'use strict';
/**
 * Durable state for the desktop application-update flow.
 *
 * The release, download and backup decisions already live in the update bridge,
 * but only in memory: closing the app (or a crash mid-install) forgot where the
 * device was. This journal keeps the orchestration phase, the release being
 * installed and the verified backup identity on disk in the private runtime
 * root, so a restart can tell "the installer never replaced this version" from
 * "the new version is starting" without guessing.
 *
 * It also owns the local schema-compatibility gate: an installer whose target
 * schema is older than this PC's schema must never be launched, because a
 * schema migration cannot be assumed reversible.
 */
const fs = require('node:fs');
const path = require('node:path');

const PHASES = [
  'IDLE',
  'CHECKING_FOR_UPDATE',
  'UPDATE_AVAILABLE',
  'VALIDATING_ELIGIBILITY',
  'DOWNLOADING_UPDATE',
  'VERIFYING_ARTIFACT',
  'UPDATE_VERIFIED',
  'PREFLIGHT_DATA_CHECK',
  'RECONCILING_LOCAL_CLOUD',
  'CREATING_LOCAL_SNAPSHOT',
  'VERIFYING_SNAPSHOT',
  'WAITING_FOR_SAFE_INSTALL',
  'AWAITING_INSTALL_APPROVAL',
  'INSTALLING',
  'STARTING_UPDATED_APP',
  'MIGRATING_LOCAL_SCHEMA',
  'VALIDATING_MIGRATION',
  'RESUMING_SYNCHRONIZATION',
  'VERIFYING_APPLICATION_HEALTH',
  'COMPLETED',
  // Explicit alternates; these are terminal or return to a safe restart point.
  'OFFLINE',
  'DEFERRED',
  'DOWNLOAD_FAILED',
  'SYNC_CONFLICT',
  'BACKUP_FAILED',
  'INCOMPATIBLE_MIGRATION',
  'INSTALL_FAILED',
  'MIGRATION_FAILED',
  'RECOVERY_REQUIRED',
  'REVOKED',
  'BACKUP_PREPARING',
  'BACKUP_CREATED',
  'BACKUP_VERIFIED',
];

/** Ordered edges of the ideal path; failures may be recorded from anywhere. */
const FORWARD = {
  IDLE: ['CHECKING_FOR_UPDATE', 'OFFLINE'],
  CHECKING_FOR_UPDATE: ['UPDATE_AVAILABLE', 'IDLE', 'OFFLINE', 'REVOKED'],
  UPDATE_AVAILABLE: ['VALIDATING_ELIGIBILITY', 'DEFERRED', 'IDLE'],
  VALIDATING_ELIGIBILITY: ['DOWNLOADING_UPDATE', 'INCOMPATIBLE_MIGRATION', 'OFFLINE'],
  DOWNLOADING_UPDATE: ['VERIFYING_ARTIFACT', 'DOWNLOAD_FAILED'],
  VERIFYING_ARTIFACT: ['UPDATE_VERIFIED', 'DOWNLOAD_FAILED'],
  UPDATE_VERIFIED: ['PREFLIGHT_DATA_CHECK', 'CREATING_LOCAL_SNAPSHOT', 'BACKUP_PREPARING'],
  PREFLIGHT_DATA_CHECK: ['RECONCILING_LOCAL_CLOUD', 'CREATING_LOCAL_SNAPSHOT', 'SYNC_CONFLICT', 'INCOMPATIBLE_MIGRATION'],
  RECONCILING_LOCAL_CLOUD: ['CREATING_LOCAL_SNAPSHOT', 'SYNC_CONFLICT', 'OFFLINE'],
  CREATING_LOCAL_SNAPSHOT: ['BACKUP_PREPARING', 'VERIFYING_SNAPSHOT', 'BACKUP_FAILED'],
  BACKUP_PREPARING: ['BACKUP_CREATED', 'BACKUP_FAILED'],
  BACKUP_CREATED: ['BACKUP_VERIFIED', 'BACKUP_FAILED'],
  BACKUP_VERIFIED: ['VERIFYING_SNAPSHOT', 'WAITING_FOR_SAFE_INSTALL', 'AWAITING_INSTALL_APPROVAL'],
  VERIFYING_SNAPSHOT: ['BACKUP_VERIFIED', 'WAITING_FOR_SAFE_INSTALL', 'BACKUP_FAILED'],
  WAITING_FOR_SAFE_INSTALL: ['AWAITING_INSTALL_APPROVAL', 'DEFERRED'],
  AWAITING_INSTALL_APPROVAL: ['INSTALLING', 'DEFERRED'],
  INSTALLING: ['STARTING_UPDATED_APP', 'INSTALL_FAILED'],
  STARTING_UPDATED_APP: ['MIGRATING_LOCAL_SCHEMA', 'MIGRATION_FAILED'],
  MIGRATING_LOCAL_SCHEMA: ['VALIDATING_MIGRATION', 'MIGRATION_FAILED', 'RECOVERY_REQUIRED'],
  VALIDATING_MIGRATION: ['RESUMING_SYNCHRONIZATION', 'RECOVERY_REQUIRED'],
  RESUMING_SYNCHRONIZATION: ['VERIFYING_APPLICATION_HEALTH', 'SYNC_CONFLICT'],
  VERIFYING_APPLICATION_HEALTH: ['COMPLETED', 'RECOVERY_REQUIRED'],
  COMPLETED: ['IDLE'],
  OFFLINE: ['CHECKING_FOR_UPDATE', 'IDLE'],
  DEFERRED: ['CHECKING_FOR_UPDATE', 'AWAITING_INSTALL_APPROVAL', 'IDLE'],
  DOWNLOAD_FAILED: ['DOWNLOADING_UPDATE', 'IDLE'],
  SYNC_CONFLICT: ['RECONCILING_LOCAL_CLOUD', 'DEFERRED', 'IDLE'],
  BACKUP_FAILED: ['CREATING_LOCAL_SNAPSHOT', 'IDLE'],
  INCOMPATIBLE_MIGRATION: ['IDLE'],
  INSTALL_FAILED: ['DOWNLOADING_UPDATE', 'IDLE'],
  MIGRATION_FAILED: ['RECOVERY_REQUIRED'],
  RECOVERY_REQUIRED: ['IDLE'],
  REVOKED: ['IDLE'],
};

function canTransition(from, to) {
  if (!PHASES.includes(from) || !PHASES.includes(to)) return false;
  if (from === to) return true;
  return (FORWARD[from] || []).includes(to);
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp-' + process.pid;
  fs.writeFileSync(temporary, content, { mode: 0o600 });
  fs.renameSync(temporary, file);
}

/**
 * `record` is deliberately forgiving: an unexpected phase (for example a manual
 * retry) is stored with `illegal: true` instead of throwing away the journal,
 * so support can see exactly what happened.
 */
function createUpdateStateStore({ root, limit = 60, now = () => new Date().toISOString() } = {}) {
  if (!root) throw new Error('Update state needs the private runtime root');
  const file = path.join(root, 'update-state.json');
  let data = { phase: 'IDLE', updatedAt: now(), journal: [], release: null, download: null, backup: null, snapshot: null, fromVersion: null, warning: null };

  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || !PHASES.includes(parsed.phase)) throw new Error('unknown phase');
    data = { ...data, ...parsed, journal: Array.isArray(parsed.journal) ? parsed.journal.slice(-limit) : [] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      const quarantine = file + '.corrupt-' + Date.now();
      try { fs.renameSync(file, quarantine); } catch (_) { /* keep going */ }
      data.warning = 'The previous update journal was unreadable and was quarantined at ' + quarantine;
    }
  }

  function save() { atomicWrite(file, JSON.stringify(data)); }

  function record(phase, detail = {}) {
    if (!PHASES.includes(phase)) throw new Error('Unknown update phase: ' + phase);
    const previous = data.phase;
    const entry = { phase, at: now(), ...detail };
    if (!canTransition(previous, phase)) entry.illegal = { from: previous };
    data.phase = phase;
    data.updatedAt = entry.at;
    data.journal = [...data.journal, entry].slice(-limit);
    if (detail.release !== undefined) data.release = detail.release;
    if (detail.download !== undefined) data.download = detail.download;
    if (detail.backup !== undefined) data.backup = detail.backup;
    if (detail.snapshot !== undefined) data.snapshot = detail.snapshot;
    if (detail.fromVersion !== undefined) data.fromVersion = detail.fromVersion;
    save();
    return entry;
  }

  function clear() {
    data = { phase: 'IDLE', updatedAt: now(), journal: [], release: null, download: null, backup: null, snapshot: null, fromVersion: null, warning: null };
    save();
  }

  return {
    file,
    record,
    clear,
    get: () => ({ ...data, journal: [...data.journal] }),
    phase: () => data.phase,
    /** Replaces the release snapshot without inventing a phase. */
    remember(release) {
      data.release = release || null;
      save();
    },
    forget() {
      data.release = null;
      data.download = null;
      data.backup = null;
      data.snapshot = null;
      save();
    },
  };
}

/**
 * Refuses an installer that would move this PC's local schema backwards, or
 * that needs an intermediate migration this build cannot perform.
 */
function schemaGate({ localSchemaVersion, release } = {}) {
  const local = Number(localSchemaVersion);
  const target = Number(release?.targetSchemaVersion);
  const minimum = Number(release?.minimumCompatibleSchemaVersion);
  if (!Number.isInteger(local) || local < 1 || !Number.isInteger(target) || target < 1) return { ok: true };
  if (local > target) {
    const error = new Error('This installer targets local schema v' + target + ' but this PC is already at v' + local +
      '. A schema migration cannot be reversed, so the update is blocked.');
    error.code = 'INCOMPATIBLE_SCHEMA';
    return { ok: false, error };
  }
  if (Number.isInteger(minimum) && minimum >= 1 && local < minimum) {
    const error = new Error('This PC is at local schema v' + local + ' but the installer requires at least v' + minimum +
      '. Install the intermediate release first.');
    error.code = 'INCOMPATIBLE_SCHEMA';
    return { ok: false, error };
  }
  return { ok: true };
}

/**
 * On startup, interpret a journal left at INSTALLING. If the recorded release
 * is the running version the installer never replaced it; otherwise the new
 * version is starting and must migrate.
 */
function resumePlan({ persisted, currentVersion } = {}) {
  if (!persisted || persisted.phase !== 'INSTALLING') return null;
  const expected = persisted.release?.version || null;
  const from = persisted.fromVersion || null;
  if (expected && String(currentVersion) === String(expected)) {
    return { phase: 'STARTING_UPDATED_APP', detail: { expectedVersion: expected, currentVersion } };
  }
  if (from && String(currentVersion) === String(from)) {
    return { phase: 'INSTALL_FAILED', detail: { reason: 'The installer did not replace the running version' } };
  }
  return { phase: 'STARTING_UPDATED_APP', detail: { expectedVersion: expected, currentVersion } };
}

module.exports = { PHASES, canTransition, createUpdateStateStore, schemaGate, resumePlan };
