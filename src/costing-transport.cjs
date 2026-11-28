const assert=require('node:assert/strict');
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const amount=v=>v===null||Number.isSafeInteger(v)&&v>=0;
/** Persist acceptance before advancing the upload checkpoint; incomplete/old responses keep work pending. */
async function recordCostOutcomes(c,tenant,events,outcomes){
 assert(Array.isArray(outcomes)&&outcomes.length===events.length,'Cloud did not acknowledge the complete transaction');
 const ids=new Set(events.map(e=>e.event_id)),seen=new Set();
 for(const o of outcomes){assert(ids.has(o.eventId)&&!seen.has(o.eventId)&&['applied','duplicate','superseded'].includes(o.status),'Cloud did not acknowledge unique submitted records');seen.add(o.eventId);}
 const valued=events.some(e=>e.table_name==='retail_stock_movements'&&e.record_data?.cost_provisional===true&&['weighted_average','fifo','specific'].includes(e.record_data?.cost_method));
 const acceptance=outcomes.find(o=>o.costAcceptance)?.costAcceptance;
 if(valued)assert(acceptance?.version===1&&acceptance.transactionId===events[0].transaction_id&&outcomes.every(o=>o.status!=='superseded'),'Cloud costing acceptance is unavailable; keep this transaction pending and update the Cloud service');
 if(!acceptance)return;
 assert(Number.isSafeInteger(acceptance.policyVersion)&&acceptance.policyVersion>0&&Number.isFinite(Date.parse(acceptance.acceptedAt)),'Invalid costing acceptance policy');
 const documents=new Set();
 for(const o of outcomes)for(const f of o.costFinalizations||[]){
  assert(!documents.has(f.fulfillmentId),'Duplicate costing acceptance document');documents.add(f.fulfillmentId);
  assert(events.some(e=>e.record_data?.fulfillment_id===f.fulfillmentId||e.record_data?.source_id===f.fulfillmentId),'Costing acceptance belongs to another document');
  assert(f.method===acceptance.method&&f.policyVersion===acceptance.policyVersion&&Number.isFinite(Date.parse(f.acceptedAt))&&amount(f.provisionalCostCents)&&amount(f.finalCostCents),'Invalid finalized costing evidence');
  assert(f.differenceCents===(f.provisionalCostCents===null||f.finalCostCents===null?null:f.finalCostCents-f.provisionalCostCents),'Costing difference does not balance');
 }
 await c.query('CREATE TABLE IF NOT EXISTS desktop_inventory_cost_acceptance(tenant_id uuid NOT NULL,event_id uuid NOT NULL,payload jsonb NOT NULL,accepted_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,event_id))');
 for(const o of outcomes){if(!o.costAcceptance&&!o.costFinalizations?.length)continue;const payload={costAcceptance:o.costAcceptance||null,costFinalizations:o.costFinalizations||[]};const prior=(await c.query('SELECT payload FROM desktop_inventory_cost_acceptance WHERE tenant_id=$1 AND event_id=$2',[tenant,o.eventId])).rows[0];assert(!prior||canonical(prior.payload)===canonical(payload),'Cloud costing acceptance is immutable');if(!prior)await c.query('INSERT INTO desktop_inventory_cost_acceptance(tenant_id,event_id,payload) VALUES($1,$2,$3::jsonb)',[tenant,o.eventId,JSON.stringify(payload)]);}
}
function assertSupportedCostBatch(events){for(const e of events)if(e.table_name==='journal_entries'&&e.record_data?.cost_provisional===true&&['inventory_opening','inventory_landed_adjustment'].includes(e.record_data.source_type))throw Error('Cloud review is required for this inventory valuation/correction; the complete local transaction remains saved and pending. Finalize the costing policy or later landed-cost correction in Cloud before reconciling this PC.');}
module.exports={recordCostOutcomes,assertSupportedCostBatch};
