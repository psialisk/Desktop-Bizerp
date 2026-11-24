const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const protocol=require('./cloud-local.cjs');
const profileKeys=['databases','uploads','localBusiness','cloudBinding','offlineLicense','cloudRegistration','pendingCloudIdentity','schemaHash','licenseControl'];
const pick=v=>Object.fromEntries(profileKeys.map(k=>[k,v[k]]));
const normalized=s=>String(s||'').trim().toLowerCase().replace(/^0(?=9\d{9}$)/,'+63');
function skewText(ms){const minutes=Math.round(Math.abs(ms)/60000),hours=Math.floor(minutes/60);return (hours?hours+' h '+(minutes%60)+' min':minutes+' min')+(ms<0?' behind':' ahead of');}
function pickClockSkew(current,outcomes){let skew=current;for(const o of outcomes||[]){if(!o||typeof o.skewMs!=='number')continue;if(skew===null||Math.abs(o.skewMs)>Math.abs(skew))skew=o.skewMs;}return skew;}
function clockSkewState(skew){return skew===null?null:{skewMs:skew,at:new Date().toISOString(),message:'This computer clock is '+skewText(skew)+' the cloud time, so these records were timestamped by the cloud. Correct the system clock, then use Sync now.'};}
async function installSchema(c,sql){
 // PostgreSQL enum additions must commit before later migrations use the new value.
 const marker=/^ALTER TYPE "users_status_enum" ADD VALUE IF NOT EXISTS 'pending_verification';\s*$/m;
 const match=marker.exec(sql);if(!match){await c.query(sql);return;}
 await c.query(sql.slice(0,match.index));await c.query(match[0]);await c.query(sql.slice(match.index+match[0].length));
}
async function migrate(rt){
 if(rt.v.schemaHash===rt.manifest.schemaHash)return;
 const entry=(rt.manifest.upgrades||[]).find(e=>e.fromHash===rt.v.schemaHash&&e.toHash===rt.manifest.schemaHash&&e.recordSyncExpansion==='desktop-record-sync-v1');
 if(!entry||!['0.4.8-0.4.14','0.4.15','0.4.16','0.4.17','0.4.18','0.4.19'].includes(entry.fromVersion))return;
 const sql=await fs.readFile(path.join(rt.bundle,entry.file),'utf8');if(crypto.createHash('sha256').update(sql).digest('hex')!==entry.migrationHash)throw Error('Schema migration integrity check failed');
 for(const database of Object.values(rt.v.databases||{})){const c=await rt.client(database);try{await c.query('BEGIN');const roles=(await c.query("SELECT id,permissions,to_jsonb(roles)->'legacy_permissions' AS legacy_permissions FROM roles")).rows;
  await c.query(sql.replace(/^(?:BEGIN|COMMIT);\s*$/gm,''));
  for(const role of roles){const row=(await c.query('SELECT legacy_permissions FROM roles WHERE id=$1',[role.id])).rows[0];if(JSON.stringify(row.legacy_permissions)!==JSON.stringify(['0.4.15','0.4.16','0.4.17','0.4.18','0.4.19'].includes(entry.fromVersion)?role.legacy_permissions:(role.legacy_permissions||role.permissions)))throw Error('Role permission history was not preserved');}
  await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}}
 rt.v.schemaHash=rt.manifest.schemaHash;rt.upgradePending=false;rt.upgradeEntry=null;await rt.secrets.save(rt.v);rt.message('Local schema updated. Business records and role permission history were preserved.');
}
async function saveProfile(rt){const id=rt.v.cloudBinding?.tenantId||(rt.v.databases?.live?'local-'+rt.v.instanceId:null);if(!id)return;rt.v.cloudProfiles={...rt.v.cloudProfiles,[id]:{...pick(rt.v),identifiers:[...new Set([...(rt.v.cloudProfiles?.[id]?.identifiers||[]),rt.v.localBusiness?.ownerEmail].filter(Boolean))]}};await rt.secrets.save(rt.v);}
async function selectProfile(rt,id){if(rt.v.cloudBinding?.tenantId===id){await migrate(rt);return;}await saveProfile(rt);await rt.stopHttp();const saved=rt.v.cloudProfiles?.[id];for(const k of profileKeys)delete rt.v[k];Object.assign(rt.v,saved||{databases:{},uploads:{},schemaHash:rt.manifest.schemaHash});await rt.secrets.save(rt.v);await migrate(rt);}
async function selectOffline(rt,identifier){if(!rt.v.cloudProfiles)return;const current=rt.v.cloudProfiles[rt.v.cloudBinding?.tenantId];if([rt.v.localBusiness?.ownerEmail,...(current?.identifiers||[])].some(s=>s&&normalized(s)===normalized(identifier)))return;const entry=Object.entries(rt.v.cloudProfiles).find(([,p])=>(p.identifiers||[]).some(s=>normalized(s)===normalized(identifier)));if(entry&&entry[0]!==rt.v.cloudBinding?.tenantId){await selectProfile(rt,entry[0]);await rt.start('live');}}
async function exchange(rt,events=[],cursor='0',historyKey=null){const b=rt.v.cloudBinding,payload={events,cursor,historyKey};return protocol.request(b.api,'/desktop-local/records',{body:{...protocol.proof(b.identity,'recheck',{activationId:b.activationId,payloadHash:crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),...(b.syncActorGrant?{actorGrant:b.syncActorGrant}:{})}),...payload}});}
async function applyPending(rt,c,pending){const {applyDesktopEvents}=require(path.join(rt.bundle,'backend/dist/common/desktop-record-sync'));const db={query:async(s,p)=>(await c.query(s,p)).rows};let todo=[...pending].sort((a,b)=>Date.parse(b.event_at)-Date.parse(a.event_at)||String(b.device_id).localeCompare(String(a.device_id))||String(b.event_id).localeCompare(String(a.event_id)));await c.query('BEGIN');try{while(todo.length){const next=[];let progress=0;for(const e of todo){await c.query('SAVEPOINT sync_row');try{await applyDesktopEvents(db,rt.v.cloudBinding.tenantId,[e],true);await c.query('RELEASE SAVEPOINT sync_row');progress++;}catch(err){await c.query('ROLLBACK TO SAVEPOINT sync_row');if(['23503','P0001'].includes(err.code)){e.syncDependencyError=err.message;next.push(e);}else throw err;}}if(!progress)throw Error('Sync could not apply '+todo[0].table_name+': '+(todo[0].syncDependencyError||'referenced records are unavailable')+'. Pending changes are retained');todo=next;}await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}}
// The sync position is kept in the local database next to the journal, so losing the small state file
// on disk cannot make the Desktop upload work the cloud already has.
const checkpointTable="CREATE TABLE IF NOT EXISTS desktop_sync_checkpoint(tenant_id uuid NOT NULL,actor_key text NOT NULL,device_id uuid NOT NULL,cursor text NOT NULL,uploaded bigint NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,actor_key))";
const cleanPosition=o=>({cursor:typeof o?.cursor==='string'?o.cursor:'0',uploaded:/^[0-9]+$/.test(String(o?.uploaded))?String(o.uploaded):'0'});
async function readStateFile(file){try{const raw=JSON.parse(await fs.readFile(file,'utf8'));return {...cleanPosition(raw),pending:Array.isArray(raw.pending)?raw.pending:[]};}catch(e){if(e.code==='ENOENT'||e instanceof SyntaxError)return null;throw e;}}
async function readCheckpoint(c,b){try{const row=(await c.query('SELECT cursor,uploaded FROM desktop_sync_checkpoint WHERE tenant_id=$1 AND actor_key=$2',[b.tenantId,b.syncActorId||''])).rows[0];return row?cleanPosition(row):null;}catch{return null;}}
async function saveCheckpoint(rt,c,b,state){try{if(!rt.checkpointTable){await c.query(checkpointTable);rt.checkpointTable=true;}await c.query('INSERT INTO desktop_sync_checkpoint(tenant_id,actor_key,device_id,cursor,uploaded,updated_at) VALUES($1,$2,$3,$4,$5::bigint,now()) ON CONFLICT(tenant_id,actor_key) DO UPDATE SET device_id=EXCLUDED.device_id,cursor=EXCLUDED.cursor,uploaded=EXCLUDED.uploaded,updated_at=now()',[b.tenantId,b.syncActorId||'',b.identity.installationId,state.cursor,state.uploaded]);}catch(e){if(!rt.checkpointWarning){rt.checkpointWarning=true;rt.message('Sync position could not be stored in the local database; a lost sync file may re-upload history. '+e.message);}}}
async function storedCheckpoint(rt){const b=rt.v.cloudBinding;if(!b||!rt.v.databases?.live)return null;let c;try{c=await rt.client(rt.v.databases.live);return await readCheckpoint(c,b);}catch{return null;}finally{await c?.end().catch(()=>{});}}
async function journalMax(c){try{return Number((await c.query('SELECT COALESCE(max(sequence),0) AS max FROM desktop_sync_events')).rows[0].max);}catch{return null;}}
// Whichever store is further along wins, but a position this journal never reached belongs to another
// database (a restore that kept a newer file or row): trusting it would silently skip every local row below.
function resumeState(file,saved,max){const within=s=>!s||max==null||Number(s.uploaded)<=max;
 const base=within(file)?file:null,pick=saved&&within(saved)&&(!base||Number(saved.uploaded)>Number(base.uploaded))?saved:base;
 return {cursor:pick?.cursor||'0',uploaded:pick?.uploaded||'0',pending:Array.isArray(pick?.pending)?pick.pending:[]};}
function reportSyncError(rt,e){if(/more than 5 minutes in the future/.test(String(e.message)))rt.clockSkew={skewMs:null,at:new Date().toISOString(),message:'This computer clock is more than 5 minutes ahead of the cloud, so new records are refused. Correct the system clock, then use Sync now.'};rt.syncSummary='Sync pending: '+e.message;rt.message(rt.syncSummary);}
// Local record changes and local sign-ins ask for a sync immediately; a burst coalesces into one run.
function requestSync(rt){if(!rt.v?.cloudBinding||!rt.v?.databases?.live)return;if(rt.tenantSyncRunning){rt.tenantSyncAgain=true;return;}if(rt.tenantSyncSoon)return;rt.tenantSyncSoon=setTimeout(()=>{rt.tenantSyncSoon=null;synchronize(rt).catch(e=>reportSyncError(rt,e));},150);rt.tenantSyncSoon.unref?.();}
const pendingFilter="e.tenant_id=$1 AND e.device_id=$2 AND e.sequence>$3::bigint AND NOT t.cloud_only AND e.table_name NOT IN ('erp_inventory_values','retail_lot_allocations','retail_prescription_dispenses','notifications') AND ($4::uuid IS NULL OR (e.origin_actor_id=$4 AND e.table_name NOT IN ('retail_customer_policy','retail_pos_policy','erp_inventory_settings')))";
const pendingArgs=(b,uploaded)=>[b.tenantId,b.identity.installationId,uploaded,b.syncActorId||null];
// The probe and the upload loop read the journal through this one builder, so neither can widen the other's scope.
const pendingSQL=(columns,extra='')=>'SELECT '+columns+' FROM desktop_sync_events e JOIN desktop_sync_tables t USING(table_name) WHERE '+pendingFilter+extra;
const stateFile=(rt,b)=>path.join(rt.root,'tenant-sync-'+b.tenantId+(b.syncActorId?'-'+b.syncActorId:'')+'.json');
// One index probe on the local journal is all it takes to notice a local write, using the same position and
// the same query a sync would; the store backend does not have to tell us anything.
async function probeLocal(rt){if(rt.tenantSyncRunning||rt.tenantSyncProbing)return;const b=rt.v.cloudBinding;if(!b||!rt.v.databases?.live)return;rt.tenantSyncProbing=true;
 try{const c=rt.tenantSyncProbe||(rt.tenantSyncProbe=await rt.client(rt.v.databases.live));
  // The probe resumes from the same position a sync would, so it never kicks a run for rows already uploaded.
  const {uploaded}=resumeState(await readStateFile(stateFile(rt,b)),await readCheckpoint(c,b),await journalMax(c));
  if((await c.query(pendingSQL('1',' LIMIT 1'),pendingArgs(b,uploaded))).rows[0])requestSync(rt);
 }catch{await rt.tenantSyncProbe?.end().catch(()=>{});rt.tenantSyncProbe=null;}
 finally{rt.tenantSyncProbing=false;}}
async function synchronize(rt){if(rt.tenantSyncRunning)return;const b=rt.v.cloudBinding;if(!b||!rt.v.databases?.live)return;rt.tenantSyncRunning=true;const c=await rt.client(rt.v.databases.live);const file=stateFile(rt,b);try{
 await require('./automatic-license.cjs').refresh(rt);
 let clockSkew=null,repaired=null,serverTime=NaN;const state=resumeState(await readStateFile(file),await readCheckpoint(c,b),await journalMax(c));
 // The checkpoint is the crash-proof copy, so it must never describe a page that only the state file
 // remembers: while a page waits to be applied the durable cursor stays where the applied work ended.
 const save=async()=>{const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(state));await fs.rename(temp,file);if(!state.pending.length)await saveCheckpoint(rt,c,b,state);};
 // Download the complete dependency set before applying; the cursor and pending payload are persisted together.
 let complete=false;while(!complete){const page=await exchange(rt,[],state.cursor);serverTime=Date.parse(page.serverTime);state.pending.push(...page.events);state.cursor=page.cursor;await save();complete=page.complete;}
 if(state.pending.length){await applyPending(rt,c,state.pending);state.pending=[];await save();}
 // A clock that ran ahead leaves queued rows future-dated and refused; shift them onto the cloud timeline first.
 if(Number.isFinite(serverTime)){const retimed=await require(path.join(rt.bundle,'backend/dist/common/desktop-record-sync')).retimeFutureEvents({query:async(s,p)=>(await c.query(s,p)).rows},b.tenantId,b.identity.installationId,state.uploaded,new Date(serverTime));if(retimed.count)repaired={skewMs:retimed.skewMs,at:new Date().toISOString(),retimed:retimed.count,message:'This computer clock was '+skewText(retimed.skewMs)+' the cloud time, so '+retimed.count+' queued record(s) were re-timestamped to the cloud time and synchronization resumed. Correct the system clock so new records keep their real time.'};}
 // Only locally recorded business events are uploaded; replayed cloud references and license/credential state never upload.
 while(true){
  const args=pendingArgs(b,state.uploaded);
  const first=(await c.query(pendingSQL('e.*',' ORDER BY e.sequence LIMIT 1'),args)).rows[0];if(!first)break;
  const group=first.transaction_id;const rows=(await c.query(pendingSQL('e.*',' AND '+(group?'e.transaction_id=$5':'e.sequence=$5::bigint')+' ORDER BY e.sequence'),[...args,group||first.sequence])).rows;
  if(rows.length>1000||Buffer.byteLength(JSON.stringify(rows))>1500000)throw Error('A transaction exceeds the sync batch limit; its records remain saved');
  const result=await exchange(rt,rows,state.cursor);clockSkew=pickClockSkew(clockSkew,result.outcomes);state.uploaded=String(rows.at(-1).sequence);state.pending.push(...result.events);state.cursor=result.cursor;await save();if(state.pending.length){await applyPending(rt,c,state.pending);state.pending=[];await save();}
 }
 rt.clockSkew=clockSkewState(clockSkew)||repaired;rt.syncSummary='Cloud and local records synchronized. History is retained for every received version.';
 }finally{await c.end();rt.tenantSyncRunning=false;if(rt.tenantSyncAgain){rt.tenantSyncAgain=false;requestSync(rt);}}}
function start(rt){stop(rt);if(!rt.v.cloudBinding)return;
 // A journal probe every two seconds starts synchronization seconds after a local write; the thirty second
 // timer still pulls cloud changes (and covers writes that never pass through the local backend).
 rt.tenantSyncProbeTimer=setInterval(()=>probeLocal(rt),2000);rt.tenantSyncProbeTimer.unref?.();
 rt.tenantSyncTimer=setInterval(()=>synchronize(rt).catch(e=>reportSyncError(rt,e)),30000);rt.tenantSyncTimer.unref?.();}
function stop(rt){if(rt.tenantSyncTimer)clearInterval(rt.tenantSyncTimer);rt.tenantSyncTimer=null;if(rt.tenantSyncProbeTimer)clearInterval(rt.tenantSyncProbeTimer);rt.tenantSyncProbeTimer=null;if(rt.tenantSyncSoon)clearTimeout(rt.tenantSyncSoon);rt.tenantSyncSoon=null;if(rt.tenantSyncProbe){rt.tenantSyncProbe.end().catch(()=>{});rt.tenantSyncProbe=null;}rt.tenantSyncAgain=false;}
async function cloudLogin(rt,input,auth,api){const tenant=auth.actor.tenantId;if(!tenant)throw Error('Cloud login returned no tenant');const staffLogin=auth.actor.role!=='owner';await selectProfile(rt,tenant);
 if(staffLogin){
  const activation=await protocol.staffActivation(rt,input,auth,api);const {claims,cloudBinding,staff,staffGrant}=activation;
  if(!rt.v.databases?.live){const name='store_live_'+crypto.randomBytes(6).toString('hex');await rt.createDatabase(name);const c=await rt.client(name);try{await installSchema(c,await fs.readFile(path.join(rt.bundle,'schema.sql'),'utf8'));await c.query('INSERT INTO desktop_sync_identity(singleton,device_id) VALUES(true,$1)',[cloudBinding.identity.installationId]);}finally{await c.end();}rt.v={...rt.v,databases:{live:name},uploads:{live:path.join(rt.root,'uploads',tenant)},schemaHash:rt.manifest.schemaHash};await fs.mkdir(rt.v.uploads.live,{recursive:true});}
  rt.v={...rt.v,cloudBinding,localBusiness:{businessName:claims.businessName,ownerName:claims.fullName,ownerEmail:claims.email,packageId:claims.foundation.specializationId}};await rt.secrets.save(rt.v);
  const manager=require('./cloud-staff.cjs');await manager.initializeStaffTenant(rt,claims);await synchronize(rt);await manager.mirror(rt,staff,staffGrant,input.password,input.email);
  rt.v.cloudProfiles={...rt.v.cloudProfiles,[tenant]:{...pick(rt.v),identifiers:[...new Set([...(rt.v.cloudProfiles?.[tenant]?.identifiers||[]),input.email,staff.email,claims.email])]}};await saveProfile(rt);await rt.start('live');start(rt);return true;
 }

 if(!rt.v.cloudBinding){const activation=await protocol.activate(rt,{email:input.email,password:input.password,confirmation:input.password});const {claims,cloudBinding}=activation;const name='store_live_'+crypto.randomBytes(6).toString('hex');await rt.createDatabase(name);const c=await rt.client(name);try{await installSchema(c,await fs.readFile(path.join(rt.bundle,'schema.sql'),'utf8'));await c.query('INSERT INTO desktop_sync_identity(singleton,device_id) VALUES(true,$1)',[cloudBinding.identity.installationId]);}finally{await c.end();}rt.v={...rt.v,cloudBinding,databases:{live:name},uploads:{live:path.join(rt.root,'uploads',tenant)},localBusiness:{businessName:claims.businessName,ownerName:claims.fullName,ownerEmail:claims.email,packageId:claims.foundation.specializationId},schemaHash:rt.manifest.schemaHash};await fs.mkdir(rt.v.uploads.live,{recursive:true});await rt.secrets.save(rt.v);await protocol.request(api,'/desktop-local/login-enroll',{token:auth.token,body:protocol.proof(cloudBinding.identity,'recheck',{activationId:cloudBinding.activationId})});
 }else{const b=rt.v.cloudBinding;const renewed=await protocol.request(api,'/desktop-local/login-enroll',{token:auth.token,body:protocol.proof(b.identity,'recheck',{activationId:b.activationId})});protocol.verifyGrant(renewed.grant,b.keys,b,'owner');rt.v.cloudBinding={...b,ownerGrant:renewed.grant};delete rt.v.cloudBinding.syncActorGrant;delete rt.v.cloudBinding.syncActorId;await rt.secrets.save(rt.v);const c=await rt.client(rt.v.databases.live);try{await c.query('INSERT INTO desktop_sync_identity(singleton,device_id) VALUES(true,$1) ON CONFLICT(singleton) DO UPDATE SET device_id=EXCLUDED.device_id',[b.identity.installationId]);}finally{await c.end();}}
 const file=stateFile(rt,{tenantId:tenant});let firstSync=false;try{await fs.access(file);}catch(e){if(e.code!=='ENOENT')throw e;firstSync=!(await storedCheckpoint(rt));}if(firstSync){const c=await rt.client(rt.v.databases.live);try{await c.query("UPDATE desktop_sync_events e SET device_id=$2 FROM desktop_sync_tables t WHERE e.table_name=t.table_name AND e.tenant_id=$1 AND e.device_id='cloud' AND NOT t.cloud_only",[tenant,rt.v.cloudBinding.identity.installationId]);}finally{await c.end();}}
 await synchronize(rt);{const c=await rt.client(rt.v.databases.live);try{await require('./cloud-staff.cjs').installPolicy(rt,c,protocol.verifyGrant(rt.v.cloudBinding.ownerGrant,rt.v.cloudBinding.keys,rt.v.cloudBinding,'owner'));}finally{await c.end();}}await require('./cloud-staff.cjs').cacheOwnerLogin(rt,input,auth);rt.v.cloudProfiles={...rt.v.cloudProfiles,[tenant]:{...pick(rt.v),identifiers:[...new Set([input.email,auth.actor.email,auth.actor.loginPhone,rt.v.localBusiness.ownerEmail].filter(Boolean))]}};await saveProfile(rt);await rt.start('live');start(rt);return true;
}
module.exports={applyPending,migrate,installSchema,cloudLogin,synchronize,requestSync,start,stop,selectOffline,saveProfile,exchange};
