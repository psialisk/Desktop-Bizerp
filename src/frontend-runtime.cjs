'use strict';
/**
 * The packaged Next.js server keeps its build output and cache under distDir
 * (.next-desktop). Next always creates <distDir>/cache when it starts, which
 * fails with EPERM when the application is installed under Program Files.
 *
 * The packaged build is therefore mirrored once per build id into the user's
 * private store directory, and the server is started from that copy. The mirror
 * uses hard links when the volumes allow it, so it costs no extra disk space and
 * reads are shared with the installed (read-only) runtime.
 */
const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');

const READY = '.ready';
const CACHE = path.join('.next-desktop', 'cache');

function buildIdFor(source) {
  try {
    const value = syncFs.readFileSync(path.join(source, '.next-desktop', 'BUILD_ID'), 'utf8').trim();
    return /^[0-9A-Za-z_-]{1,80}$/.test(value) ? value : 'unknown';
  } catch {
    return 'unknown';
  }
}

function keyFor(version, buildId) {
  return createHash('sha256').update(String(version) + '|' + String(buildId)).digest('hex').slice(0, 16);
}

/** Deterministic path, so interrupted runs can recognise their own child processes. */
function homeFor(root, version, buildId) {
  return path.join(path.resolve(root), 'fe', keyFor(version, buildId));
}

async function walk(root, relative = '') {
  const out = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? relative + '/' + entry.name : entry.name;
    if (entry.isSymbolicLink()) throw Error('The packaged workspace contains an unsupported link: ' + name);
    if (entry.isDirectory()) out.push(...await walk(root, name));
    else if (entry.isFile()) out.push(name);
    else throw Error('The packaged workspace contains an unsupported file: ' + name);
  }
  return out;
}

async function prune(root, keep, current) {
  const parent = path.join(path.resolve(root), 'fe');
  let entries;
  try { entries = await fs.readdir(parent, { withFileTypes: true }); } catch { return; }
  const stale = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === current || entry.name.startsWith('.staging-') || entry.name.includes('.staging-')) continue;
    const full = path.join(parent, entry.name);
    try { stale.push({ full, at: (await fs.stat(full)).mtimeMs }); } catch { /* removed concurrently */ }
  }
  stale.sort((a, b) => b.at - a.at);
  for (const item of stale.slice(Math.max(0, keep - 1))) await fs.rm(item.full, { recursive: true, force: true }).catch(() => {});
}

async function mirror(source, target) {
  for (const relative of await walk(source)) {
    if (relative === CACHE.split(path.sep).join('/') || relative.startsWith(CACHE.split(path.sep).join('/') + '/')) continue;
    const from = path.join(source, ...relative.split('/'));
    const to = path.join(target, ...relative.split('/'));
    await fs.mkdir(path.dirname(to), { recursive: true });
    try { await fs.link(from, to); } catch { await fs.copyFile(from, to); }
  }
}

async function prepareFrontendRuntime({ root, source, version, buildId, keep = 2, onMessage = () => {} }) {
  const home = homeFor(root, version, buildId);
  const ready = path.join(home, READY);
  if (syncFs.existsSync(ready) && syncFs.existsSync(path.join(home, 'server.js'))) {
    await prune(root, keep, home);
    return home;
  }
  await fs.mkdir(path.dirname(home), { recursive: true });
  const staging = path.join(path.dirname(home), '.staging-' + randomBytes(4).toString('hex'));
  try {
    await mirror(source, staging);
    await fs.writeFile(path.join(staging, READY), JSON.stringify({ source, version, buildId, preparedAt: new Date().toISOString() }));
    try {
      await fs.rename(staging, home);
    } catch (error) {
      await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
      // Another start may have prepared the same build; reuse it only when complete.
      if (!['EEXIST', 'ENOTEMPTY', 'EPERM', 'EACCES'].includes(error.code) || !syncFs.existsSync(ready)) throw error;
    }
    onMessage('Local workspace prepared for this Windows account');
    await prune(root, keep, home);
    return home;
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true }).catch(() => {});
    throw Error('The local workspace could not be prepared in ' + root + ': ' + error.message);
  }
}

module.exports = { prepareFrontendRuntime, homeFor, buildIdFor, keyFor, READY };
