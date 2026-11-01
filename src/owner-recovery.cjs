const {randomBytes,createHash,timingSafeEqual}=require('node:crypto'),path=require('node:path');
const DAY=86400000;
const digest=value=>createHash('sha256').update(value).digest('hex');
function enroll(settings,{tenantId,ownerId,email},now=Date.now()){
 if(settings.ownerRecovery)throw Error('Recovery already enrolled');
 const code=randomBytes(24).toString('hex').match(/.{8}/g).join('-');
 settings.ownerRecovery={tenantId,ownerId,email:email.trim().toLowerCase(),verifier:digest(code),createdAt:now,expiresAt:now+DAY,lastSeen:now,attempts:0,used:false};
 return {code,expiresAt:new Date(now+DAY).toISOString()};
}
async function inspect(rt,now=Date.now()){
 const r=rt.v?.ownerRecovery;if(!r)return {available:false,message:'Quick recovery is unavailable for this business.'};
 if(now<r.lastSeen-60000||now<r.createdAt)r.locked=true;
 r.lastSeen=Math.max(r.lastSeen,now);if(now>=r.expiresAt)r.locked=true;
 await rt.secrets.save(rt.v);
 const available=!r.locked&&!r.used&&r.attempts<10&&!!rt.v.databases.live;
 return {available,expiresAt:new Date(r.expiresAt).toISOString(),remainingMs:Math.max(0,r.expiresAt-now),message:available?'Available for 24 hours after business creation. No internet required.':'Quick recovery has expired or is unavailable. Use the approved recovery process.'};
}
async function reset(rt,input,now=Date.now(),hashPassword){
 if(!input||typeof input.email!=='string'||typeof input.code!=='string'||input.code.length>200||typeof input.password!=='string'||typeof input.confirmation!=='string')throw Error('Enter the owner email, recovery code and new password.');
 if(input.password!==input.confirmation)throw Error('Passwords must match.');
 if(input.password.trim().length<12||Buffer.byteLength(input.password,'utf8')>72)throw Error('Choose a password of 12–72 UTF-8 bytes.');
 const state=await inspect(rt,now);if(!state.available)throw Error('Recovery unavailable. '+state.message);
 const r=rt.v.ownerRecovery;r.attempts++;await rt.secrets.save(rt.v);
 const actual=Buffer.from(digest(input.code.trim().toLowerCase()),'hex'),expected=Buffer.from(r.verifier,'hex');
 if(input.email.trim().toLowerCase()!==r.email||expected.length!==actual.length||!timingSafeEqual(actual,expected))throw Error('Recovery details are invalid.');
 // Durable single-use tombstone precedes mutation: interrupted recovery fails closed.
 r.used=true;delete r.verifier;rt.v.jwtSecret=randomBytes(48).toString('base64url');await rt.secrets.save(rt.v);
 const hash=await(hashPassword||require(path.join(rt.bundle,'backend/node_modules/bcrypt')).hash)(input.password,12);
 let c;try{c=await rt.client(rt.v.databases.live);await c.query('BEGIN');const result=await c.query("UPDATE users SET password_hash=$1 WHERE id=$2 AND tenant_id=$3 AND lower(email)=$4 AND role='owner' AND status='active'",[hash,r.ownerId,r.tenantId,r.email]);if(result.rowCount!==1)throw Error('Owner changed');
 await c.query("INSERT INTO audit_logs(tenant_id,user_id,action,entity_type,entity_id,new_values) VALUES($1,$2,'desktop.owner.password-recovery','User',$2,$3)",[r.tenantId,r.ownerId,JSON.stringify({method:'local-one-time-code',withinCreationWindow:true})]);await c.query('COMMIT');
 }catch{if(c)await c.query('ROLLBACK').catch(()=>{});throw Error('Recovery could not complete. The code was consumed for safety; use the approved recovery process.');}finally{await c?.end();}
 return {message:'Owner password reset. Sign in with your new password. Cashier and business records are unchanged.'};
}
module.exports={enroll,inspect,reset};
