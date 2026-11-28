const fs=require('node:fs/promises'),path=require('node:path'),{randomBytes,createHash}=require('node:crypto');
const {PORTS,safeBackupPath,validateManifest}=require('./config.cjs');

async function prepareUpgrade(current,newHash,prepare,save){
 const next=structuredClone(current);
 for(const mode of ['live','training'])if(current.databases[mode]){const p=await prepare(mode,current.databases[mode]);next.databases[mode]=p.database;next.uploads[mode]=p.uploads;}
 next.schemaHash=newHash;next.jwtSecret=randomBytes(48).toString('base64url');
 next.upgradeHistory=[...(current.upgradeHistory||[]),{fromHash:current.schemaHash,toHash:newHash,backupRoot:current.lastUpgradeBackup||null,originalDatabases:current.databases,originalUploads:current.uploads,at:new Date().toISOString()}];
 await save(next);return next;
}

const ident=s=>'"'+s.replaceAll('"','""')+'"';
// Compare exact numeric values across additive integer/numeric scale upgrades without JS Number conversion.
async function fingerprint(c,definitions,ignoredColumns={}){
 if(!definitions){const tables=(await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;definitions=[];
  for(const t of tables){const columns=(await c.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[t.tablename])).rows;definitions.push({name:t.tablename,columns:columns.map(r=>r.column_name),numericColumns:columns.filter(r=>['smallint','integer','bigint','numeric','decimal'].includes(r.data_type)).map(r=>r.column_name)});}
 }
 if(Object.keys(ignoredColumns).length)definitions=definitions.map(d=>({...d,columns:d.columns.filter(k=>!(ignoredColumns[d.name]||[]).includes(k)),numericColumns:d.numericColumns.filter(k=>!(ignoredColumns[d.name]||[]).includes(k))}));
 const out=[];for(const d of definitions){const select=d.columns.map(k=>(d.numericColumns||[]).includes(k)?`trim_scale(${ident(k)}::numeric) AS ${ident(k)}`:ident(k));
  const r=await c.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(row_to_json(x)::text,'' ORDER BY row_to_json(x)::text),'')) AS hash FROM (SELECT ${select.join(',')} FROM ${ident(d.name)}) x`);out.push({...d,...r.rows[0]});
 }return out;
}

const acceptedHashes=rt=>[...new Set((rt.manifest.upgrades||[]).map(u=>u.fromHash))];
const stamp=()=>new Date().toISOString().replace(/[:.]/g,'-');
async function verifyBackup(rt,folder,mode){
 const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
 validateManifest(manifest,rt.manifest.schemaHash,mode,acceptedHashes(rt));
 for(const file of manifest.files){const target=safeBackupPath(folder,file.name);const stat=await fs.lstat(target);if(stat.isSymbolicLink()||!stat.isFile()||stat.size!==file.size||await rt.hash(target)!==file.hash)throw Error('Automatic upgrade backup integrity check failed');}
 return manifest;
}
async function createUpgradeBackup(rt,old){
 const parent=path.join(rt.root,'upgrade-backups');await fs.mkdir(parent,{recursive:true});
 const staging=await fs.mkdtemp(path.join(parent,'.in-progress-'));
 try{
  const sourceEntry=(rt.manifest.upgrades||[]).find(u=>u.fromHash===old.schemaHash),version=sourceEntry?.fromVersion||rt.manifest.version;
  let stores=0;
  for(const mode of ['live','training'])if(old.databases[mode]){
   stores++;rt.message('Saving automatic '+mode+' recovery backup');const folder=path.join(staging,mode);await fs.mkdir(folder);
   const dump=path.join(folder,'database.dump');await rt.run(rt.bin('pg_dump'),['-h','127.0.0.1','-p',String(PORTS.database),'-U','gnj_app','-d',old.databases[mode],'-Fc','-f',dump],{PGPASSWORD:old.appPassword},120000);
   const files=[{name:'database.dump',hash:await rt.hash(dump),size:(await fs.stat(dump)).size}];
   for(const relative of await rt.walk(old.uploads[mode])){const name='uploads/'+relative,target=safeBackupPath(folder,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(old.uploads[mode],...relative.split('/')),target);files.push({name,hash:await rt.hash(target),size:(await fs.stat(target)).size});}
   await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify({format:1,mode,schemaHash:old.schemaHash,version,createdAt:new Date().toISOString(),files},null,2),{flag:'wx'});
   await verifyBackup(rt,folder,mode);
  }
  if(!stores)throw Error('No local stores are available to upgrade');
  const backupRoot=path.join(parent,'automatic-upgrade-'+stamp()+'-'+randomBytes(4).toString('hex'));
  await fs.rename(staging,backupRoot);return backupRoot;
 }catch(error){await fs.rm(staging,{recursive:true,force:true}).catch(()=>{});throw error;}
}

async function upgradeStore(rt,options={}){
 const old=rt.v,entry=(rt.manifest.upgrades||[]).find(u=>u.fromHash===old.schemaHash&&u.toHash===rt.manifest.schemaHash);
 if(!entry)throw Error('No reviewed upgrade path for this store');
 if(!/^migrations\/[0-9a-z_-]+\.sql$/.test(entry.file))throw Error('Invalid packaged migration path');
 const sqlFile=path.join(rt.bundle,...entry.file.split('/'));if(await rt.hash(sqlFile)!==entry.migrationHash)throw Error('Packaged migration integrity failed');
 await rt.stopHttp();
 const backupRoot=await createUpgradeBackup(rt,old),created=[];
 let cloudBackup=null;
 // The local backup is already written and verified above; the cloud copy is an
 // extra safety net, so a missing entitlement, offline PC or upload failure must
 // never block the migration.
 if(typeof options.beforeMigrate==='function'){
  rt.message('Uploading the verified recovery backup to the cloud account');
  try{cloudBackup=await options.beforeMigrate({backupRoot,fromVersion:entry.fromVersion||rt.manifest.version});}
  catch(error){rt.message('Cloud backup could not be completed: '+error.message);cloudBackup={verified:false,reason:error.message};}
  if(cloudBackup?.verified===false)rt.message('Cloud backup not uploaded ('+(cloudBackup.reason||'unavailable')+'); the local recovery backup is kept');
 }
 try{
  rt.message('Recovery backup verified. Migrating restored copies of your local stores');
  const next=await prepareUpgrade({...old,lastUpgradeBackup:backupRoot},rt.manifest.schemaHash,async(mode)=>{
   const folder=path.join(backupRoot,mode),manifest=await verifyBackup(rt,folder,mode);
   const original=await rt.client(old.databases[mode]);let before,costingRegistry;const costingPolicy=entry.costingExpansion==='inventory-costing-v1';const emailTrialPolicy=entry.emailTrialExpansion==='owner-email-trial-v1';
   try{if(costingPolicy)costingRegistry=await require('./upgrade-costing.cjs').capture(original);before=await fingerprint(original,undefined,{...(emailTrialPolicy?{users:['status','updated_at','email_verified_at']}:{}),...(entry.recordSyncExpansion?{roles:['permissions','updated_at']}:{} )});}finally{await original.end();}
   const waterPolicy=entry.auditExpansion==='water-fleet-standard-v1',accountPolicy=entry.auditExpansion==='retail-customer-accounts-v1',counterPolicy=entry.configExpansion==='counter-staples-103-105';let approvedBefore;
   if(waterPolicy||accountPolicy){const sourceClient=await rt.client(old.databases[mode]);try{approvedBefore=await require('./upgrade-water-fleet.cjs').captureWaterFleetUpgrade(sourceClient);}finally{await sourceClient.end();}}
   const database='store_'+mode+'_'+randomBytes(6).toString('hex');await rt.createDatabase(database);created.push(database);
   await rt.run(rt.bin('pg_restore'),['-h','127.0.0.1','-p',String(PORTS.database),'-U','gnj_app','-d',database,'--no-owner','--no-privileges','--exit-on-error',path.join(folder,'database.dump')],{PGPASSWORD:old.appPassword},120000);
   const clone=await rt.client(database);try{
    await require('./tenant-sync.cjs').installSchema(clone,await fs.readFile(sqlFile,'utf8'));
    if(costingPolicy)await require('./upgrade-costing.cjs').verify(clone,costingRegistry);
    const after=await fingerprint(clone,before),businessRows=rows=>(costingPolicy?rows.filter(t=>t.name!=='desktop_sync_tables'):rows).filter(t=>!(waterPolicy||accountPolicy||counterPolicy)||!['tenant_foundations','audit_logs'].includes(t.name));
    if(JSON.stringify(businessRows(after))!==JSON.stringify(businessRows(before)))throw Error('Upgrade changed existing business records ('+businessRows(after).filter((r,i)=>JSON.stringify(r)!==JSON.stringify(businessRows(before)[i])).map(r=>r.name).join(', ')+'); original store and recovery backup retained');
    if(counterPolicy)await require('./upgrade-counter-config.cjs').verifyCounterConfig(clone);
    if(waterPolicy)await require('./upgrade-water-fleet.cjs').verifyWaterFleetUpgrade(clone,approvedBefore);
    if(accountPolicy)await require('./upgrade-customer-accounts.cjs').verifyCustomerAccountsUpgrade(clone,approvedBefore,require(path.join(rt.bundle,'backend/dist/common/water-fleet-standard')).withWaterFleet);
    const check=await clone.query("SELECT to_regclass('public.retail_pos_policy') IS NOT NULL AS ready");if(!check.rows[0].ready)throw Error('Upgraded schema validation failed');
   }finally{await clone.end();}
   const uploads=path.join(rt.root,'uploads',database);await fs.mkdir(uploads,{recursive:true});
   for(const file of manifest.files.filter(f=>f.name.startsWith('uploads/'))){const relative=file.name.slice(8),source=safeBackupPath(folder,file.name),target=path.join(uploads,...relative.split('/'));await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(source,target);if(await rt.hash(target)!==file.hash)throw Error('Restored upload integrity check failed');}
   return {database,uploads};
  },v=>rt.secrets.save(v));
  rt.v=next;rt.upgradePending=false;rt.upgradeEntry=null;rt.lastUpgradeBackup=backupRoot;
  rt.message('Schema upgrade verified. Automatic recovery backup saved to '+backupRoot);return {upgraded:true,backupRoot,cloudBackup};
 }catch(error){
  for(const database of created){const client=await rt.client('postgres',true).catch(()=>null);try{if(client)await client.query('DROP DATABASE IF EXISTS "'+database+'"');}catch{}finally{await client?.end();}await fs.rm(path.join(rt.root,'uploads',database),{recursive:true,force:true}).catch(()=>{});}
  rt.message('Upgrade stopped safely. Original stores and the automatic recovery backup were retained.');throw error;
 }
}
module.exports={prepareUpgrade,upgradeStore,fingerprint,createUpgradeBackup};
