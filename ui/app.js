const api=window.storeDesktop,$=id=>document.getElementById(id);

const page=location.hash.slice(1)||'login';let operationLabel='Preparing local services…',current={},network=false,localErpAddress=false,kind='owner',pending=false,workflowTouched=false,recovery=null,welcome=null,recoveryLoading=false,maintenanceResult='',updatesInfo=null,updatesLoading=false,updatesError='',updateProgress=null;

for(const id of ['login','create','license','tools','recovery'])$(id+'Page').hidden=id!==page;

if(page!=='login')document.body.classList.add('aux');

function errorFor(){return $(page==='login'?'error':page+'Error');}

function showError(text){const node=errorFor();node.textContent=text;node.hidden=!text;}

function iconText(node,icon,label){const image=document.createElement('i');image.className='bi bi-'+icon;node.replaceChildren(image,document.createTextNode(' '+label));}

function canLocal(){return current.initialized&&current.ready&&current.configured&&!current.upgradeAvailable;}

function render(s){current=s;

 const waiting=!!s.busy||pending;const overlay=$('loadingOverlay');overlay.hidden=!waiting;for(const main of document.querySelectorAll('main')){main.inert=waiting;main.setAttribute('aria-busy',String(waiting));}

 $('loadingTitle').textContent='Please wait…';

 $('loadingMessage').textContent=(s.busy&&s.message)||operationLabel;

 const busy=!!s.busy||pending;for(const button of document.querySelectorAll('button'))button.disabled=busy;

 if(page==='login'){

  $('forgotPassword').hidden=network||kind!=='owner'||!s.configured;

  document.body.classList.toggle('network',network);iconText($('connectionBadge'),network?'globe2':'pc-display-horizontal',network?'NETWORK':s.mode==='training'?'LOCAL Â· TRAINING':'LOCAL Â· This computer');

  $('localBusinessField').hidden=true;$('networkField').hidden=!network;$('networkUrl').disabled=busy;$('networkUrl').required=network;$('networkUrl').readOnly=!localErpAddress;$('networkUrl').placeholder=localErpAddress?'https://local-erp.example or http://192.168.1.20:3000':'https://bizerpsme.shop';$('localErpToggle').hidden=false;if(network&&!localErpAddress&&$('networkUrl').value!=='https://bizerpsme.shop')$('networkUrl').value='https://bizerpsme.shop';iconText($('localErpToggle'),localErpAddress?'cloud':'pc-display-horizontal',localErpAddress?'Use Business ERP cloud':'Connect Local ERP');$('workflowField').hidden=kind!=='pos';

  document.querySelector('[data-kind="customer"]').hidden=!network;

  for(const button of document.querySelectorAll('[data-kind]')){button.classList.toggle('selected',button.dataset.kind===kind);button.setAttribute('aria-pressed',String(button.dataset.kind===kind));}

  $('localBusiness').textContent=s.businessName||(s.configured?'Local business':'No local business created yet');

  $('signIn').textContent=pending?'Signing inâ€¦':network?'Sign in to network':'Sign in locally';$('signIn').disabled=busy||!network&&!canLocal();

  iconText($('connectionToggle'),network?'pc-display-horizontal':'wifi',network?'Use local mode':'Connect to Network');$('connectionToggle').setAttribute('aria-expanded',String(network));

  $('modeNote').textContent=network?'Network login opens the selected server workspace':'Works without internet';

  $('runtimeStatus').textContent=network?(s.startupError?'Local startup is unavailable. Network sign-in is available.':''):(s.startupError?'Local startup: '+s.startupError:s.message||'');

  maintenancePanel.hidden=network||!s.maintenanceAvailable;
  maintenanceCopy.textContent=maintenanceResult||(s.upgradeAvailable?'A reviewed update is ready. Desktop saves and verifies a local recovery backup, uploads an encrypted copy to your cloud account when the licence allows it, then migrates a restored copy. The local backup is kept if the cloud copy cannot be uploaded.':'This local schema has no reviewed migration in this package. Save a backup and contact support for a safe migration path.');
  upgradeSchemaOnly.hidden=!s.upgradeAvailable;upgradeSchemaOnly.disabled=busy||!s.upgradeAvailable;
  backupOnly.hidden=!s.configured;backupOnly.disabled=busy||!s.initialized||!s.maintenanceAvailable;
  if(!s.maintenanceAvailable)maintenanceResult='';

  const workflows=s.workflows||[];if($('workflow').options.length!==workflows.length){$('workflow').replaceChildren(...workflows.map(w=>new Option(w.name,w.id)));$('workflow').value=s.packageId==='water-refilling'?'water-desk':'retail';}

  if(!network&&!workflowTouched&&s.packageId)$('workflow').value=s.packageId==='water-refilling'?'water-desk':'retail';

 }

 if(page==='create'){

  if(s.packages?.length&&$('packageChoice').options.length!==s.packages.length){$('packageChoice').replaceChildren(...s.packages.map(p=>new Option(p.name+' Â· '+p.industry,p.id)));$('packageChoice').value='water-refilling';}

  if(s.configured)for(const button of $('createForm').querySelectorAll('button[type="submit"]'))button.disabled=true;

 }

 if(page==='license'){

  $('licenseBusiness').textContent=s.businessName||(s.configured?'Local business':'No local business yet');$('licenseStatus').textContent=s.license?.message||(!s.configured?'Create a local business first':'Local license available');

  const license=s.license||{};

  $('licenseSummaryDetails').textContent=[`Installed version: ${s.version||'Unavailable'}`,`Package: ${license.selectedPackage||s.packageId||'Choose during business setup'}`,`Access: ${license.permanent?'Permanent purchased version':license.licenseType||license.state||'No signed key'}`,`Purchased version: ${license.purchasedVersion||'—'}`,`Revision: ${license.revision||'—'}`,`Expires: ${license.permanent?'No expiry':license.expiresAt||'—'}`,`Grace ends: ${license.permanent?'Not applicable':license.graceEndsAt||'—'}`,`Original trial started: ${license.trialStartedAt||'—'}`,'','Activation history',...(license.history||[]).map(h=>`Revision ${h.revision} · ${h.licenseType} · ${h.purchasedVersion||'legacy'} · ${h.issuedAt}${h.expiresAt?' · expires '+h.expiresAt:''}`)].join('\n');

  for(const id of ['licenseRequest','licenseExport','licensePreview','licenseApply'])$(id).disabled=busy||!s.initialized;

 }

 if(page==='create')$('welcomeContinue').disabled=busy||!$('savedCredentials').checked;

 if(page==='recovery'){

  if(!busy&&!recovery&&!recoveryLoading){recoveryLoading=true;queueMicrotask(()=>perform(updateRecovery).finally(()=>{recoveryLoading=false,maintenanceResult='';}));}

  $('recoveryBusiness').value=s.businessName||'Local business';$('resetOwner').disabled=busy||!recovery?.available;

 }

 if(page==='tools'){$('cloudStatus').textContent=s.cloud?.message||'Working fully offline. Business details register when the cloud service is reachable.';$('clockSkew').hidden=!s.clockSkew;$('clockSkew').textContent=s.clockSkew?s.clockSkew.message:'';$('training').hidden=!s.trainingAvailable;renderUpdates(busy);if(!updatesInfo&&!updatesLoading&&!busy){updatesLoading=true;queueMicrotask(()=>loadUpdates());}}

}

function renderUpdates(busy){
 if(!$('updatesStatus'))return;
 const info=updatesInfo||{};
 const linked=!!info.linked;
 const release=info.release;
 const download=info.download;
 const backup=info.backup;
 const snapshot=info.snapshot;
 let text=updatesError||info.error||'';
 if(!text){
  if(!updatesInfo)text='Loading update status…';
  else if(!linked)text='This PC is not registered for updates yet. Sign in online once as the business owner to link it.';
  else if(release)text='Version '+info.currentVersion+' is installed. Update '+release.version+' is available'+(release.mandatory?' and is required':'')+'.';
  else text='Version '+info.currentVersion+' is installed. No newer compatible update is available.';
  if(download?.ready)text+=' Update downloaded'+(snapshot?.verified?' and a verified local snapshot exists'+(backup?.status==='verified'?' (also uploaded to the cloud).':'.'):' — create and verify the local snapshot next.');
  if(snapshot?.verified&&info.restartApproved)text+=' Restart approved; install is ready.';
  else if(snapshot?.verified&&!info.restartApproved)text+=' The local snapshot is verified. Approve the restart to install.';
  if(snapshot?.verified&&backup?.status==='not_uploaded')text+=' The cloud copy was skipped; the local snapshot is enough to install.';
  if(info.blockedReason&&release)text+=' '+info.blockedReason;
 }
 $('updatesStatus').textContent=text;
 $('updatesError').hidden=!(updatesError||info.error);$('updatesError').textContent=updatesError||info.error||'';
 $('updateCheck').hidden=!linked;$('updateCheck').disabled=!!busy;
 $('updateDownload').hidden=!release||!!download?.ready;$('updateDownload').disabled=!!busy;
 $('updateBackup').hidden=!download?.ready||!!snapshot?.verified;$('updateBackup').disabled=!!busy;
 $('updateApprove').hidden=!snapshot?.verified||!!info.restartApproved;$('updateApprove').disabled=!!busy;
 $('updateInstall').hidden=!info.restartApproved;$('updateInstall').disabled=!!busy||!info.installReady;
 const progress=$('updateProgress');
 const active=updateProgress!==null&&updateProgress<100;
 progress.hidden=!active;
 if(active){progress.value=updateProgress||0;}
}

async function loadUpdates(){try{updatesInfo=await api.updatesStatus();updatesError='';}catch(error){updatesError=String(error.message||'Unable to load update status');}finally{updatesLoading=false;render(current);}}

async function perform(fn,label='Completing your request…'){if(pending||current.busy)return null;showError('');operationLabel=label;pending=true;render(current);try{return await fn();}catch(error){showError(String(error.message||'Operation failed').replace(/^Error invoking remote method '[^']+': (?:Error: )?/,''));return null;}finally{pending=false;try{render(await api.status());}catch(error){render({...current,busy:false});showError('Unable to refresh local status. '+String(error.message||'Please retry.'));}}}

api.onStatus(render);api.onReturn(choice=>{network=choice.mode==='network';localErpAddress=false;$('networkUrl').value='https://bizerpsme.shop';kind=choice.kind;$('password').value='';$('password').type='password';$('showPassword').textContent='Show';render(current);});

for(const button of document.querySelectorAll('[data-kind]'))button.onclick=()=>{kind=button.dataset.kind;showError('');$('password').value='';render(current);};

$('workflow').onchange=()=>{workflowTouched=true;};

$('connectionToggle').onclick=()=>{network=!network;localErpAddress=false;$('networkUrl').value='https://bizerpsme.shop';if(!network&&kind==='customer')kind='owner';$('password').value='';showError('');render(current);};

$('localErpToggle').onclick=()=>{if(localErpAddress){localErpAddress=false;$('networkUrl').value='https://bizerpsme.shop';}else{network=true;localErpAddress=true;$('networkUrl').value='';}$('password').value='';showError('');render(current);if(localErpAddress)$('networkUrl').focus();};

$('showPassword').onclick=()=>{const input=$('password');input.type=input.type==='password'?'text':'password';$('showPassword').textContent=input.type==='password'?'Show':'Hide';$('showPassword').setAttribute('aria-label',input.type==='password'?'Show password':'Hide password');};

for(const button of document.querySelectorAll('.reveal'))button.onclick=()=>{const input=button.previousElementSibling;input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'Show':'Hide';};

window.addEventListener('blur',()=>{for(const input of document.querySelectorAll('.password-field input')){input.type='password';input.nextElementSibling.textContent='Show';}});

$('loginForm').onsubmit=event=>{event.preventDefault();const value={mode:network?'network':'local',kind,email:$('email').value,password:$('password').value,server:$('networkUrl').value,workflowId:$('workflow').value};$('password').value='';$('password').type='password';$('showPassword').textContent='Show';perform(()=>api.login(value),network?'Connecting and signing in…':'Opening your local workspace…');};

$('openLicense').onclick=()=>perform(()=>api.openWindow('license'));

for(const button of document.querySelectorAll('.close'))button.onclick=()=>window.close();

$('createForm').onsubmit=event=>{event.preventDefault();const form=new FormData(event.target),value=Object.fromEntries(form);value.training=form.has('training');for(const input of event.target.querySelectorAll('[name="password"],[name="cashierPassword"],[name="confirmation"],[name="enrollmentKey"]'))input.value='';perform(async()=>{const result=await api.setup(value);value.password='';value.cashierPassword='';if(result?.welcome){welcome=result.welcome;$('welcomeBusiness').textContent=welcome.businessName;$('welcomeOwner').textContent=welcome.ownerEmail;$('welcomeOwnerPassword').value=welcome.ownerPassword;$('welcomeCashierCard').hidden=!welcome.cashierEmail;$('welcomeCashier').textContent=welcome.cashierEmail;$('welcomeCashierPassword').value=welcome.cashierPassword;$('welcomeCode').value=welcome.recoveryCode||'';document.querySelector('.recovery-note').hidden=welcome.cloudBound;document.querySelector('#welcomeDialog .connection-badge').textContent=welcome.cloudBound?'Cloud activated Desktop':'7-day trial + 3-day grace';$('welcomeDeadline').textContent='Available until '+new Date(welcome.expiresAt).toLocaleString();$('welcomeDialog').showModal();$('createNotice').textContent='Local business created.';event.target.reset();}},'Creating the business, accounts and local storage…');};

$('forgotPassword').onclick=()=>perform(()=>api.openWindow('recovery'));

$('savedCredentials').onchange=()=>render(current);

$('welcomeDialog').addEventListener('cancel',event=>event.preventDefault());

$('saveCredentials').onclick=()=>perform(async()=>{if(await api.saveCredentials())$('welcomeFeedback').textContent='Protected credentials saved. Keep a separate safe record if you will use another Windows account.';});

$('copyRecovery').onclick=()=>perform(async()=>{await api.copy(welcome.recoveryCode);$('welcomeFeedback').textContent='Recovery code copied. Store it safely.';});

$('welcomeContinue').onclick=()=>perform(async()=>{if(!$('savedCredentials').checked)return;await api.clearWelcome();welcome=null;for(const id of ['welcomeOwnerPassword','welcomeCashierPassword','welcomeCode'])$(id).value='';window.close();});

async function updateRecovery(){const result=await api.recoveryStatus();recovery={...result,checkedAt:Date.now()};$('recoveryState').textContent=result.message;render(current);tickRecovery();}

function tickRecovery(){if(!recovery)return;const remaining=Math.max(0,recovery.remainingMs-(Date.now()-recovery.checkedAt));if(remaining<=0)recovery.available=false;const minutes=Math.ceil(remaining/60000);$('recoveryCountdown').textContent=recovery.available?Math.floor(minutes/60)+'h '+minutes%60+'m remaining':'Quick recovery unavailable';$('resetOwner').disabled=pending||!!current.busy||!recovery.available;}

$('recoveryForm').onsubmit=event=>{event.preventDefault();const value={email:$('recoveryEmail').value,code:$('recoveryCode').value,password:$('recoveryPassword').value,confirmation:$('recoveryConfirmation').value};$('recoveryPassword').value='';$('recoveryConfirmation').value='';perform(async()=>{try{const result=await api.resetOwner(value);$('recoveryState').textContent=result.message;$('recoveryCode').value='';}finally{value.password='';value.confirmation='';const previous=$('recoveryState').textContent;await updateRecovery();if(previous.startsWith('Owner password reset'))$('recoveryState').textContent=previous;}});};

$('openCredentials').onclick=()=>perform(async()=>{const saved=await api.openCredentials();if(!saved)return;$('recoveryEmail').value=saved.ownerEmail;$('recoveryCode').value=saved.recoveryCode;$('savedAccountEmails').textContent='Owner: '+saved.ownerEmail+(saved.cashierEmail?' Â· Cashier: '+saved.cashierEmail:'');$('savedOwnerPassword').value=saved.ownerPassword;$('savedCashierPassword').value=saved.cashierPassword||'';$('savedCashierField').hidden=!saved.cashierEmail;$('savedAccounts').hidden=false;});

if(page==='recovery')setInterval(tickRecovery,1000);

window.addEventListener('beforeunload',()=>{welcome=null;for(const input of document.querySelectorAll('input[type="password"],#welcomeCode,#recoveryCode,#welcomeOwnerPassword,#welcomeCashierPassword,#savedOwnerPassword,#savedCashierPassword'))input.value='';});

$('licenseExport').onclick=()=>perform(async()=>{if(await api.licenseExport())$('licenseNotice').textContent='Installation request exported. Send the .gnjrequest file to your license administrator.';});

$('licenseRequest').onclick=()=>perform(async()=>{const text=await api.licenseRequest();$('licenseRequestText').value=text;await api.copy(text);$('licenseNotice').textContent='Installation request copied. Send it to your license administrator.';});

$('licenseFile').onchange=()=>perform(async()=>{const file=$('licenseFile').files[0];if(!file)return;if(file.size>65536)throw Error('License file is too large');$('licenseKey').value=await file.text();$('licenseApply').hidden=true;});

$('licenseKey').oninput=()=>{$('licenseApply').hidden=true;$('licenseChanges').hidden=true;};

$('licensePreview').onclick=()=>perform(async()=>{const claims=await api.licensePreview($('licenseKey').value.trim());$('licenseChanges').textContent=JSON.stringify({plan:claims.planId,licenseType:claims.kind,revision:claims.revision,permanent:claims.kind==='perpetual',purchasedVersion:claims.purchasedVersion,foundation:claims.grants,expiresAt:claims.expiresAt,graceEndsAt:claims.graceEndsAt},null,2);$('licenseChanges').hidden=false;$('licenseApply').hidden=false;});

$('licenseApply').onclick=()=>perform(async()=>{const result=await api.licenseApply($('licenseKey').value.trim());if(result){$('licenseApply').hidden=true;$('licenseKey').value='';$('licenseChanges').hidden=true;$('licenseNotice').textContent='License applied. Business records preserved.';}});

upgradeSchemaOnly.onclick=()=>perform(()=>api.upgrade(),'Backing up and upgrading…');backupOnly.onclick=()=>perform(async()=>{const saved=await api.maintenanceBackup();if(saved)maintenanceResult='Backup saved to '+saved+'. The local schema was not changed.';},'Creating backup only…');$('live').onclick=()=>perform(()=>api.switchMode('live'));$('training').onclick=()=>perform(()=>api.switchMode('training'));$('restart').onclick=()=>perform(()=>api.restart());$('backup').onclick=()=>perform(()=>api.backup());$('restore').onclick=()=>perform(()=>api.restore());$('cloudRestore').onclick=()=>perform(()=>api.cloudRestore());$('rebuildCloud').onclick=()=>perform(()=>api.rebuildCloudSnapshot());

api.onUpdatesProgress?.(value=>{
 if(!value)return;
 if(value.phase==='download'){updateProgress=Number(value.percent)||0;const bar=$('updateProgress');if(bar){bar.hidden=false;bar.value=updateProgress;}$('updatesStatus').textContent='Downloading update… '+updateProgress+'%';}
 else if(value.phase==='backup'){updatesError='';$('updatesStatus').textContent=value.status==='verified'?(value.scope==='local'?'Local snapshot verified.':'Cloud backup verified.'):value.status==='local_only'?'Cloud copy skipped; the local snapshot is verified.':value.status==='uploading'?'Uploading encrypted cloud copy…':value.status==='verifying'?'Verifying the local snapshot…':'Creating the local snapshot…';}
 else if(value.phase==='installing'){$('updatesStatus').textContent='Installing version '+value.version+' and restarting…';}
  else if(value.phase==='restore'){$('updatesStatus').textContent=value.status==='downloading'?'Downloading the verified cloud backup…':value.status==='restoring'?'Restoring into a new local database…':value.status==='restored'?'Cloud backup restored.':'Checking the cloud backup…';}
 else if(value.phase==='linked'||value.phase==='checked'||value.phase==='downloaded'||value.phase==='approved'){void loadUpdates();}
});

$('updateCheck').onclick=()=>perform(async()=>{updatesError='';updateProgress=null;updatesInfo=await api.updatesCheck();},'Checking for updates…');
$('updateDownload').onclick=()=>perform(async()=>{updatesError='';updateProgress=0;updatesInfo=await api.updatesDownload();updateProgress=null;},'Downloading update…');
$('updateBackup').onclick=()=>perform(async()=>{updatesError='';updatesInfo=await api.updatesBackup();},'Creating and verifying the local snapshot…');
$('updateApprove').onclick=()=>perform(async()=>{updatesInfo=await api.updatesApproveRestart();},'Approving restart…');
$('updateInstall').onclick=()=>perform(async()=>{await api.updatesInstall();},'Installing verified update…');

perform(()=>api.status(),'Preparing local services…');






$('cloudSignup').onclick=()=>perform(()=>api.cloudSignup(),'Opening cloud registration...');

$('syncNow').onclick=()=>perform(async()=>{$('cloudStatus').textContent=await api.syncNow();});
$('syncHistory').onclick=()=>perform(async()=>{$('syncHistoryRows').textContent=JSON.stringify(await api.syncHistory(),null,2);$('syncHistoryRows').hidden=false;});
