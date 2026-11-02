const crypto=require('node:crypto');
const prefixes={owner:'GNJTA1',staff:'GNJLS1',roster:'GNJLR1'};
function verifyGrant(token,keys,binding,purpose,now=Date.now()){
 if(typeof token!=='string'||token.length>1000000)throw Error('Signed cloud grant required');
 const parts=token.split('.');if(parts.length!==3||parts[0]!==prefixes[purpose])throw Error('Wrong cloud grant purpose');
 const c=JSON.parse(Buffer.from(parts[1],'base64url').toString());const der=keys[c.issuerKeyId];
 if(!der||!crypto.verify('RSA-SHA256',Buffer.from(parts.slice(0,2).join('.')),crypto.createPublicKey({key:Buffer.from(der,'base64'),format:'der',type:'spki'}),Buffer.from(parts[2],'base64url')))throw Error('Invalid cloud signature');
 if(c.v!==1||c.platform!=='desktop'||!Number.isSafeInteger(c.issuedAt)||c.issuedAt>now+300000)throw Error('Invalid Desktop grant');
 for(const k of ['tenantId','ownerId','installationId','fingerprint','activationId'])if(!c[k]||(binding[k]!==undefined&&c[k]!==binding[k]))throw Error('Cloud identity mismatch: '+k);
 if(purpose==='owner'&&c.license&&(!c.license.platforms?.includes('desktop')||!Number.isSafeInteger(c.license.graceEndsAt)))throw Error('Invalid signed Desktop commercial policy');
 if(c.expiresAt!==null&&(!Number.isSafeInteger(c.expiresAt)||c.expiresAt<=now))throw Error('Cloud lease expired; reconnect online');
 if(purpose==='staff'){
  if(c.purpose!=='staff'||!['staff','manager'].includes(c.role)||!c.userId||c.passwordChangeRequired!==false||!Number.isSafeInteger(c.expiresAt)||c.expiresAt-c.issuedAt>7*86400000)throw Error('Invalid staff lease');
  if(!c.permissions||typeof c.permissions!=='object'||Array.isArray(c.permissions)||Object.values(c.permissions).some(v=>!['none','view','edit'].includes(v)))throw Error('Invalid signed permissions');
 }
 if(purpose==='staff'&&c.pharmacist!==null&&c.pharmacist!==undefined&&(!c.pharmacist.active||typeof c.pharmacist.licenseNumber!=='string'||!c.pharmacist.licenseNumber.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(c.pharmacist.validThrough)))throw Error('Invalid signed pharmacist authorization');
 if(purpose==='roster'&&(c.purpose!=='roster'||!Array.isArray(c.users)))throw Error('Invalid roster');
 return c;
}
function assertFresh(v){if(v.databases?.live||v.localBusiness||v.cloudBinding)throw Error('Existing profile cannot be rebound; keep its original installation');}
function deviceIdentity(){const k=crypto.generateKeyPairSync('rsa',{modulusLength:2048});const publicKey=k.publicKey.export({format:'der',type:'spki'}).toString('base64');return {installationId:crypto.randomUUID(),publicKey,privateKey:k.privateKey.export({format:'pem',type:'pkcs8'}),fingerprint:crypto.createHash('sha256').update(Buffer.from(publicKey,'base64')).digest('hex')};}
function proof(identity,action,extra={}){const proofText=JSON.stringify({action,installationId:identity.installationId,requestId:identity.requestId||crypto.randomUUID(),issuedAt:Date.now(),publicKey:identity.publicKey,licenseCapabilities:['temporary','permanent','retail-pharmacy'],...extra});return {proofText,signature:crypto.sign('RSA-SHA256',Buffer.from(proofText),identity.privateKey).toString('base64')};}
async function request(api,route,{token,body}={},fetcher=fetch){const u=new URL(api);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Secure cloud endpoint required');let r;try{r=await fetcher(api+route,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});}catch{throw Error('Internet connection required for cloud enrollment');}if(!r.ok){const e=Error('Cloud enrollment denied (HTTP '+r.status+')');e.status=r.status;throw e;}const text=await r.text();if(text.length>1000000)throw Error('Cloud response too large');return JSON.parse(text);}
async function cloudAuth(api,email,password,fetcher){const auth=await request(api,'/auth/staff/login',{body:{email,password}},fetcher);if(!auth.accessToken||auth.passwordChangeRequired)throw Error('Complete the required password change online first');const actor=await request(api,'/auth/staff/me',{token:auth.accessToken},fetcher);return {token:auth.accessToken,actor:{...actor,tenantId:auth.user?.tenantId}};}
async function activate(rt,input,fetcher){assertFresh(rt.v);if(!input.enrollmentKey?.startsWith('DESKTOP-'))throw Error('A Desktop enrollment key is required');if(input.password!==input.confirmation)throw Error('Owner password confirmation does not match');const api=rt.manifest.cloudApi||'https://bizerp-gnj.onrender.com/api';const {token,actor}=await cloudAuth(api,input.email,input.password,fetcher);if(actor.role!=='owner'||!actor.tenantId||!actor.id)throw Error('Existing cloud business owner required');
 let identity=rt.v.pendingCloudIdentity;if(!identity){identity={...deviceIdentity(),requestId:crypto.randomUUID()};rt.v={...rt.v,pendingCloudIdentity:identity};await rt.secrets.save(rt.v);}
 const keys=(await request(api,'/desktop-local/issuer',{token},fetcher)).publicKeys;
 const reserved=await request(api,'/desktop-local/reserve',{token,body:{...proof(identity,'reserve',{email:input.email,keyHash:crypto.createHash('sha256').update(input.enrollmentKey).digest('hex')}),enrollmentKey:input.enrollmentKey}},fetcher);
 const binding={installationId:identity.installationId,fingerprint:identity.fingerprint,ownerId:actor.id,tenantId:actor.tenantId};const claims=verifyGrant(reserved.grant,keys,binding,'owner');if(!claims.foundation||!claims.license||!claims.limits)throw Error('Cloud grant missing commercial policy');
 await request(api,'/desktop-local/ack',{body:proof(identity,'ack',{activationId:claims.activationId})},fetcher);
 const cloudBinding={...binding,activationId:claims.activationId,identity,keys,ownerGrant:reserved.grant,api};
 const roster=await request(api,'/desktop-local/staff/roster',{token,body:proof(identity,'staff-roster',{activationId:claims.activationId})},fetcher);verifyGrant(roster.grant,keys,cloudBinding,'roster');cloudBinding.rosterGrant=roster.grant;
 return {cloudBinding,claims};
}
module.exports={verifyGrant,assertFresh,deviceIdentity,proof,request,cloudAuth,activate};
