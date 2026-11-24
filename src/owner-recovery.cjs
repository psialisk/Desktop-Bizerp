const {randomBytes,createHash,timingSafeEqual}=require('node:crypto'),path=require('node:path');
const DAY=86400000;
const digest=value=>createHash('sha256').update(value).digest('hex');
function enroll(settings,{tenantId,ownerId,email},now=Date.now()){
 if(settings.ownerRecovery)throw Error('Recovery already enrolled');
 const code=randomBytes(24).toString('hex').match(/.{8}/g).join('-');
 settings.ownerRecovery={tenantId,ownerId,email:email.trim().toLowerCase(),verifier:digest(code),createdAt:now,expiresAt:now+DAY,lastSeen:now,attempts:0,used:false};
 return {code,expiresAt:new Date(now+DAY).toISOString()};
}
// A cloud-linked business keeps its owner password in the cloud, and this PC can still hold an older copy of
// it. The signed grant this PC already enforces for the licence names that owner, so it is enough to repair
// the stale copy locally: an expired or never-enrolled one-time code must not leave the owner with a dead end.
function cloudOwner(rt){
 const b=rt.v?.cloudBinding;if(!b)return null;
 try{const c=require('./cloud-local.cjs').verifyGrant(b.ownerGrant,b.keys,b,'owner');if(!c?.ownerId)return null;return {tenantId:c.tenantId,ownerId:c.ownerId,email:String(c.email||'').trim().toLowerCase()};}catch{return null;}
}
async function inspect(rt,now=Date.now()){
 const owner=cloudOwner(rt),live=!!rt.v?.databases?.live,r=rt.v?.ownerRecovery;
 if(!r)return live&&owner?{available:true,mode:'repair',repair:true,email:owner.email,remainingMs:0,message:'Quick recovery was never enrolled here. Repair the local copy of this cloud owner password instead. No internet required.'}:{available:false,mode:'none',repair:false,remainingMs:0,message:'Quick recovery is unavailable for this business.'};
 // A clock that moves backwards is not a recovery window: repair stays closed for that, but an expired one is fine.
 const tampered=now<r.lastSeen-60000||now<r.createdAt;
 if(tampered)r.locked=true;
 r.lastSeen=Math.max(r.lastSeen,now);if(now>=r.expiresAt)r.locked=true;
 await rt.secrets.save(rt.v);
 const usable=!r.locked&&!r.used&&r.attempts<10&&live;
 const repair=live&&!!owner&&!tampered;
 const expiry={expiresAt:new Date(r.expiresAt).toISOString(),remainingMs:Math.max(0,r.expiresAt-now)};
 if(usable)return {available:true,mode:'code',repair,...expiry,message:'Available for 24 hours after business creation. No internet required.'};
 if(repair)return {available:true,mode:'repair',repair,email:owner.email,...expiry,message:'Quick recovery has expired. Repair the local copy of this cloud owner password instead. No internet required.'};
 return {available:false,mode:'none',repair:false,...expiry,message:'Quick recovery has expired or is unavailable. Use the approved recovery process.'};
}
async function reset(rt,input,now=Date.now(),hashPassword){
 if(!input||typeof input.email!=='string'||typeof input.code!=='string'||input.code.length>200||typeof input.password!=='string'||typeof input.confirmation!=='string')throw Error('Enter the owner email, recovery code and new password.');
 if(input.password!==input.confirmation)throw Error('Passwords must match.');
 if(input.password.trim().length<12||Buffer.byteLength(input.password,'utf8')>72)throw Error('Choose a password of 12–72 UTF-8 bytes.');
 const state=await inspect(rt,now);if(!state.available)throw Error('Recovery unavailable. '+state.message);
 const repair=state.mode==='repair',owner=repair?cloudOwner(rt):null;
 if(repair&&(!owner||input.email.trim().toLowerCase()!==owner.email))throw Error('Enter the owner email this computer is linked to: '+(owner?.email||''));
 const r=rt.v.ownerRecovery;
 if(!repair){
  r.attempts++;await rt.secrets.save(rt.v);
  const actual=Buffer.from(digest(input.code.trim().toLowerCase()),'hex'),expected=Buffer.from(r.verifier,'hex');
  if(input.email.trim().toLowerCase()!==r.email||expected.length!==actual.length||!timingSafeEqual(actual,expected))throw Error('Recovery details are invalid.');
 }
 // Durable single-use tombstone precedes mutation: interrupted recovery fails closed.
 if(r){r.used=true;delete r.verifier;}
 rt.v.jwtSecret=randomBytes(48).toString('base64url');await rt.secrets.save(rt.v);
 const target=repair?{tenantId:owner.tenantId,ownerId:owner.ownerId,email:owner.email}:{tenantId:r.tenantId,ownerId:r.ownerId,email:r.email};
 const hash=await(hashPassword||require(path.join(rt.bundle,'backend/node_modules/bcrypt')).hash)(input.password,12);
 let c;try{c=await rt.client(rt.v.databases.live);await c.query('BEGIN');const result=await c.query("UPDATE users SET password_hash=$1 WHERE id=$2 AND tenant_id=$3 AND lower(email)=$4 AND role='owner' AND status='active' RETURNING credential_version",[hash,target.ownerId,target.tenantId,target.email]);if(result.rowCount!==1)throw Error('Owner changed');await require('./local-credentials.cjs').record(rt,c,target.ownerId,{source:'owner-reset',version:Number(result.rows[0]?.credential_version)||0});
  await c.query("INSERT INTO audit_logs(tenant_id,user_id,action,entity_type,entity_id,new_values) VALUES($1,$2,$3,'User',$2,$4)",[target.tenantId,target.ownerId,repair?'desktop.owner.local-credential-repair':'desktop.owner.password-recovery',JSON.stringify(repair?{method:'signed-local-grant'}:{method:'local-one-time-code',withinCreationWindow:true})]);await c.query('COMMIT');
 }catch{if(c)await c.query('ROLLBACK').catch(()=>{});throw Error('Recovery could not complete. '+(repair?'The local credential was not changed.':'The code was consumed for safety; use the approved recovery process.'));}finally{await c?.end();}
 return {message:repair?'Local owner credential repaired. Sign in locally with your new password. Cashier and business records are unchanged.':'Owner password reset. Sign in with your new password. Cashier and business records are unchanged.'};
}
module.exports={enroll,inspect,reset};
