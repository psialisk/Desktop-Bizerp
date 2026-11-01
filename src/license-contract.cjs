// Generated from canonical backend offline-license. Run scripts/sync-license-contract.cjs after backend build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_LICENSE_TEXT = void 0;
exports.publicFingerprint = publicFingerprint;
exports.validateOfflineClaims = validateOfflineClaims;
exports.signOfflineGrant = signOfflineGrant;
exports.verifyOfflineGrant = verifyOfflineGrant;
exports.effectiveOfflineGrants = effectiveOfflineGrants;
exports.createActivationRequest = createActivationRequest;
exports.verifyActivationRequest = verifyActivationRequest;
const crypto_1 = require("crypto");
exports.MAX_LICENSE_TEXT = 65536;
const uuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const id = (v, max = 80) => typeof v === 'string' && v.length > 0 && v.length <= max && /^[a-zA-Z0-9_:/.-]+$/.test(v);
const integer = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(v) && v >= min && v <= max;
const fail = (s) => { throw new Error(s); };
function rsa(key, priv = false) { const k = key instanceof crypto_1.KeyObject ? key : priv ? (0, crypto_1.createPrivateKey)(key) : (0, crypto_1.createPublicKey)(key); if (k.asymmetricKeyType !== 'rsa' || (k.asymmetricKeyDetails?.modulusLength || 0) < 2048)
    fail('RSA key must be at least 2048 bits'); return k; }
function publicFingerprint(publicKey) { return (0, crypto_1.createHash)('sha256').update(rsa(publicKey).export({ type: 'spki', format: 'der' })).digest('hex'); }
function segments(text, prefix, count) { if (typeof text !== 'string' || text.length > exports.MAX_LICENSE_TEXT)
    fail('Activation text size exceeds limit'); const parts = text.trim().split('.'); if (parts.length !== count || parts[0] !== prefix || parts.slice(1).some(s => !s || !/^[A-Za-z0-9_-]+$/.test(s)))
    fail('Invalid activation format'); return parts; }
function decode(encoded) { const bytes = Buffer.from(encoded, 'base64url'); if (bytes.length > 32768 || bytes.toString('base64url') !== encoded)
    fail('Invalid activation payload size or encoding'); try {
    return JSON.parse(bytes.toString('utf8'));
}
catch {
    fail('Invalid activation JSON');
} }
function stringList(v, max = 64) { return Array.isArray(v) && v.length <= max && v.every(s => id(s)) && new Set(v).size === v.length; }
function grant(g) { if (!g || !id(g.industryId) || !id(g.templateId) || !stringList(g.blocks) || !g.blocks.length || !stringList(g.workflowIds) || !stringList(g.specializationIds, 7))
    fail('Invalid foundation grants'); }
function validateOfflineClaims(c) {
    if (!c || c.v !== 1 || !id(c.issuerKeyId, 40) || !uuid(c.licenseId) || !uuid(c.activationId) || !integer(c.revision, 1) || !['cloud', 'desktop', 'android'].includes(c.platform) || !uuid(c.installationId) || !id(c.localBusinessId, 160) || !/^[a-f0-9]{64}$/.test(c.fingerprint) || !id(c.planId) || c.catalogVersion !== 1 || !id(c.branchId))
        fail('Invalid activation claims or catalog version');
    if (!['trial', 'paid'].includes(c.kind) || !integer(c.trialDays, 1, 3650) || !integer(c.graceDays, 0, 365))
        fail('Invalid activation policy');
    for (const k of ['issuedAt', 'notBefore', 'expiresAt', 'graceEndsAt'])
        if (typeof c[k] !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(c[k]) || !Number.isFinite(Date.parse(c[k])))
            fail('Invalid activation date');
    if (Date.parse(c.expiresAt) <= Date.parse(c.notBefore) || Date.parse(c.graceEndsAt) !== Date.parse(c.expiresAt) + c.graceDays * 86400000 || Date.parse(c.issuedAt) > Date.parse(c.expiresAt))
        fail('Invalid activation validity');
    grant(c.grants);
    if (c.scheduled) {
        if (!c.scheduled.effectiveAt || !Number.isFinite(Date.parse(c.scheduled.effectiveAt)) || Date.parse(c.scheduled.effectiveAt) <= Date.parse(c.notBefore) || Date.parse(c.scheduled.effectiveAt) >= Date.parse(c.expiresAt))
            fail('Invalid scheduled entitlement time');
        grant(c.scheduled.grants);
    }
    return c;
}
function signOfflineGrant(claims, issuer) {
    validateOfflineClaims(claims);
    if (claims.issuerKeyId !== issuer.keyId)
        fail('Issuer key does not match claims');
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    if (Buffer.byteLength(JSON.stringify(claims)) > 32768)
        fail('Activation payload size exceeds limit');
    const signingInput = `GNJA1.${issuer.keyId}.${payload}`;
    return signingInput + '.' + (0, crypto_1.sign)('RSA-SHA256', Buffer.from(signingInput), rsa(issuer.privateKey, true)).toString('base64url');
}
function verifyOfflineGrant(text, publicKeys, binding, now = new Date(), allowExpiredForReadOnly = false) {
    const parts = segments(text, 'GNJA1', 4), key = publicKeys[parts[1]];
    if (!key)
        fail('Activation issuer is not trusted');
    if (!(0, crypto_1.verify)('RSA-SHA256', Buffer.from(parts.slice(0, 3).join('.')), rsa(key), Buffer.from(parts[3], 'base64url')))
        fail('Invalid activation signature');
    const c = validateOfflineClaims(decode(parts[2]));
    if (c.issuerKeyId !== parts[1])
        fail('Issuer key mismatch');
    if (['platform', 'installationId', 'localBusinessId', 'fingerprint'].some(k => c[k] !== binding[k]) || (binding.licenseId && binding.licenseId !== c.licenseId))
        fail('Activation binding does not match this installation/business');
    if (c.revision < (binding.minimumRevision || 0))
        fail('Activation revision rollback rejected');
    if (binding.lastSeen && now.getTime() + 300000 < Date.parse(binding.lastSeen))
        fail('Device clock moved backwards; license review required');
    if (!Number.isFinite(now.getTime()) || now.getTime() < Date.parse(c.notBefore))
        fail('Activation is not active yet');
    if (!allowExpiredForReadOnly && now.getTime() >= Date.parse(c.graceEndsAt))
        fail('Activation expired; import renewal');
    return c;
}
function effectiveOfflineGrants(c, now = new Date()) { return c.scheduled && now.getTime() >= Date.parse(c.scheduled.effectiveAt) ? c.scheduled.grants : c.grants; }
function createActivationRequest(identity, privateKey) { const key = rsa(privateKey, true), publicKey = (0, crypto_1.createPublicKey)(key).export({ type: 'spki', format: 'pem' }).toString(); const payload = Buffer.from(JSON.stringify({ v: 1, ...identity, publicKey })).toString('base64url'); const input = 'GNJR1.' + payload; return input + '.' + (0, crypto_1.sign)('RSA-SHA256', Buffer.from(input), key).toString('base64url'); }
function verifyActivationRequest(text) { const p = segments(text, 'GNJR1', 3), r = decode(p[1]); if (!r || r.v !== 1 || !uuid(r.installationId) || !id(r.localBusinessId, 160) || !['cloud', 'desktop', 'android'].includes(r.platform) || r.capabilityVersion !== 1 || !stringList(r.supportedKinds, 7) || typeof r.publicKey !== 'string' || r.publicKey.length > 4096)
    fail('Invalid activation request'); const key = rsa(r.publicKey); if (!(0, crypto_1.verify)('RSA-SHA256', Buffer.from(p.slice(0, 2).join('.')), key, Buffer.from(p[2], 'base64url')))
    fail('Invalid installation proof signature'); return { ...r, fingerprint: publicFingerprint(key) }; }
