'use strict';
const assert = require('node:assert');
const fs = require('node:fs/promises');
const syncFs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareFrontendRuntime, homeFor, buildIdFor } = require('../src/frontend-runtime.cjs');

async function write(file, content) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

(async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'erp-frontend-runtime-'));
  const source = path.join(base, 'bundle', 'frontend');
  await write(path.join(source, 'server.js'), '// packaged server');
  await write(path.join(source, 'package.json'), '{"name":"fixture"}');
  await write(path.join(source, '.next-desktop', 'BUILD_ID'), 'BUILD-1\n');
  await write(path.join(source, '.next-desktop', 'cache', 'stale.bin'), 'stale');
  await write(path.join(source, 'node_modules', 'next', 'package.json'), '{"name":"next"}');
  await write(path.join(source, 'public', 'logo.png'), 'png');
  const root = path.join(base, 'store-data');

  const prepared = await prepareFrontendRuntime({ root, source, version: '0.4.23', buildId: 'BUILD-1' });
  assert.equal(prepared, homeFor(root, '0.4.23', 'BUILD-1'), 'the mirror path must be derived from the build');
  assert.ok(prepared.startsWith(path.join(root, 'fe') + path.sep), 'the mirror must live in the user store');
  assert.ok(!prepared.startsWith(source), 'the mirror must not be the packaged directory');
  assert.equal(await fs.readFile(path.join(prepared, 'server.js'), 'utf8'), '// packaged server');
  assert.ok(syncFs.existsSync(path.join(prepared, 'node_modules', 'next', 'package.json')), 'dependencies are mirrored');
  assert.ok(syncFs.existsSync(path.join(prepared, 'public', 'logo.png')), 'public assets are mirrored');
  assert.equal(syncFs.existsSync(path.join(prepared, '.next-desktop', 'cache')), false, 'the packaged cache is not copied');

  await fs.mkdir(path.join(prepared, '.next-desktop', 'cache', 'images'), { recursive: true });
  await fs.writeFile(path.join(prepared, '.next-desktop', 'cache', 'images', 'entry'), 'cached');
  assert.equal(syncFs.existsSync(path.join(source, '.next-desktop', 'cache', 'images', 'entry')), false, 'cache writes stay in the user store');
  assert.equal(await fs.readFile(path.join(prepared, '.next-desktop', 'cache', 'images', 'entry'), 'utf8'), 'cached');

  const readyAt = (await fs.stat(path.join(prepared, '.ready'))).mtimeMs;
  const reused = await prepareFrontendRuntime({ root, source, version: '0.4.23', buildId: 'BUILD-1' });
  assert.equal(reused, prepared, 'an existing mirror is reused');
  assert.equal((await fs.stat(path.join(prepared, '.ready'))).mtimeMs, readyAt, 'a reused mirror is not rebuilt');

  for (const name of ['old-a', 'old-b', 'old-c']) await write(path.join(root, 'fe', name, 'server.js'), 'x');
  await prepareFrontendRuntime({ root, source, version: '0.4.23', buildId: 'BUILD-1' });
  const kept = (await fs.readdir(path.join(root, 'fe'), { withFileTypes: true })).filter(entry => entry.isDirectory() && !entry.name.startsWith('.staging-'));
  assert.ok(kept.length <= 2, 'older mirrors are pruned, found ' + kept.map(entry => entry.name).join(', '));

  await fs.writeFile(path.join(source, '.next-desktop', 'BUILD_ID'), 'BUILD-2\n');
  assert.equal(buildIdFor(source), 'BUILD-2');
  const upgraded = await prepareFrontendRuntime({ root, source, version: '0.4.23', buildId: 'BUILD-2' });
  assert.notEqual(upgraded, prepared, 'a new build gets a fresh mirror');
  assert.ok(syncFs.existsSync(path.join(upgraded, 'server.js')));

  await fs.rm(base, { recursive: true, force: true });
  console.log('frontend runtime mirror: ok');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
