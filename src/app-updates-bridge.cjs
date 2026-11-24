'use strict';
/**
 * Narrow Electron bridge for the desktop update client.
 *
 * Only these owner-authorized operations are exposed: status, check, download
 * with progress, encrypted backup upload, restart approval and install. The
 * renderer never receives the installation token, the backup key or the
 * installer path. Install is refused unless the currently downloaded release
 * has a cloud-verified backup and the owner approved the restart.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createHash, createPublicKey, randomBytes, randomUUID, sign } = require('node:crypto');
const defaults = require('./app-updates.cjs');
const { createUpdateStateStore, schemaGate, resumePlan } = require('./update-state.cjs');

const API_BASE_ENV = 'BIZERP_APP_UPDATES_API';
const TOKEN_ENV = 'BIZERP_APP_UPDATE_INSTALLATION_TOKEN';
const BACKUP_KEY_ENV = 'BIZERP_TENANT_BACKUP_KEY';
const HEX_KEY = /^[a-f0-9]{64}$/;
// Pre-install snapshots are only useful until a newer one exists. Repeated
// updates and retries would otherwise keep one full encrypted dump per attempt.
const SNAPSHOT_RETENTION = 3;

function registerAppUpdates(options) {
  const {
    ipcMain, getRuntime, login, trusted, action, dialog, getDialogHost, app, root,
    broadcast = () => {}, beforeInstall, finishInstall,
    env = process.env, fetchImpl = fetch, updates = defaults,
    verifyInstaller = updates.verifyAuthenticode, launchInstaller = updates.launchInstaller,
  } = options;
  if (!ipcMain || !getRuntime || !login || !trusted || !action) throw new Error('Update bridge dependencies are incomplete');
  if (!root) throw new Error('Update bridge needs the private runtime root');

  const state = { release: null, checkedAt: null, download: null, snapshot: null, backup: null, restartApproved: false, check: null };
  // Durable journal of the update flow. It is advisory: a journal problem must
  // never block an update or a business operation.
  const updateState = (() => { try { return createUpdateStateStore({ root }); } catch (_) { return null; } })();
  function journal(phase, detail) { try { updateState?.record(phase, detail); } catch (_) { /* never block */ } }
  try {
    const plan = resumePlan({ persisted: updateState?.get(), currentVersion: config().currentVersion });
    if (plan) journal(plan.phase, plan.detail);
  } catch (_) { /* runtime may not be ready yet */ }

  // The release, download and verified snapshot only live in memory, so a
  // restart used to lose an update that was already prepared. Restore them from
  // the journal; approval is still required after a restart.
  (() => {
    const saved = updateState?.get();
    if (!saved) return;
    if (!state.release && saved.release?.id && saved.release.version) state.release = { ...saved.release };
    if (!state.download && saved.download?.file && saved.release?.id && saved.download.releaseId === saved.release.id && fs.existsSync(saved.download.file)) {
      state.download = { file: saved.download.file, sha256: saved.download.sha256, version: saved.release.version, releaseId: saved.download.releaseId, downloadedAt: saved.updatedAt || null, progress: 100 };
    }
    if (!state.snapshot && saved.snapshot?.verified && saved.snapshot.checksum && saved.snapshot.releaseId === saved.release?.id) {
      const file = path.resolve(root, saved.snapshot.file || '');
      if (file.startsWith(root + path.sep) && fs.existsSync(file)) state.snapshot = { ...saved.snapshot, file };
    }
  })();

  const ownerAction = fn => action(fn, { owner: true });
  const emit = (phase, detail = {}) => {
    try { broadcast({ phase, ...detail }); } catch (_) { /* the UI is optional */ }
  };

  /**
   * Keeps only the newest pre-install snapshots for this store. Runs after a
   * verified snapshot and at startup, because a failed or repeated update can
   * leave one directory per attempt behind. Pruning is best effort: a locked
   * file is skipped and retried on the next update rather than failing one.
   */
  async function pruneSnapshots(keep = SNAPSHOT_RETENTION) {
    const directory = path.join(root, 'app-update-backups');
    let entries;
    try {
      entries = await fsp.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
    const snapshots = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const location = path.join(directory, entry.name);
      try {
        snapshots.push({ location, modifiedAt: (await fsp.stat(location)).mtimeMs });
      } catch (_) { /* removed while scanning */ }
    }
    snapshots.sort((a, b) => b.modifiedAt - a.modifiedAt);
    const removed = [];
    for (const snapshot of snapshots.slice(Math.max(1, keep))) {
      try {
        await fsp.rm(snapshot.location, { recursive: true, force: true });
        removed.push(snapshot.location);
      } catch (_) { /* retried after the next verified snapshot */ }
    }
    return removed;
  }
  // Startup cleanup is fire-and-forget: an update must never wait on disk I/O.
  void pruneSnapshots().catch(() => {});

  function config() {
    const runtime = getRuntime();
    const saved = runtime?.v?.appUpdates || {};
    const apiBase = String(env[API_BASE_ENV] || saved.apiBase || runtime?.manifest?.cloudApi || '').replace(/\/$/, '');
    const token = String(env[TOKEN_ENV] || saved.token || '');
    const installationId = String(saved.installationId || runtime?.v?.cloudBinding?.installationId || runtime?.v?.instanceId || '');
    return {
      runtime, apiBase, token, installationId,
      currentVersion: String(runtime?.manifest?.version || require('../package.json').version),
      localSchemaVersion: Number(env.BIZERP_APP_SCHEMA_VERSION || runtime?.manifest?.schemaVersion || 1),
      canonicalContractVersion: Number(env.APP_CANONICAL_CONTRACT_VERSION || 1),
    };
  }

  function requireToken() {
    const cfg = config();
    if (!cfg.token || !cfg.apiBase) throw new Error('This PC is not linked for updates. Sign in online as the business owner or activate a perpetual licence.');
    return cfg;
  }

  /** The stored local licence identity owns the perpetual grant and the device key that signs for it. */
  function nativeCredential() {
    const stored = getRuntime()?.v?.offlineLicense;
    const unlinked = 'This PC is not linked for updates. Sign in online as the business owner or activate a perpetual licence.';
    if (!stored?.proof?.privateKey || !stored?.proof?.publicKey) throw new Error(unlinked);
    const grant = String(stored.token || '').trim();
    if (!grant) throw new Error(unlinked);
    return { proof: stored.proof, grant };
  }

  /** A fresh device-key proof binds the perpetual licence to this installation. */
  function nativeProof(proof, installationId) {
    const publicKey = createPublicKey(proof.publicKey).export({ type: 'spki', format: 'der' }).toString('base64');
    const proofText = JSON.stringify({ action: 'app-update-register', installationId, requestId: randomUUID(), issuedAt: Date.now(), publicKey });
    return { proofText, signature: sign('RSA-SHA256', Buffer.from(proofText), proof.privateKey).toString('base64') };
  }

  /** Registers a perpetual offline install without a staff JWT; the tenant is never chosen here. */
  async function registerNative() {
    const cfg = config();
    if (!cfg.apiBase) throw new Error('Cloud API address is unavailable; sign in online once to link updates');
    const { proof, grant } = nativeCredential();
    const installationId = proof.installationId;
    const response = await fetchImpl(cfg.apiBase + '/app-updates/installations/register-native', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        platform: 'windows', architecture: process.arch === 'arm64' ? 'arm64' : 'x64',
        installationId, currentVersion: cfg.currentVersion, localSchemaVersion: cfg.localSchemaVersion,
        canonicalContractVersion: cfg.canonicalContractVersion, channel: 'stable',
        grant, ...nativeProof(proof, installationId),
      }),
    });
    const data = await readJson(response);
    if (typeof data.installationToken !== 'string' || data.installationToken.length < 40) throw new Error('Update registration returned no installation token');
    await saveInstallation({ token: data.installationToken, apiBase: cfg.apiBase, installationId, linkedAt: new Date().toISOString() });
    emit('linked', { version: cfg.currentVersion, native: true });
    return { linked: true, installationId, capabilities: data.capabilities || null, native: true };
  }

  /** Uses the stored installation token, registering a perpetual licence offline when there is none. */
  async function credential() {
    const cfg = config();
    if (cfg.token) return cfg;
    await registerNative();
    return requireToken();
  }

  function status() {
    const cfg = config();
    const release = state.release;
    const snapshotMatches = !!(release && state.snapshot?.verified && state.snapshot.releaseId === release.id);
    return {
      linked: !!(cfg.token && cfg.apiBase),
      apiBase: cfg.apiBase || null,
      installationId: cfg.installationId || null,
      currentVersion: cfg.currentVersion,
      checkedAt: state.checkedAt,
      updateAvailable: !!release,
      release: release ? { id: release.id, version: release.version, mandatory: !!release.mandatory, releaseNotes: release.releaseNotes || null, artifact: { filename: release.artifact?.filename || null, sizeBytes: release.artifact?.sizeBytes || null } } : null,
      policy: state.check?.policy || null,
      download: state.download ? { version: state.download.version, file: state.download.file ? path.basename(state.download.file) : null, ready: !!state.download.file, progress: state.download.progress || 100 } : null,
      backup: state.backup ? { status: state.backup.verified ? 'verified' : 'not_uploaded', id: state.backup.id || null, checksum: state.backup.checksum || null, createdAt: state.backup.createdAt || null, reason: state.backup.reason || null } : null,
      snapshot: state.snapshot ? { verified: !!state.snapshot.verified, checksum: state.snapshot.checksum || null, file: state.snapshot.file ? path.relative(root, state.snapshot.file) : null, sizeBytes: state.snapshot.sizeBytes || null, createdAt: state.snapshot.createdAt || null, releaseId: state.snapshot.releaseId || null } : null,
      restartApproved: state.restartApproved,
      installReady: !!(state.download?.file && snapshotMatches && state.restartApproved),
      blockedReason: !release ? 'No downloaded update.' : !state.download?.file ? 'Download the update first.' : !snapshotMatches ? 'Create and verify the local snapshot before installing.' : !state.restartApproved ? 'Approve the restart before installing.' : null,
      state: { downloadedAt: state.download?.downloadedAt || null, error: state.check?.error || null },
      phase: updateState?.phase() || null,
      journal: updateState ? updateState.get().journal.slice(-10) : [],
    };
  }

  async function saveInstallation(values) {
    const runtime = getRuntime();
    runtime.v = { ...runtime.v, appUpdates: { ...(runtime.v.appUpdates || {}), ...values } };
    await runtime.secrets.save(runtime.v);
  }

  async function readJson(response) {
    if (!response.ok) {
      let message = 'Update service returned HTTP ' + response.status;
      try { message = JSON.parse(await response.text()).message || message; } catch (_) { /* keep status */ }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  /** Registers/refreshes this installation from a verified cloud owner login. The JWT stays in memory. */
  async function linkInstallation({ apiBase, ownerToken, actor }) {
    if (!actor || actor.role !== 'owner' || !actor.tenantId) throw new Error('A verified cloud business owner is required');
    if (!ownerToken) throw new Error('Cloud owner authorization is missing');
    const cfg = config();
    const api = String(apiBase || '').replace(/\/$/, '');
    if (!api) throw new Error('Cloud API address is unavailable');
    const installationId = cfg.installationId;
    if (!installationId) throw new Error('This installation has no stable identifier');
    const response = await fetchImpl(api + '/app-updates/installations/register', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bearer ' + ownerToken, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        installationId, platform: 'windows', architecture: process.arch === 'arm64' ? 'arm64' : 'x64',
        currentVersion: cfg.currentVersion, localSchemaVersion: cfg.localSchemaVersion,
        canonicalContractVersion: cfg.canonicalContractVersion, channel: 'stable',
      }),
    });
    const data = await readJson(response);
    if (typeof data.installationToken !== 'string' || data.installationToken.length < 40) throw new Error('Update registration returned no installation token');
    await saveInstallation({ token: data.installationToken, apiBase: api, installationId, linkedAt: new Date().toISOString() });
    emit('linked', { version: cfg.currentVersion });
    return { linked: true, installationId, capabilities: data.capabilities || null };
  }

  async function onCloudLogin({ api, token, actor }) {
    try { return await linkInstallation({ apiBase: api, ownerToken: token, actor }); }
    catch (error) {
      const runtime = getRuntime();
      try { runtime?.message?.('Business signed in; update registration is unavailable: ' + String(error.message || error)); } catch (_) { /* status is best effort */ }
      return { linked: false, error: String(error.message || error) };
    }
  }

  const checkWith = cfg => updates.checkForUpdate({
    apiBase: cfg.apiBase, installationToken: cfg.token, currentVersion: cfg.currentVersion,
    localSchemaVersion: cfg.localSchemaVersion, canonicalContractVersion: cfg.canonicalContractVersion,
  });

  async function check() {
    let cfg = await credential();
    let result;
    try { result = await checkWith(cfg); }
    catch (error) {
      // An expired or revoked installation token is renewed from the signed licence.
      if (error?.status !== 401 && error?.status !== 403) throw error;
      try { await registerNative(); } catch (_) { throw error; }
      cfg = requireToken();
      result = await checkWith(cfg);
    }
    const next = result.updateAvailable && result.release ? {
      ...result.release,
      mandatory: !!(result.release.mandatoryUpdate || result.release.mandatory),
      releaseNotes: result.release.releaseNotes || result.release.notes || null,
    } : null;
    if (next?.id !== state.release?.id) {
      state.release = next;
      state.download = null;
      state.snapshot = null;
      state.backup = null;
      state.restartApproved = false;
    }
    state.checkedAt = result.checkedAt || new Date().toISOString();
    state.check = { at: state.checkedAt, policy: result.policy || null, capabilities: result.capabilities || null, error: null };
    journal(next ? 'UPDATE_AVAILABLE' : 'IDLE', next ? {
      release: {
        id: next.id, version: next.version, mandatory: !!next.mandatory,
        targetSchemaVersion: next.targetSchemaVersion ?? null, minimumCompatibleSchemaVersion: next.minimumCompatibleSchemaVersion ?? null,
      },
    } : {});
    emit('checked', { updateAvailable: !!next, version: next?.version || null });
    return status();
  }

  async function download() {
    const cfg = requireToken();
    if (!state.release) throw new Error('Check for an update first');
    state.download = null; state.snapshot = null; state.backup = null; state.restartApproved = false;
    journal('DOWNLOADING_UPDATE', { release: { id: state.release.id, version: state.release.version, targetSchemaVersion: state.release.targetSchemaVersion ?? null, minimumCompatibleSchemaVersion: state.release.minimumCompatibleSchemaVersion ?? null } });
    const destination = path.join(root, 'app-updates');
    emit('download', { percent: 0 });
    const downloaded = await updates.downloadUpdate({
      apiBase: cfg.apiBase, installationToken: cfg.token, release: state.release, destination,
      onProgress: progress => {
        state.download = { ...(state.download || {}), progress: progress.percent };
        emit('download', progress);
      },
    });
    state.download = { file: downloaded.file, sha256: downloaded.sha256, version: state.release.version, releaseId: state.release.id, downloadedAt: new Date().toISOString(), progress: 100 };
    journal('UPDATE_VERIFIED', { download: { file: downloaded.file, sha256: downloaded.sha256, releaseId: state.release.id } });
    emit('downloaded', { version: state.release.version });
    return status();
  }

  function backupKey(runtime) {
    let key = String(env[BACKUP_KEY_ENV] || '').trim().toLowerCase();
    if (!key) key = String(runtime.v.appUpdateBackupKey || '').trim().toLowerCase();
    if (!key) key = randomBytes(32).toString('hex');
    if (!HEX_KEY.test(key)) throw new Error('The tenant backup key must be 64 hexadecimal characters');
    return key;
  }

  /**
   * Encrypted copy of the live store in the private runtime root, verified by
   * decrypting it and re-hashing the archive. It never depends on the network,
   * so an offline or unentitled PC can still install an update safely.
   */
  async function localSnapshot(runtime, key) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const workspace = path.join(root, 'app-update-backups', stamp);
    await fsp.mkdir(workspace, { recursive: true });
    journal('CREATING_LOCAL_SNAPSHOT');
    emit('backup', { status: 'creating', scope: 'local' });
    const backupDirectory = await runtime.backup(workspace);
    const outputFile = path.join(workspace, 'pre-update-local.bzbackup');
    const archive = await updates.createEncryptedBackup({ backupDirectory, outputFile, keyHex: key });
    journal('VERIFYING_SNAPSHOT');
    emit('backup', { status: 'verifying', scope: 'local' });
    // The manifest comes from createEncryptedBackup (the exact manifest it
    // embedded); authentication is streamed so a large dump is never decrypted
    // into the main process's memory.
    const manifest = archive.manifest;
    if (manifest?.format !== 1 || manifest.mode !== 'live' || !Array.isArray(manifest.files) || !manifest.files.length) {
      throw new Error('The local update snapshot is unreadable');
    }
    await updates.verifyEncryptedBackup(outputFile, key);
    const checksum = await updates.sha256File(outputFile);
    if (checksum !== archive.checksum) throw new Error('The local update snapshot failed its checksum check');
    return { file: outputFile, checksum, sizeBytes: archive.sizeBytes, files: manifest.files.length, createdAt: new Date().toISOString() };
  }

  async function createBackup() {
    if (!state.release || !state.download?.file) throw new Error('Download the update before creating its pre-install snapshot');
    const runtime = getRuntime();
    if (!runtime?.v?.databases?.live) throw new Error('A local live database is required before an update');
    const cfg = config();
    const key = backupKey(runtime);
    if (runtime.v.appUpdateBackupKey !== key) {
      runtime.v = { ...runtime.v, appUpdateBackupKey: key };
      await runtime.secrets.save(runtime.v);
    }
    let snapshot;
    try {
      snapshot = await localSnapshot(runtime, key);
    } catch (error) {
      journal('BACKUP_FAILED', { message: String(error?.message || error) });
      throw error;
    }
    state.snapshot = { ...snapshot, verified: true, releaseId: state.release.id };
    journal('BACKUP_VERIFIED', {
      backup: { verified: true, scope: 'local', checksum: snapshot.checksum, sizeBytes: snapshot.sizeBytes, at: snapshot.createdAt },
      snapshot: { verified: true, file: path.relative(root, snapshot.file), checksum: snapshot.checksum, sizeBytes: snapshot.sizeBytes, releaseId: state.release.id, createdAt: snapshot.createdAt },
    });
    emit('backup', { status: 'verified', scope: 'local', checksum: snapshot.checksum });
    await pruneSnapshots().catch(() => {});

    // The cloud copy is best effort only: offline or unentitled PCs keep the
    // verified local snapshot and can still install.
    if (!cfg.token || !cfg.apiBase) {
      state.backup = { verified: false, reason: 'Cloud backup skipped: this PC is offline or not linked; the verified local snapshot is used' };
      emit('backup', { status: 'local_only', reason: state.backup.reason });
      return status();
    }
    try {
      emit('backup', { status: 'uploading', percent: 0, scope: 'cloud' });
      const completed = await updates.uploadBackup({
        apiBase: cfg.apiBase, installationToken: cfg.token, archive: snapshot,
        metadata: {
          backupType: 'pre_update', applicationVersion: cfg.currentVersion,
          schemaVersion: cfg.localSchemaVersion, canonicalContractVersion: cfg.canonicalContractVersion,
          backupFormatVersion: 1, deviceId: cfg.installationId,
          encryptionVersion: 'AES-256-GCM', encryptionKeyReference: 'desktop-local-v1',
          syncCheckpoint: {}, recordCounts: { files: snapshot.files },
        },
      });
      if (completed?.status !== 'verified') throw new Error('The cloud backup was not verified');
      state.backup = { verified: true, id: completed.id || null, checksum: snapshot.checksum, sizeBytes: snapshot.sizeBytes, releaseId: state.release.id, createdAt: snapshot.createdAt };
      emit('backup', { status: 'verified', scope: 'cloud', checksum: snapshot.checksum });
    } catch (error) {
      state.backup = { verified: false, reason: 'Cloud backup unavailable (' + String(error?.message || error) + '); the verified local snapshot is used' };
      emit('backup', { status: 'local_only', reason: state.backup.reason });
    }
    return status();
  }

  /** Retries once when the installation token has expired; any other refusal is reported. */
  async function uploadArchive(cfg, archive, metadata, stallMs, capMs) {
    const bounds = { stallTimeoutMs: stallMs, totalTimeoutMs: capMs };
    try {
      return await updates.uploadBackup({ apiBase: cfg.apiBase, installationToken: cfg.token, archive, metadata, ...bounds });
    } catch (error) {
      if (error?.status !== 401) throw error;
      await registerNative();
      const renewed = requireToken();
      return updates.uploadBackup({ apiBase: renewed.apiBase, installationToken: renewed.token, archive, metadata, ...bounds });
    }
  }

  /**
   * Uploads the verified automatic backup taken by a local schema upgrade.
   *
   * The cloud copy never gates the upgrade: the runtime keeps the verified local
   * backup and only reports whether the encrypted archive reached the account.
   * Entitlement (cloudBackupAccess) is enforced by /device-backups/initiate, and
   * its refusal is returned as a reason instead of throwing.
   */
  async function backupSchemaUpgrade({ backupRoot, fromVersion } = {}) {
    // The upgrade has already stopped the local services, so the cloud step must
    // not hang. A dead connection is detected from *no upload progress*, not from
    // total elapsed time, so a large dump on a slow link still gets its copy; the
    // generous overall cap only stops a runaway that keeps sending bytes forever.
    const stallMs = Math.min(60 * 60 * 1000, Math.max(250, Number(env.BIZERP_SCHEMA_UPGRADE_BACKUP_STALL_MS) || 5 * 60 * 1000));
    const capMs = Math.min(24 * 60 * 60 * 1000, Math.max(5 * 60 * 1000, Number(env.BIZERP_SCHEMA_UPGRADE_BACKUP_MAX_MS) || 6 * 60 * 60 * 1000));
    try {
      if (!backupRoot || typeof backupRoot !== 'string' || !fs.existsSync(backupRoot)) throw new Error('The automatic upgrade backup is unavailable');
      // Only the live business store is uploaded: a training copy is a sandbox and
      // would consume the tenant backup quota and clutter the cloud vault.
      const modes = ['live'].filter(mode => fs.existsSync(path.join(backupRoot, mode, 'manifest.json')));
      if (!modes.length) throw new Error('The automatic upgrade backup contains no live business store');
      const cfg = await credential();
      const runtime = getRuntime();
      const key = backupKey(runtime);
      if (runtime.v.appUpdateBackupKey !== key) {
        runtime.v = { ...runtime.v, appUpdateBackupKey: key };
        await runtime.secrets.save(runtime.v);
      }
      const version = String(fromVersion);
      const applicationVersion = /^\d{1,4}\.\d{1,4}\.\d{1,4}(?:-[0-9A-Za-z.-]{1,40})?$/.test(version) ? version : cfg.currentVersion;
      const uploaded = [];
      for (const mode of modes) {
        const folder = path.join(backupRoot, mode);
        const archive = await updates.createEncryptedBackup({ backupDirectory: folder, outputFile: path.join(folder, 'pre-upgrade.bzbackup'), keyHex: key });
        emit('backup', { status: 'uploading', percent: 0, mode });
        const completed = await uploadArchive(cfg, archive, {
          backupType: 'pre_update', applicationVersion,
          schemaVersion: cfg.localSchemaVersion, canonicalContractVersion: cfg.canonicalContractVersion,
          backupFormatVersion: 1, deviceId: cfg.installationId,
          encryptionVersion: 'AES-256-GCM', encryptionKeyReference: 'desktop-local-v1',
          syncCheckpoint: {}, recordCounts: { files: archive.recordCount, mode },
        }, stallMs, capMs);
        if (completed?.status !== 'verified') throw new Error('The cloud backup was not verified');
        uploaded.push({ mode, id: completed.id || null, checksum: archive.checksum, sizeBytes: archive.sizeBytes });
        emit('backup', { status: 'verified', checksum: archive.checksum, mode });
      }
      return { verified: true, id: uploaded[0].id, checksum: uploaded[0].checksum, sizeBytes: uploaded[0].sizeBytes, uploaded };
    } catch (error) {
      // The uploader already names the failure precisely (stalled connection,
      // per-request timeout or overall cap); every other failure is reported as-is.
      const bounded = error?.code === 'BACKUP_STALLED' || error?.code === 'BACKUP_TIMEOUT';
      const reason = bounded ? error.message + '; the local backup is kept' : String(error?.message || error);
      return { verified: false, reason, status: error?.status || null };
    }
  }

  /** Writes the decrypted archive back into the backup layout the local restore expects. */
  async function materializeRestore(folder, archive, runtime) {
    const manifest = archive?.manifest;
    if (!manifest || manifest.format !== 1 || !Array.isArray(manifest.files) || !manifest.files.length) throw new Error('The cloud backup payload is invalid');
    if (manifest.mode !== 'live') throw new Error('The cloud backup is not a live business store');
    const supported = [runtime.manifest.schemaHash, ...((runtime.manifest.upgrades || []).map(entry => entry.fromHash))];
    if (!supported.includes(manifest.schemaHash)) throw new Error('That backup uses a schema this application does not support');
    const { safeBackupPath } = require('./config.cjs');
    await fsp.mkdir(folder, { recursive: true });
    for (const file of manifest.files) {
      const bytes = Buffer.from(String(archive.files?.[file.name] || ''), 'base64');
      if (bytes.length !== Number(file.size) || createHash('sha256').update(bytes).digest('hex') !== file.hash) throw new Error('A file in the cloud backup failed its integrity check');
      const target = safeBackupPath(folder, file.name);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, bytes, { mode: 0o600 });
    }
    await fsp.writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest), 'utf8');
    return manifest;
  }

  /**
   * Pulls the newest verified cloud backup through /device-restores/authorize and
   * /download and restores it into a new local database.
   *
   * Compatibility is checked twice: the cloud refuses a backup whose schema is
   * newer than this application or whose canonical contract differs, and the
   * decrypted manifest is checked again against the packaged schema hashes before
   * the runtime touches the store. A backup from an older schema is restored and
   * then awaits the reviewed Back up and upgrade step.
   */
  async function restoreFromCloud() {
    const cfg = await credential();
    const runtime = getRuntime();
    if (!runtime?.v?.databases?.live) throw new Error('Sign in to your cloud business on this PC before restoring a cloud backup');
    if (runtime.mode && runtime.mode !== 'live') throw new Error('Switch to the live business before restoring a cloud backup');
    if (runtime.upgradePending) throw new Error('Finish the pending schema upgrade before restoring a cloud backup');
    const key = String(env[BACKUP_KEY_ENV] || runtime.v.appUpdateBackupKey || '').trim().toLowerCase();
    if (!HEX_KEY.test(key)) throw new Error('This PC has no tenant backup key; a cloud backup can only be opened with the key of the PC that created it');
    emit('restore', { status: 'authorizing' });
    const authorized = await updates.authorizeRestore({
      apiBase: cfg.apiBase, installationToken: cfg.token,
      targetSchemaVersion: cfg.localSchemaVersion, canonicalContractVersion: cfg.canonicalContractVersion,
    });
    if (typeof authorized?.ticket !== 'string' || typeof authorized?.downloadUrl !== 'string' || !authorized.backup?.id) throw new Error('The cloud service did not authorize a restore');
    const backup = authorized.backup;
    if (Number(backup.schemaVersion) > Number(cfg.localSchemaVersion)) throw new Error('That backup needs a newer local schema than this application supports');
    if (Number(backup.canonicalContractVersion) !== Number(cfg.canonicalContractVersion)) throw new Error('That backup is not contract-compatible with this application');
    const workspace = path.join(root, 'cloud-restores', new Date().toISOString().replace(/[:.]/g, '-'));
    await fsp.mkdir(workspace, { recursive: true });
    emit('restore', { status: 'downloading', backupId: backup.id });
    const downloaded = await updates.downloadRestore({
      apiBase: cfg.apiBase, downloadUrl: authorized.downloadUrl,
      destination: path.join(workspace, 'restore.bzbackup'), expectedSha256: backup.checksum,
    });
    let archive;
    try {
      archive = updates.openEncryptedBackup(downloaded.file, key);
    } catch (_) {
      throw new Error('This PC cannot open that backup; it was encrypted with a different tenant backup key');
    }
    const record = (eventType, outcome, detail = {}) => updates.recordRestoreEvent({
      apiBase: cfg.apiBase, installationToken: cfg.token,
      body: { recoveryId: authorized.recoveryId, backupId: backup.id, eventType, outcome, detail: { source: 'desktop', ...detail } },
    }).catch(() => null);
    await record('restore_started', 'pending');
    emit('restore', { status: 'restoring', backupId: backup.id });
    try {
      const manifest = await materializeRestore(path.join(workspace, 'backup'), archive, runtime);
      const status = await runtime.restore(path.join(workspace, 'backup', 'manifest.json'));
      await record('restore_completed', 'success', { schemaHash: manifest.schemaHash, version: manifest.version || null });
      emit('restore', { status: 'restored', backupId: backup.id });
      return {
        restored: true, backupId: backup.id, schemaHash: manifest.schemaHash, version: manifest.version || null,
        sizeBytes: downloaded.sizeBytes, upgradeRequired: !!status?.upgradePending, status,
      };
    } catch (error) {
      await record('restore_failed', 'failure', { message: String(error?.message || error).slice(0, 500) });
      throw error;
    }
  }

  async function approveRestart() {
    if (!state.download?.file || !state.release) throw new Error('Download the update first');
    if (!state.snapshot?.verified || state.snapshot.releaseId !== state.release.id) throw new Error('A verified local snapshot is required before approving a restart');
    const window = typeof getDialogHost === 'function' ? getDialogHost() : undefined;
    if (dialog) {
      const answer = await dialog.showMessageBox(window, {
        type: 'warning', buttons: ['Cancel', 'Restart and install'], defaultId: 0, cancelId: 0,
        message: 'Restart Business ERP and install version ' + state.release.version + '?',
        detail: 'A verified encrypted snapshot of the local database is kept on this PC' + (state.backup?.verified ? ' and was uploaded to the cloud' : '') + '. The signed installer was checked before launch. Close or save local work before continuing.',
        noLink: true,
      });
      if (answer.response !== 1) return { ...status(), restartApproved: false };
    }
    state.restartApproved = true;
    journal('AWAITING_INSTALL_APPROVAL', { release: { id: state.release.id, version: state.release.version, targetSchemaVersion: state.release.targetSchemaVersion ?? null, minimumCompatibleSchemaVersion: state.release.minimumCompatibleSchemaVersion ?? null } });
    emit('approved', { version: state.release.version });
    return status();
  }

  async function install() {
    if (!state.release || !state.download?.file) throw new Error('Download the update first');
    // The cloud refuses the wrong release at check time; this repeats the check
    // locally so a stale decision can never migrate a database backwards.
    const gate = schemaGate({ localSchemaVersion: config().localSchemaVersion, release: state.release });
    if (!gate.ok) {
      journal('INCOMPATIBLE_MIGRATION', { message: gate.error.message });
      throw gate.error;
    }
    if (!state.snapshot?.verified || state.snapshot.releaseId !== state.release.id) throw new Error('A verified local snapshot is required before install');
    if (!fs.existsSync(state.snapshot.file)) throw new Error('The local update snapshot is missing; create it again');
    if (await updates.sha256File(state.snapshot.file) !== state.snapshot.checksum) throw new Error('The local update snapshot changed after verification');
    if (!state.restartApproved) throw new Error('Restart approval is required before install');
    if (!fs.existsSync(state.download.file)) throw new Error('The downloaded installer is missing; download it again');
    const digest = await updates.sha256File(state.download.file);
    if (digest !== state.download.sha256) throw new Error('The downloaded installer changed after verification');
    const signature = await verifyInstaller(state.download.file);
    if (typeof beforeInstall === 'function' && !await beforeInstall()) throw new Error('Restart cancelled; the update was not installed');
    journal('INSTALLING', {
      fromVersion: config().currentVersion,
      release: { id: state.release.id, version: state.release.version, targetSchemaVersion: state.release.targetSchemaVersion ?? null },
      download: { file: state.download.file, sha256: digest },
      backup: { verified: true, scope: 'local', checksum: state.snapshot.checksum, file: state.snapshot.file },
      cloudBackup: state.backup?.verified ? { id: state.backup.id, checksum: state.backup.checksum } : null,
    });
    let launched;
    try {
      launched = launchInstaller(state.download.file);
    } catch (error) {
      journal('INSTALL_FAILED', { message: String(error?.message || error) });
      throw error;
    }
    emit('installing', { version: state.release.version });
    if (typeof finishInstall === 'function') await finishInstall();
    else app?.quit?.();
    return { installing: true, version: state.release.version, sha256: digest, publisher: signature?.Subject || null, pid: launched?.pid || null };
  }

  ipcMain.handle('updates:status', event => { trusted(event); return status(); });
  ipcMain.handle('updates:check', ownerAction(check));
  ipcMain.handle('updates:download', ownerAction(download));
  ipcMain.handle('updates:backup', ownerAction(createBackup));
  ipcMain.handle('updates:approve-restart', ownerAction(approveRestart));
  ipcMain.handle('updates:install', ownerAction(install));

  return { onCloudLogin, linkInstallation, status, backupSchemaUpgrade, restoreFromCloud };
}

module.exports = { registerAppUpdates };
