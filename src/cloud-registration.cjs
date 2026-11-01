const fs=require('node:fs/promises'),path=require('node:path'),{sign,randomUUID}=require('node:crypto');
function envelope(proof,prefix,body){const input=prefix+'.'+Buffer.from(JSON.stringify({v:1,installationId:proof.installationId,localBusinessId:proof.localBusinessId,publicKey:proof.publicKey,issuedAt:new Date().toISOString(),requestId:randomUUID(),...body})).toString('base64url');return input+'.'+sign('RSA-SHA256',Buffer.from(input),proof.privateKey).toString('base64url');}
async function post(rt,route,body){
 const base=new URL(rt.manifest.cloudApi);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Cloud registration needs a configured HTTPS API');
 const response=await fetch(base.href.replace(/\/$/,'')+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.any([AbortSignal.timeout(15000),...(rt.cloudAbort?[rt.cloudAbort.signal]:[])]),redirect:'error'});
 const data=await response.json().catch(()=>({}));if(!response.ok){const error=Error(data.message||`Cloud request failed (${response.status})`);error.status=response.status;throw error;}return data;
}
async function register(rt){
 const local=await require('./license-runtime.cjs').localLicense(rt),data=await local.identity(),business=rt.v.localBusiness;if(!business||!rt.v.databases.live)return null;
 const reference=data.autoTrial?.productKey||rt.v.localTrialReference||('LOCAL-TRIAL-'+randomUUID().toUpperCase());if(!data.autoTrial&&!rt.v.localTrialReference){rt.v.localTrialReference=reference;await rt.secrets.save(rt.v);}
 const result=await post(rt,'/desktop/registrations',{proof:envelope(data.proof,'GNJLREG1',{...business,appVersion:rt.manifest.version,localTrialKey:reference,...(data.claims?.kind==='perpetual'?{contractId:data.claims.licenseId}:{})})});
 if(result.localBusinessId!==data.proof.localBusinessId||result.source!=='local-generated'||result.packageId!==business.packageId)throw Error('Cloud registration returned another business identity');return result;
}
function start(rt){
 const previous=rt.cloudTask;stop(rt);rt.cloudStopped=false;rt.cloudAbort=new AbortController();const generation=rt.cloudGeneration;
 if(!rt.manifest.fullErp||!rt.manifest.cloudApi||!rt.v.localBusiness)return;
 let running=false;
 const tick=async()=>{if(rt.cloudStopped||generation!==rt.cloudGeneration||running||rt.mode!=='live')return;running=true;
  try{const result=await register(rt);if(!result||generation!==rt.cloudGeneration)return;const prior=rt.v.cloudRegistration||{};
   rt.v.cloudRegistration={...prior,...result,message:prior.conflict?'Cloud sync paused for conflict review; rebuild only after reconciling local records.':result.cloudEntitled===true?'Cloud enabled; preparing read-only reporting sync':'Business registered as local-generated. Reporting sync waits for verified Cloud access.',checkedAt:new Date().toISOString()};
   await rt.secrets.save(rt.v);if(result.cloudEntitled===true&&!prior.conflict)await require('./cloud-replica.cjs').sync(rt,result);if(generation===rt.cloudGeneration)rt.message(rt.v.cloudRegistration.message);
  }catch(e){if(rt.cloudStopped||generation!==rt.cloudGeneration)return;rt.v.cloudRegistration={...rt.v.cloudRegistration,cloudEntitled:false,conflict:e.status===409||rt.v.cloudRegistration?.conflict,message:(e.status===409?'Cloud sync paused for conflict review. ':'Working offline. ')+e.message,checkedAt:new Date().toISOString()};await rt.secrets.save(rt.v);rt.message('Local ERP is ready; '+(e.status===409?'review the cloud sync conflict.':'cloud registration/sync will retry when available.'));}
  finally{running=false;}
 };
 let ready=false;const trigger=()=>{if(ready&&!running)rt.cloudTask=tick();};rt.cloudTimer=setInterval(trigger,60000);rt.cloudTimer.unref?.();Promise.resolve(previous).catch(()=>{}).then(()=>{ready=true;if(generation===rt.cloudGeneration)trigger();});
}
function stop(rt){rt.cloudGeneration=(rt.cloudGeneration||0)+1;rt.cloudStopped=true;rt.cloudAbort?.abort();if(rt.cloudTimer)clearInterval(rt.cloudTimer);rt.cloudTimer=null;}
async function rebuild(rt){
 stop(rt);await rt.cloudTask?.catch(()=>{});const file=path.join(rt.root,'cloud-sync-pending.json');try{await fs.rename(file,path.join(rt.root,'cloud-sync-held-'+Date.now()+'.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
 rt.v.cloudRegistration={...rt.v.cloudRegistration,conflict:false,message:'Previous pending snapshot retained for review. Preparing a fresh reporting copy.'};await rt.secrets.save(rt.v);start(rt);return {message:'Pending copy retained; a fresh snapshot will still need to pass cloud conflict checks.'};
}
module.exports={envelope,post,register,start,stop,rebuild};
