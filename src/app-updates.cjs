'use strict';
/**
 * Desktop update and backup client.
 *
 * The backend issues short-lived download tickets and installation tokens; the
 * renderer never receives Google Drive credentials. APK/EXE bytes are verified
 * by SHA-256, then the Windows installer must also pass Authenticode
 * verification before it is launched. Installation is never silent: the NSIS
 * installer runs with /S only after the owner approved the restart, and the
 * verified local database backup must be uploaded and verified first.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createHash, createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');

const MAGIC = 'BZDESK1\n';

function compareVersions(a, b) {
  const parse = value => {
    const match = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})(?:-([0-9A-Za-z.-]{1,40}))?$/.exec(String(value || '').trim());
    if (!match) throw new Error('Invalid semantic version: ' + value);
    return { parts: [Number(match[1]), Number(match[2]), Number(match[3])], pre: match[4] || '' };
  };
  const left = parse(a), right = parse(b);
  for (let i = 0; i < 3; i++) if (left.parts[i] !== right.parts[i]) return left.parts[i] > right.parts[i] ? 1 : -1;
  if (left.pre === right.pre) return 0;
  if (!left.pre) return 1;
  if (!right.pre) return -1;
  return left.pre > right.pre ? 1 : -1;
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function readJson(response) {
  if (!response.ok) {
    let message = 'Update service returned HTTP ' + response.status;
    try { message = JSON.parse(await response.text()).message || message; } catch (_) { /* keep the status text */ }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function checkForUpdate({ apiBase, installationToken, currentVersion, localSchemaVersion = 1, canonicalContractVersion = 1, fetchImpl = fetch }) {
  if (!/^https:\/\//.test(apiBase) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(apiBase)) throw new Error('Desktop updates require HTTPS');
  const url = apiBase.replace(/\/$/, '') + '/app-updates/check?currentVersion=' + encodeURIComponent(currentVersion) + '&localSchemaVersion=' + localSchemaVersion + '&canonicalContractVersion=' + canonicalContractVersion;
  const response = await fetchImpl(url, { headers: { Authorization: 'Bearer ' + installationToken, Accept: 'application/json' } });
  return readJson(response);
}

async function downloadUpdate({ apiBase, installationToken, release, destination, onProgress, fetchImpl = fetch }) {
  const ticket = await fetchImpl(apiBase.replace(/\/$/, '') + '/app-updates/download-tickets', {
    method: 'POST', headers: { Authorization: 'Bearer ' + installationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ releaseId: release.id }),
  }).then(readJson);
  const expected = release.artifact.sha256, size = Number(release.artifact.sizeBytes);
  const target = path.resolve(destination, 'BusinessERP-Desktop-' + release.version + '-Setup.exe');
  const partial = target + '.part';
  await fsp.mkdir(destination, { recursive: true });
  // Backend tickets are origin-relative (/api/app-updates/download/:ticket);
  // resolve them against the origin without duplicating the /api prefix.
  const downloadUrl = new URL(ticket.url, apiBase.replace(/\/$/, '') + '/').toString();
  const response = await fetchImpl(downloadUrl, { headers: { Accept: 'application/octet-stream' } });
  if (!response.ok || !response.body) throw new Error('The update download failed (HTTP ' + response.status + ')');
  const file = fs.createWriteStream(partial, { mode: 0o600 });
  let written = 0, lastReported = -1;
  const report = force => {
    if (typeof onProgress !== 'function') return;
    const percent = size > 0 ? Math.min(100, Math.floor((written / size) * 100)) : 0;
    if (!force && percent === lastReported) return;
    lastReported = percent;
    try { onProgress({ receivedBytes: written, totalBytes: size, percent }); } catch (_) { /* progress must never abort the download */ }
  };
  report(true);
  await pipeline(Readable.fromWeb(response.body), async function* (source) {
    for await (const chunk of source) {
      written += chunk.length;
      if (written > size) throw new Error('The downloaded installer is larger than the published artifact');
      report(false);
      yield chunk;
    }
  }, file);
  if (written !== size) throw new Error('The downloaded installer size does not match the release');
  const digest = await sha256File(partial);
  if (digest !== expected) { await fsp.unlink(partial).catch(() => {}); throw new Error('The downloaded installer failed its SHA-256 check'); }
  await fsp.rename(partial, target);
  report(true);
  return { file: target, sha256: digest, sizeBytes: written };
}

/** Windows Authenticode verification; an unsigned or tampered installer is rejected. */
function verifyAuthenticode(file, run = runPowerShell) {
  const command = "$s=Get-AuthenticodeSignature -LiteralPath '" + file.replace(/'/g, "''") + "';" +
    "[pscustomobject]@{Status=$s.Status.ToString();Subject=$s.SignerCertificate.Subject;Thumbprint=$s.SignerCertificate.Thumbprint}|ConvertTo-Json -Compress";
  return run(command).then(output => {
    const result = JSON.parse(output);
    if (result.Status !== 'Valid') throw new Error('Windows rejected the installer signature (' + result.Status + ')');
    return result;
  });
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true });
    let out = '', err = '';
    child.stdout.on('data', chunk => { if (out.length < 65536) out += chunk; });
    child.stderr.on('data', chunk => { if (err.length < 8000) err += chunk; });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve(out.trim()) : reject(new Error('Authenticode check failed: ' + (err.trim() || 'exit ' + code))));
  });
}

/** Encrypts a completed runtime backup directory into one authenticated archive. */
async function createEncryptedBackup({ backupDirectory, outputFile, keyHex }) {
  if (!/^[a-f0-9]{64}$/.test(String(keyHex || ''))) throw new Error('TENANT_BACKUP_ENCRYPTION_KEY must be exactly 64 hexadecimal characters');
  const files = {};
  const manifest = await fsp.readFile(path.join(backupDirectory, 'manifest.json'), 'utf8');
  const listed = JSON.parse(manifest);
  for (const entry of listed.files || []) {
    if (!/^[A-Za-z0-9._/-]+$/.test(entry.name) || entry.name.includes('..')) throw new Error('Invalid backup entry');
    const content = await fsp.readFile(path.join(backupDirectory, ...entry.name.split('/')));
    const digest = createHash('sha256').update(content).digest('hex');
    if (digest !== entry.hash) throw new Error('Backup file changed after its manifest was written: ' + entry.name);
    files[entry.name] = content.toString('base64');
  }
  const payload = Buffer.from(JSON.stringify({ format: 1, manifest: listed, files }), 'utf8');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  const body = Buffer.concat([cipher.update(payload), cipher.final()]);
  const archive = Buffer.concat([Buffer.from(MAGIC, 'ascii'), iv, cipher.getAuthTag(), body]);
  await fsp.writeFile(outputFile, archive, { mode: 0o600 });
  return { file: outputFile, sizeBytes: archive.length, checksum: createHash('sha256').update(archive).digest('hex'), recordCount: Object.keys(files).length };
}

function openEncryptedBackup(file, keyHex) {
  const archive = fs.readFileSync(file);
  if (archive.subarray(0, MAGIC.length).toString('ascii') !== MAGIC) throw new Error('Not a Bizerp desktop backup');
  const iv = archive.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = archive.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const body = archive.subarray(MAGIC.length + 28);
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
  decipher.setAuthTag(tag);
  // Throws on tampering: authenticated encryption is the integrity check.
  return JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8'));
}

async function uploadBackup({ apiBase, installationToken, archive, metadata, fetchImpl = fetch }) {
  const initiated = await fetchImpl(apiBase.replace(/\/$/, '') + '/device-backups/initiate', {
    method: 'POST', headers: { Authorization: 'Bearer ' + installationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...metadata, checksum: archive.checksum, sizeBytes: archive.sizeBytes }),
  }).then(readJson);
  const upload = await fetchImpl(apiBase.replace(/\/$/, '') + '/device-backups/' + initiated.id + '/content', {
    method: 'PUT', headers: { Authorization: 'Bearer ' + installationToken, 'Content-Type': 'application/octet-stream', 'Content-Length': String(archive.sizeBytes) },
    body: fs.createReadStream(archive.file), duplex: 'half',
  });
  if (!upload.ok) throw new Error('Backup upload failed (HTTP ' + upload.status + ')');
  const completed = await fetchImpl(apiBase.replace(/\/$/, '') + '/device-backups/' + initiated.id + '/complete', {
    method: 'POST', headers: { Authorization: 'Bearer ' + installationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ checksum: archive.checksum }),
  }).then(readJson);
  if (completed.status !== 'verified') throw new Error('The cloud backup was not verified; the update must not install');
  return completed;
}

/** Launches the verified NSIS installer and returns immediately so the caller can quit. */
function launchInstaller(file, { silent = true } = {}) {
  const child = spawn(file, silent ? ['/S'] : [], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  return { pid: child.pid, silent };
}

module.exports = { compareVersions, sha256File, checkForUpdate, downloadUpdate, verifyAuthenticode, createEncryptedBackup, openEncryptedBackup, uploadBackup, launchInstaller };
