const assert=require('node:assert/strict');
const required=['water-custody','delivery-fleet','contacts','inventory','staff'];
async function captureWaterFleetUpgrade(c){return {foundations:(await c.query('SELECT to_jsonb(f) AS value FROM tenant_foundations f ORDER BY tenant_id')).rows.map(r=>r.value),audits:(await c.query('SELECT id,md5(to_jsonb(a)::text) AS hash FROM audit_logs a ORDER BY id')).rows};}
async function verifyWaterFleetUpgrade(c,before){
 const after=await captureWaterFleetUpgrade(c),byTenant=new Map(after.foundations.map(f=>[f.tenant_id,f])),changed=[];
 assert.equal(after.foundations.length,before.foundations.length,'Foundation count changed during Water upgrade');
 for(const old of before.foundations){
  const f=byTenant.get(old.tenant_id),blocks=old.blocks||[];
  const water=old.industry_id==='retail'&&['inventory','retail-pos'].every(b=>blocks.includes(b))&&(old.specialization_id==='water-refilling'||(!old.specialization_id&&old.workflow_ids?.includes('water-desk')&&blocks.includes('water-custody')));
  if(!water||required.every(b=>blocks.includes(b))){assert.deepEqual(f,old,'Unrelated foundation changed during Water upgrade');continue;}
  assert(f&&Number.isFinite(Date.parse(f.updated_at)),'Water foundation update timestamp missing');
  const expected={...old,blocks:[...new Set([...blocks,...required])].sort(),version:old.version+1,updated_at:f.updated_at};
  assert.deepEqual(f,expected,'Water foundation changed outside the approved staple expansion');changed.push({old,new:f});
 }
 const audits=new Map(after.audits.map(a=>[a.id,a.hash])),oldIds=new Set(before.audits.map(a=>a.id));
 for(const a of before.audits)assert.equal(audits.get(a.id),a.hash,'Existing audit evidence changed during Water upgrade');
 const added=after.audits.filter(a=>!oldIds.has(a.id));assert.equal(added.length,changed.length,'Unexpected audit additions during Water upgrade');
 if(added.length){const rows=(await c.query('SELECT * FROM audit_logs WHERE id=ANY($1::uuid[])',[added.map(a=>a.id)])).rows;
  for(const pair of changed){const matches=rows.filter(a=>a.tenant_id===pair.old.tenant_id&&a.entity_id===pair.old.tenant_id&&a.action==='foundation.water-fleet-standard'&&a.entity_type==='TenantFoundation');assert.equal(matches.length,1,'Missing Water foundation audit');assert(matches[0].user_id==null&&matches[0].ip_address==null&&matches[0].user_agent==null&&Number.isFinite(Date.parse(matches[0].created_at)),'Unexpected Water audit attribution or timestamp');assert.deepEqual(matches[0].old_values,pair.old,'Water audit old values mismatch');assert.deepEqual(matches[0].new_values,pair.new,'Water audit new values mismatch');}
 }
}
module.exports={captureWaterFleetUpgrade,verifyWaterFleetUpgrade};
