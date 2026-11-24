'use strict';
const assert = require('node:assert/strict');
const fsp = require('node:fs/promises');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createHash, randomBytes, randomUUID } = require('node:crypto');
const { registerAppUpdates } = require('../src/app-updates-bridge.cjs');
const updates = require('../src/app-updates.cjs');

const sha256 = value => createHash('sha256').update(value).digest('hex');
const write = async (file, content) => { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, content); };

(async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'bizerp-cloud-restore-'));
  const key = randomBytes(32).toString('hex');
  const states = { mode: 'ok', contract: 1, payload: null, authorizeBodies: [], events: [], downloads: 0 };
  let server;

  async function buildPayload(schemaHash) {
    const folder = path.join(root, 'fixtures', randomBytes(4).toString('hex'));
    const dump = Buffer.from('PGDMP restored store');
    await write(path.join(folder, 'database.dump'), dump);
    await write(path.join(folder, 'manifest.json'), JSON.stringify({
      format: 1, mode: 'live', schemaHash, version: '0.4.20', createdAt: new Date().toISOString(),
      files: [{ name: 'database.dump', hash: sha256(dump), size: dump.length }],
    }));
    const archive = await updates.createEncryptedBackup({ backupDirectory: folder, outputFile: path.join(folder, 'restore.bzbackup'), keyHex: key });
    return { binary: await fsp.readFile(path.join(folder, 'restore.bzbackup')), checksum: archive.checksum, dump };
  }

  const handle = async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    if (req.url === '/device-restores/authorize' && req.method === 'POST') {
      if (!/^Bearer installation-/.test(req.headers.authorization || '')) { res.statusCode = 401; return json({ message: 'Installation token required' }); }
      states.authorizeBodies.push(JSON.parse(body.toString()));
      if (states.mode === 'entitlement') { res.statusCode = 403; return json({ message: 'This business has no entitlement for restore' }); }
      if (states.mode === 'schema') { res.statusCode = 409; return json({ message: 'That backup needs a newer local schema than this application supports' }); }
      return json({
        recoveryId: 'recovery-1', ticket: 'restore-ticket', expiresAt: new Date(Date.now() + 60000).toISOString(),
        downloadUrl: '/api/device-restores/recovery-1/download?ticket=restore-ticket',
        backup: { id: 'backup-9', schemaVersion: 1, canonicalContractVersion: states.contract, status: 'verified', checksum: states.payload.checksum, sizeBytes: states.payload.binary.length },
      });
    }
    if (req.url === '/api/device-restores/recovery-1/download?ticket=restore-ticket' && req.method === 'GET') {
      if (req.headers.authorization) { res.statusCode = 400; return json({ message: 'The ticket is the authorization' }); }
      states.downloads += 1;
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.end(states.payload.binary);
    }
    if (req.url === '/device-restores/events' && req.method === 'POST') {
      states.events.push(JSON.parse(body.toString()));
      return json({ id: 'event-' + states.events.length });
    }
    res.statusCode = 404; json({ message: 'Not found' });
  };
  server = http.createServer((req, res) => { handle(req, res).catch(error => { res.statusCode = 500; res.end(JSON.stringify({ message: error.message })); }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const apiBase = 'http://127.0.0.1:' + server.address().port;

  let restoreCalls = [];
  let restoreError = null;
  const runtime = {
    manifest: { version: '0.4.23', cloudApi: apiBase, schemaHash: 'schema-current', upgrades: [{ fromHash: 'schema-before' }] },
    v: { instanceId: randomUUID(), databases: { live: 'local-db' }, appUpdates: { token: 'installation-' + randomBytes(12).toString('hex'), apiBase }, appUpdateBackupKey: key },
    secrets: { save: async value => { runtime.v = value; } },
    restore: async manifestPath => {
      restoreCalls.push(manifestPath);
      if (restoreError) throw restoreError;
      return { upgradePending: true };
    },
  };
  const bridge = registerAppUpdates({
    ipcMain: { handle() {} }, getRuntime: () => runtime, login: { authorizeOwner: async () => ({ role: 'owner' }) },
    trusted: () => true, action: fn => (...args) => fn(...args), root, env: {},
  });

  async function run(payloadSchemaHash = 'schema-before', setup = () => {}) {
    states.mode = 'ok'; states.contract = 1; states.authorizeBodies = []; states.events = []; states.downloads = 0;
    states.payload = await buildPayload(payloadSchemaHash);
    restoreCalls = []; restoreError = null;
    setup();
    return bridge.restoreFromCloud();
  }

  // The newest verified backup is pulled, integrity-checked, decrypted and restored
  // into a fresh database; an older schema is reported as needing the upgrade step.
  const restored = await run();
  assert.equal(restored.restored, true);
  assert.equal(restored.backupId, 'backup-9');
  assert.equal(restored.upgradeRequired, true);
  assert.deepEqual(states.authorizeBodies[0], { targetSchemaVersion: 1, canonicalContractVersion: 1 });
  assert.equal(states.downloads, 1);
  assert.equal(restoreCalls.length, 1);
  assert.deepEqual(states.events.map(event => event.eventType + ':' + event.outcome), ['restore_started:pending', 'restore_completed:success']);
  assert.equal(states.events[0].recoveryId, 'recovery-1');
  const folder = path.dirname(restoreCalls[0]);
  assert.deepEqual(await fsp.readFile(path.join(folder, 'database.dump')), states.payload.dump);
  const manifest = JSON.parse(await fsp.readFile(restoreCalls[0], 'utf8'));
  assert.equal(manifest.schemaHash, 'schema-before');

  // A newer schema or a different canonical contract is refused before download.
  restoreCalls = [];
  states.mode = 'schema';
  await assert.rejects(bridge.restoreFromCloud(), /newer local schema/);
  assert.equal(restoreCalls.length, 0);

  await assert.rejects(run('schema-before', () => { states.contract = 2; }), /not contract-compatible/);
  assert.equal(states.downloads, 0);
  assert.equal(restoreCalls.length, 0);

  // No restore entitlement from the cloud is surfaced as-is.
  states.mode = 'entitlement';
  await assert.rejects(bridge.restoreFromCloud(), /no entitlement for restore/);

  // A backup recorded under a schema this build does not support is rejected locally.
  await assert.rejects(run('schema-future'), /schema this application does not support/);
  assert.equal(restoreCalls.length, 0);
  assert.deepEqual(states.events.map(event => event.eventType), ['restore_started', 'restore_failed']);

  // A backup encrypted with another PC's key cannot be opened.
  await assert.rejects(run('schema-before', () => { runtime.v.appUpdateBackupKey = randomBytes(32).toString('hex'); }), /different tenant backup key/);
  assert.equal(restoreCalls.length, 0);
  assert.equal(states.events.length, 0);
  runtime.v.appUpdateBackupKey = key;

  // A tampered download is rejected by its checksum.
  await assert.rejects(run('schema-before', () => { states.payload.checksum = sha256('tampered'); }), /checksum check/);
  assert.equal(restoreCalls.length, 0);

  // A failed local restore is recorded and rethrown.
  const failure = run('schema-before', () => { restoreError = new Error('Backup belongs to another local business'); });
  await assert.rejects(failure, /another local business/);
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.deepEqual(states.events.map(event => event.eventType + ':' + event.outcome), ['restore_started:pending', 'restore_failed:failure']);
  assert.match(states.events.at(-1).detail.message, /another local business/);

  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
  await fsp.rm(root, { recursive: true, force: true });
  console.log('cloud restore: authorize/download ticket, checksum, key, schema + contract gates, fresh-database restore and recovery events passed');
})().catch(error => { console.error(error); process.exit(1); });
