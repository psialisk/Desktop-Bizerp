'use strict';
// Durable desktop update journal + local schema-compatibility gate.
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { canTransition, createUpdateStateStore, schemaGate, resumePlan } = require('../src/update-state.cjs');
const { registerAppUpdates } = require('../src/app-updates-bridge.cjs');

const KEY = 'f'.repeat(64);
const TOKEN = 'installation-token-' + 'a'.repeat(30);
const SHA = 'a'.repeat(64);

const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function makeUpdates(state) {
  return {
    async checkForUpdate() {
      return {
        checkedAt: new Date().toISOString(), updateAvailable: true, policy: {},
        release: {
          id: state.releaseId, version: state.version, mandatory: false,
          targetSchemaVersion: state.targetSchema, minimumCompatibleSchemaVersion: 1,
          artifact: { filename: 'BusinessERP-Desktop-' + state.version + '-Setup.exe', sizeBytes: 16, sha256: SHA },
        },
      };
    },
    async downloadUpdate({ destination }) {
      await fsp.mkdir(destination, { recursive: true });
      const file = path.join(destination, 'setup.exe');
      await fsp.writeFile(file, 'MZ-installer');
      return { file, sha256: hashFile(file) };
    },
    async createEncryptedBackup({ outputFile }) {
      await fsp.writeFile(outputFile, 'encrypted-backup');
      return { file: outputFile, sizeBytes: 16, checksum: hashFile(outputFile), recordCount: 1, manifest: { format: 1, mode: 'live', files: [{ name: 'database.dump', size: 5, hash: 'h' }] } };
    },
    async verifyEncryptedBackup() { return true; },
    openEncryptedBackup() { return { manifest: { format: 1, mode: 'live', files: [{ name: 'database.dump', size: 5, hash: 'h' }] } }; },
    async sha256File(file) { return hashFile(file); },
    async uploadBackup() { return { id: 'backup-1', status: 'verified' }; },
    async verifyAuthenticode() { return { Status: 'Valid', Subject: 'CN=GNJ Test' }; },
    launchInstaller() { state.launched += 1; return { pid: 4242 }; },
  };
}

function makeRuntime(root, version, schema) {
  const runtime = {
    root, manifest: { version, schemaVersion: schema },
    v: {
      instanceId: 'instance-1', databases: { live: 'store_live' },
      appUpdates: { token: TOKEN, apiBase: 'https://updates.invalid', installationId: 'installation-1' },
      appUpdateBackupKey: KEY,
    },
    secrets: { save: async value => { runtime.v = value; } },
    backup: async workspace => {
      await fsp.mkdir(workspace, { recursive: true });
      await fsp.writeFile(path.join(workspace, 'database.dump'), 'PGDMP');
      return workspace;
    },
  };
  return runtime;
}

function makeBridge({ root, state }) {
  const handlers = {};
  registerAppUpdates({
    ipcMain: { handle: (channel, fn) => { handlers[channel] = fn; } },
    getRuntime: () => makeRuntime.current,
    login: { authorizeOwner: async () => ({ role: 'owner', tenantId: 'tenant-1', sub: 'owner-1' }) },
    trusted: () => true, action: fn => (...args) => fn(...args), root,
    updates: makeUpdates(state), finishInstall: async () => {}, env: {},
  });
  return {
    status: () => handlers['updates:status'](),
    check: () => handlers['updates:check'](),
    download: () => handlers['updates:download'](),
    createBackup: () => handlers['updates:backup'](),
    approveRestart: () => handlers['updates:approve-restart'](),
    install: () => handlers['updates:install'](),
  };
}

async function moduleChecks(root) {
  assert.equal(canTransition('IDLE', 'CHECKING_FOR_UPDATE'), true);
  assert.equal(canTransition('COMPLETED', 'INSTALLING'), false);
  assert.equal(canTransition('VALIDATING_ELIGIBILITY', 'INCOMPATIBLE_MIGRATION'), true);

  const store = createUpdateStateStore({ root: path.join(root, 'module') });
  assert.equal(store.phase(), 'IDLE');
  store.record('UPDATE_AVAILABLE', { release: { id: 'r', version: '0.5.0', targetSchemaVersion: 2 } });
  store.record('INSTALLING', { fromVersion: '0.4.23', release: { id: 'r', version: '0.5.0' } });
  const illegal = store.get().journal.at(-1).illegal;
  assert.equal(illegal.from, 'UPDATE_AVAILABLE', 'skipping the ordered path is recorded, not hidden');

  const reloaded = createUpdateStateStore({ root: path.join(root, 'module') });
  assert.equal(reloaded.phase(), 'INSTALLING', 'phase survives a restart');
  assert.equal(reloaded.get().release.version, '0.5.0');
  assert.equal(reloaded.get().fromVersion, '0.4.23');

  const limited = createUpdateStateStore({ root: path.join(root, 'limited'), limit: 3 });
  for (const phase of ['CHECKING_FOR_UPDATE', 'UPDATE_AVAILABLE', 'VALIDATING_ELIGIBILITY', 'DOWNLOADING_UPDATE', 'VERIFYING_ARTIFACT']) limited.record(phase);
  assert.equal(limited.get().journal.length, 3, 'journal is bounded');

  const corruptRoot = path.join(root, 'corrupt');
  await fsp.mkdir(corruptRoot, { recursive: true });
  await fsp.writeFile(path.join(corruptRoot, 'update-state.json'), '{not json');
  const recovered = createUpdateStateStore({ root: corruptRoot });
  assert.equal(recovered.phase(), 'IDLE');
  assert.match(recovered.get().warning, /quarantined/);
  assert.ok(fs.readdirSync(corruptRoot).some(name => name.includes('.corrupt-')), 'the unreadable journal is preserved');

  const downgrade = schemaGate({ localSchemaVersion: 3, release: { targetSchemaVersion: 2 } });
  assert.equal(downgrade.ok, false);
  assert.equal(downgrade.error.code, 'INCOMPATIBLE_SCHEMA');
  assert.match(downgrade.error.message, /cannot be reversed/);
  const tooOld = schemaGate({ localSchemaVersion: 1, release: { targetSchemaVersion: 2, minimumCompatibleSchemaVersion: 2 } });
  assert.equal(tooOld.ok, false);
  assert.match(tooOld.error.message, /intermediate release/);
  assert.equal(schemaGate({ localSchemaVersion: 2, release: { targetSchemaVersion: 2, minimumCompatibleSchemaVersion: 1 } }).ok, true);

  assert.equal(resumePlan({ persisted: { phase: 'INSTALLING', release: { version: '0.5.1' }, fromVersion: '0.5.0' }, currentVersion: '0.5.1' }).phase, 'STARTING_UPDATED_APP');
  assert.equal(resumePlan({ persisted: { phase: 'INSTALLING', release: { version: '0.5.1' }, fromVersion: '0.5.0' }, currentVersion: '0.5.0' }).phase, 'INSTALL_FAILED');
  assert.equal(resumePlan({ persisted: { phase: 'IDLE' }, currentVersion: '0.5.0' }), null);
}

async function bridgeChecks(root) {
  // A stale release that would move the schema backwards is refused locally.
  const state = { releaseId: 'release-old', version: '0.5.0', targetSchema: 2, launched: 0 };
  makeRuntime.current = makeRuntime(path.join(root, 'refuse'), '0.4.23', 3);
  const bridge = makeBridge({ root: makeRuntime.current.root, state });

  await bridge.check();
  assert.equal(bridge.status().phase, 'UPDATE_AVAILABLE');
  await bridge.download();
  assert.equal(bridge.status().phase, 'UPDATE_VERIFIED');
  await bridge.createBackup();
  assert.equal(bridge.status().phase, 'BACKUP_VERIFIED');
  await bridge.approveRestart();
  assert.equal(bridge.status().phase, 'AWAITING_INSTALL_APPROVAL');
  await assert.rejects(bridge.install(), /targets local schema v2 but this PC is already at v3/);
  assert.equal(state.launched, 0, 'the installer is never launched on an incompatible schema');
  assert.equal(bridge.status().phase, 'INCOMPATIBLE_MIGRATION');
  assert.ok(fs.existsSync(path.join(makeRuntime.current.root, 'update-state.json')));

  // A compatible release installs, and the journal survives the restart.
  const next = { releaseId: 'release-new', version: '0.5.1', targetSchema: 3, launched: 0 };
  const installRoot = path.join(root, 'install');
  makeRuntime.current = makeRuntime(installRoot, '0.5.0', 3);
  const installing = makeBridge({ root: installRoot, state: next });
  await installing.check();
  await installing.download();
  await installing.createBackup();
  await installing.approveRestart();
  const result = await installing.install();
  assert.equal(result.installing, true);
  assert.equal(next.launched, 1);
  const journal = JSON.parse(await fsp.readFile(path.join(installRoot, 'update-state.json'), 'utf8'));
  assert.equal(journal.phase, 'INSTALLING');
  assert.equal(journal.fromVersion, '0.5.0');
  assert.equal(journal.release.version, '0.5.1');

  // The updated build resumes as STARTING_UPDATED_APP; an unchanged version means the install did not happen.
  makeRuntime.current = makeRuntime(installRoot, '0.5.1', 3);
  const updated = makeBridge({ root: installRoot, state: next });
  assert.equal(updated.status().phase, 'STARTING_UPDATED_APP');
  await fsp.writeFile(path.join(installRoot, 'update-state.json'), JSON.stringify({ ...journal, phase: 'INSTALLING' }));
  makeRuntime.current = makeRuntime(installRoot, '0.5.0', 3);
  const unchanged = makeBridge({ root: installRoot, state: next });
  assert.equal(unchanged.status().phase, 'INSTALL_FAILED', 'a launch without replacement is detected on restart');
}

(async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'bizerp-update-state-'));
  try {
    await moduleChecks(root);
    await bridgeChecks(root);
    console.log('update state: durable phases, resume after restart, schema downgrade gate and journal recovery passed');
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exit(1); });
