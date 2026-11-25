// A local credential is the one this PC can verify without the cloud: users.password_hash holds the
// secret, and desktop_local_credentials records where that copy came from and which cloud credential
// version it represents. Without that record a stale or missing copy is indistinguishable from a
// wrong password, which is what made local sign-in fail with one opaque message.
const path = require('node:path');
const SOURCES = new Set(['cloud-sync', 'owner-reset', 'legacy', 'unusable']);
const SQL = `CREATE TABLE IF NOT EXISTS desktop_local_credentials(user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,source text NOT NULL,credential_version integer NOT NULL DEFAULT 0,provisioned_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now())`;
const BACKFILL = `INSERT INTO desktop_local_credentials(user_id,source,credential_version) SELECT id,CASE WHEN password_hash LIKE '$2%' THEN 'legacy' ELSE 'unusable' END,COALESCE(credential_version,0) FROM users ON CONFLICT(user_id) DO NOTHING`;

// The table is created on first use and backfilled once per database, so an existing store gains
// provenance without a schema migration or an upgrade route.
async function prepare(rt, c) {
  const database = rt.v?.databases?.live;
  if (!database) return;
  rt.localCredentialsReady = rt.localCredentialsReady || {};
  await c.query(SQL);
  if (rt.localCredentialsReady[database]) return;
  await c.query(BACKFILL);
  rt.localCredentialsReady[database] = true;
}

async function record(rt, c, userId, { source, version }) {
  if (!SOURCES.has(source)) throw Error('Unknown local credential source: ' + source);
  if (!userId) return;
  await c.query(SQL);
  await c.query(
    `INSERT INTO desktop_local_credentials(user_id,source,credential_version) VALUES($1,$2,$3)
     ON CONFLICT(user_id) DO UPDATE SET source=EXCLUDED.source,credential_version=EXCLUDED.credential_version,updated_at=now()`,
    [userId, source, Number.isSafeInteger(version) ? version : 0]
  );
}

function phoneOf(rt, identifier) {
  if (String(identifier || '').includes('@')) return null;
  try {
    return require(path.join(rt.bundle, 'backend/dist/common/login-phone')).normalizeLoginPhone(identifier);
  } catch {
    return null;
  }
}

// Mirrors the backend's own lookup: an email may belong to any role, a contact number only to the owner.
async function state(rt, input) {
  const identifier = String(input?.email || '').trim();
  const email = identifier.includes('@') ? identifier.toLowerCase() : null;
  const phone = phoneOf(rt, identifier);
  const c = await rt.client(rt.v.databases.live);
  try {
    await prepare(rt, c);
    const result = await c.query(
      `SELECT u.id,u.role,u.status,u.tenant_id,u.credential_version,u.password_hash,c.source,c.credential_version AS local_version
         FROM users u
         LEFT JOIN desktop_local_credentials c ON c.user_id=u.id
        WHERE (lower(u.email)=$1 OR ($2::text IS NOT NULL AND u.login_phone=$2 AND u.role='owner'))
        LIMIT 3`,
      [email, phone]
    );
    const rows = result.rows;
    if (!rows.length) return { state: 'no_account', identifier };
    if (rows.length > 1) return { state: 'duplicate', identifier, count: rows.length };
    const user = rows[0];
    const hasHash = typeof user.password_hash === 'string' && user.password_hash.startsWith('$2');
    if (!['active', 'pending_verification'].includes(user.status) || (user.role === 'super_admin' && user.tenant_id !== null))
      return { state: 'inactive', identifier, role: user.role, status: user.status };
    const source = user.source || 'missing';
    if (!hasHash || source === 'unusable' || source === 'missing')
      return { state: 'no_credential', identifier, source, role: user.role };
    const local = Number(user.local_version) || 0;
    const account = Number(user.credential_version) || 0;
    if (local < account) return { state: 'stale', identifier, source, localVersion: local, accountVersion: account, role: user.role };
    return { state: 'ready', identifier, userId: user.id, role: user.role, source, credentialVersion: account };
  } finally {
    await c.end();
  }
}

function failure(state, info = {}) {
  const who = info.identifier ? '"' + info.identifier + '"' : 'This account';
  const messages = {
    no_account: `No account on this PC matches ${who}. Check the spelling, or use the owner email or contact number this business was registered with.`,
    duplicate: `More than one account on this PC matches ${who}, so a password cannot be attributed to one person. Use the owner email or contact number instead.`,
    inactive: `The account for ${who} is ${info.status || 'not active'} on this PC, so local sign-in is closed for it.`,
    no_credential:
      info.role === 'owner'
        ? `${who} has no usable local credential on this PC yet (saved source: ${info.source || 'missing'}). Connect to Network once with the owner password; that writes the credential this PC checks offline.`
        : `${who} has no usable local credential on this PC yet (saved source: ${info.source || 'missing'}). Sign this staff account in once through Connect to Network, then use Sign in locally.`,
    stale: `The local credential on this PC was saved for credential version ${info.localVersion}, but the account is now at version ${info.accountVersion} because it changed elsewhere. Sign in once through Connect to Network to refresh this PC.`,
    wrong_secret: `The password does not match the local credential saved on this PC. If the password was changed in the cloud, sign in once through Connect to Network to refresh it.`,
  };
  const error = Error(messages[state] || 'Local sign-in failed.');
  error.localState = state;
  return error;
}

module.exports = { prepare, record, state, failure };
