const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),{randomUUID,randomBytes}=require('node:crypto');
const {StoreRuntime}=require('../src/runtime.cjs');
// Tests only: prohibit background cloud registration and all non-loopback HTTP.
require('../src/cloud-registration.cjs').start=()=>{};
const nativeFetch=global.fetch;global.fetch=(url,options)=>{if(!['127.0.0.1','localhost'].includes(new URL(url).hostname))throw Error('Smoke test forbids cloud network');return nativeFetch(url,options)};
const available=['retail-store','water-refilling','retail-pharmacy','salon','laundry','food-beverage','auto-repair','services-contracting'];const selected=process.env.ERP_CALENDAR_PACKAGES?process.env.ERP_CALENDAR_PACKAGES.split(','):available;assert(selected.every(p=>available.includes(p)));
(async()=>{for(const packageId of selected){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'BusinessERP-Calendar-'+packageId+'-'));let saved=null,successful=false;const rt=new StoreRuntime({root,bundle:path.resolve('artifacts/BusinessERP-Desktop-0.4.2-Operational-Calendar/resources/runtime'),secrets:{load:async()=>saved,save:async v=>{saved=structuredClone(v)}}});
 try{await rt.initialize();const password=randomBytes(20).toString('base64url'),email='owner@calendar-fixture.invalid';
 await rt.setup({businessName:'Synthetic calendar fixture',ownerName:'Fixture owner',email,password,packageId,training:false});assert(rt.ready,'Private local services must start');
 const base='http://127.0.0.1:38121/api';async function call(route,method='GET',body,token){const res=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();assert(res.ok,route+': '+JSON.stringify(data));return data;}
 const login=await call('/auth/staff/login','POST',{email,password});const token=login.accessToken||login.token;assert(token,'Owner login must return a token');
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const before=await call('/operations-calendar?month='+day.slice(0,7),'GET',null,token);assert(before.canEdit);const body={requestKey:randomUUID(),title:'Synthetic stock count',category:'stock-count',dueOn:day,priority:'normal',note:'Fixture only'};
 const task=await call('/operations-calendar/tasks','POST',body,token);assert.equal((await call('/operations-calendar/tasks','POST',body,token)).id,task.id);
 assert((await call('/operations-calendar?month='+day.slice(0,7),'GET',null,token)).events.some(e=>e.id==='task:'+task.id));
 const page=await fetch('http://127.0.0.1:38120/dashboard/operational-calendar');assert.equal(page.status,200);
 successful=true;console.log('PASS Desktop offline '+packageId+': private Postgres/Nest/Next, owner login, calendar task/retry/feed and page shell');
 }finally{await rt.stop();
  // Remove only the exact mkdtemp profile owned by this successful fixture. Never target an installed profile.
  if(successful&&rt.ready===false&&root.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(root).startsWith('BusinessERP-Calendar-')){
   const resolved=await fs.realpath(root);if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep))await fs.rm(root,{recursive:true,maxRetries:5,retryDelay:250}).catch(()=>console.log('Temporary fixture retained after a Windows file lock; runtime assertions passed'));
  }
 }
}})().catch(e=>{console.error(e.message);process.exitCode=1});
