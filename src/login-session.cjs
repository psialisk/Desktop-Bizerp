const {randomUUID,createHash}=require('node:crypto');
const {networkTarget}=require('./network-window.cjs');
function connection(raw,cloudApi='https://bizerp-gnj.onrender.com/api'){
 const url=new URL(networkTarget(raw,'owner'));if(url.hostname==='bizerpsme.shop')url.hostname='www.bizerpsme.shop';const origin=url.origin;
 const official=['bizerpsme.shop','www.bizerpsme.shop','bizerp-gnj-fe.onrender.com'].includes(new URL(origin).hostname);
 if(official){const u=new URL(cloudApi);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/api')throw Error('Invalid shipped cloud API');}
 return {origin,api:official?cloudApi:origin+'/api'};
}
function credentialInput(raw){
 if(!raw||!['local','network'].includes(raw.mode)||!['owner','pos','customer'].includes(raw.kind))throw Error('Choose local or network and a login type');
 if(raw.mode==='local'&&raw.kind==='customer')throw Error('Customer Login requires a network business');
 if(typeof raw.email!=='string'||!raw.email.trim()||raw.email.length>190||typeof raw.password!=='string'||!raw.password||Buffer.byteLength(raw.password)>72)throw Error('Enter a valid email and password (at most 72 bytes)');
 return {mode:raw.mode,kind:raw.kind,email:raw.email.trim(),password:raw.password,server:raw.server,workflowId:raw.workflowId};
}
async function jsonRequest(api,path,{token,body}={},fetcher=fetch){
 const response=await fetcher(api+path,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok){let message='Sign-in request failed (HTTP '+response.status+')';try{const value=await response.json();if(typeof value.message==='string')message=value.message.slice(0,300);}catch{}throw Error(message);}
 const reader=response.body.getReader();let size=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024)throw Error('Sign-in response is too large');chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
async function authenticate(api,input,fetcher=fetch){
 const prefix=input.kind==='owner'?'staff':input.kind==='customer'?'renter':'pos';
 const body={email:input.email,password:input.password,...(input.kind==='pos'?{industry:input.workflow.mode,workflowId:input.workflow.id,installationId:input.installationId}:{})};
 const result=await jsonRequest(api,'/auth/'+prefix+'/login',{body},fetcher);
 if(typeof result.accessToken!=='string'||result.accessToken.length>20000)throw Error('Server returned an invalid sign-in response');
 const actor=await jsonRequest(api,input.kind==='customer'?'/renter/me':'/auth/staff/me',{token:result.accessToken},fetcher);
 if(!actor.id||input.kind!=='customer'&&!['owner','manager','staff'].includes(actor.role))throw Error('Use a business account, not Super Admin');
 if(input.kind==='customer')await jsonRequest(api,'/renter/me/foundation',{token:result.accessToken},fetcher);
 if(input.kind==='pos'){const session=await jsonRequest(api,'/pos/session',{token:result.accessToken},fetcher);if(session.workflowId!==input.workflow.id)throw Error('POS workflow changed; sign in again');}
 return {token:result.accessToken,actor};
}
class WorkspaceLogin{
 constructor({WebContentsView,control,workspaces,runtime,cloudApi,onReturn}){Object.assign(this,{WebContentsView,control,workspaces,runtime,cloudApi,onReturn});this.active=null;this.opening=null;control.on('resize',()=>this.resize());}
 resize(){if(this.active){const [width,height]=this.control.getContentSize();this.active.view.setBounds({x:0,y:0,width,height});}}
 async login(raw){
  const input=credentialInput(raw);if(this.active||this.opening)throw Error('Sign out of the current workspace first');
  const local=input.mode==='local',rt=this.runtime();if(local&&!rt.ready)throw Error('Local business is not ready. Create the business or wait for startup.');
  const target=local?{origin:rt.status().url,api:rt.status().url+'/api'}:connection(input.server,this.cloudApi);
  const workflows=require(require('node:path').join(rt.bundle,'backend/dist/modules/foundation/catalog.json')).counterWorkflows.filter(w=>w.status==='ready');
  const workflow=workflows.find(w=>w.id===input.workflowId)||workflows.find(w=>w.id===(local&&rt.v.localBusiness?.packageId==='water-refilling'?'water-desk':'retail'));
  const partition=local?'persist:water-'+rt.mode+'-'+input.kind:'network-'+createHash('sha256').update(target.origin+'|'+input.kind).digest('hex').slice(0,24);
  const view=new this.WebContentsView({webPreferences:{partition,...(local?{preload:require('node:path').join(__dirname,'workspace-preload.cjs')} :{}),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  const wc=view.webContents,entry={view,webContents:wc,parentWindow:this.control,networkWorkspace:!local,kind:input.kind,mode:input.mode,origin:target.origin,api:target.api,
   ...(local?{desktopContext:{origin:target.origin,store:rt.v.databases[rt.mode],mode:rt.mode,kind:input.kind}}:{}),isDestroyed:()=>wc.isDestroyed(),destroy:()=>this.close(entry)};
  this.opening=entry;wc.session.setPermissionRequestHandler((_w,_p,done)=>done(false));wc.setWindowOpenHandler(()=>({action:'deny'}));
  const guard=(event,url)=>{try{if(new URL(url).origin!==target.origin)event.preventDefault();}catch{event.preventDefault();}};
  wc.on('will-navigate',guard);wc.on('will-redirect',guard);
  if(local)wc.session.webRequest.onBeforeRequest((details,done)=>{let allow=false;try{const u=new URL(details.url);allow=u.origin===target.origin||['blob:','data:'].includes(u.protocol);}catch{}done({cancel:!allow});});
  let lastStatus=200;wc.on('did-navigate',(_event,_url,code)=>{lastStatus=code;});
  const load=async url=>{lastStatus=200;let timer;try{await Promise.race([wc.loadURL(url),new Promise((_,reject)=>{timer=setTimeout(()=>{wc.stop?.();reject(Error('ERP website did not respond. Check the server address and connection.'));},20000);})]);}finally{clearTimeout(timer);}if(lastStatus>=400)throw Error('Workspace page unavailable (HTTP '+lastStatus+'). Check the ERP website address.');};
  try{
   // The bootstrap page only establishes this isolated web origin; never receive credentials in a remote preload.
   await load(target.origin+'/business-login');if(new URL(wc.getURL()).origin!==target.origin)throw Error('Workspace server redirected to another address');
   const installationId=await wc.executeJavaScript(`(()=>{let id=localStorage.getItem('business_erp_pos_installation');if(!/^[a-f0-9-]{36}$/i.test(id||'')){id=${JSON.stringify(randomUUID())};localStorage.setItem('business_erp_pos_installation',id);}return id})()`);
   if(local&&rt.v.cloudBinding)await require('./cloud-staff.cjs').prepareLogin(rt,input);
   const auth=await authenticate(target.api,{...input,workflow,installationId});entry.actor=auth.actor;
   if(new URL(wc.getURL()).origin!==target.origin)throw Error('Workspace address changed during sign-in');
   const key=input.kind==='owner'?'staff_token':input.kind==='customer'?'renter_token':'pos_token';
   await wc.executeJavaScript(`(()=>{for(const key of ['staff_token','pos_token','renter_token'])localStorage.removeItem(key);localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(auth.token)});})()`);
   if(entry.desktopContext)entry.desktopContext.principalId=auth.actor.id;
   await load(target.origin+(input.kind==='owner'?'/dashboard':input.kind==='customer'?'/renter-portal':workflow.route));
   this.opening=null;this.active=entry;this.workspaces.add(entry);this.control.contentView.addChildView(view);this.resize();wc.focus();
   const navigate=(_event,url,mainFrame)=>{if(this.active!==entry||mainFrame===false||new URL(url).origin!==target.origin)return;const pathname=new URL(url).pathname;
    if(['/', '/business-login','/staff-login','/pos-login','/renter-login','/customer-login/real-estate','/customer-login'].includes(pathname))this.close(entry);
   };
   wc.on('did-navigate',navigate);wc.on('did-navigate-in-page',navigate);
   return {signedIn:true};
  }catch(e){this.opening=null;await this.close(entry,false);throw Error(e.message?.startsWith('Sign-in')?e.message:e.message||'Could not open the workspace');}
 }
 async close(entry=this.active,notify=true){if(!entry)return;this.workspaces.delete(entry);if(this.active===entry){this.control.contentView.removeChildView(entry.view);this.active=null;}
  if(!entry.webContents.isDestroyed()){
   if(entry.networkWorkspace){await entry.webContents.session.clearStorageData();await entry.webContents.session.closeAllConnections();}
   else await entry.webContents.executeJavaScript(`for(const key of ['staff_token','pos_token','renter_token'])localStorage.removeItem(key);`).catch(()=>{});
   entry.webContents.close();
  }
  if(notify)this.onReturn({mode:entry.mode,kind:entry.kind});
 }
 async authorizeOwner(){const entry=this.active,rt=this.runtime();if(!entry||entry.networkWorkspace||entry.kind!=='owner'||entry.desktopContext?.store!==rt.v.databases[rt.mode])throw Error('Sign in locally as Business Owner to use local tools');
  if(new URL(entry.webContents.getURL()).origin!==entry.origin)throw Error('Local workspace changed');const token=await entry.webContents.executeJavaScript('localStorage.getItem("staff_token")');
  const actor=await jsonRequest(entry.api,'/auth/staff/me',{token});if(actor.id!==entry.actor.id||actor.role!=='owner')throw Error('Local owner access required');return actor;
 }
}
module.exports={connection,credentialInput,authenticate,jsonRequest,WorkspaceLogin};
