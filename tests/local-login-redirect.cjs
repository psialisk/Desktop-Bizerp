const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {loadWorkspace} = require('../src/login-session.cjs');

const origin = 'http://127.0.0.1:38120';

function fixture({url = origin + '/business-login', result = 'resolve', finalUrl = origin + '/user-login?portal=business', status = 200} = {}) {
  const wc = new EventEmitter();
  wc.stopped = false;
  wc.loadURL = async requested => {
    if (result === 'reject') {
      const error = Error("ERR_ABORTED (-3) loading '" + requested + "'");
      error.code = 'ERR_ABORTED';
      error.errno = -3;
      throw error;
    }
    if (result === 'reject-other') throw Object.assign(Error("ERR_FAILED (-2) loading '" + requested + "'"), {code: 'ERR_FAILED', errno: -2});
    // Electron reports the navigation status before the loadURL promise settles.
    wc.emit('did-navigate', {}, finalUrl, status);
  };
  wc.getURL = () => finalUrl;
  wc.isDestroyed = () => false;
  wc.stop = () => { wc.stopped = true; };
  return wc;
}

(async () => {
  // The shipped local frontend answers /business-login with 307 to /user-login;
  // Electron surfaces that redirect as ERR_ABORTED on the loadURL promise.
  await loadWorkspace(fixture({result: 'reject'}), origin + '/business-login', origin);

  // A load that actually failed, or that left the workspace origin, must still throw.
  await assert.rejects(loadWorkspace(fixture({result: 'reject-other'}), origin + '/business-login', origin), /ERR_FAILED/);
  await assert.rejects(loadWorkspace(fixture({result: 'reject', finalUrl: 'about:blank'}), origin + '/business-login', origin), /ERR_ABORTED/);
  await assert.rejects(loadWorkspace(fixture({result: 'reject', finalUrl: 'https://evil.invalid/business-login'}), origin + '/business-login', origin), /ERR_ABORTED/);

  // Normal loads and HTTP errors behave as before.
  await loadWorkspace(fixture(), origin + '/business-login', origin);
  await assert.rejects(loadWorkspace(fixture({status: 503}), origin + '/business-login', origin), /HTTP 503/);

  // A stalled server still times out and stops the load.
  const stalled = fixture({result: 'reject-other'});
  stalled.loadURL = () => new Promise(() => {});
  await assert.rejects(loadWorkspace(stalled, origin + '/business-login', origin, {timeoutMs: 30}), /did not respond/);
  assert.equal(stalled.stopped, true);

  console.log('local login redirect: ERR_ABORTED from the redirected login route is tolerated, genuine failures, foreign origins, HTTP errors and stalls still fail');
})().catch(error => { console.error(error); process.exitCode = 1; });
