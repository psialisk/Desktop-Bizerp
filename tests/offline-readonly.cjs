// Offline read-only, through the real modules: a live API, the same API stopped, the real
// login policy store, the real cached-entitlement decision and the real request rule.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const reachability = require('../src/login-reachability.cjs');
const policyStore = require('../src/login-policy-store.cjs');
const {readOnlyRequestBlocked} = require('../src/login-session.cjs');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-offline-'));
  const server = http.createServer((request, response) => {
    if (String(request.url).endsWith('/health')) {
      response.writeHead(200, {'content-type': 'application/json'});
      response.end('{"ok":true}');
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const api = 'http://127.0.0.1:' + server.address().port + '/api';
  const localOrigin = 'http://127.0.0.1:4321';

  // A read-only subscription was confirmed online, and the server reported a paid date.
  await policyStore.recordOnlineSignIn(root, {api, readOnly: true, paidUntil: new Date(Date.now() + 86400000).toISOString()});
  const stored = await policyStore.read(root);

  // 1. Online: the probe answers, so local sign-in is withheld.
  assert.equal(await reachability.probe(api), true, 'a JSON /health answer means the API is reachable');
  const whileOnline = reachability.localLoginDecision({reachable: true, lastOnlineAt: stored.lastOnlineAt});
  assert.equal(whileOnline.allowed, false);
  assert.match(whileOnline.reason, /reachable/);

  // 2. The API is stopped: the client sees an unreachable server and offers the local fallback.
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections?.(); });
  assert.equal(await reachability.probe(api), false, 'a refused connection means the API is unavailable');
  assert.equal(reachability.localLoginDecision({reachable: false, lastOnlineAt: stored.lastOnlineAt}).allowed, true);

  // 3. The cached entitlement is read-only, and it states the reason the client shows.
  const entitlement = reachability.cachedEntitlement({readOnly: stored.readOnly, paidUntil: stored.paidUntil, lastOnlineAt: stored.lastOnlineAt});
  assert.equal(entitlement.readOnly, true);
  assert.match(entitlement.reason, /read-only/);
  assert.match(entitlement.reason, /reconnect/i);
  assert.match(entitlement.reason, /readable/);

  // 4. Writes and sync are refused at the local request boundary; reads still pass.
  const blocked = method => readOnlyRequestBlocked({url: localOrigin + '/api/retail/products', method, origin: localOrigin, readOnly: entitlement.readOnly});
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) assert.equal(blocked(method), true, method + ' writes must be refused');
  for (const method of ['GET', 'HEAD']) assert.equal(blocked(method), false, method + ' reads must keep working');
  assert.equal(readOnlyRequestBlocked({url: 'https://bizerp-gnj.onrender.com/api/x', method: 'POST', origin: localOrigin, readOnly: true}), false, 'only the local workspace is guarded');
  assert.equal(readOnlyRequestBlocked({url: localOrigin + '/api/retail/products', method: 'POST', origin: localOrigin, readOnly: false}), false, 'a writable session is untouched');

  // 5. A paid date that passed while offline also makes the session read-only, with its own reason.
  await policyStore.recordOnlineSignIn(root, {api, readOnly: false, paidUntil: new Date(Date.now() - 86400000).toISOString()});
  const expired = await policyStore.read(root);
  const past = reachability.cachedEntitlement({readOnly: expired.readOnly, paidUntil: expired.paidUntil, lastOnlineAt: expired.lastOnlineAt});
  assert.equal(past.readOnly, true);
  assert.match(past.reason, /paid period reported by the server ended/);
  assert.equal(readOnlyRequestBlocked({url: localOrigin + '/api/retail/store/checkout', method: 'POST', origin: localOrigin, readOnly: past.readOnly}), true);

  // 6. A paid date still in the future keeps the offline session writable.
  await policyStore.recordOnlineSignIn(root, {api, readOnly: false, paidUntil: new Date(Date.now() + 86400000).toISOString()});
  const current = await policyStore.read(root);
  const active = reachability.cachedEntitlement({readOnly: current.readOnly, paidUntil: current.paidUntil, lastOnlineAt: current.lastOnlineAt});
  assert.equal(active.readOnly, false);
  assert.equal(readOnlyRequestBlocked({url: localOrigin + '/api/retail/store/checkout', method: 'POST', origin: localOrigin, readOnly: active.readOnly}), false);

  fs.rmSync(root, {recursive: true, force: true});
  console.log('PASS offline read-only end to end: probe online/offline, local fallback, cached read-only decision, write refused, read allowed, sync reason available');
  process.exit(0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
