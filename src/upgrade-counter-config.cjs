// Migrations 103–105 intentionally change foundation configuration and add audit rows.
// The caller still fingerprints every other pre-existing table and retains originals.
async function verifyCounterConfig(c){
 const result=await c.query(`SELECT count(*)::int AS invalid FROM tenant_foundations WHERE
 (industry_id='retail' AND (NOT (blocks @> ARRAY['inventory','retail-pos','retail-sales','retail-purchase','retail-accounting','financial-reports','staff']::text[]) OR (workflow_ids IS NOT NULL AND NOT ('retail'=ANY(workflow_ids)))))
 OR (industry_id='food-hospitality' AND (NOT (blocks @> ARRAY['contacts','food']::text[]) OR (workflow_ids IS NOT NULL AND NOT ('food-counter'=ANY(workflow_ids)))))`);
 if(result.rows[0].invalid!==0)throw Error('Counter configuration upgrade validation failed');
}
module.exports={verifyCounterConfig};
