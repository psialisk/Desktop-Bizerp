'use strict';
/**
 * Narrow Electron bridge for the desktop update client.
 *
 * Only these owner-authorized operations are exposed: status, check, download
 * with progress, encrypted backup upload, restart approval and install. The
 * renderer never receives the installation token, the backup key or the
 * installer path. Install is refused unless the currently downloaded release
 * has a cloud-verified backup and the owner approved the restart.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createPublicKey, randomBytes, randomUUID, sign } = require('node:crypto');
const defaults = require('./app-updates.cjs');

const API_BASE_ENV = 'BIZERP_APP_UPDATES_API';
const TOKEN_ENV = 'BIZERP_APP_UPDATE_INSTALLATION_TOKEN';
const BACKUP_KEY_ENV = 'BIZERP_TENANT_BACKUP_KEY';
const HEX_KEY = /^[a-f0-9]{64}$/;

function registerAppUpdates(options) {
  const {
    ipcMain, getRuntime, login, trusted, action, dialog, getDialogHost, app, root,
    broadcast = () => {}, beforeInstall, finishInstall,
    env = process.env, fetchImpl = fetch, updates = defaults,
    verifyInstaller = updates.verifyAuthenticode, launchInstaller = updates.launchInstaller,
  } = options;
  if (!ipcMain || !getRuntime || !login || !trusted || !action) throw new Error('Update bridge dependencies are incomplete');
  if (!root) throw new Error('Update bridge needs the private runtime root');

  const state = { release: null, checkedAt: null, download: null, backup: null, restartApproved: false, check: null };
  const ownerAction = fn => action(fn, { owner: true });
  const emit = (phase, detail = {}) => {
    try { broadcast({ phase, ...detail }); } catch (_) { /* the UI is optional */ }
  };

  function config() {
    const runtime = getRuntime();
    const saved = runtime?.v?.appUpdates || {};
    const apiBase = String(env[API_BASE_ENV] || saved.apiBase || runtime?.manifest?.cloudApi || '').replace(/\/$/, '');
    const token = String(env[TOKEN_ENV] || saved.token || '');
    const installationId = String(saved.installationId || runtime?.v?.cloudBinding?.installationId || runtime?.v?.instanceId || '');
    return {
      runtime, apiBase, token, installationId,
      currentVersion: String(runtime?.manifest?.version || require('../package.json').version),
      localSchemaVersion: Number(env.BIZERP_APP_SCHEMA_VERSION || runtime?.manifest?.schemaVersion || 1),
      canonicalContractVersion: Number(env.APP_CANONICAL_CONTRACT_VERSION || 1),
    };
  }

  function requireToken() {
    const cfg = config();
    if (!cfg.token || !cfg.apiBase) throw new Error('This PC is not linked for updates. Sign in online as the business owner or activate a perpetual licence.');
    return cfg;
  }

  /** The stored local licence identity owns the perpetual grant and the device key that signs for it. */
  function nativeCredential() {
    const stored = getRuntime()?.v?.offlineLicense;
    const unlinked = 'This PC is not linked for updates. Sign in online as the business owner or activate a perpetual licence.';
    if (!stored?.proof?.privateKey || !stored?.proof?.publicKey) throw new Error(unlinked);
    const grant = String(stored.token || '').trim();
    if (!grant) throw new Error(unlinked);
    return { proof: stored.proof, grant };
  }

  /** A fresh device-key proof binds the perpetual licence to this installation. */
  function nativeProof(proof, installationId) {
    const publicKey = createPublicKey(proof.publicKey).export({ type: 'spki', format: 'der' }).toString('base64');
    const proofText = JSON.stringify({ action: 'app-update-register', installationId, requestId: randomUUID(), issuedAt: Date.now(), publicKey });
    return { proofText, signature: sign('RSA-SHA256', Buffer.from(proofText), proof.privateKey).toString('base64') };
  }

  /** Registers a perpetual offline install without a staff JWT; the tenant is never chosen here. */
  async function registerNative() {
    const cfg = config();
    if (!cfg.apiBase) throw new Error('Cloud API address is unavailable; sign in online once to link updates');
    const { proof, grant } = nativeCredential();
    const installationId = proof.installationId;
    const response = await fetchImpl(cfg.apiBase + '/app-updates/installations/register-native', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        platform: 'windows', architecture: process.arch === 'arm64' ? 'arm64' : 'x64',
        installationId, currentVersion: cfg.currentVersion, localSchemaVersion: cfg.localSchemaVersion,
        canonicalContractVersion: cfg.canonicalContractVersion, channel: 'stable',
        grant, ...nativeProof(proof, installationId),
      }),
    });
    const data = await readJson(response);
    if (typeof data.installationToken !== 'string' || data.installationToken.length < 40) throw new Error('Update registration returned no installation token');
    await saveInstallation({ token: data.installationToken, apiBase: cfg.apiBase, installationId, linkedAt: new Date().toISOString() });
    emit('linked', { version: cfg.currentVersion, native: true });
    return { linked: true, installationId, capabilities: data.capabilities || null, native: true };
  }

  /** Uses the stored installation token, registering a perpetual licence offline when there is none. */
  async function credential() {
    const cfg = config();
    if (cfg.token) return cfg;
    await registerNative();
    return requireToken();
  }

  function status() {
    const cfg = config();
    const release = state.release;
    const backupMatches = !!(release && state.backup?.verified && state.backup.releaseId === release.id);
    return {
      linked: !!(cfg.token && cfg.apiBase),
      apiBase: cfg.apiBase || null,
      installationId: cfg.installationId || null,
      currentVersion: cfg.currentVersion,
      checkedAt: state.checkedAt,
      updateAvailable: !!release,
      release: release ? { id: release.id, version: release.version, mandatory: !!release.mandatory, releaseNotes: release.releaseNotes || null, artifact: { filename: release.artifact?.filename || null, sizeBytes: release.artifact?.sizeBytes || null } } : null,
      policy: state.check?.policy || null,
      download: state.download ? { version: state.download.version, file: state.download.file ? path.basename(state.download.file) : null, ready: !!state.download.file, progress: state.download.progress || 100 } : null,
      backup: state.backup ? { status: state.backup.verified ? 'verified' : 'failed', id: state.backup.id || null, checksum: state.backup.checksum || null, createdAt: state.backup.createdAt || null } : null,
      restartApproved: state.restartApproved,
      installReady: !!(state.download?.file && backupMatches && state.restartApproved),
      blockedReason: !release ? 'No downloaded update.' : !state.download?.file ? 'Download the update first.' : !backupMatches ? 'Create and verify a cloud backup before installing.' : !state.restartApproved ? 'Approve the restart before installing.' : null,
      state: { downloadedAt: state.download?.downloadedAt || null, error: state.check?.error || null },
    };
  }

  async function saveInstallation(values) {
    const runtime = getRuntime();
    runtime.v = { ...runtime.v, appUpdates: { ...(runtime.v.appUpdates || {}), ...values } };
    await runtime.secrets.save(runtime.v);
  }

  async function readJson(response) {
    if (!response.ok) {
      let message = 'Update service returned HTTP ' + response.status;
      try { message = JSON.parse(await response.text()).message || message; } catch (_) { /* keep status */ }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  /** Registers/refreshes this installation from a verified cloud owner login. The JWT stays in memory. */
  async function linkInstallation({ apiBase, ownerToken, actor }) {
    if (!actor || actor.role !== 'owner' || !actor.tenantId) throw new Error('A verified cloud business owner is required');
    if (!ownerToken) throw new Error('Cloud owner authorization is missing');
    const cfg = config();
    const api = String(apiBase || '').replace(/\/$/, '');
    if (!api) throw new Error('Cloud API address is unavailable');
    const installationId = cfg.installationId;
    if (!installationId) throw new Error('This installation has no stable identifier');
    const response = await fetchImpl(api + '/app-updates/installations/register', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bearer ' + ownerToken, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        installationId, platform: 'windows', architecture: process.arch === 'arm64' ? 'arm64' : 'x64',
        currentVersion: cfg.currentVersion, localSchemaVersion: cfg.localSchemaVersion,
        canonicalContractVersion: cfg.canonicalContractVersion, channel: 'stable',
      }),
    });
    const data = await readJson(response);
    if (typeof data.installationToken !== 'string' || data.installationToken.length < 40) throw new Error('Update registration returned no installation token');
    await saveInstallation({ token: data.installationToken, apiBase: api, installationId, linkedAt: new Date().toISOString() });
    emit('linked', { version: cfg.currentVersion });
    return { linked: true, installationId, capabilities: data.capabilities || null };
  }

  async function onCloudLogin({ api, token, actor }) {
    try { return await linkInstallation({ apiBase: api, ownerToken: token, actor }); }
    catch (error) {
      const runtime = getRuntime();
      try { runtime?.message?.('Business signed in; update registration is unavailable: ' + String(error.message || error)); } catch (_) { /* status is best effort */ }
      return { linked: false, error: String(error.message || error) };
    }
  }

  const checkWith = cfg => updates.checkForUpdate({
    apiBase: cfg.apiBase, installationToken: cfg.token, currentVersion: cfg.currentVersion,
    localSchemaVersion: cfg.localSchemaVersion, canonicalContractVersion: cfg.canonicalContractVersion,
  });

  async function check() {
    let cfg = await credential();
    let result;
    try { result = await checkWith(cfg); }
    catch (error) {
      // An expired or revoked installation token is renewed from the signed licence.
      if (error?.status !== 401 && error?.status !== 403) throw error;
      try { await registerNative(); } catch (_) { throw error; }
      cfg = requireToken();
      result = await checkWith(cfg);
    }
    const next = result.updateAvailable && result.release ? {
      ...result.release,
      mandatory: !!(result.release.mandatoryUpdate || result.release.mandatory),
      releaseNotes: result.release.releaseNotes || result.release.notes || null,
    } : null;
    if (next?.id !== state.release?.id) {
      state.release = next;
      state.download = null;
      state.backup = null;
      state.restartApproved = false;
    }
    state.checkedAt = result.checkedAt || new Date().toISOString();
    state.check = { at: state.checkedAt, policy: result.policy || null, capabilities: result.capabilities || null, error: null };
    emit('checked', { updateAvailable: !!next, version: next?.version || null });
    return status();
  }

  async function download() {
    const cfg = requireToken();
    if (!state.release) throw new Error('Check for an update first');
    state.download = null; state.backup = null; state.restartApproved = false;
    const destination = path.join(root, 'app-updates');
    emit('download', { percent: 0 });
    const downloaded = await updates.downloadUpdate({
      apiBase: cfg.apiBase, installationToken: cfg.token, release: state.release, destination,
      onProgress: progress => {
        state.download = { ...(state.download || {}), progress: progress.percent };
        emit('download', progress);
      },
    });
    state.download = { file: downloaded.file, sha256: downloaded.sha256, version: state.release.version, releaseId: state.release.id, downloadedAt: new Date().toISOString(), progress: 100 };
    emit('downloaded', { version: state.release.version });
    return status();
  }

  function backupKey(runtime) {
    let key = String(env[BACKUP_KEY_ENV] || '').trim().toLowerCase();
    if (!key) key = String(runtime.v.appUpdateBackupKey || '').trim().toLowerCase();
    if (!key) key = randomBytes(32).toString('hex');
    if (!HEX_KEY.test(key)) throw new Error('The tenant backup key must be 64 hexadecimal characters');
    return key;
  }

  async function createBackup() {
    const cfg = requireToken();
    if (!state.release || !state.download?.file) throw new Error('Download the update before creating its pre-install backup');
    const runtime = getRuntime();
    if (!runtime?.v?.databases?.live) throw new Error('A local live database is required before an update');
    const key = backupKey(runtime);
    if (runtime.v.appUpdateBackupKey !== key) {
      runtime.v = { ...runtime.v, appUpdateBackupKey: key };
      await runtime.secrets.save(runtime.v);
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const workspace = path.join(root, 'app-update-backups', stamp);
    await fsp.mkdir(workspace, { recursive: true });
    emit('backup', { status: 'creating' });
    const backupDirectory = await runtime.backup(workspace);
    const outputFile = path.join(workspace, 'pre-update.bzbackup');
    const archive = await updates.createEncryptedBackup({ backupDirectory, outputFile, keyHex: key });
    emit('backup', { status: 'uploading', percent: 0 });
    const completed = await updates.uploadBackup({
      apiBase: cfg.apiBase, installationToken: cfg.token, archive,
      metadata: {
        backupType: 'pre_update', applicationVersion: cfg.currentVersion,
        schemaVersion: cfg.localSchemaVersion, canonicalContractVersion: cfg.canonicalContractVersion,
        backupFormatVersion: 1, deviceId: cfg.installationId,
        encryptionVersion: 'AES-256-GCM', encryptionKeyReference: 'desktop-local-v1',
        syncCheckpoint: {}, recordCounts: { files: archive.recordCount },
      },
    });
    const verified = completed?.status === 'verified';
    state.backup = { verified, id: completed?.id || null, checksum: archive.checksum, sizeBytes: archive.sizeBytes, releaseId: state.release.id, createdAt: new Date().toISOString() };
    if (!verified) { state.restartApproved = false; throw new Error('The cloud backup was not verified; installation stays blocked'); }
    emit('backup', { status: 'verified', checksum: archive.checksum });
    return status();
  }

  async function approveRestart() {
    const cfg = requireToken();
    if (!state.download?.file || !state.release) throw new Error('Download the update first');
    if (!state.backup?.verified || state.backup.releaseId !== state.release.id) throw new Error('A verified cloud backup is required before approving a restart');
    const window = typeof getDialogHost === 'function' ? getDialogHost() : undefined;
    if (dialog) {
      const answer = await dialog.showMessageBox(window, {
        type: 'warning', buttons: ['Cancel', 'Restart and install'], defaultId: 0, cancelId: 0,
        message: 'Restart Business ERP and install version ' + state.release.version + '?',
        detail: 'The encrypted backup was verified by the cloud service. The signed installer was checked before launch. Close or save local work before continuing.',
        noLink: true,
      });
      if (answer.response !== 1) return { ...status(), restartApproved: false };
    }
    state.restartApproved = true;
    emit('approved', { version: state.release.version });
    return status();
  }

  async function install() {
    requireToken();
    if (!state.release || !state.download?.file) throw new Error('Download the update first');
    if (!state.backup?.verified || state.backup.releaseId !== state.release.id) throw new Error('A verified cloud backup is required before install');
    if (!state.restartApproved) throw new Error('Restart approval is required before install');
    if (!fs.existsSync(state.download.file)) throw new Error('The downloaded installer is missing; download it again');
    const digest = await updates.sha256File(state.download.file);
    if (digest !== state.download.sha256) throw new Error('The downloaded installer changed after verification');
    const signature = await verifyInstaller(state.download.file);
    if (typeof beforeInstall === 'function' && !await beforeInstall()) throw new Error('Restart cancelled; the update was not installed');
    const launched = launchInstaller(state.download.file);
    emit('installing', { version: state.release.version });
    if (typeof finishInstall === 'function') await finishInstall();
    else app?.quit?.();
    return { installing: true, version: state.release.version, sha256: digest, publisher: signature?.Subject || null, pid: launched?.pid || null };
  }

  ipcMain.handle('updates:status', event => { trusted(event); return status(); });
  ipcMain.handle('updates:check', ownerAction(check));
  ipcMain.handle('updates:download', ownerAction(download));
  ipcMain.handle('updates:backup', ownerAction(createBackup));
  ipcMain.handle('updates:approve-restart', ownerAction(approveRestart));
  ipcMain.handle('updates:install', ownerAction(install));

  return { onCloudLogin, linkInstallation, status };
}

module.exports = { registerAppUpdates };
