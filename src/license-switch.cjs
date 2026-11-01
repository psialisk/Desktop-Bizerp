const fs=require('node:fs/promises'),path=require('node:path'),{randomBytes}=require('node:crypto');
const {PORTS,safeBackupPath}=require('./config.cjs');
const {fingerprint}=require('./upgrade.cjs');

// Encrypted settings are the only commit point. Prepared databases/files are
// deliberately retained after failure; no startup path promotes an orphan.
async function prepareLicenseSwitch(current,{offlineLicense,packageId,prepare,publish,save}){
 const next=structuredClone(current);
 for(const mode of ['live','training'])if(current.databases[mode]){const candidate=await prepare(mode,current.databases[mode]);next.databases[mode]=candidate.database;next.uploads[mode]=candidate.uploads;}
 await publish();
 next.offlineLicense=offlineLicense;
 if(next.localBusiness&&packageId)next.localBusiness.packageId=packageId;
 next.licenseHistory=[...(current.licenseHistory||[]),{at:new Date().toISOString(),licenseId:offlineLicense.claims?.licenseId,revision:offlineLicense.claims?.revision,originalDatabases:current.databases,originalUploads:current.uploads}];
 await save(next);
 return next;
}

async function prepareLicenseDatabase(rt,folder,mode,source,claims,token,configure){
 const old=rt.v,backup=path.join(folder,mode);await fs.mkdir(backup,{recursive:false});
 rt.message('Preparing '+mode+' license configuration in a retained copy');
 const dump=path.join(backup,'database.dump');
 await rt.run(rt.bin('pg_dump'),['-h','127.0.0.1','-p',String(PORTS.database),'-U','gnj_app','-d',source,'-Fc','-f',dump],{PGPASSWORD:old.appPassword},120000);
 const files=[{name:'database.dump',size:(await fs.stat(dump)).size,hash:await rt.hash(dump)}];
 for(const relative of await rt.walk(old.uploads[mode])){const name='uploads/'+relative,target=safeBackupPath(backup,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(old.uploads[mode],...relative.split('/')),target);files.push({name,size:(await fs.stat(target)).size,hash:await rt.hash(target)});}
 await fs.writeFile(path.join(backup,'manifest.json'),JSON.stringify({format:1,mode,schemaHash:old.schemaHash,version:rt.manifest.version,createdAt:new Date().toISOString(),files},null,2),{flag:'wx'});
 const original=await rt.client(source);let before;
 try{before=await fingerprint(original);}finally{await original.end();}
 const database='store_'+mode+'_'+randomBytes(6).toString('hex');await rt.createDatabase(database);
 await rt.run(rt.bin('pg_restore'),['-h','127.0.0.1','-p',String(PORTS.database),'-U','gnj_app','-d',database,'--no-owner','--no-privileges','--exit-on-error',dump],{PGPASSWORD:old.appPassword},120000);
 const clone=await rt.client(database);
 try{const tenants=await clone.query('SELECT id FROM tenants');if(tenants.rows.length!==1)throw Error('Expected a single local business');await configure(rt,clone,tenants.rows[0].id,claims,token);const after=await fingerprint(clone,before),operational=rows=>rows.filter(row=>!['tenant_foundations','audit_logs','desktop_signed_capacity'].includes(row.name));if(JSON.stringify(operational(before))!==JSON.stringify(operational(after)))throw Error('License configuration changed existing business records; originals retained');}finally{await clone.end();}
 const uploads=path.join(rt.root,'uploads',database);await fs.mkdir(path.dirname(uploads),{recursive:true});await fs.mkdir(uploads,{recursive:false});
 for(const file of files.filter(row=>row.name.startsWith('uploads/'))){const target=path.join(uploads,...file.name.slice(8).split('/'));await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(safeBackupPath(backup,file.name),target);if(await rt.hash(target)!==file.hash)throw Error('License attachment copy verification failed');}
 return {database,uploads};
}
module.exports={prepareLicenseSwitch,prepareLicenseDatabase};
