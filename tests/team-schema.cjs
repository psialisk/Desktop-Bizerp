const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {PGlite}=require(path.join(process.env.ERP_BACKEND_SOURCE||'D:/GitHub/bizerp.gnj/backend','node_modules/@electric-sql/pglite'));
const repo=process.env.ERP_DESKTOP_SOURCE||process.cwd(),read=f=>fs.readFileSync(path.join(repo,f),'utf8');
const {fingerprint}=require(path.join(repo,'src/upgrade.cjs'));
(async()=>{
 const team=read('scripts/upgrade_087_team.sql');
 const previous=fs.readFileSync(path.join(repo,'artifacts/BusinessERP-Desktop-0.4.2-Cloud-Local-Staff/resources/runtime/schema.sql'),'utf8');
 const cases=[['086',previous.split('-- 087 persisted calendar reconciliation')[0],read('scripts/087_calendar_reconciliation.sql')+team],['fresh',read('scripts/schema_calendar.sql'),''],['042',fs.readFileSync('D:/Business ERP/Desktop-Development/Recovered-0.4.2/application/resources/runtime/schema.sql','utf8'),read('scripts/upgrade_042_calendar.sql')+team],['087',fs.readFileSync(path.join(repo,'artifacts/BusinessERP-Desktop-0.4.2-Cloud-Local-Staff/resources/runtime/schema.sql'),'utf8'),team]];
 for(const [name,schema,upgrade] of cases){const db=new PGlite();try{
 await db.exec(schema);const c={query:(s,p)=>db.query(s,p)},t=randomUUID(),u=randomUUID(),e=randomUUID(),product=randomUUID();
 await c.query("INSERT INTO tenants(id,name,slug) VALUES($1,'Synthetic retained store',$2)",[t,'fixture-'+t]);
 await c.query("INSERT INTO users(id,tenant_id,email,full_name,password_hash,role) VALUES($1,$2,'owner@fixture.invalid','Synthetic owner','fixture','owner')",[u,t]);
 await c.query("INSERT INTO employees(id,tenant_id,full_name,position,status) VALUES($1,$2,'Synthetic employee','Cashier','active')",[e,t]);
 await c.query("INSERT INTO retail_products(id,tenant_id,sku,name,unit,selling_price) VALUES($1,$2,'RETAIN','Retained history','piece',123.40)",[product,t]);
 let retainedLinks=0;
if(upgrade&&(await c.query("SELECT to_regclass('erp_shift_assignments') IS NOT NULL AS ready")).rows[0].ready){const legacy=randomUUID();await c.query('INSERT INTO erp_employee_links(tenant_id,employee_id,user_id,hourly_rate) VALUES($1,$2,$3,175.25)',[t,legacy,u]);await c.query("INSERT INTO erp_shift_assignments(tenant_id,employee_id,work_date,starts_at,ends_at,label,created_by) VALUES($1,$2,'2026-10-30','2026-10-30T00:00Z','2026-10-30T08:00Z','Historical custom shift',$3)",[t,legacy,u]);await c.query("INSERT INTO erp_attendance(tenant_id,employee_id,started_at,ended_at,status,created_by,request_key) VALUES($1,$2,'2026-10-30T00:00Z','2026-10-30T08:00Z','approved',$3,$4)",[t,legacy,u,randomUUID()]);retainedLinks=1;}
const before=upgrade?await fingerprint(c):null;if(upgrade){await db.exec(upgrade);assert.deepEqual(await fingerprint(c,before),before,name+' original values retained');}
 await db.exec(team); // Additive team migration is rerunnable.
 assert((await c.query("SELECT to_regclass('tenant_starter_accounts') IS NOT NULL AND to_regclass('desktop_local_installations') IS NOT NULL AND to_regclass('team_shift_requests') IS NOT NULL AS ready")).rows[0].ready);
 await c.query("INSERT INTO erp_shift_assignments(tenant_id,employee_id,work_date,starts_at,ends_at,label,created_by,shift_type) VALUES($1,$2,'2026-11-04','2026-11-04T12:00Z','2026-11-04T20:00Z','Night',$3,'night')",[t,e,u]);
 assert.equal((await c.query('SELECT count(*)::int AS n FROM erp_employee_links')).rows[0].n,retainedLinks,'No invented wage links; old compensation retained');
 await assert.rejects(c.query("INSERT INTO erp_shift_assignments(tenant_id,employee_id,work_date,starts_at,ends_at,label,created_by) VALUES($1,$2,'2026-11-05','2026-11-05T12:00Z','2026-11-05T20:00Z','Foreign',$3)",[randomUUID(),e,u]),/Employee must belong/);
 console.log('PASS '+name+' schema: histories preserved, 088–091 available, wage-independent shifts and tenant boundary');
 }finally{await db.close();}}
})().catch(e=>{console.error(e);process.exitCode=1});
