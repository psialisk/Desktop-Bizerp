'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createHash, randomBytes } = require('node:crypto');
const updates = require('../src/app-updates.cjs');

(async () => {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'bizerp-desktop-updates-'));
  let server;
  try {
    // Version ordering never offers a downgrade.
    assert.equal(updates.compareVersions('0.4.24', '0.4.23'), 1);
    assert.equal(updates.compareVersions('1.0.0-beta.1', '1.0.0'), -1);

    // Local HTTP fixture emulates the backend ticket, download and backup endpoints.
    const installer = Buffer.concat([Buffer.from('MZ'), randomBytes(4096)]);
    const checksum = createHash('sha256').update(installer).digest('hex');
    const uploads = [], completed = [];
    server = http.createServer(async (req, res) => {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (req.url.startsWith('/app-updates/check')) {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ updateAvailable: true, release: { id: 'r1', version: '0.4.24', artifact: { filename: 'setup.exe', sizeBytes: installer.length, sha256: checksum } } }));
      }
      if (req.url === '/app-updates/download-tickets') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ url: '/api/app-updates/download/ticket-1' })); }
      if (req.url === '/api/app-updates/download/ticket-1') { res.setHeader('Content-Type', 'application/octet-stream'); return res.end(installer); }
      if (req.url === '/device-backups/initiate') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ id: 'b1' })); }
      if (req.url === '/device-backups/b1/content') { uploads.push(body.length); res.statusCode = 200; return res.end('{}'); }
      if (req.url === '/device-backups/b1/complete') { completed.push(JSON.parse(body.toString())); res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ id: 'b1', status: 'verified' })); }
      res.statusCode = 404; res.end('{}');
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const apiBase = 'http://127.0.0.1:' + server.address().port;
    const auth = 'installation-token';

    const check = await updates.checkForUpdate({ apiBase, installationToken: auth, currentVersion: '0.4.23' });
    assert.equal(check.release.version, '0.4.24');
    const progress = [];
    const downloaded = await updates.downloadUpdate({ apiBase, installationToken: auth, release: check.release, destination: path.join(root, 'downloads'), onProgress: value => progress.push(value.percent) });
    assert.equal(downloaded.sha256, checksum);
    assert.deepEqual(await fsp.readFile(downloaded.file), installer);
    assert.equal(progress[0], 0);
    assert.equal(progress.at(-1), 100);

    // A tampered download is rejected and never returned as ready.
    const badRelease = { ...check.release, artifact: { ...check.release.artifact, sha256: 'f'.repeat(64) } };
    await assert.rejects(updates.downloadUpdate({ apiBase, installationToken: auth, release: badRelease, destination: path.join(root, 'bad') }), /SHA-256/);
    assert.equal(fs.existsSync(path.join(root, 'bad', 'BusinessERP-Desktop-0.4.24-Setup.exe')), false);

    // Authenticode: unsigned installers are blocked before launch.
    await assert.rejects(Promise.resolve().then(() => updates.verifyAuthenticode(downloaded.file, async () => JSON.stringify({ Status: 'NotSigned', Subject: null, Thumbprint: null }))), /NotSigned/);
    const signed = await updates.verifyAuthenticode(downloaded.file, async () => JSON.stringify({ Status: 'Valid', Subject: 'CN=Bizerp', Thumbprint: 'AB' }));
    assert.equal(signed.Subject, 'CN=Bizerp');

    // Runtime backup -> encrypted archive -> authorized upload must be verified.
    const backupDir = path.join(root, 'backup');
    await fsp.mkdir(backupDir, { recursive: true });
    const dump = Buffer.from('PGDMP fake dump');
    await fsp.writeFile(path.join(backupDir, 'database.dump'), dump);
    await fsp.writeFile(path.join(backupDir, 'manifest.json'), JSON.stringify({ format: 1, files: [{ name: 'database.dump', hash: createHash('sha256').update(dump).digest('hex'), size: dump.length }] }));
    const key = randomBytes(32).toString('hex');
    const archive = await updates.createEncryptedBackup({ backupDirectory: backupDir, outputFile: path.join(root, 'backup.bzbackup'), keyHex: key });
    assert.equal(archive.recordCount, 1);
    const opened = updates.openEncryptedBackup(archive.file, key);
    assert.equal(opened.manifest.mode, undefined);
    assert.equal(Buffer.from(opened.files['database.dump'], 'base64').toString(), 'PGDMP fake dump');
    assert.throws(() => updates.openEncryptedBackup(archive.file, randomBytes(32).toString('hex')), /unable to authenticate|bad decrypt/i);

    const uploaded = await updates.uploadBackup({ apiBase, installationToken: auth, archive, metadata: { backupType: 'pre_update', applicationVersion: '0.4.23', schemaVersion: 2, canonicalContractVersion: 1, backupFormatVersion: 1, deviceId: 'desktop-a', encryptionVersion: 'AES-256-GCM', encryptionKeyReference: 'desktop-key-v1' } });
    assert.equal(uploaded.status, 'verified');
    assert.equal(uploads[0], archive.sizeBytes);
    assert.equal(completed[0].checksum, archive.checksum);

    // A backup that never verified blocks installation.
    server.removeAllListeners('request');
    server.on('request', (req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ id: 'b2', status: 'failed' })); });
    await assert.rejects(updates.uploadBackup({ apiBase, installationToken: auth, archive, metadata: { deviceId: 'desktop-a' } }), /not verified/);

    console.log('PASS desktop updates: version ordering, short-lived ticket download, SHA-256 tamper rejection, Authenticode blocking, encrypted backup round-trip, authorized upload and verified-before-install gate');
  } finally {
    await new Promise(resolve => server ? server.close(resolve) : resolve());
    await fsp.rm(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
