const assert=require('node:assert/strict');
const {captureWaterFleetUpgrade}=require('./upgrade-water-fleet.cjs');
function same(a,b){assert.deepEqual(a,b);return true;}
async function verifyCustomerAccountsUpgrade(c,before,expand){
 const after=await captureWaterFleetUpgrade(c);assert.equal(after.foundations.length,before.foundations.length,'Foundation count changed');
 const hashes=new Map(after.audits.map(a=>[a.id,a.hash]));for(const old of before.audits)assert.equal(hashes.get(old.id),old.hash,'Prior audit evidence changed');
 const ids=after.audits.filter(a=>!before.audits.some(b=>b.id===a.id)).map(a=>a.id),rows=ids.length?(await c.query('SELECT * FROM audit_logs WHERE id=ANY($1::uuid[])',[ids])).rows:[];
 assert(rows.every(r=>['foundation.water-fleet-standard','foundation.retail-customer-accounts.retrofit'].includes(r.action)),'Unexpected upgrade audit');
 for(const old of before.foundations){let current=old;const chain=rows.filter(r=>r.tenant_id===old.tenant_id);let applied=0;
  while(applied<chain.length){const event=chain.find(r=>!r.used&&(()=>{try{return same(r.old_values,current)}catch{return false}})());assert(event,'Foundation upgrade audit chain missing');assert(event.entity_type==='TenantFoundation'&&event.entity_id===old.tenant_id&&event.user_id==null&&event.ip_address==null&&event.user_agent==null,'Unexpected upgrade actor');
   const next=event.new_values;assert(Number.isFinite(Date.parse(next.updated_at)),'Upgrade timestamp missing');
   let blocks;if(event.action==='foundation.water-fleet-standard'){const water=current.industry_id==='retail'&&current.blocks.includes('inventory')&&current.blocks.includes('retail-pos')&&(current.specialization_id==='water-refilling'||!current.specialization_id&&current.workflow_ids?.includes('water-desk')&&current.blocks.includes('water-custody'));assert(water,'Water expansion applied to another package');blocks=[...new Set([...current.blocks,'water-custody','delivery-fleet','contacts','inventory','staff'])].sort();}
   else {const derived=expand({industryId:current.industry_id,templateId:current.template_id,specializationId:current.specialization_id,workflowIds:current.workflow_ids,blocks:current.blocks});blocks=[...new Set(derived.blocks)].sort();assert(!current.blocks.includes('retail-credit')||!current.blocks.includes('retail-loyalty'),'Duplicate customer foundation expansion');assert(blocks.includes('retail-credit')&&blocks.includes('retail-loyalty'),'Unrelated customer foundation expansion');}
   assert.deepEqual(next,{...current,blocks,version:current.version+1,updated_at:next.updated_at},'Foundation changed outside approved standard additions');event.used=true;current=next;applied++;
  }
  assert.deepEqual(after.foundations.find(f=>f.tenant_id===old.tenant_id),current,'Unrelated or unaudited foundation changed');
 }
 assert(rows.every(r=>r.used),'Unmatched foundation upgrade audit');
}
module.exports={captureCustomerAccountsUpgrade:captureWaterFleetUpgrade,verifyCustomerAccountsUpgrade};
