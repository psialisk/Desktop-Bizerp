// Network-first login: while the ERP server answers, only online sign-in is offered.
// Local sign-in is the offline fallback, and only for a PC whose owner has signed in
// online recently enough that the cached account can be trusted.
const {networkTarget} = require('./network-window.cjs');

const PROBE_TIMEOUT_MS = 3000;
const RETRY_DELAY_MS = 1500;
const CACHE_MS = 60000;
const MAX_LOCAL_DAYS = 30;

// A reachable server is one that answers `/health` with JSON. A captive portal or a
// proxy error page answers HTML, which must not be mistaken for a usable API.
async function probe(api, {fetchImpl = fetch, timeoutMs = PROBE_TIMEOUT_MS, retryDelayMs = RETRY_DELAY_MS} = {}) {
  const endpoint = String(api || '').replace(/\/+$/, '') + '/health';
  const attempt = async () => {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'GET',
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {Accept: 'application/json'},
      });
      const type = String(response.headers?.get?.('content-type') || '').toLowerCase();
      return type.includes('json');
    } catch {
      return false;
    }
  };
  if (await attempt()) return true;
  await new Promise(resolve => setTimeout(resolve, retryDelayMs));
  return attempt();
}

/**
 * Caches the last probe per API base for a minute so the login screen can render
 * without re-probing on every status refresh. `check(force)` always re-probes.
 */
function createReachability({fetcher} = {}) {
  let key = null, checkedAt = 0, value = null, pending = null;
  return {
    last(api) {
      if (api !== key) return {checked: false, reachable: null, checkedAt: null};
      return {checked: value !== null, reachable: value, checkedAt: checkedAt || null};
    },
    check(api, {force = false, now = Date.now()} = {}) {
      if (api !== key) { key = api; value = null; checkedAt = 0; }
      if (!force && value !== null && now - checkedAt < CACHE_MS) return Promise.resolve(value);
      if (!pending) {
        pending = probe(api, fetcher ? {fetchImpl: fetcher} : {})
          .then(result => { value = result; checkedAt = Date.now(); return result; })
          .finally(() => { pending = null; });
      }
      return pending;
    },
  };
}

const DAY_MS = 86400000;

/** Local sign-in is a fallback: never while the server answers, never without a recent online sign-in. */
function localLoginDecision({reachable, lastOnlineAt, now = Date.now(), maxAgeDays = MAX_LOCAL_DAYS}) {
  if (reachable === true) return {allowed: false, reason: 'Sign in online: the server is reachable.'};
  if (reachable !== false) return {allowed: false, reason: 'Checking the server before offering local sign-in.'};
  const last = Number(lastOnlineAt) || 0;
  if (!last) return {allowed: false, reason: 'No online sign-in is saved on this PC yet. Connect once to enable offline sign-in.'};
  const age = now - last;
  if (age > maxAgeDays * DAY_MS) {
    return {allowed: false, reason: 'The last online sign-in on this PC is older than ' + maxAgeDays + ' days. Connect to sign in online first.'};
  }
  return {allowed: true, reason: null};
}

/**
 * The cached entitlement is the read-only decision the server made at the last online
 * sign-in, plus the paid-until date it reported then. Past that date the offline session
 * is read-only without another server call; nothing is inferred beyond what was cached.
 */
function cachedEntitlement({readOnly, paidUntil, lastOnlineAt, now = Date.now()}) {
  if (readOnly === true) {
    const since = Number(lastOnlineAt) || 0;
    const when = since ? new Date(since).toISOString().slice(0, 10) : 'the last online sign-in';
    return {
      readOnly: true,
      reason: 'Offline session is read-only: the server last reported this subscription as read-only (checked ' + when + '). Saved records stay readable; reconnect to make changes.',
    };
  }
  const until = Number(paidUntil) || 0;
  if (!until || now < until) return {readOnly: false, reason: null};
  return {
    readOnly: true,
    reason: 'Offline session is read-only: the paid period reported by the server ended on ' + new Date(until).toISOString().slice(0, 10) + '. Saved records stay readable; reconnect to make changes.',
  };
}

function apiFor(server, cloudApi) {
  return require('./login-session.cjs').connection(server, cloudApi).api;
}

module.exports = {
  PROBE_TIMEOUT_MS, RETRY_DELAY_MS, CACHE_MS, MAX_LOCAL_DAYS,
  probe, createReachability, localLoginDecision, cachedEntitlement, apiFor, networkTarget,
};
