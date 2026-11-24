const assert = require('node:assert/strict');
const DAY = 86400000;
const path = require('node:path');

const credentials = require('../src/local-credentials.cjs');

// Minimal stand-in for the live database: state() opens its own client, prepares the provenance
// table and backfills it before the account lookup, so the rows are queued in that order.
function client(responses = []) {
  const calls = [];
  return {
    calls,
    async query(sql, args) {
      calls.push({ sql, args });
      const next = responses.shift();
      return typeof next === 'function' ? next(sql, args) : next || { rows: [], rowCount: 0 };
    },
    async end() {},
  };
}

function store(rows) {
  const database = client([{}, {}, { rows }]);
  return { database, rt: { v: { databases: { live: 'store' } }, bundle: path.join(__dirname, '..'), client: async () => database } };
}

const owner = (extra = {}) => ({
  id: 'owner-1', role: 'owner', status: 'active', tenant_id: 'tenant-1', credential_version: 0,
  password_hash: '$2b$12$abcdefghijklmnopqrstuv', source: 'cloud-sync', local_version: 0, ...extra,
});

(async () => {
  const cases = [
    ['an address nobody on this PC owns', [], 'no_account', /No account on this PC matches "Ghost@Example.com"/],
    ['an address saved twice', [owner({ id: 'a' }), owner({ id: 'b' })], 'duplicate', /More than one account on this PC matches/],
    ['an account that is not active', [owner({ status: 'suspended' })], 'inactive', /is suspended on this PC, so local sign-in is closed/],
    ['a cloud-provisioned row with no password hash', [owner({ password_hash: '!owner-cloud-login-required', source: 'unusable', role: 'owner' })], 'no_credential', /no usable local credential on this PC yet \(saved source: unusable\).*Connect to Network/],
    ['a staff row with no provenance row', [owner({ password_hash: '!cloud-staff-login-required', role: 'cashier', source: null, local_version: null })], 'no_credential', /Sign this staff account in once through Connect to Network/],
    ['a copy saved before the credential changed elsewhere', [owner({ credential_version: 3, local_version: 1 })], 'stale', /saved for credential version 1, but the account is now at version 3/],
    ['a copy that matches the cloud version', [owner({ credential_version: 2, local_version: 2 })], 'ready', null],
  ];

  for (const [label, rows, expected, message] of cases) {
    const { database, rt } = store(rows);
    const result = await credentials.state(rt, { email: 'Ghost@Example.com ' });
    assert.equal(result.state, expected, label);
    if (expected === 'ready') {
      assert.equal(result.credentialVersion, 2, label);
      assert.equal(result.userId, 'owner-1', label);
    }
    if (message) {
      const error = credentials.failure(result.state, result);
      assert.equal(error.localState, expected, label);
      assert.match(error.message, message, label);
    }
    assert.match(database.calls[0].sql, /CREATE TABLE IF NOT EXISTS desktop_local_credentials/, label);
    assert.match(database.calls[1].sql, /INSERT INTO desktop_local_credentials.*COALESCE\(credential_version,0\)/, label);
    assert.equal(result.identifier, 'Ghost@Example.com', label);
  }

  // A contact number is only ever resolved to the owner, never to staff.
  const phone = store([owner({ email: null })]);
  await credentials.state(phone.rt, { email: '09171234567' });
  assert.equal(phone.database.calls[2].args[1] === null, true, 'a phone lookup asks for the owner role');

  // An unknown provenance source is a programming error, not a credential state.
  const unknown = client([{}, {}]);
  await assert.rejects(credentials.record({ v: {} }, unknown, 'owner-1', { source: 'typed-by-hand', version: 0 }), /Unknown local credential source/);

  // A successful cloud cache records the version the cloud reported for that account.
  const record = client([{}, {}]);
  await credentials.record({ v: {} }, record, 'owner-1', { source: 'cloud-sync', version: 4 });
  assert.deepEqual(record.calls[1].args, ['owner-1', 'cloud-sync', 4]);

  // The provenance table is prepared once per open database, then reused.
  const cachedDatabase = client([{}, { rows: [owner()] }]);
  const cached = { database: cachedDatabase, rt: { v: { databases: { live: 'store' } }, bundle: path.join(__dirname, '..'), client: async () => cachedDatabase, localCredentialsReady: { store: true } } };
  await credentials.state(cached.rt, { email: 'ghost@example.com' });
  assert.equal(cached.database.calls.filter(call => /CREATE TABLE/.test(call.sql)).length, 1);
  assert.equal(cached.database.calls.filter(call => /INSERT INTO desktop_local_credentials/.test(call.sql)).length, 0, 'a prepared database is not backfilled again');

  // --- Owner repair on a cloud-linked PC ---------------------------------------------------------
  const cloudLocal = require.resolve('../src/cloud-local.cjs');
  const grant = { tenantId: 'tenant-1', ownerId: 'owner-1', email: 'Owner@Example.com' };
  const original = require.cache[cloudLocal];
  require.cache[cloudLocal] = { id: cloudLocal, filename: cloudLocal, loaded: true, exports: { verifyGrant: () => grant } };
  const recovery = require('../src/owner-recovery.cjs');

  const secrets = { saves: 0, async save() { this.saves++; } };
  const repairStore = () => {
    const calls = [];
    const database = {
      calls,
      async query(sql, args) {
        calls.push({ sql, args });
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [], rowCount: 0 };
        if (sql.startsWith('UPDATE users SET password_hash')) return { rows: [{ credential_version: 2 }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      },
      async end() {},
    };
    const rt = { v: { cloudBinding: { ownerGrant: 'signed' }, databases: { live: 'store' }, jwtSecret: 'old' }, secrets, client: async () => database };
    return { rt, database };
  };

  // Never enrolled: the signed grant makes the repair available without internet.
  const fresh = repairStore().rt;
  const freshState = await recovery.inspect(fresh);
  assert.equal(freshState.available, true, 'a cloud-bound owner can repair an unenrolled credential');
  assert.equal(freshState.mode, 'repair');
  assert.equal(freshState.email, 'owner@example.com');

  // A plain local business with no recovery code stays unavailable.
  const local = { v: { databases: { live: 'store' } }, secrets, client: async () => client() };
  assert.equal((await recovery.inspect(local)).mode, 'none', 'a local business without a code has no repair path');

  // The wrong email is refused before anything is written.
  const wrongEmail = repairStore();
  await assert.rejects(
    recovery.reset(wrongEmail.rt, { email: 'someone@example.com', code: '', password: 'Password123!', confirmation: 'Password123!' }, Date.now(), async () => '$2b$12$new'),
    /Enter the owner email this computer is linked to: owner@example.com/
  );
  assert.equal(wrongEmail.database.calls.length, 0, 'a mismatched owner email writes nothing');

  // The repair rewrites the hash and records the provenance the local login path reads.
  const repaired = repairStore();
  const result = await recovery.reset(repaired.rt, { email: 'owner@example.com', code: '', password: 'Password123!', confirmation: 'Password123!' }, Date.now(), async () => '$2b$12$new');
  assert.match(result.message, /Local owner credential repaired/);
  const provenance = repaired.database.calls.find(call => /INSERT INTO desktop_local_credentials/.test(call.sql));
  assert.deepEqual(provenance.args, ['owner-1', 'owner-reset', 2], 'the repair records the cloud credential version');
  const audit = repaired.database.calls.find(call => /INSERT INTO audit_logs/.test(call.sql));
  assert.equal(audit.args[2], 'desktop.owner.local-credential-repair');
  assert.match(String(audit.args[3]), /signed-local-grant/);
  assert.notEqual(repaired.rt.v.jwtSecret, 'old', 'repair rotates the local signing secret');

  // A tampered clock keeps the repair closed, exactly as it keeps the one-time code closed.
  const skewed = repairStore().rt;
  skewed.v.ownerRecovery = { tenantId: 'tenant-1', ownerId: 'owner-1', email: 'owner@example.com', verifier: 'ab', createdAt: Date.now(), expiresAt: Date.now() + DAY, lastSeen: Date.now() + 600000, attempts: 0 };
  const skewState = await recovery.inspect(skewed);
  assert.equal(skewState.available, false, 'a backwards clock does not unlock repair');

  // A business whose grant no longer verifies has no repair path either.
  require.cache[cloudLocal].exports.verifyGrant = () => { throw Error('bad signature'); };
  assert.equal((await recovery.inspect(repairStore().rt)).mode, 'none');
  if (original) require.cache[cloudLocal] = original; else delete require.cache[cloudLocal];

  console.log('local credentials: no_account, duplicate, inactive, no_credential, stale and ready states are distinguished, every failure names its own fix, and a cloud-bound owner repairs the local copy without a one-time code');
})().catch(error => { console.error(error); process.exitCode = 1; });
