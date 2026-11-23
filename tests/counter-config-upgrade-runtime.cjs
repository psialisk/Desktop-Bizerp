const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
// A separate cluster and ports: never connect to the installed business profile.
const config=require('../src/config.cjs');config.PORTS={database:54991,backend:38991,frontend:38990};
const {StoreRuntime}=require('../src/runtime.cjs'),{upgradeStore,fingerprint}=require('../src/upgrade.cjs');
(async()=>{const bundle=path.resolve('artifacts/BusinessERP-Desktop-0.4.2-Counter-Upgrade-20261113/resources/runtime'),root=await fs.mkdtemp(path.join(os.tmpdir(),'BusinessERP-counter-upgrade-'));let saved;
 const rt=new StoreRuntime({root,bundle,secrets:{load:async()=>saved,save:async v=>{saved=structuredClone(v);}}});
 try{await rt.initialize();const base=structuredClone(rt.v);
 for(const [level,hash] of [[102,'1fcaeda7fbf6ac6b8e24804874ac7044afb05ca9ab9ed5f646c488045fb3b702'],[103,'26fbc3d6a1ba7e098dd1c09fe4abacaa48d45d96861e09c8cc0405b5ec1d405d'],[104,'f700b9a869d2b58ee16868bc9098669266622d18dfd4675bc523b45689048137']]){
 const database='store_live_'+crypto.randomBytes(6).toString('hex'),uploads=path.join(root,'original-'+level);await fs.mkdir(uploads);await rt.createDatabase(database);
 const c=await rt.client(database);let before;try{await c.query(`CREATE TABLE tenant_foundations(tenant_id uuid PRIMARY KEY,industry_id text,blocks text[],workflow_ids text[],version integer DEFAULT 1,updated_at timestamptz DEFAULT now());CREATE TABLE audit_logs(id uuid PRIMARY KEY,tenant_id uuid,user_id uuid,action text,entity_type text,entity_id uuid,old_values jsonb,new_values jsonb);CREATE TABLE retail_pos_policy(id integer);CREATE TABLE sample_sales(id integer,total numeric);INSERT INTO sample_sales VALUES(1,125.50);
 INSERT INTO tenant_foundations(tenant_id,industry_id,blocks,workflow_ids) VALUES(gen_random_uuid(),'retail',ARRAY['inventory'],ARRAY[]::text[]),(gen_random_uuid(),'retail',ARRAY['inventory'],NULL),(gen_random_uuid(),'food-hospitality',ARRAY[]::text[],ARRAY[]::text[]),(gen_random_uuid(),'food-hospitality',ARRAY[]::text[],NULL),(gen_random_uuid(),'real-estate',ARRAY['contacts'],ARRAY[]::text[]);`);
 for(const n of [103,104].filter(n=>n<=level)){const file=n===103?'103_retail_pos_staple.sql':'104_retail_counter_workflow.sql';await c.query(await fs.readFile(path.join('D:/GitHub/bizerp.gnj/backend/sql',file),'utf8'));}before=await fingerprint(c);}finally{await c.end();}
 rt.v={...structuredClone(base),schemaHash:hash,databases:{live:database},uploads:{live:uploads}};const result=await upgradeStore(rt);assert.notEqual(rt.v.databases.live,database);
 const original=await rt.client(database),clone=await rt.client(rt.v.databases.live);try{assert.deepEqual(await fingerprint(original,before),before);await require('../src/upgrade-counter-config.cjs').verifyCounterConfig(clone);assert.equal((await clone.query('SELECT total::text FROM sample_sales')).rows[0].total,'125.50');assert.equal((await clone.query("SELECT count(*)::int AS n FROM tenant_foundations WHERE workflow_ids IS NULL")).rows[0].n,2);
 const migration=rt.manifest.upgrades.find(e=>e.fromHash===hash);const auditCount=(await clone.query('SELECT count(*)::int AS n FROM audit_logs')).rows[0].n;await clone.query(await fs.readFile(path.join(bundle,migration.file),'utf8'));assert.equal((await clone.query('SELECT count(*)::int AS n FROM audit_logs')).rows[0].n,auditCount);
 }finally{await original.end();await clone.end();}assert((await fs.stat(path.join(result.backupRoot,'live/database.dump'))).size>0);console.log('PASS '+level+' to 105: config, NULL workflows, repeat safety, backup and retained original');
 }console.log('Synthetic profile: '+root);
 }finally{await rt.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});
