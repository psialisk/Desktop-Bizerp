'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const Module = require('node:module');
const { createHash, createPublicKey, generateKeyPairSync, randomBytes, randomUUID, verify } = require('node:crypto');
const { registerAppUpdates } = require('../src/app-updates-bridge.cjs');

(async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'bizerp-update-bridge-'));
  const installer = Buffer.concat([Buffer.from('MZ'), randomBytes(8192)]);
  const checksum = createHash('sha256').update(installer).digest('hex');
  const ownerJwt = 'owner-jwt-for-test';
  const installationToken = 'installation-' + randomBytes(24).toString('hex');
  const seen = { uploads: [], metadata: [], checks: [], tickets: [], native: [] };
  let backupMode = 'verified';
  let releaseRound = 1;
  let server;

  const serverRequest = async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    if (req.url === '/app-updates/installations/register' && req.method === 'POST') {
      if (req.headers.authorization !== 'Bearer ' + ownerJwt) { res.statusCode = 401; return json({ message: 'Owner authorization required' }); }
      seen.metadata.push(JSON.parse(body.toString()));
      return json({ installationToken, capabilities: { updates: true, backups: true } });
    }
    if (req.url === '/app-updates/installations/register-native' && req.method === 'POST') {
      const submitted = JSON.parse(body.toString());
      const proof = JSON.parse(submitted.proofText);
      const key = createPublicKey({ key: Buffer.from(proof.publicKey, 'base64'), format: 'der', type: 'spki' });
      const valid = proof.action === 'app-update-register'
        && proof.installationId === submitted.installationId
        && proof.tenantId === undefined
        && verify('RSA-SHA256', Buffer.from(submitted.proofText), key, Buffer.from(submitted.signature, 'base64'));
      if (!valid || String(submitted.grant).indexOf('GNJD1.') !== 0) { res.statusCode = 403; return json({ message: 'Native registration rejected' }); }
      seen.native.push(submitted);
      return json({ installationToken, capabilities: { updates: true, backups: true } });
    }
    // Download tickets are short-lived signed URLs and deliberately carry no installation token.
    if (req.url === '/api/app-updates/download/ticket-1') {
      res.setHeader('Content-Type', 'application/octet-stream'); return res.end(installer);
    }
    if (seen.rejectToken) { seen.rejectToken = false; res.statusCode = 401; return json({ message: 'Installation token required' }); }
    if (!req.headers.authorization || req.headers.authorization !== 'Bearer ' + installationToken) { res.statusCode = 401; return json({ message: 'Installation token required' }); }
    if (req.url.startsWith('/app-updates/check')) {
      seen.checks.push(req.url);
      const version = releaseRound === 1 ? '0.4.24' : '0.4.25';
      return json({
        updateAvailable: true, checkedAt: new Date().toISOString(),
        release: { id: 'release-' + releaseRound, version, mandatory: false, releaseNotes: 'Security fixes', artifact: { filename: 'BusinessERP-Desktop-' + version + '-Setup.exe', sizeBytes: installer.length, sha256: checksum } },
        policy: { minimumSchemaVersion: 1 },
      });
    }
    if (req.url === '/app-updates/download-tickets') {
      seen.tickets.push(JSON.parse(body.toString()));
      return json({ url: '/api/app-updates/download/ticket-1', expiresAt: new Date(Date.now() + 60000).toISOString() });
    }
    if (req.url === '/device-backups/initiate') {
      const metadata = JSON.parse(body.toString()); seen.metadata.push(metadata);
      return json({ id: 'backup-1' });
    }
    if (req.url === '/device-backups/backup-1/content') {
      seen.uploads.push({ size: body.length, checksum: createHash('sha256').update(body).digest('hex') });
      res.setHeader('Content-Type', 'application/json'); return res.end('{}');
    }
    if (req.url === '/device-backups/backup-1/complete') {
      const completed = JSON.parse(body.toString());
      if (backupMode === 'verified' && seen.uploads.at(-1)?.checksum === completed.checksum) return json({ id: 'backup-1', status: 'verified' });
      return json({ id: 'backup-1', status: 'failed' });
    }
    res.statusCode = 404; json({ message: 'Not found' });
  };
  server = http.createServer((req, res) => { serverRequest(req, res).catch(error => { res.statusCode = 500; res.end(JSON.stringify({ message: error.message })); }); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const apiBase = 'http://127.0.0.1:' + server.address().port;

  const runtime = {
    manifest: { version: '0.4.23', cloudApi: apiBase },
    v: { instanceId: randomUUID(), databases: { live: 'local-db' } },
    secrets: { save: async value => { runtime.v = value; } },
    backup: async destination => {
      await fsp.mkdir(destination, { recursive: true });
      const data = Buffer.from('PGDMP bridge test');
      await fsp.writeFile(path.join(destination, 'database.dump'), data);
      await fsp.writeFile(path.join(destination, 'manifest.json'), JSON.stringify({ format: 1, mode: 'live', files: [{ name: 'database.dump', hash: createHash('sha256').update(data).digest('hex'), size: data.length }] }));
      return destination;
    },
  };

  const handlers = new Map(), progress = [];
  let launched = null, finished = 0, before = 0, dialogAnswer = 1;
  const bridge = registerAppUpdates({
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    getRuntime: () => runtime,
    login: { authorizeOwner: async () => ({ role: 'owner' }) },
    trusted: () => true,
    action: fn => (...args) => fn(...args),
    dialog: { showMessageBox: async () => ({ response: dialogAnswer }) },
    getDialogHost: () => null,
    app: { quit() {} },
    root,
    broadcast: value => progress.push(value),
    beforeInstall: async () => { before += 1; return true; },
    finishInstall: async () => { finished += 1; },
    verifyInstaller: async () => ({ Status: 'Valid', Subject: 'CN=Bizerp Test' }),
    launchInstaller: file => { launched = file; return { pid: 4321 }; },
    env: {},
  });
  const call = channel => handlers.get(channel)({ sender: { id: 1 } });

  assert.equal((await call('updates:status')).linked, false);
  await assert.rejects(call('updates:check'), /not linked/i);

  const linked = await bridge.linkInstallation({ apiBase, ownerToken: ownerJwt, actor: { role: 'owner', tenantId: 'tenant-1' } });
  assert.equal(linked.linked, true);
  assert.equal(runtime.v.appUpdates.token, installationToken);
  assert.equal(JSON.stringify(await call('updates:status')).includes(installationToken), false);
  assert.equal(seen.metadata[0].installationId, runtime.v.instanceId);
  assert.equal(seen.metadata[0].platform, 'windows');
  assert.equal(seen.metadata[0].currentVersion, '0.4.23');

  const checked = await call('updates:check');
  assert.equal(checked.updateAvailable, true);
  assert.equal(checked.release.version, '0.4.24');
  assert.match(seen.checks[0], /currentVersion=0\.4\.23/);

  // Install cannot start before a download, and a downloaded release cannot
  // install before its pre-update backup is cloud-verified.
  await assert.rejects(call('updates:install'), /Download the update first/);
  const downloaded = await call('updates:download');
  assert.equal(downloaded.download.ready, true);
  assert.deepEqual(await fsp.readFile(path.join(root, 'app-updates', 'BusinessERP-Desktop-0.4.24-Setup.exe')), installer);
  assert.ok(progress.some(value => value.phase === 'download' && value.percent === 0));
  assert.ok(progress.some(value => value.phase === 'download' && value.percent === 100));
  await assert.rejects(call('updates:install'), /verified local snapshot/);
  assert.equal(launched, null);

  const backedUp = await call('updates:backup');
  assert.equal(backedUp.backup.status, 'verified');
  assert.equal(seen.metadata.at(-1).backupType, 'pre_update');
  assert.equal(seen.metadata.at(-1).deviceId, runtime.v.instanceId);
  assert.equal(seen.metadata.at(-1).encryptionKeyReference, 'desktop-local-v1');
  assert.equal(seen.uploads.length, 1);
  await assert.rejects(call('updates:install'), /Restart approval/);

  dialogAnswer = 0;
  const declined = await call('updates:approve-restart');
  assert.equal(declined.restartApproved, false);
  await assert.rejects(call('updates:install'), /Restart approval/);

  dialogAnswer = 1;
  const approved = await call('updates:approve-restart');
  assert.equal(approved.restartApproved, true);
  assert.equal(approved.installReady, true);
  const installed = await call('updates:install');
  assert.equal(installed.installing, true);
  assert.equal(installed.publisher, 'CN=Bizerp Test');
  assert.equal(before, 1);
  assert.equal(finished, 1);
  assert.equal(launched, path.join(root, 'app-updates', 'BusinessERP-Desktop-0.4.24-Setup.exe'));

  // A cloud upload that fails never blocks the update: the verified local
  // snapshot is the install gate.
  backupMode = 'failed';
  releaseRound = 2;
  const checkedAgain = await call('updates:check');
  assert.equal(checkedAgain.download, null);
  await call('updates:download');
  const fellBack = await call('updates:backup');
  assert.equal(fellBack.snapshot.verified, true, 'the local snapshot unlocks install without a cloud copy');
  assert.equal(fellBack.backup.status, 'not_uploaded');
  assert.match(fellBack.backup.reason, /verified local snapshot is used/);
  dialogAnswer = 1;
  const offlineApproved = await call('updates:approve-restart');
  assert.equal(offlineApproved.installReady, true);
  const offlineInstalled = await call('updates:install');
  assert.equal(offlineInstalled.installing, true);

  // Without a cloud sign-in a perpetual Desktop licence registers itself from its
  // signed grant and a fresh device-key proof; no staff JWT is involved.
  const licenseKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const licenseIdentity = {
    platform: 'desktop', installationId: randomUUID(), localBusinessId: randomUUID(),
    privateKey: licenseKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKey: licenseKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
  runtime.v = { ...runtime.v, appUpdates: {}, offlineLicense: { proof: licenseIdentity, token: 'GNJD1.signed.offline.grant' } };
  delete runtime.localLicense;
  assert.equal((await call('updates:status')).linked, false);
  const offlineChecked = await call('updates:check');
  assert.equal(offlineChecked.updateAvailable, true);
  assert.equal(seen.native.length, 1);
  assert.equal(seen.native[0].platform, 'windows');
  assert.equal(seen.native[0].installationId, licenseIdentity.installationId);
  assert.equal(seen.native[0].grant, 'GNJD1.signed.offline.grant');
  assert.equal(runtime.v.appUpdates.installationId, licenseIdentity.installationId);
  await call('updates:check');
  assert.equal(seen.native.length, 1, 'the stored installation token is reused');
  seen.rejectToken = true;
  const renewed = await call('updates:check');
  assert.equal(renewed.updateAvailable, true);
  assert.equal(seen.native.length, 2, 'a refused installation token is renewed from the licence');
  seen.rejectToken = false;

  // Without a perpetual licence the original refusal is reported, not a licence error.
  runtime.v = { ...runtime.v, offlineLicense: undefined };
  seen.rejectToken = true;
  await assert.rejects(call('updates:check'), /Installation token required/);

  // Preload exposes only named update channels, never raw IPC.
  const exposed = {};
  const originalLoad = Module._load;
  const renderer = { invoke: async channel => channel, on() {}, removeListener() {} };
  Module._load = function (request, parent, isMain) {
    if (request === 'electron') return { contextBridge: { exposeInMainWorld: (name, api) => { exposed[name] = api; } }, ipcRenderer: renderer };
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[require.resolve('../src/preload.cjs')];
    require('../src/preload.cjs');
  } finally { Module._load = originalLoad; }
  const api = exposed.storeDesktop;
  assert.equal(await api.updatesStatus(), 'updates:status');
  assert.equal(await api.updatesCheck(), 'updates:check');
  assert.equal(await api.updatesDownload(), 'updates:download');
  assert.equal(await api.updatesBackup(), 'updates:backup');
  assert.equal(await api.updatesApproveRestart(), 'updates:approve-restart');
  assert.equal(await api.updatesInstall(), 'updates:install');
  assert.equal(Object.isFrozen(api), true);
  assert.equal(typeof api.onUpdatesProgress, 'function');
  assert.equal(Object.keys(api).some(key => key === 'ipcRenderer' || key === 'send'), false);

  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
  await fsp.rm(root, { recursive: true, force: true });
  console.log('app-updates-bridge: registration, token-scoped check, progress download, verified-backup gate, restart approval and signed install passed');
})().catch(error => { console.error(error); process.exit(1); });
