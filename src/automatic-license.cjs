const fs=require('node:fs/promises'),path=require('node:path'),protocol=require('./cloud-local.cjs');
async function publish(rt){
 const b=rt.v.cloudBinding;if(!b)return '';
 const file=path.join(rt.root,'cloud-license-binding.json'),temp=file+'.new';
 const {identity,syncActorGrant,syncActorId,...publicBinding}=b;
 await fs.writeFile(temp,JSON.stringify(publicBinding),{mode:0o600});await fs.rename(temp,file);return file;
}
async function refresh(rt,{request=protocol.request,installPolicy=require('./cloud-staff.cjs').installPolicy}={}){
 const b=rt.v.cloudBinding;if(!b)return;
 let result;try{result=await request(b.api,'/desktop-local/recheck',{body:protocol.proof(b.identity,'recheck',{activationId:b.activationId})});}catch(e){await require('./license-control.cjs').denied(rt,e);throw e;}
 const claims=protocol.verifyGrant(result.grant,b.keys,b,'owner');
 if(claims.activationId!==b.activationId||!claims.foundation||!claims.license||!claims.limits)throw Error('Refreshed license identity or policy is incomplete');
 if(rt.v.cloudBinding!==b)throw Error('Business changed during license refresh');
 // Persist policy without restarting the active workspace or altering its data/sync identity.
 const old=JSON.parse(Buffer.from(b.ownerGrant.split('.')[1],'base64url'));
 const policy=value=>JSON.stringify([value.license,value.foundation,value.limits]);
 if(policy(old)!==policy(claims)){const c=await rt.client(rt.v.databases.live);try{await installPolicy(rt,c,claims);}finally{await c.end();}}
 if(rt.v.cloudBinding!==b)throw Error('Business changed during license refresh');
 const next={...rt.v,localBusiness:{...rt.v.localBusiness,...(claims.packageId?{packageId:claims.packageId}:{})},cloudBinding:{...b,ownerGrant:result.grant}};await rt.secrets.save(next);rt.v=next;
 await require('./license-control.cjs').set(rt,{status:'active'});await publish(rt);rt.cloudRecheckWarning=null;rt.licenseSummary=summary(rt);return claims;
}
function summary(rt){const b=rt.v.cloudBinding,c=protocol.verifyGrant(b.ownerGrant,b.keys,b,'owner'),permanent=c.license.perpetual===true;return {state:rt.v.licenseControl?.status!=='active'&&rt.v.licenseControl?rt.v.licenseControl.status:permanent?'permanent':c.license.kind,permanent,licenseType:permanent?'permanent':c.license.kind,revision:c.revision,installedVersion:rt.manifest?.version,selectedPackage:rt.v.localBusiness?.packageId,expiresAt:permanent?null:new Date(c.expiresAt).toISOString(),message:permanent?'Permanent offline access is activated for the purchased package.':'Cloud-linked local access; verified purchases activate on the next online license check.'};}
async function publishLocal(rt,token){const file=path.join(rt.root,'activation.gnjlicense'),temp=file+'.new';await fs.writeFile(temp,token,{mode:0o600});await fs.rename(temp,file);return file;}
async function applyRegistered(rt,activation){
 if(!activation?.activationKey||rt.v.cloudBinding)return false;
 const token=activation.activationKey;if(rt.v.offlineLicense?.token===token)return false;
 if(rt.licenseApplying)throw Error('License activation is already in progress');rt.licenseApplying=true;
 try{const licensing=require('./license-runtime.cjs'),license=await licensing.localLicense(rt),claims=await license.preview(token);
  if(!['perpetual','extension'].includes(claims.kind)||(claims.kind==='extension'&&claims.source!=='cloud-configuration'))throw Error('Automatic purchase does not match this installed package/version');
  const c=await rt.client(rt.v.databases.live);try{await license.apply(token,async()=>licensing.applyDatabase(rt,c,claims.localBusinessId,claims,token));}finally{await c.end();}
  const selected=claims.planId||claims.grants.specializationIds?.[0];rt.v={...rt.v,localBusiness:{...rt.v.localBusiness,packageId:selected}};await rt.secrets.save(rt.v);await licensing.publishLicense(rt,token);await publishLocal(rt,token);rt.licenseSummary=await license.summary();return true;
 }finally{rt.licenseApplying=false;}
}
module.exports={refresh,publish,summary,publishLocal,applyRegistered};
