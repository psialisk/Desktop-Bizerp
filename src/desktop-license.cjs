// Generated from canonical backend desktop-license. Run scripts/sync-license-contract.cjs after backend build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicFingerprint = publicFingerprint;
exports.verifyDesktopRequest = verifyDesktopRequest;
exports.validateDesktopClaims = validateDesktopClaims;
exports.signDesktopGrant = signDesktopGrant;
exports.verifyDesktopGrant = verifyDesktopGrant;
const crypto_1 = require("crypto");
const fail = (message) => { throw new Error(message); };
const uuid = (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const id = (s, max = 80) => typeof s === 'string' && s.length > 0 && s.length <= max && /^[a-zA-Z0-9_:/.-]+$/.test(s);
const date = (s) => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s) && Number.isFinite(Date.parse(s));
function rsa(value, privateKey = false) { const key = value instanceof crypto_1.KeyObject ? value : privateKey ? (0, crypto_1.createPrivateKey)(value) : (0, crypto_1.createPublicKey)(value); if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength || 0) < 2048)
    fail('RSA key must be at least 2048 bits'); return key; }
function publicFingerprint(key) { return (0, crypto_1.createHash)('sha256').update(rsa(key).export({ type: 'spki', format: 'der' })).digest('hex'); }
function parts(text, prefix) { if (typeof text !== 'string' || text.length > 65536)
    fail('Invalid activation text size'); const p = text.trim().split('.'); if (p.length !== 3 || p[0] !== prefix || p.slice(1).some(s => !s || !/^[A-Za-z0-9_-]+$/.test(s)))
    fail('Invalid activation format'); return p; }
function decode(s) { const b = Buffer.from(s, 'base64url'); if (b.length > 32768 || b.toString('base64url') !== s)
    fail('Invalid activation encoding'); return JSON.parse(b.toString('utf8')); }
const list = (v, max = 64) => Array.isArray(v) && v.length <= max && v.every(s => id(s)) && new Set(v).size === v.length;
function verifyDesktopRequest(text) { const full = text?.trim().startsWith('GNJR2.'), p = parts(text, full ? 'GNJR2' : 'GNJR1'), r = decode(p[1]); if (r?.v !== (full ? 2 : 1) || r.platform !== 'desktop' || !uuid(r.installationId) || !uuid(r.localBusinessId) || r.capabilityVersion !== (full ? 2 : 1) || (r.installedVersion !== undefined && !id(r.installedVersion, 50)) || (r.selectedPackage !== undefined && !id(r.selectedPackage)) || !(full ? list(r.supportedPackages, 64) : list(r.supportedKinds, 7)) || typeof r.publicKey !== 'string' || r.publicKey.length > 4096)
    fail('Invalid desktop installation request'); const key = rsa(r.publicKey); if (!(0, crypto_1.verify)('RSA-SHA256', Buffer.from(p.slice(0, 2).join('.')), key, Buffer.from(p[2], 'base64url')))
    fail('Invalid installation proof'); return { ...r, fingerprint: publicFingerprint(key) }; }
function validateDesktopClaims(c) {
    if (c?.v !== 2 || !['perpetual', 'extension'].includes(c.kind) || c.platform !== 'desktop' || !id(c.issuerKeyId, 40) || !uuid(c.licenseId) || !uuid(c.activationId) || !Number.isSafeInteger(c.revision) || c.revision < 1 || !uuid(c.installationId) || !uuid(c.localBusinessId) || !/^[a-f0-9]{64}$/.test(c.fingerprint) || !id(c.planId) || c.catalogVersion !== 1 || !id(c.branchId) || !id(c.purchasedVersion, 50) || !date(c.issuedAt) || !date(c.notBefore))
        fail('Invalid local desktop license');
    if (Date.parse(c.issuedAt) > Date.parse(c.notBefore))
        fail('Invalid activation start');
    if (c.kind === 'perpetual') {
        if (c.expiresAt !== null || c.graceEndsAt !== null)
            fail('Permanent license cannot expire');
    }
    else if (!Number.isSafeInteger(c.extensionDays) || c.extensionDays < 1 || c.extensionDays > 3650 || !Number.isSafeInteger(c.graceDays) || c.graceDays < 0 || c.graceDays > 365 || !date(c.expiresAt) || !date(c.graceEndsAt) || Date.parse(c.expiresAt) <= Date.parse(c.notBefore) || Date.parse(c.graceEndsAt) !== Date.parse(c.expiresAt) + c.graceDays * 86400000)
        fail('Invalid local extension validity');
    for (const k of ['updatesUntil', 'supportUntil'])
        if (c[k] !== null && !date(c[k]))
            fail('Invalid update/support term');
    const g = c.grants;
    if (!g || !id(g.industryId) || !id(g.templateId) || !list(g.blocks) || !g.blocks.length || !list(g.workflowIds) || !list(g.specializationIds, 7))
        fail('Invalid foundation grants');
    const l = c.limits;
    if (!l || !Number.isSafeInteger(l.branches) || l.branches < 1 || !Number.isSafeInteger(l.registersPerBranch) || l.registersPerBranch < 1 || !Number.isSafeInteger(l.internalAccounts) || l.internalAccounts < 1)
        fail('Invalid license capacity');
    return c;
}
function signDesktopGrant(claims, issuer) { const c = validateDesktopClaims({ ...claims, issuerKeyId: issuer.keyId }), payload = Buffer.from(JSON.stringify(c)).toString('base64url'); if (payload.length > 44000)
    fail('Desktop license too large'); const input = 'GNJD1.' + payload; return input + '.' + (0, crypto_1.sign)('RSA-SHA256', Buffer.from(input), rsa(issuer.privateKey, true)).toString('base64url'); }
function verifyDesktopGrant(text, keys, binding, now = new Date(), allowExpiredForReadOnly = false) {
    const p = parts(text, 'GNJD1'), c = validateDesktopClaims(decode(p[1])), key = keys[c.issuerKeyId];
    if (!key)
        fail('Activation issuer is not trusted');
    if (!(0, crypto_1.verify)('RSA-SHA256', Buffer.from(p.slice(0, 2).join('.')), rsa(key), Buffer.from(p[2], 'base64url')))
        fail('Invalid activation signature');
    if (['platform', 'installationId', 'localBusinessId', 'fingerprint'].some(k => binding[k] !== c[k]) || (binding.licenseId && binding.licenseId !== c.licenseId))
        fail('Activation binding does not match this installation/business');
    if (binding.installedVersion !== c.purchasedVersion)
        fail('This license covers a different purchased version');
    if (c.revision < (binding.minimumRevision || 0))
        fail('Activation revision rollback rejected');
    if (binding.lastSeen && now.getTime() + 300000 < Date.parse(binding.lastSeen))
        fail('Device clock moved backwards; review required');
    if (!allowExpiredForReadOnly && c.kind === 'extension' && now.getTime() >= Date.parse(c.graceEndsAt))
        fail('Local extension expired; import renewal');
    if (!Number.isFinite(now.getTime()) || now.getTime() < Date.parse(c.notBefore))
        fail('Activation is not active yet');
    return c;
}
