const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {PGlite}=require(process.env.ERP_BACKEND_SOURCE+'/node_modules/@electric-sql/pglite');
const {fingerprint}=require('../src/upgrade.cjs');
(async()=>{const db=new PGlite();try{
await db.exec(fs.readFileSync(path.join(process.env.ERP_RECOVERED_RUNTIME,'schema.sql'),'utf8'));
const c={query:async(s,p)=>db.query(s,p)};const t=randomUUID(),u=randomUUID(),p=randomUUID();
await c.query("INSERT INTO tenants(id,name,slug) VALUES($1,'Retained store','desktop-preservation')",[t]);await c.query("INSERT INTO users(id,tenant_id,email,full_name,password_hash,role) VALUES($1,$2,'desktop@fixture.invalid','Owner','fixture','owner')",[u,t]);await c.query("INSERT INTO retail_products(id,tenant_id,sku,name,unit,selling_price) VALUES($1,$2,'RETAIN','Retained product','piece',123.40)",[p,t]);
const before=await fingerprint(c);await db.exec(fs.readFileSync('scripts/upgrade_042_calendar.sql','utf8'));const after=await fingerprint(c,before);assert.deepEqual(after,before,'All original business column values must be retained');
const ready=(await c.query("SELECT to_regclass('operations_calendar_events') IS NOT NULL AS projection,to_regclass('operations_tasks') IS NOT NULL AS calendar,to_regclass('retail_medicines') IS NOT NULL AS pharmacy")).rows[0];assert(ready.calendar&&ready.pharmacy&&ready.projection);
const numeric=(await fingerprint(c)).find(t=>t.name==='retail_products');assert(numeric.numericColumns.includes('selling_price'),'Fingerprint must normalize equivalent exact numeric scale');
console.log('PASS Desktop 0.4.2 upgrade preserves original rows/columns; Pharmacy and calendar schema available');
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
