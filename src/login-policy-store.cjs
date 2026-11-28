// The only durable fact the offline login needs: when this PC last signed in online and
// what the server said about the subscription then. It lives beside the local store, is
// not a credential, and a missing or unreadable file simply means "no online sign-in yet".
const fs = require('node:fs/promises');
const path = require('node:path');

const FILE = 'login-policy.json';

function fileFor(root) {
  return path.join(root, FILE);
}

async function read(root) {
  try {
    const value = JSON.parse(await fs.readFile(fileFor(root), 'utf8'));
    if (!value || typeof value !== 'object') return null;
    return {
      lastOnlineAt: Number(value.lastOnlineAt) || 0,
      readOnly: value.readOnly === true,
      paidUntil: Number(value.paidUntil) || 0,
      api: typeof value.api === 'string' ? value.api : null,
    };
  } catch {
    return null;
  }
}

async function recordOnlineSignIn(root, {api, readOnly = false, paidUntil = null, now = Date.now()}) {
  const paid = Date.parse(paidUntil);
  const value = {lastOnlineAt: Number(now), readOnly: readOnly === true, paidUntil: Number.isFinite(paid) ? paid : 0, api: api || null};
  await fs.mkdir(root, {recursive: true});
  const temp = fileFor(root) + '.new';
  await fs.writeFile(temp, JSON.stringify(value), {mode: 0o600});
  await fs.rename(temp, fileFor(root));
  return value;
}

module.exports = {read, recordOnlineSignIn, FILE};
