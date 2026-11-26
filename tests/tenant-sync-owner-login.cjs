'use strict';
// Regressions for the cloud owner login path: the local owner credential must exist before the
// signed policy is installed, and only a missing sync state file re-queues cloud-stamped events.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const srcDir = path.join(__dirname, '..', 'src');
const cloudLocal = require.resolve(path.join(srcDir, 'cloud-local.cjs'));
const cloudStaff = require.resolve(path.join(srcDir, 'cloud-staff.cjs'));
const tenant = 'tenant-1';
const ownerId = 'owner-1';
const calls = [];
const seen = { loginEmail: null, policyOwner: null };

const stub = (id, exports) => { require.cache[id] = { id, filename: id, loaded: true, exports }; };
stub(cloudLocal, {
  verifyGrant: () => ({ tenantId: tenant, ownerId, businessName: 'Acme', license: { platforms: ['desktop'], perpetual: true }, limits: { internalAccounts: 5 } }),
  request: async () => ({ grant: 'renewed-grant' }),
  proof: () => ({}),
});
stub(cloudStaff, {
  cacheOwnerLogin: async (rt, input) => { calls.push('cache-owner'); seen.loginEmail = input.email; },
  installPolicy: async (rt, client, claims) => { calls.push('install-policy'); seen.policyOwner = claims.ownerId; },
});

const { cloudLogin, stop } = require(path.join(srcDir, 'tenant-sync.cjs'));

const client = () => ({
  queries: [],
  async query(sql, args) { this.queries.push({ sql, args }); return { rows: [], rowCount: 0 }; },
  async end() {},
});

async function run({ withStateFile }) {
  calls.length = 0;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tenant-sync-'));
  const database = client();
  const rt = {
    root,
    bundle: path.join(__dirname, '..'),
    v: {
      cloudBinding: { tenantId: tenant, api: 'http://cloud.invalid', keys: {}, activationId: 'a', ownerGrant: 'g', identity: { installationId: 'device-1' } },
      databases: { live: 'store' },
      cloudProfiles: {},
      schemaHash: 'same',
    },
    manifest: { schemaHash: 'same' },
    secrets: { save: async () => {} },
    message: () => {},
    stopHttp: async () => {},
    start: async () => {},
    client: async () => database,
    localSeed: null,
  };
  if (withStateFile) await fs.writeFile(path.join(root, 'tenant-sync-' + tenant + '.json'), '{}');
  try {
    await cloudLogin(rt, { email: 'owner@example.com' }, { token: 't', actor: { id: ownerId, tenantId: tenant, role: 'owner', email: 'owner@example.com' } }, {});
  } finally {
    stop(rt);
    await fs.rm(root, { recursive: true, force: true });
  }
  return database;
}

(async () => {
  const missing = await run({ withStateFile: false });
  assert.deepEqual(calls, ['cache-owner', 'install-policy'], 'the owner credential is cached before the policy is installed');
  assert.equal(seen.loginEmail, 'owner@example.com', 'the login identifier reaches the credential cache');
  assert.equal(seen.policyOwner, ownerId, 'the installed policy belongs to the signed-in owner');
  assert.ok(missing.queries.some((q) => /UPDATE desktop_sync_events/.test(q.sql)), 'a missing state file re-queues cloud-stamped events for this device');
  assert.ok(missing.queries.filter((q) => /UPDATE desktop_sync_events/.test(q.sql)).every((q) => q.args[0] === tenant && q.args[1] === 'device-1'));

  const existing = await run({ withStateFile: true });
  assert.ok(!existing.queries.some((q) => /UPDATE desktop_sync_events/.test(q.sql)), 'an existing state file leaves the synced journal alone');
  console.log('tenant sync owner login: credential cached before policy, missing sync state re-queued once, existing state untouched');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
