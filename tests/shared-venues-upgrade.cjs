const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {PGlite}=require('D:/GitHub/bizerp.gnj/backend/node_modules/@electric-sql/pglite');
(async()=>{const db=new PGlite();try{
 const base=process.env.ERP_PARITY_BASE,stage=process.env.ERP_PARITY_STAGE;assert(base&&stage);
 await db.exec(fs.readFileSync(path.join(base,'schema.sql'),'utf8'));
 const t=randomUUID(),u=randomUUID(),court=randomUUID();
 await db.query("INSERT INTO tenants(id,name,slug) VALUES($1,'Retained Pickleball',$2)",[t,"retain-"+t]);
 await db.query("INSERT INTO users(id,tenant_id,email,full_name,password_hash,role) VALUES($1,$2,'retain@fixture.invalid','Owner','fixture','owner')",[u,t]);
 await db.query("INSERT INTO fitness_courts(id,tenant_id,name,hourly_rate) VALUES($1,$2,'Retained Court',300)",[court,t]);
 await db.query("INSERT INTO fitness_venue_profiles(tenant_id,court_id,description,images,updated_by) VALUES($1,$2,'Original profile','[\"/api/customer-discovery/venue-media/retain.png\"]',$3)",[t,court,u]);
 const delta=fs.readFileSync(path.join(stage,'migrations/139_shared_venues_check_in.sql'),'utf8');await db.exec(delta);
 let row=(await db.query('SELECT * FROM fitness_court_public_profiles WHERE court_id=$1',[court])).rows[0];assert.equal(row.description,'Original profile');assert.equal(row.images.length,1);
 const linked=(await db.query('SELECT venue_id,use_venue_profile FROM fitness_courts WHERE id=$1',[court])).rows[0];assert(linked.venue_id);assert.equal(linked.use_venue_profile,false);
 await db.exec(delta);assert.equal((await db.query('SELECT count(*)::int AS n FROM fitness_venues WHERE tenant_id=$1',[t])).rows[0].n,1);
 assert.equal((await db.query('SELECT description FROM fitness_venue_profiles WHERE court_id=$1',[court])).rows[0].description,'Original profile');
 const fresh=new PGlite();try{await fresh.exec(fs.readFileSync(path.join(stage,'schema.sql'),'utf8'));assert((await fresh.query("SELECT to_regclass('fitness_court_public_profiles') IS NOT NULL AS ready")).rows[0].ready);}finally{await fresh.close();}
 console.log('PASS fresh shipped schema and Desktop migration preserves court/profile/photos, creates shared venue without overriding legacy, reruns safely');
 }finally{await db.close();}})().catch(e=>{console.error(e);process.exitCode=1});

