'use strict';
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createHash, generateKeyPairSync, randomBytes, randomUUID, verify } = require('node:crypto');
const { registerAppUpdates } = require('../src/app-updates-bridge.cjs');
const updates = require('../src/app-updates.cjs');
const { upgradeStore } = require('../src/upgrade.cjs');

const sha256 = value => createHash('sha256').update(value).digest('hex');
const writeFile = async (file, content) => { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, content); };

async function bridgeChecks() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'bizerp-schema-backup-'));
  const backupRoot = path.join(root, 'upgrade-backups', 'automatic-upgrade-test');
  for (const mode of ['live', 'training']) {
    const data = Buffer.from('PGDMP ' + mode + ' store');
    await writeFile(path.join(backupRoot, mode, 'database.dump'), data);
    await writeFile(path.join(backupRoot, mode, 'manifest.json'), JSON.stringify({
      format: 1, mode, schemaHash: 'schema-before', version: '0.4.20', createdAt: new Date().toISOString(),
      files: [{ name: 'database.dump', hash: sha256(data), size: data.length }],
    }));
  }

  const installationToken = 'installation-' + randomBytes(24).toString('hex');
  const renewedToken = 'installation-' + randomBytes(24).toString('hex');
  const seen = { metadata: [], uploads: [], native: 0, denyEntitlement: false, expireOnce: false, hangContent: false, hangInitiate: false, dribble: false };
  let server, counter = 0;

  const handle = async (req, res) => {
    const contentUrl = /^\/device-backups\/backup-\d+\/content$/.test(req.url);
    if (seen.hangContent && contentUrl) return; // stalled connection: never read the body or respond
    if (seen.hangInitiate && req.url === '/device-backups/initiate') return; // silent metadata call
    const chunks = [];
    let dribbled = 0;
    for await (const chunk of req) {
      chunks.push(chunk);
      if (seen.dribble && contentUrl) {
        dribbled += chunk.length;
        if (dribbled >= 1024 * 1024) { dribbled = 0; await new Promise(resolve => setTimeout(resolve, 50)); }
      }
    }
    const body = Buffer.concat(chunks);
    const json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    if (req.url === '/app-updates/installations/register-native' && req.method === 'POST') {
      const submitted = JSON.parse(body.toString());
      const proof = JSON.parse(submitted.proofText);
      const key = require('node:crypto').createPublicKey({ key: Buffer.from(proof.publicKey, 'base64'), format: 'der', type: 'spki' });
      if (String(submitted.grant).indexOf('GNJD1.') !== 0 || !verify('RSA-SHA256', Buffer.from(submitted.proofText), key, Buffer.from(submitted.signature, 'base64'))) {
        res.statusCode = 403; return json({ message: 'Native registration rejected' });
      }
      seen.native += 1;
      return json({ installationToken: renewedToken, capabilities: { backups: true } });
    }
    if (seen.denyEntitlement) { res.statusCode = 403; return json({ message: 'This business has no entitlement for cloud backup' }); }
    if (seen.expireOnce) { seen.expireOnce = false; res.statusCode = 401; return json({ message: 'Installation token required' }); }
    if (!/^Bearer /.test(req.headers.authorization || '')) { res.statusCode = 401; return json({ message: 'Installation token required' }); }
    if (req.url === '/device-backups/initiate') {
      const metadata = JSON.parse(body.toString()); seen.metadata.push(metadata); counter += 1;
      return json({ id: 'backup-' + counter, uploadUrl: '/api/device-backups/backup-' + counter + '/content' });
    }
    if (/^\/device-backups\/backup-\d+\/content$/.test(req.url)) {
      seen.uploads.push({ mode: seen.metadata.at(-1).recordCounts.mode, checksum: sha256(body) });
      return json({});
    }
    if (/^\/device-backups\/backup-\d+\/complete$/.test(req.url)) {
      const completed = JSON.parse(body.toString());
      const last = seen.uploads.at(-1);
      return json({ id: 'backup-' + counter, status: last && last.checksum === completed.checksum ? 'verified' : 'failed' });
    }
    res.statusCode = 404; json({ message: 'Not found' });
  };
  server = http.createServer((req, res) => { handle(req, res).catch(error => { res.statusCode = 500; res.end(JSON.stringify({ message: error.message })); }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const apiBase = 'http://127.0.0.1:' + server.address().port;
  const installationId = randomUUID();

  const makeRuntime = () => ({
    manifest: { version: '0.4.23', cloudApi: apiBase },
    v: { instanceId: randomUUID(), databases: { live: 'local' }, appUpdates: { token: installationToken, apiBase, installationId } },
    secrets: { save: async value => { runtime.v = value; } },
  });
  let runtime = makeRuntime();
  const progress = [];
  const bridge = registerAppUpdates({
    ipcMain: { handle() {} }, getRuntime: () => runtime, login: { authorizeOwner: async () => ({ role: 'owner' }) },
    trusted: () => true, action: fn => (...args) => fn(...args), root, broadcast: value => progress.push(value), env: {},
  });
  // Same cloud, but with a short bounded deadline so a hanging test stays fast.
  const hungBridge = registerAppUpdates({
    ipcMain: { handle() {} }, getRuntime: () => runtime, login: { authorizeOwner: async () => ({ role: 'owner' }) },
    trusted: () => true, action: fn => (...args) => fn(...args), root, env: { BIZERP_SCHEMA_UPGRADE_BACKUP_STALL_MS: '500' },
  });

  const result = await bridge.backupSchemaUpgrade({ backupRoot, fromVersion: '0.4.20' });
  assert.equal(result.verified, true, 'the schema upgrade backup must be cloud verified');
  assert.equal(result.uploaded.length, 1, 'only the live store is uploaded');
  assert.equal(seen.metadata.length, 1);
  assert.equal(seen.metadata[0].backupType, 'pre_update');
  assert.equal(seen.metadata[0].applicationVersion, '0.4.20');
  assert.equal(seen.metadata[0].deviceId, installationId);
  assert.equal(seen.metadata[0].encryptionVersion, 'AES-256-GCM');
  assert.equal(seen.metadata[0].encryptionKeyReference, 'desktop-local-v1');
  assert.equal(seen.metadata[0].recordCounts.mode, 'live');
  assert.deepEqual(seen.uploads.map(upload => upload.mode), ['live']);
  assert.equal(fs.existsSync(path.join(backupRoot, 'live', 'pre-upgrade.bzbackup')), true, 'the live archive is kept with the local backup');
  assert.equal(fs.existsSync(path.join(backupRoot, 'training', 'manifest.json')), true, 'the training backup is still kept locally');
  assert.equal(fs.existsSync(path.join(backupRoot, 'training', 'pre-upgrade.bzbackup')), false, 'the training copy is not archived or uploaded');
  assert.ok(progress.some(value => value.phase === 'backup' && value.status === 'verified'));
  assert.equal(fs.existsSync(path.join(backupRoot, 'live', 'pre-upgrade.bzbackup')), true, 'the encrypted archive is kept with the local backup');

  const key = runtime.v.appUpdateBackupKey;
  assert.match(String(key), /^[a-f0-9]{64}$/);
  const archive = updates.openEncryptedBackup(path.join(backupRoot, 'live', 'pre-upgrade.bzbackup'), key);
  assert.equal(archive.files['database.dump'], Buffer.from('PGDMP live store').toString('base64'));

  // No cloud backup entitlement: reported for the caller, never thrown.
  seen.denyEntitlement = true;
  const denied = await bridge.backupSchemaUpgrade({ backupRoot, fromVersion: '0.4.20' });
  assert.equal(denied.verified, false);
  assert.match(denied.reason, /no entitlement for cloud backup/);
  assert.equal(denied.status, 403);
  assert.equal(seen.uploads.length, 1, 'nothing is uploaded without the entitlement');
  seen.denyEntitlement = false;

  // Not linked and no perpetual licence: local backup remains the only copy.
  runtime = { manifest: { version: '0.4.23', cloudApi: apiBase }, v: { instanceId: randomUUID(), databases: { live: 'local' } }, secrets: { save: async value => { runtime.v = value; } } };
  const unlinked = await bridge.backupSchemaUpgrade({ backupRoot, fromVersion: '0.4.20' });
  assert.equal(unlinked.verified, false);
  assert.match(unlinked.reason, /not linked/i);

  // An expired installation token is renewed from the signed licence, then retried.
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  runtime = {
    manifest: { version: '0.4.23', cloudApi: apiBase },
    v: {
      instanceId: randomUUID(), databases: { live: 'local' }, appUpdates: { token: 'expired-token', apiBase, installationId },
      offlineLicense: {
        proof: { installationId, privateKey: keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString() },
        token: 'GNJD1.signed.offline.grant',
      },
    },
    secrets: { save: async value => { runtime.v = value; } },
  };
  seen.expireOnce = true;
  const renewed = await bridge.backupSchemaUpgrade({ backupRoot, fromVersion: '0.4.20' });
  assert.equal(renewed.verified, true, 'an expired token is renewed and the upload retried');
  assert.equal(seen.native, 1);

  // A slow link that keeps making progress is never treated as a stall: the old
  // total-elapsed deadline would have cut this upload off at 400 ms.
  seen.dribble = true;
  const bigBytes = randomBytes(128 * 1024 * 1024);
  const bigFile = path.join(root, 'large.bzbackup');
  await fsp.writeFile(bigFile, bigBytes);
  const slowStartedAt = Date.now();
  const slow = await updates.uploadBackup({
    apiBase, installationToken, stallTimeoutMs: 1000,
    archive: { file: bigFile, sizeBytes: bigBytes.length, checksum: sha256(bigBytes) },
    metadata: {
      backupType: 'pre_update', applicationVersion: '0.4.20', deviceId: installationId,
      encryptionVersion: 'AES-256-GCM', encryptionKeyReference: 'desktop-local-v1', schemaVersion: 1, canonicalContractVersion: 1,
      syncCheckpoint: {}, recordCounts: { files: 1, mode: 'live' },
    },
  });
  const slowElapsed = Date.now() - slowStartedAt;
  seen.dribble = false;
  assert.equal(slow.status, 'verified', 'a slow but progressing upload is verified');
  assert.ok(slowElapsed > 1000, 'progress outlives the stall timeout (took ' + slowElapsed + ' ms)');
  console.log('slow-link upload verified in ' + slowElapsed + ' ms');

  // A silent initiate call names its own timeout, not the content-stall reason.
  seen.hangInitiate = true;
  await assert.rejects(
    updates.uploadBackup({ apiBase, installationToken, archive: { file: bigFile, sizeBytes: bigBytes.length, checksum: sha256(bigBytes) }, metadata: { recordCounts: { mode: 'live' } }, totalTimeoutMs: 5000 }),
    error => error.code === 'BACKUP_TIMEOUT' && /did not answer the upload request within 0\.5 s/.test(error.message),
  );
  // And the overall cap keeps its own reason when it is the budget that runs out.
  await assert.rejects(
    updates.uploadBackup({ apiBase, installationToken, archive: { file: bigFile, sizeBytes: bigBytes.length, checksum: sha256(bigBytes) }, metadata: { recordCounts: { mode: 'live' } }, totalTimeoutMs: 100 }),
    error => error.code === 'BACKUP_TIMEOUT' && /timed out after 0\.1 s without finishing/.test(error.message),
  );
  seen.hangInitiate = false;

  // A stalled upload is aborted after the bounded wait and reported as a fallback.
  runtime = makeRuntime();
  seen.hangContent = true;
  const began = Date.now();
  const stalled = await hungBridge.backupSchemaUpgrade({ backupRoot, fromVersion: '0.4.20' });
  const elapsed = Date.now() - began;
  seen.hangContent = false;
  assert.equal(stalled.verified, false, 'a stalled upload is not verified');
  assert.match(stalled.reason, /stalled \(no upload progress for 0\.5 s\)/, 'the reason names the stalled connection');
  assert.ok(elapsed < 5000, 'the stalled upload aborts quickly (took ' + elapsed + ' ms)');

  return {
    apiBase, key, seen,
    close: async () => {
      server.closeAllConnections?.();
      await new Promise(resolve => server.close(resolve));
      await fsp.rm(root, { recursive: true, force: true });
    },
  };
}

async function upgradeHookChecks(apiBase, key, seen) {
  const base = await fsp.mkdtemp(path.join(os.tmpdir(), 'bizerp-upgrade-hook-'));
  const bundle = path.join(base, 'bundle');
  const migration = '-- reviewed additive migration\nCREATE TABLE IF NOT EXISTS extra_rows(id int);\n';
  await writeFile(path.join(bundle, 'migrations', '091_test.sql'), migration);
  const oldHash = 'schema-before', newHash = 'schema-after';

  const makeRuntime = () => {
    const root = path.join(base, 'store-' + randomBytes(3).toString('hex'));
    const rt = {
      root, bundle,
      manifest: { version: '0.4.23', schemaHash: newHash, upgrades: [{ fromHash: oldHash, toHash: newHash, fromVersion: '0.4.20', file: 'migrations/091_test.sql', migrationHash: sha256(migration) }] },
      v: { schemaHash: oldHash, databases: { live: 'store_live_aaaaaaaaaaaa' }, uploads: { live: path.join(root, 'uploads', 'live') }, appPassword: 'secret', adminPassword: 'secret', instanceId: 'instance' },
      secrets: { save: async value => { rt.v = value; } },
      events: [],
      hash: async file => sha256(await fsp.readFile(file)),
      bin: name => path.join(bundle, 'bin', name + '.exe'),
      run: async (exe, args) => {
        const name = path.basename(exe, '.exe');
        if (name === 'pg_dump') { rt.events.push('pg_dump'); await fsp.writeFile(args[args.indexOf('-f') + 1], 'PGDMP data'); return ''; }
        if (name === 'pg_restore') { rt.events.push('pg_restore'); return ''; }
        return '';
      },
      createDatabase: async () => {},
      client: async () => ({
        query: async sql => {
          if (/FROM pg_tables/.test(sql)) return { rows: [{ tablename: 'widgets' }] };
          if (/count\(\*\)::int AS count/.test(sql)) return { rows: [{ count: 1, hash: 'hash' }] };
          if (/to_regclass/.test(sql)) return { rows: [{ ready: true }] };
          return { rows: [] };
        },
        end: async () => {},
      }),
      walk: async () => [],
      stopHttp: async () => { rt.events.push('stopHttp'); },
      message: message => { rt.events.push(message); },
      upgradePending: true, upgradeEntry: {},
    };
    return rt;
  };

  // The cloud copy is taken from the verified local backup before any migration runs.
  const first = makeRuntime();
  let hookInfo = null;
  const result = await upgradeStore(first, {
    beforeMigrate: async info => {
      hookInfo = info;
      first.events.push('hook');
      assert.equal(fs.existsSync(path.join(info.backupRoot, 'live', 'database.dump')), true);
      assert.equal(fs.existsSync(path.join(info.backupRoot, 'live', 'manifest.json')), true);
      return { verified: true, id: 'backup-1' };
    },
  });
  assert.equal(result.upgraded, true);
  assert.equal(result.cloudBackup.verified, true);
  assert.equal(hookInfo.fromVersion, '0.4.20');
  const order = first.events.filter(value => ['pg_dump', 'hook', 'pg_restore'].includes(value));
  assert.deepEqual(order, ['pg_dump', 'hook', 'pg_restore'], 'the cloud copy is uploaded after the verified local backup and before the migration');
  assert.equal(first.v.schemaHash, newHash, 'the migration still completes');
  assert.equal(first.upgradePending, false);

  // A refused or failed cloud upload never blocks the upgrade.
  const second = makeRuntime();
  const fellBack = await upgradeStore(second, { beforeMigrate: async () => { throw new Error('no entitlement for cloud backup'); } });
  assert.equal(fellBack.upgraded, true);
  assert.equal(fellBack.cloudBackup.verified, false);
  assert.match(fellBack.cloudBackup.reason, /no entitlement/);
  assert.equal(second.v.schemaHash, newHash);
  assert.ok(second.events.some(value => /Cloud backup not uploaded/.test(value)));
  assert.equal(fs.existsSync(path.join(fellBack.backupRoot, 'live', 'manifest.json')), true, 'the local backup is kept');

  // A stalled upload is bounded even with the local services stopped: the
  // upgrade still migrates, using the verified local backup it already wrote.
  const third = makeRuntime();
  third.manifest.cloudApi = apiBase;
  third.v.appUpdates = { token: 'installation-hook', apiBase, installationId: 'installation-hook' };
  third.v.appUpdateBackupKey = key;
  const rtBridge = registerAppUpdates({
    ipcMain: { handle() {} }, getRuntime: () => third, login: { authorizeOwner: async () => ({ role: 'owner' }) },
    trusted: () => true, action: fn => (...args) => fn(...args), root: third.root,
    env: { BIZERP_SCHEMA_UPGRADE_BACKUP_STALL_MS: '500' },
  });
  seen.hangContent = true;
  const startedAt = Date.now();
  const stalledUpgrade = await upgradeStore(third, {
    beforeMigrate: info => { third.events.push('hook'); return rtBridge.backupSchemaUpgrade(info); },
  });
  const waited = Date.now() - startedAt;
  seen.hangContent = false;
  assert.equal(stalledUpgrade.upgraded, true, 'a stalled cloud upload never blocks the migration');
  assert.equal(stalledUpgrade.cloudBackup.verified, false);
  assert.match(stalledUpgrade.cloudBackup.reason, /stalled/);
  assert.ok(waited < 5000, 'the upgrade falls back after a bounded wait (took ' + waited + ' ms)');
  assert.deepEqual(third.events.filter(value => ['pg_dump', 'hook', 'pg_restore'].includes(value)), ['pg_dump', 'hook', 'pg_restore']);
  assert.equal(third.v.schemaHash, newHash, 'the migration completes after the fallback');
  assert.equal(fs.existsSync(path.join(stalledUpgrade.backupRoot, 'live', 'manifest.json')), true, 'the local backup is kept');

  await fsp.rm(base, { recursive: true, force: true });
}

(async () => {
  const shared = await bridgeChecks();
  await upgradeHookChecks(shared.apiBase, shared.key, shared.seen);
  await shared.close();
  console.log('schema upgrade cloud backup: entitlement, encrypted upload, token renewal, hook ordering, local fallback and stalled-upload timeout passed');
})().catch(error => { console.error(error); process.exit(1); });
