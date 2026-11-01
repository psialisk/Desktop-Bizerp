const fs=require('node:fs/promises'),syncFs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto'),{LocalLicense}=require('./license-store.cjs');
const {effectiveOfflineGrants}=require('./license-contract.cjs');
async function localLicense(rt){
 if(rt.localLicense)return rt.localLicense;
 let businessId=rt.v.offlineLicense?.proof?.localBusinessId;
 if(!businessId&&rt.v.databases.live){const c=await rt.client(rt.v.databases.live);try{const r=await c.query('SELECT id FROM tenants');if(r.rows.length!==1)throw Error('Expected a single local business');businessId=r.rows[0].id;}finally{await c.end();}}
 const keysPath=path.join(__dirname,'licensing-public-keys.json'),keys=JSON.parse(await fs.readFile(keysPath,'utf8'));
 rt.localLicense=new LocalLicense({store:{load:async()=>rt.v.offlineLicense||{},save:async value=>{const next={...rt.v,offlineLicense:value};await rt.secrets.save(next);rt.v=next;}},publicKeys:keys,installedVersion:rt.manifest.version,businessId:businessId||randomUUID(),installationId:rt.v.instanceId,packageIds:rt.manifest.fullErp?require(path.join(rt.bundle,'backend/dist/modules/package-commerce/catalog.json')).packages.map(p=>p.id):null,required:rt.manifest.commercialLicensing===true||!!rt.v.offlineLicense?.token});rt.localLicense.selectedPackage=rt.v.localBusiness?.packageId;return rt.localLicense;
}
function snapshot(c,grant){return {catalogVersion:1,planId:c.planId,cycle:'monthly',currency:'PHP',items:[],tax:{mode:'inclusive',rateBps:1200},grants:{branches:[{id:c.branchId,registers:1,specializationIds:grant.specializationIds,foundation:grant}]}};}
async function applyDatabase(rt,client,tenantId,claims,token){
 const {normalizeFoundation}=require(path.join(rt.bundle,'backend/dist/modules/foundation/foundation.catalog'));
 const localConfiguration=['perpetual','extension','local_trial'].includes(claims.kind),current=localConfiguration?claims.grants:effectiveOfflineGrants(claims),specialization=current.specializationId||current.specializationIds?.[0]||null,catalog=require(path.join(rt.bundle,'backend/dist/modules/foundation/catalog.json')),foundation=normalizeFoundation({...current,packageFamilyId:specialization?catalog.specializations.find(s=>s.id===specialization)?.packageFamilyId:null,specializationId:specialization});
 const q=async(s,p)=>(await client.query(s,p)).rows;await q('BEGIN');try{
  if(claims.limits){
   const count=await q("SELECT count(*)::int AS n FROM users WHERE tenant_id=$1 AND status='active'",[tenantId]);
   if(count[0].n>claims.limits.internalAccounts)throw Error('Active internal accounts exceed the signed purchased allowance; disable unused accounts before activation');
   await q('CREATE TABLE IF NOT EXISTS desktop_signed_capacity(tenant_id text PRIMARY KEY,internal_accounts integer NOT NULL CHECK(internal_accounts>0))');
   await q('ALTER TABLE desktop_signed_capacity ADD COLUMN IF NOT EXISTS limits jsonb');
   await q('INSERT INTO desktop_signed_capacity(tenant_id,internal_accounts) VALUES($1,$2) ON CONFLICT(tenant_id) DO UPDATE SET internal_accounts=EXCLUDED.internal_accounts',[tenantId,claims.limits.internalAccounts]);
   await q('UPDATE desktop_signed_capacity SET limits=$2 WHERE tenant_id=$1',[tenantId,JSON.stringify(claims.limits)]);
   await q(`CREATE OR REPLACE FUNCTION desktop_check_internal_capacity() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE capacity integer; used integer; BEGIN IF NEW.status <> 'active' THEN RETURN NEW; END IF; SELECT internal_accounts INTO capacity FROM desktop_signed_capacity WHERE tenant_id=NEW.tenant_id::text FOR UPDATE; IF capacity IS NULL THEN RETURN NEW; END IF; SELECT count(*) INTO used FROM users WHERE tenant_id=NEW.tenant_id AND status='active' AND id<>NEW.id; IF used>=capacity THEN RAISE EXCEPTION 'Signed desktop internal-account allowance exceeded' USING ERRCODE='check_violation'; END IF; RETURN NEW; END $$`);
   await q('DROP TRIGGER IF EXISTS desktop_internal_capacity ON users');
   await q('CREATE TRIGGER desktop_internal_capacity BEFORE INSERT OR UPDATE OF status,tenant_id ON users FOR EACH ROW EXECUTE FUNCTION desktop_check_internal_capacity()');
  }
  const owners=await q("SELECT id FROM users WHERE tenant_id=$1 AND role='owner' ORDER BY created_at LIMIT 1",[tenantId]);if(!owners.length)throw Error('Local owner is missing; use recovery instead of reprovisioning');
  await q('UPDATE tenant_foundations SET industry_id=$2,template_id=$3,blocks=$4,workflow_ids=$5,package_family_id=$6,specialization_id=$7,version=version+1,updated_by=$8,updated_at=now() WHERE tenant_id=$1',[tenantId,foundation.industryId,foundation.templateId,foundation.blocks,foundation.workflowIds,foundation.packageFamilyId,foundation.specializationId,owners[0].id]);
  await q('INSERT INTO audit_logs(id,tenant_id,user_id,action,entity_type,entity_id,new_values) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',[randomUUID(),tenantId,owners[0].id,'desktop.license.apply',claims.kind==='perpetual'?'DesktopPurchase':claims.kind==='extension'?'DesktopExtension':'RetailAgreement',tenantId,JSON.stringify({revision:claims.revision,activationId:claims.activationId,purchasedVersion:claims.purchasedVersion||null,permanent:claims.kind==='perpetual',licenseType:claims.kind,expiresAt:claims.expiresAt||null,graceEndsAt:claims.graceEndsAt||null,recordPreservation:true})]);
  await q('COMMIT');
 }catch(e){await q('ROLLBACK');throw e;}
}
// This immutable cache is prepared before the encrypted settings commit. Startup
// selects only the cache derived from the committed encrypted token.
async function publishLicense(rt,token){const digest=require('node:crypto').createHash('sha256').update(token).digest('hex'),folder=path.join(rt.root,'licenses'),target=path.join(folder,digest+'.gnjlicense');await fs.mkdir(folder,{recursive:true});try{if(await fs.readFile(target,'utf8')===token)return target;}catch(e){if(e.code!=='ENOENT')throw e;}const temporary=target+'.'+randomUUID()+'.new',file=await fs.open(temporary,'wx',0o600);try{await file.writeFile(token);await file.sync();}finally{await file.close();}await fs.rename(temporary,target);return target;}
async function applyLicense(rt,text){
 if(rt.licenseApplying)throw Error('Activation already in progress');rt.licenseApplying=true;
 try{const license=await localLicense(rt),claims=await license.preview(text),old=rt.v,token=text.trim();if(old.offlineLicense?.token===token)return claims;
  if(rt.ready)throw Error('Close Owner/POS windows and stop the local servers before changing the package');
  let staged=structuredClone(old.offlineLicense||{});const candidate=new LocalLicense({...license,store:{load:async()=>staged,save:async value=>{staged=value;}}});await candidate.apply(token);
  const {prepareLicenseSwitch,prepareLicenseDatabase}=require('./license-switch.cjs'),folder=path.join(rt.root,'pre-license-'+Date.now()+'-'+randomUUID());await fs.mkdir(folder,{recursive:false});
  const next=await prepareLicenseSwitch(old,{offlineLicense:staged,packageId:claims.grants?.specializationIds?.[0]||old.localBusiness?.packageId,prepare:(mode,source)=>prepareLicenseDatabase(rt,folder,mode,source,claims,token,applyDatabase),publish:()=>publishLicense(rt,token),save:value=>rt.secrets.save(value)});
  rt.v=next;return claims;
 }finally{rt.licenseApplying=false;}
}
async function setupLicense(rt,input){const local=await localLicense(rt);let status=await local.status();if(rt.manifest.fullErp&&!rt.v.offlineLicense?.token){const catalog=require(path.join(rt.bundle,'backend/dist/modules/package-commerce/catalog.json')),selected=catalog.packages.find(p=>p.id===input.packageId);if(!selected)throw Error('Choose an installed ERP package');const {packageFoundation}=require(path.join(rt.bundle,'backend/dist/common/package-foundation'));status=await local.startTrial(selected.id,packageFoundation(selected.id),selected.limits);}if(rt.manifest.commercialLicensing&&!status.claims&&!status.trial)throw Error('Paste a signed activation key before creating this store');if(!status.writable)throw Error(status.message);return status;}
async function ensureFullBusiness(rt){
 if(!rt.manifest.fullErp||!rt.v.databases.live||rt.v.localBusiness)return;
 const c=await rt.client(rt.v.databases.live);try{const r=await c.query("SELECT t.name,u.full_name,u.email,f.specialization_id,f.template_id FROM tenants t JOIN users u ON u.tenant_id=t.id AND u.role='owner' JOIN tenant_foundations f ON f.tenant_id=t.id ORDER BY u.created_at LIMIT 1");if(!r.rows.length)throw Error('Existing local business needs owner recovery');const row=r.rows[0],catalog=require(path.join(rt.bundle,'backend/dist/modules/package-commerce/catalog.json')),packageId=catalog.packages.some(p=>p.id===row.specialization_id)?row.specialization_id:catalog.packages.some(p=>p.id===row.template_id)?row.template_id:'water-refilling';rt.v={...rt.v,localBusiness:{businessName:row.name,ownerName:row.full_name,ownerEmail:row.email,packageId}};await rt.secrets.save(rt.v);if(!rt.v.offlineLicense?.token){const status=await setupLicense(rt,{packageId});const tenant=await c.query('SELECT id FROM tenants');await applyDatabase(rt,c,tenant.rows[0].id,{kind:'local_trial',grants:status.grants,limits:status.limits,revision:1},'LOCAL-TRIAL');}}finally{await c.end();}
}
module.exports={localLicense,applyLicense,applyDatabase,publishLicense,setupLicense,ensureFullBusiness};
