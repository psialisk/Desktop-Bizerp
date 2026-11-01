const api=window.storeDesktop,$=id=>document.getElementById(id);
const page=location.hash.slice(1)||'login';let operationLabel='Preparing local services…',current={},network=false,kind='owner',pending=false,workflowTouched=false,recovery=null,welcome=null,recoveryLoading=false;
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
  $('localBusinessField').hidden=network;$('networkField').hidden=!network;$('networkUrl').disabled=!network;$('networkUrl').required=network;$('workflowField').hidden=kind!=='pos';
  document.querySelector('[data-kind="customer"]').hidden=!network;
  for(const button of document.querySelectorAll('[data-kind]')){button.classList.toggle('selected',button.dataset.kind===kind);button.setAttribute('aria-pressed',String(button.dataset.kind===kind));}
  $('localBusiness').textContent=s.businessName||(s.configured?'Local business':'No local business created yet');
  $('signIn').textContent=pending?'Signing inâ€¦':network?'Sign in to network':'Sign in locally';$('signIn').disabled=busy||!network&&!canLocal();
  iconText($('connectionToggle'),network?'pc-display-horizontal':'wifi',network?'Use local mode':'Connect to Network');$('connectionToggle').setAttribute('aria-expanded',String(network));
  $('modeNote').textContent=network?'Network login opens the selected server workspace':'Works without internet';
  $('createBusiness').hidden=network;$('linkDivider').hidden=network;$('createBusiness').disabled=busy||!s.initialized||s.configured||s.upgradeAvailable;
  $('runtimeStatus').textContent=network?(s.startupError?'Local startup is unavailable. Network sign-in is available.':''):(s.startupError?'Local startup: '+s.startupError:s.message||'');
  $('upgrade').hidden=network||!s.upgradeAvailable;
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
  if(!busy&&!recovery&&!recoveryLoading){recoveryLoading=true;queueMicrotask(()=>perform(updateRecovery).finally(()=>{recoveryLoading=false;}));}
  $('recoveryBusiness').value=s.businessName||'Local business';$('resetOwner').disabled=busy||!recovery?.available;
 }
 if(page==='tools'){$('cloudStatus').textContent=s.cloud?.message||'Working fully offline. Business details register when the cloud service is reachable.';$('training').hidden=!s.trainingAvailable;}
}
async function perform(fn,label='Completing your request…'){if(pending||current.busy)return null;showError('');operationLabel=label;pending=true;render(current);try{return await fn();}catch(error){showError(String(error.message||'Operation failed').replace(/^Error invoking remote method '[^']+': (?:Error: )?/,''));return null;}finally{pending=false;try{render(await api.status());}catch(error){render({...current,busy:false});showError('Unable to refresh local status. '+String(error.message||'Please retry.'));}}}
api.onStatus(render);api.onReturn(choice=>{network=choice.mode==='network';kind=choice.kind;$('password').value='';$('password').type='password';$('showPassword').textContent='Show';render(current);});
for(const button of document.querySelectorAll('[data-kind]'))button.onclick=()=>{kind=button.dataset.kind;showError('');$('password').value='';render(current);};
$('workflow').onchange=()=>{workflowTouched=true;};
$('connectionToggle').onclick=()=>{network=!network;if(!network&&kind==='customer')kind='owner';$('password').value='';showError('');render(current);};
$('showPassword').onclick=()=>{const input=$('password');input.type=input.type==='password'?'text':'password';$('showPassword').textContent=input.type==='password'?'Show':'Hide';$('showPassword').setAttribute('aria-label',input.type==='password'?'Show password':'Hide password');};
for(const button of document.querySelectorAll('.reveal'))button.onclick=()=>{const input=button.previousElementSibling;input.type=input.type==='password'?'text':'password';button.textContent=input.type==='password'?'Show':'Hide';};
window.addEventListener('blur',()=>{for(const input of document.querySelectorAll('.password-field input')){input.type='password';input.nextElementSibling.textContent='Show';}});
$('loginForm').onsubmit=event=>{event.preventDefault();const value={mode:network?'network':'local',kind,email:$('email').value,password:$('password').value,server:$('networkUrl').value,workflowId:$('workflow').value};$('password').value='';$('password').type='password';$('showPassword').textContent='Show';perform(()=>api.login(value),network?'Connecting and signing in…':'Opening your local workspace…');};
$('createBusiness').onclick=()=>perform(()=>api.openWindow('create'));$('openLicense').onclick=()=>perform(()=>api.openWindow('license'));
for(const button of document.querySelectorAll('.close'))button.onclick=()=>window.close();
$('createForm').onsubmit=event=>{event.preventDefault();const form=new FormData(event.target),value=Object.fromEntries(form);value.training=form.has('training');for(const input of event.target.querySelectorAll('[name="password"],[name="cashierPassword"]'))input.value='';perform(async()=>{const result=await api.setup(value);value.password='';value.cashierPassword='';if(result?.welcome){welcome=result.welcome;$('welcomeBusiness').textContent=welcome.businessName;$('welcomeOwner').textContent=welcome.ownerEmail;$('welcomeOwnerPassword').value=welcome.ownerPassword;$('welcomeCashierCard').hidden=!welcome.cashierEmail;$('welcomeCashier').textContent=welcome.cashierEmail;$('welcomeCashierPassword').value=welcome.cashierPassword;$('welcomeCode').value=welcome.recoveryCode;$('welcomeDeadline').textContent='Available until '+new Date(welcome.expiresAt).toLocaleString();$('welcomeDialog').showModal();$('createNotice').textContent='Local business created.';event.target.reset();}},'Creating the business, accounts and local storage…');};
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
$('upgrade').onclick=()=>perform(()=>api.upgrade());$('live').onclick=()=>perform(()=>api.switchMode('live'));$('training').onclick=()=>perform(()=>api.switchMode('training'));$('restart').onclick=()=>perform(()=>api.restart());$('backup').onclick=()=>perform(()=>api.backup());$('restore').onclick=()=>perform(()=>api.restore());$('rebuildCloud').onclick=()=>perform(()=>api.rebuildCloudSnapshot());
perform(()=>api.status(),'Preparing local services…');


