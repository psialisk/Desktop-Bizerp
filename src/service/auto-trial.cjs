const {randomUUID}=require('node:crypto');
const day=86400000;
function startTrial(existing,packageId,now=new Date()){
 if(existing)return existing;
 return {productKey:'LOCAL-TRIAL-'+randomUUID().toUpperCase(),packageId,startedAt:now.toISOString(),expiresAt:new Date(+now+7*day).toISOString(),graceEndsAt:new Date(+now+10*day).toISOString(),lastSeen:now.toISOString()};
}
function trialStatus(t,now=new Date()){
 if(!t||typeof t.productKey!=='string'||!/^LOCAL-TRIAL-[0-9A-F-]{36}$/.test(t.productKey)||Date.parse(t.expiresAt)-Date.parse(t.startedAt)!==7*day||Date.parse(t.graceEndsAt)-Date.parse(t.startedAt)!==10*day)throw Error('Invalid local trial terms');
 if(!Number.isFinite(+now)||+now+300000<Date.parse(t.startedAt)||+now+300000<Date.parse(t.lastSeen))throw Error('Local clock moved backwards; license review is required');
 const state=+now>=Date.parse(t.graceEndsAt)?'expired':+now>=Date.parse(t.expiresAt)?'grace':'trial';
 return {state,writable:state!=='expired',trial:t,message:`${t.packageId} · ${state} · trial ends ${t.expiresAt.slice(0,10)} · grace ends ${t.graceEndsAt.slice(0,10)}`,expiresAt:t.expiresAt};
}
module.exports={startTrial,trialStatus};
