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
  return { file: outputFile, sizeBytes: archive.length, checksum: createHash('sha256').update(archive).digest('hex'), recordCount: Object.keys(files).length, manifest: listed };
}

/**
 * Authenticates an archive without decrypting its payload into memory.
 *
 * AES-GCM verifies the tag over the whole ciphertext, so a wrong key or a
 * single changed byte throws. The plaintext is streamed through the cipher and
 * discarded; callers that need the manifest already have it from
 * createEncryptedBackup, which built the archive from that same manifest.
 */
async function verifyEncryptedBackup(file, keyHex) {
  if (!/^[a-f0-9]{64}$/.test(String(keyHex || ''))) throw new Error('TENANT_BACKUP_ENCRYPTION_KEY must be exactly 64 hexadecimal characters');
  const headerSize = MAGIC.length + 12 + 16;
  const handle = await fsp.open(file, 'r');
  try {
    const header = Buffer.alloc(headerSize);
    const { bytesRead } = await handle.read(header, 0, headerSize, 0);
    if (bytesRead !== headerSize || header.subarray(0, MAGIC.length).toString('ascii') !== MAGIC) throw new Error('Not a Bizerp desktop backup');
    const iv = header.subarray(MAGIC.length, MAGIC.length + 12);
    const tag = header.subarray(MAGIC.length + 12, headerSize);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
    decipher.setAuthTag(tag);
    for await (const chunk of handle.createReadStream({ start: headerSize, autoClose: false })) {
      // Plaintext is intentionally discarded: only the authentication tag matters.
      decipher.update(chunk);
    }
    decipher.final();
    return true;
  } finally {
    await handle.close();
  }
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

function humanSeconds(ms) {
  const seconds = ms / 1000;
  return Number.isInteger(seconds) ? String(seconds) : String(Math.round(seconds * 10) / 10);
}

/**
 * Aborts a request after ms, or as soon as the caller's signal aborts. The
 * rejection reason names the request that timed out, so callers never have to
 * guess which layer fired.
 */
function abortAfter(ms, outer, description) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    const error = new Error(description || 'The request timed out after ' + humanSeconds(ms) + ' s');
    error.code = 'BACKUP_TIMEOUT';
    controller.abort(error);
  }, Math.max(1, Number(ms) || 1));
  timer.unref?.();
  const forward = () => controller.abort(outer.reason);
  if (outer) {
    if (outer.aborted) forward();
    else outer.addEventListener('abort', forward, { once: true });
  }
  return { signal: controller.signal, done: () => { clearTimeout(timer); outer?.removeEventListener?.('abort', forward); } };
}

/**
 * Streams the archive into the upload endpoint with a manual pump, so progress
 * means bytes the socket actually accepted. `fetch` buffers the body eagerly,
 * which makes "bytes read from disk" useless as a stall signal.
 */
function putArchive({ url, token, file, sizeBytes, signal, stallTimeoutMs }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? require('node:https') : require('node:http');
    let settled = false;
    let lastProgressAt = Date.now();
    const stream = fs.createReadStream(file, { highWaterMark: 64 * 1024 });
    const request = lib.request(target, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream', 'Content-Length': String(sizeBytes) },
    });
    const watchdog = setInterval(() => {
      if (Date.now() - lastProgressAt < stallTimeoutMs) return;
      const error = new Error('Cloud backup stalled (no upload progress for ' + humanSeconds(stallTimeoutMs) + ' s)');
      error.code = 'BACKUP_STALLED';
      fail(error);
    }, Math.max(25, Math.min(1000, Math.floor(stallTimeoutMs / 4))));
    watchdog.unref?.();
    function cleanup() {
      clearInterval(watchdog);
      signal?.removeEventListener?.('abort', onAbort);
      stream.destroy();
    }
    function fail(error) {
      if (settled) return;
      settled = true;
      cleanup();
      request.destroy();
      reject(error);
    }
    function succeed(value) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }
    function onAbort() {
      fail(signal?.reason || Object.assign(new Error('Backup upload aborted'), { name: 'AbortError' }));
    }
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }
    request.on('response', response => {
      response.on('data', () => {});
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) return succeed({ ok: true, status: response.statusCode });
        const error = new Error('Backup upload failed (HTTP ' + response.statusCode + ')');
        error.status = response.statusCode;
        fail(error);
      });
      response.on('error', fail);
    });
    request.on('error', fail);
    stream.on('error', fail);
    stream.on('data', chunk => {
      lastProgressAt = Date.now();
      if (!request.write(chunk)) {
        stream.pause();
        request.once('drain', () => stream.resume());
      }
    });
    stream.on('end', () => request.end());
  });
}

/**
 * Uploads one encrypted archive. Every request is bounded: a stalled connection
 * aborts the request (and the body stream) instead of waiting indefinitely.
 */
const REQUEST_TIMEOUT_MS = 20000;

async function uploadBackup({ apiBase, installationToken, archive, metadata, fetchImpl = fetch, signal, stallTimeoutMs = 5 * 60 * 1000, totalTimeoutMs = 6 * 60 * 60 * 1000 }) {
  const base = apiBase.replace(/\/$/, '');
  // One overall cap for the whole upload; initiate/complete get short bounds of
  // their own so a silent metadata call cannot stall the content phase.
  const overall = abortAfter(totalTimeoutMs, signal, 'Cloud backup timed out after ' + humanSeconds(totalTimeoutMs) + ' s without finishing');
  // A short overall budget also shortens the metadata calls, so the reason
  // always belongs to the timer that actually fired.
  const requestTimeoutMs = Math.min(REQUEST_TIMEOUT_MS, Math.max(250, Math.floor(totalTimeoutMs / 10)));
  const bounded = async (request, guard) => {
    try { return await request; } catch (error) {
      if (guard.signal.aborted) throw guard.signal.reason;
      if (overall.signal.aborted) throw overall.signal.reason;
      throw error;
    }
  };
  try {
    const initiation = abortAfter(requestTimeoutMs, overall.signal, 'The backup service did not answer the upload request within ' + humanSeconds(requestTimeoutMs) + ' s');
    let initiated;
    try {
      initiated = await bounded(fetchImpl(base + '/device-backups/initiate', {
        method: 'POST', headers: { Authorization: 'Bearer ' + installationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...metadata, checksum: archive.checksum, sizeBytes: archive.sizeBytes }),
        signal: initiation.signal,
      }).then(readJson), initiation);
    } finally { initiation.done(); }
    // The pump only reads the next chunk when the socket accepts one, so a slow
    // link keeps making progress while a dead connection stops producing bytes.
    await putArchive({
      url: base + '/device-backups/' + initiated.id + '/content', token: installationToken,
      file: archive.file, sizeBytes: archive.sizeBytes, signal: overall.signal, stallTimeoutMs,
    });
    const completion = abortAfter(requestTimeoutMs, overall.signal, 'The backup service did not confirm the upload within ' + humanSeconds(requestTimeoutMs) + ' s');
    let completed;
    try {
      completed = await bounded(fetchImpl(base + '/device-backups/' + initiated.id + '/complete', {
        method: 'POST', headers: { Authorization: 'Bearer ' + installationToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ checksum: archive.checksum }),
        signal: completion.signal,
      }).then(readJson), completion);
    } finally { completion.done(); }
    if (completed.status !== 'verified') throw new Error('The cloud backup was not verified; the update must not install');
    return completed;
  } finally { overall.done(); }
}

/** Launches the verified NSIS installer and returns immediately so the caller can quit. */
function launchInstaller(file, { silent = true } = {}) {
  const child = spawn(file, silent ? ['/S'] : [], { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  return { pid: child.pid, silent };
}

/**
 * Asks the cloud for a restore ticket and the newest verified, schema/contract
 * compatible backup. The service enforces the restore entitlement and returns a
 * short-lived ticket plus the backup manifest.
 */
async function authorizeRestore({ apiBase, installationToken, targetSchemaVersion, canonicalContractVersion, backupId, fetchImpl = fetch }) {
  if (!/^https:\/\//.test(apiBase) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(apiBase)) throw new Error('Cloud restore requires HTTPS');
  const response = await fetchImpl(apiBase.replace(/\/$/, '') + '/device-restores/authorize', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
    headers: { Authorization: 'Bearer ' + installationToken, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ targetSchemaVersion, canonicalContractVersion, ...(backupId ? { backupId } : {}) }),
  });
  return readJson(response);
}

/** Downloads the encrypted backup through the signed restore ticket and checks its SHA-256. */
async function downloadRestore({ apiBase, downloadUrl, destination, expectedSha256, fetchImpl = fetch }) {
  const url = new URL(downloadUrl, apiBase.replace(/\/$/, '') + '/').toString();
  const response = await fetchImpl(url, { headers: { Accept: 'application/octet-stream' } });
  if (!response.ok || !response.body) throw new Error('The cloud backup download failed (HTTP ' + response.status + ')');
  await fsp.mkdir(path.dirname(destination), { recursive: true });
  const file = fs.createWriteStream(destination, { mode: 0o600 });
  const hashing = createHash('sha256');
  let written = 0;
  await pipeline(Readable.fromWeb(response.body), async function* (source) {
    for await (const chunk of source) {
      written += chunk.length;
      if (written > 2 * 1024 * 1024 * 1024) throw new Error('The cloud backup exceeds the maximum restore size');
      hashing.update(chunk);
      yield chunk;
    }
  }, file);
  const digest = hashing.digest('hex');
  if (expectedSha256 && digest !== String(expectedSha256).toLowerCase()) {
    await fsp.unlink(destination).catch(() => {});
    throw new Error('The downloaded backup failed its checksum check');
  }
  return { file: destination, sha256: digest, sizeBytes: written };
}

/** Records restore progress on the device recovery event trail (best effort by the caller). */
async function recordRestoreEvent({ apiBase, installationToken, body, fetchImpl = fetch }) {
  const response = await fetchImpl(apiBase.replace(/\/$/, '') + '/device-restores/events', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Authorization: 'Bearer ' + installationToken, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return readJson(response);
}

module.exports = { compareVersions, sha256File, checkForUpdate, downloadUpdate, verifyAuthenticode, createEncryptedBackup, openEncryptedBackup, verifyEncryptedBackup, uploadBackup, launchInstaller, authorizeRestore, downloadRestore, recordRestoreEvent };
