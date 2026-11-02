const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const backend=process.env.ERP_BACKEND_SOURCE||'D:/GitHub/bizerp.gnj/backend';
const {PGlite}=require(path.join(backend,'node_modules/@electric-sql/pglite'));
const {provision}=require('../src/provision.cjs'),{installPolicy,prepareLogin}=require('../src/cloud-staff.cjs');
const {packageFoundation}=require(path.join(backend,'dist/common/package-foundation'));
const {verifyGrant}=require('../src/cloud-local.cjs');
(async()=>{const db=new PGlite();const originalFetch=global.fetch;try{
await db.exec(fs.readFileSync('scripts/schema_calendar.sql','utf8'));
const c={query:(s,p)=>db.query(s,p),end:async()=>{}};
const tenantId=crypto.randomUUID(),ownerId=crypto.randomUUID(),userId=crypto.randomUUID(),employeeId=crypto.randomUUID();const now=Date.now(),pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const keys={fixture:pair.publicKey.export({format:'der',type:'spki'}).toString('base64')};const bound={tenantId,ownerId,installationId:crypto.randomUUID(),activationId:crypto.randomUUID(),fingerprint:'fixture'};
function sign(prefix,extra){const text=prefix+'.'+Buffer.from(JSON.stringify({v:1,issuerKeyId:'fixture',platform:'desktop',...bound,issuedAt:now,expiresAt:now+86400000,...extra})).toString('base64url');return text+'.'+crypto.sign('RSA-SHA256',Buffer.from(text),pair.privateKey).toString('base64url');}
const claims={...bound,revision:1,foundation:packageFoundation('retail-pharmacy'),limits:{internalAccounts:5},license:{kind:'trial',trialDays:7,graceDays:3,platforms:['desktop'],startedAt:now,expiresAt:now+7*86400000,graceEndsAt:now+10*86400000}};
const rt={bundle:path.dirname(backend),v:{databases:{live:'fixture'}},client:async()=>c,secrets:{save:async()=>{}}};
const created=await provision(rt.bundle,c,{localBusinessId:tenantId,cloudOwnerId:ownerId,businessName:'Synthetic Pharmacy',ownerName:'Synthetic owner',email:'owner@fixture.invalid',password:'Synthetic-only-password',foundation:claims.foundation},'live');assert.equal(created.tenantId,tenantId);assert.equal(created.ownerId,ownerId);
await installPolicy(rt,c,claims);
const staff={purpose:'staff',userId,email:'pharmacist@fixture.invalid',fullName:'Synthetic pharmacist',role:'staff',permissions:{general:'view',operations:'edit',retail_checkout:'edit'},credentialVersion:2,passwordChangeAllowed:false,passwordChangeRequired:false,employee:{id:employeeId,fullName:'Synthetic pharmacist',position:'Pharmacist',status:'active',schedules:[{dayOfWeek:'Mon',startTime:'09:00',endTime:'17:00'}]},pharmacist:{licenseNumber:'SYNTHETIC-VERIFIED',validThrough:'2030-01-01',active:true}};const token=sign('GNJLS1',staff);rt.v.cloudBinding={...bound,keys,ownerGrant:sign('GNJTA1',{...claims,email:'owner@fixture.invalid'}),api:'https://fixture.invalid/api',identity:require('../src/cloud-local.cjs').deviceIdentity()};verifyGrant(token,keys,bound,'staff');
global.fetch=async(url)=>({ok:true,text:async()=>JSON.stringify(url.endsWith('/auth/staff/login')?{accessToken:'cloud-token-never-used-locally',user:{tenantId}}:url.endsWith('/auth/staff/me')?{id:userId,role:'staff'}:{grant:token})});
await prepareLogin(rt,{email:staff.email,password:'Synthetic-staff-password'});
const u=(await c.query('SELECT * FROM users WHERE id=$1',[userId])).rows[0];assert.equal(u.tenant_id,tenantId);assert.equal(u.credential_version,2);assert.notEqual(u.password_hash,'Synthetic-staff-password');assert(await require(path.join(backend,'node_modules/bcrypt')).compare('Synthetic-staff-password',u.password_hash));
assert.equal((await c.query('SELECT count(*)::int AS n FROM employee_schedules WHERE employee_id=$1',[employeeId])).rows[0].n,1);
assert.equal((await c.query('SELECT license_number FROM retail_pharmacists WHERE user_id=$1 AND active',[userId])).rows[0].license_number,'SYNTHETIC-VERIFIED');
assert.equal((await c.query('SELECT count(*)::int AS n FROM retail_orders')).rows[0].n,0);
await require('../src/cloud-staff.cjs').applyRoster(rt,sign('GNJLR1',{purpose:'roster',users:[{id:userId,email:staff.email,role:'staff',status:'active',assigned:true,permissions:staff.permissions,credentialVersion:3,pharmacist:null}]}));
assert.equal((await c.query('SELECT revoked FROM desktop_cloud_staff WHERE user_id=$1',[userId])).rows[0].revoked,true);
assert.equal((await c.query('SELECT active FROM retail_pharmacists WHERE user_id=$1',[userId])).rows[0].active,false);
assert.equal((await c.query('SELECT count(*)::int AS n FROM users')).rows[0].n,2);
console.log('PASS cloud-bound PGlite provisioning: exact IDs, signed limits, credential verifier, staff permissions, schedules, verified pharmacist, no financial history');
}finally{global.fetch=originalFetch;await db.close();}})().catch(e=>{console.error(e);process.exitCode=1});

