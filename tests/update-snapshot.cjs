'use strict';
// A verified local snapshot is the install gate; the cloud copy is optional.
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { registerAppUpdates } = require('../src/app-updates-bridge.cjs');

const KEY = 'f'.repeat(64);
const TOKEN = 'installation-token-' + 'a'.repeat(30);
const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function makeUpdates(state) {
  return {
    async checkForUpdate() {
      return {
        checkedAt: new Date().toISOString(), updateAvailable: true, policy: {},
        release: {
          id: state.releaseId, version: state.version, mandatory: false,
          targetSchemaVersion: 3, minimumCompatibleSchemaVersion: 1,
          artifact: { filename: 'BusinessERP-Desktop-' + state.version + '-Setup.exe', sizeBytes: 16, sha256: 'a'.repeat(64) },
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
    async uploadBackup() {
      if (state.cloudError) throw state.cloudError;
      return { id: 'backup-1', status: 'verified' };
    },
    async verifyAuthenticode() { return { Status: 'Valid', Subject: 'CN=GNJ Test' }; },
    launchInstaller() { state.launched += 1; return { pid: 4242 }; },
  };
}

function makeRuntime(root, state) {
  const runtime = {
    root, manifest: { version: '0.4.23', schemaVersion: 3 },
    v: {
      instanceId: 'instance-1', databases: { live: 'store_live' },
      appUpdates: { token: TOKEN, apiBase: 'https://updates.invalid', installationId: 'installation-1' },
      appUpdateBackupKey: KEY,
    },
    secrets: { save: async value => { runtime.v = value; } },
    backup: async workspace => {
      await fsp.mkdir(workspace, { recursive: true });
      await fsp.writeFile(path.join(workspace, 'database.dump'), 'PGDMP');
      await fsp.writeFile(path.join(workspace, 'manifest.json'), '{}');
      return workspace;
    },
  };
  state.runtime = runtime;
  return runtime;
}

function makeBridge(root, state) {
  const handlers = {};
  registerAppUpdates({
    ipcMain: { handle: (channel, fn) => { handlers[channel] = fn; } },
    getRuntime: () => state.runtime, login: { authorizeOwner: async () => ({ role: 'owner' }) },
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

function newState(overrides = {}) {
  return { releaseId: 'release-1', version: '0.5.0', launched: 0, cloudError: null, ...overrides };
}

(async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'bizerp-update-snapshot-'));
  try {
    // 1. No cloud entitlement: the local snapshot still unlocks the install.
    const denied = newState({ cloudError: Object.assign(new Error('This business has no entitlement for cloud backup'), { status: 403 }) });
    const deniedRoot = path.join(root, 'denied');
    makeRuntime(deniedRoot, denied);
    const deniedBridge = makeBridge(deniedRoot, denied);
    await deniedBridge.check();
    await deniedBridge.download();
    const localOnly = await deniedBridge.createBackup();
    assert.equal(localOnly.snapshot.verified, true, 'the local snapshot is verified without the cloud');
    assert.ok(fs.existsSync(path.join(deniedRoot, localOnly.snapshot.file)), 'the snapshot archive exists on disk');
    assert.equal(localOnly.backup.status, 'not_uploaded');
    assert.match(localOnly.backup.reason, /verified local snapshot is used/);
    await deniedBridge.approveRestart();
    assert.equal(deniedBridge.status().installReady, true);
    assert.equal((await deniedBridge.install()).installing, true);
    assert.equal(denied.launched, 1, 'install proceeds without a cloud backup');
    const deniedJournal = JSON.parse(await fsp.readFile(path.join(deniedRoot, 'update-state.json'), 'utf8'));
    assert.equal(deniedJournal.phase, 'INSTALLING');
    assert.equal(deniedJournal.backup.scope, 'local');
    assert.ok(deniedJournal.journal.some(entry => entry.phase === 'BACKUP_VERIFIED' && entry.backup?.scope === 'local'));

    // 2. Offline and unlinked: no installation token at all, install still works.
    const offline = newState();
    const offlineRoot = path.join(root, 'offline');
    const runtime = makeRuntime(offlineRoot, offline);
    const offlineBridge = makeBridge(offlineRoot, offline);
    await offlineBridge.check();
    await offlineBridge.download();
    delete runtime.v.appUpdates;
    const snapshotOnly = await offlineBridge.createBackup();
    assert.equal(snapshotOnly.snapshot.verified, true);
    assert.equal(snapshotOnly.backup.status, 'not_uploaded');
    assert.match(snapshotOnly.backup.reason, /offline or not linked/);
    await offlineBridge.approveRestart();
    assert.equal((await offlineBridge.install()).installing, true, 'offline install does not require a token');
    assert.equal(offline.launched, 1);

    // 3. No verified snapshot: install is refused before anything launches.
    const missing = newState();
    const missingRoot = path.join(root, 'missing');
    makeRuntime(missingRoot, missing);
    const missingBridge = makeBridge(missingRoot, missing);
    await missingBridge.check();
    await missingBridge.download();
    await assert.rejects(missingBridge.install(), /verified local snapshot is required/);
    assert.equal(missing.launched, 0, 'the installer is never launched without a verified snapshot');
    assert.equal((await missingBridge.approveRestart().catch(error => error)) instanceof Error, true, 'approval also requires the snapshot');

    // 4. A snapshot changed after verification blocks install.
    const tampered = newState();
    const tamperedRoot = path.join(root, 'tampered');
    makeRuntime(tamperedRoot, tampered);
    const tamperedBridge = makeBridge(tamperedRoot, tampered);
    await tamperedBridge.check();
    await tamperedBridge.download();
    const backed = await tamperedBridge.createBackup();
    await tamperedBridge.approveRestart();
    const snapshotPath = path.join(tamperedRoot, backed.snapshot.file);
    await fsp.appendFile(snapshotPath, 'tampered');
    await assert.rejects(tamperedBridge.install(), /changed after verification/);
    assert.equal(tampered.launched, 0);

    // 5. Old pre-install snapshots are pruned after a new one and at startup.
    const retention = newState();
    const retentionRoot = path.join(root, 'retention');
    makeRuntime(retentionRoot, retention);
    const retentionBridge = makeBridge(retentionRoot, retention);
    await retentionBridge.check();
    await retentionBridge.download();
    for (let index = 0; index < 5; index += 1) {
      if (index) await new Promise(resolve => setTimeout(resolve, 20));
      await retentionBridge.createBackup();
    }
    const snapshotRoot = path.join(retentionRoot, 'app-update-backups');
    const kept = (await fsp.readdir(snapshotRoot, { withFileTypes: true })).filter(entry => entry.isDirectory());
    assert.equal(kept.length, 3, 'only the newest three snapshots are kept');
    const newest = retentionBridge.status().snapshot;
    assert.ok(fs.existsSync(path.join(retentionRoot, newest.file)), 'the newest verified snapshot survives pruning');
    for (const entry of kept) {
      assert.ok(fs.existsSync(path.join(snapshotRoot, entry.name, 'pre-update-local.bzbackup')), 'each kept snapshot still has its archive');
    }

    // Startup cleanup removes snapshots left by earlier failed or repeated attempts.
    const startupRoot = path.join(root, 'startup');
    const startupSnapshots = path.join(startupRoot, 'app-update-backups');
    for (let index = 0; index < 5; index += 1) {
      const directory = path.join(startupSnapshots, 'snapshot-' + index);
      await fsp.mkdir(directory, { recursive: true });
      await fsp.writeFile(path.join(directory, 'pre-update-local.bzbackup'), 'archive-' + index);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    const startup = newState();
    makeRuntime(startupRoot, startup);
    makeBridge(startupRoot, startup);
    let remaining = [];
    for (let attempt = 0; attempt < 50; attempt += 1) {
      remaining = (await fsp.readdir(startupSnapshots, { withFileTypes: true })).filter(entry => entry.isDirectory());
      if (remaining.length <= 3) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.equal(remaining.length, 3, 'startup pruning keeps the newest three snapshots');
    assert.equal(fs.existsSync(path.join(startupSnapshots, 'snapshot-0')), false, 'the oldest startup snapshot was removed');
    assert.equal(fs.existsSync(path.join(startupSnapshots, 'snapshot-1')), false, 'the second-oldest startup snapshot was removed');

    // 6. Real archive authentication streams the ciphertext: wrong key or tampering fails.
    const realUpdates = require('../src/app-updates.cjs');
    const cryptoRoot = path.join(root, 'crypto');
    const backupDirectory = path.join(cryptoRoot, 'live');
    await fsp.mkdir(backupDirectory, { recursive: true });
    const dump = crypto.randomBytes(2 * 1024 * 1024);
    await fsp.writeFile(path.join(backupDirectory, 'database.dump'), dump);
    await fsp.writeFile(path.join(backupDirectory, 'manifest.json'), JSON.stringify({ format: 1, mode: 'live', files: [{ name: 'database.dump', hash: crypto.createHash('sha256').update(dump).digest('hex'), size: dump.length }] }));
    const archiveFile = path.join(cryptoRoot, 'snapshot.bzbackup');
    const realArchive = await realUpdates.createEncryptedBackup({ backupDirectory, outputFile: archiveFile, keyHex: KEY });
    assert.equal(realArchive.manifest.mode, 'live');
    assert.equal(await realUpdates.verifyEncryptedBackup(archiveFile, KEY), true, 'the untouched archive authenticates');
    await assert.rejects(realUpdates.verifyEncryptedBackup(archiveFile, 'a'.repeat(64)), /authenticate|decrypt|state/i, 'a wrong key cannot verify');
    await fsp.appendFile(archiveFile, Buffer.from('tampered'));
    await assert.rejects(realUpdates.verifyEncryptedBackup(archiveFile, KEY), /authenticate|state/i, 'a tampered archive cannot verify');

    // 7. The verified snapshot is restored from update-state.json after a restart.
    const persisted = newState();
    const persistedRoot = path.join(root, 'persisted');
    makeRuntime(persistedRoot, persisted);
    const firstBridge = makeBridge(persistedRoot, persisted);
    await firstBridge.check();
    await firstBridge.download();
    const prepared = await firstBridge.createBackup();
    assert.equal(prepared.snapshot.verified, true);
    const journal = JSON.parse(await fsp.readFile(path.join(persistedRoot, 'update-state.json'), 'utf8'));
    assert.equal(journal.snapshot.verified, true, 'the journal records the verified snapshot');
    assert.equal(journal.snapshot.releaseId, persisted.releaseId);
    assert.equal(journal.snapshot.checksum, prepared.snapshot.checksum);
    assert.equal(fs.existsSync(path.join(persistedRoot, journal.snapshot.file)), true, 'the journal stores a path inside the runtime root');

    const restarted = makeBridge(persistedRoot, persisted);
    const restored = restarted.status();
    assert.equal(restored.snapshot.verified, true, 'the snapshot is restored from the journal');
    assert.equal(restored.snapshot.releaseId, persisted.releaseId);
    assert.equal(restored.updateAvailable, true, 'the release is restored from the journal');
    assert.equal(restored.download.ready, true, 'the downloaded installer is restored from the journal');
    assert.equal(restored.installReady, false, 'restart approval is still required after a restart');
    await restarted.approveRestart();
    assert.equal(restarted.status().installReady, true);
    assert.equal((await restarted.install()).installing, true);
    assert.equal(persisted.launched, 1, 'the prepared update installs after the bridge is re-created');

    console.log('update snapshot: offline and unentitled installs use a verified local snapshot; missing or tampered snapshots block install; old snapshots are pruned after a new one and at startup; archive authentication streams and rejects a wrong key or tampering; the verified snapshot is restored after a restart');
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exit(1); });
