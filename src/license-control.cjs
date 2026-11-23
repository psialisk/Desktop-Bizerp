const fs=require('node:fs/promises'),path=require('node:path');
async function publish(rt){const file=path.join(rt.root,'local-license-control.json');await fs.writeFile(file+'.new',JSON.stringify(rt.v.licenseControl||{status:'active'}),{mode:0o600});await fs.rename(file+'.new',file);return file;}
async function set(rt,value){if(!['active','suspended','revoked'].includes(value?.status))throw Error('Invalid license control status');const next={...rt.v,licenseControl:{status:value.status,message:value.message||'',checkedAt:new Date().toISOString()}};await rt.secrets.save(next);rt.v=next;await publish(rt);}
async function denied(rt,error){const status=error.code==='LOCAL_DEVICE_REVOKED'?'revoked':error.code==='TENANT_SUSPENDED'?'suspended':null;if(!status)return false;await set(rt,{status,message:error.detail||error.message});return true;}
function view(rt,summary){const c=rt.v?.licenseControl;return c&&c.status!=='active'?{...summary,state:c.status,writable:false,message:(c.message||'Platform license decision')+' Local trading is paused; records are retained.'}:summary;}
module.exports={set,publish,denied,view};
