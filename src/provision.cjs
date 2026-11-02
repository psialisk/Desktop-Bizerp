const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
async function provision(bundle,client,input,mode){
 const q=async(s,p)=>(await client.query(s,p)).rows;
 const bcrypt=require(path.join(bundle,'backend/node_modules/bcrypt'));
 const {normalizeFoundation}=require(path.join(bundle,'backend/dist/modules/foundation/foundation.catalog'));
 const tenant=(mode==="live"&&input.localBusinessId)||randomUUID(),owner=(mode==="live"&&input.cloudOwnerId)||randomUUID(),cashier=randomUUID(),role=randomUUID(),location=randomUUID();
 const foundation=normalizeFoundation(input.foundation||{industryId:'retail',templateId:'retail',blocks:['contacts','staff','inventory','retail-sales','retail-accounting','retail-pos','water-custody','delivery-fleet','documents','financial-reports'],workflowIds:['water-desk'],packageFamilyId:'retail',specializationId:'water-refilling'});
 await q('BEGIN');try{
 await q("INSERT INTO tenants(id,name,slug,plan,contact_email) VALUES($1,$2,$3,'enterprise',$4)",[tenant,(mode==='training'?'TRAINING — ':'')+input.businessName,'desktop-'+tenant,input.email]);
 const permissions={general:'view',operations:'edit',finance:'none',marketing:'none',human_resource:'none',admin:'none',retail_checkout:foundation.blocks.includes('retail-pos')?'edit':'none',property_checkout:foundation.blocks.includes('property-finance')?'edit':'none'};
 await q("INSERT INTO roles(id,tenant_id,name,permissions) VALUES($1,$2,'Local counter staff', $3)",[role,tenant,JSON.stringify(permissions)]);
 await q("INSERT INTO users(id,tenant_id,email,password_hash,full_name,role) VALUES($1,$2,$3,$4,$5,'owner')",[owner,tenant,input.email,await bcrypt.hash(input.password,12),input.ownerName]);
 if(input.cashierEmail)await q("INSERT INTO users(id,tenant_id,email,password_hash,full_name,role,access_role_id) VALUES($1,$2,$3,$4,'Local counter staff','staff',$5)",[cashier,tenant,input.cashierEmail,await bcrypt.hash(input.cashierPassword,12),role]);
 await q('INSERT INTO tenant_foundations(tenant_id,industry_id,template_id,blocks,workflow_ids,package_family_id,specialization_id,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[tenant,foundation.industryId,foundation.templateId,foundation.blocks,foundation.workflowIds,foundation.packageFamilyId||null,foundation.specializationId||null,owner]);
 await q("INSERT INTO erp_stock_locations(id,tenant_id,code,name,is_default) VALUES($1,$2,'MAIN','Store stock',true)",[location,tenant]);
 if(foundation.industryId==='real-estate'){const modes=[...(foundation.blocks.includes('rentals')?['rental']:[]),...(foundation.blocks.includes('stays')?['hotel','short_stay']:[]),...(foundation.blocks.includes('association')?['association']:[])];if(modes.length)await q('INSERT INTO business_workspaces(tenant_id,enabled_modes,default_mode,property_modes) VALUES($1,$2,$3,$4)',[tenant,modes,modes[0],JSON.stringify({})]);}
 // No platform_subscriptions row: existing shared policy treats this isolated POC store as legacy/non-expiring.
 // Commercial offline licensing is a separate release requirement, never a cloud guard bypass.
 await q("INSERT INTO audit_logs(tenant_id,user_id,action,entity_type,entity_id,new_values) VALUES($1,$2,'desktop.water.provision','Tenant',$1,$3)",[tenant,owner,JSON.stringify({mode,synthetic:mode==='training',localPoc:true})]);
 if(mode==='training'&&foundation.blocks.includes('water-custody')){
  const contact=randomUUID();await q("INSERT INTO erp_contacts(id,tenant_id,display_name,roles) VALUES($1,$2,'DEMO Water Customer',ARRAY['customer'])",[contact,tenant]);
  for(const [sku,name,unit,price,quantity]of [['DEMO-REFILL','DEMO purified water refill 5 gallons','gallon',25,200],['DEMO-BOTTLE','DEMO reusable 5-gallon container','piece',180,40],['DEMO-CAP','DEMO replacement cap','piece',5,100]]){const product=randomUUID();await q("INSERT INTO retail_products(id,tenant_id,sku,name,unit,selling_price,category) VALUES($1,$2,$3,$4,$5,$6,'Water demo')",[product,tenant,sku,name,unit,price]);await q('INSERT INTO retail_stock_movements(tenant_id,product_id,quantity,reason,request_key,actor_id,location_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[tenant,product,quantity,'SYNTHETIC TRAINING OPENING STOCK ONLY',randomUUID(),owner,location]);}
  const db={query:q,transaction:fn=>fn({query:q})};const {SpecialistOperationsService}=require(path.join(bundle,'backend/dist/modules/specialist-operations/specialist-operations.service'));const custody=new SpecialistOperationsService(db,{requireTenantId:()=>tenant});const actor={sub:owner,role:'owner',permissions:{operations:'edit'}};
  for(const [direction,quantity]of [['issue',4],['return',2]])await custody.create(actor,'water-refilling',{contactId:contact,containerType:'DEMO station-owned 5-gallon bottle',direction,quantity,note:'SYNTHETIC TRAINING CUSTODY ONLY; not a real delivery or payment',requestKey:randomUUID()});
 }
 await q('COMMIT');return {tenantId:tenant,ownerId:owner,cashierId:input.cashierEmail?cashier:null,locationId:location};
 }catch(e){await q('ROLLBACK');throw e;}
}
module.exports={provision};
