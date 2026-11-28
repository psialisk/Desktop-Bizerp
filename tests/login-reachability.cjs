const assert=require('node:assert/strict');
const {probe,createReachability,localLoginDecision,cachedEntitlement,MAX_LOCAL_DAYS}=require('../src/login-reachability.cjs');
const store=require('../src/login-policy-store.cjs');
const os=require('node:os'),fs=require('node:fs/promises'),path=require('node:path');
const jsonResponse=()=>({ok:true,headers:{get:()=> 'application/json; charset=utf-8'}});
const htmlResponse=()=>({ok:false,headers:{get:()=> 'text/html'}});

(async()=>{
  // probe: JSON answers count, HTML (captive portal) does not
  assert.equal(await probe('https://api.example/api',{fetchImpl:async()=>jsonResponse(),retryDelayMs:0}),true);
  assert.equal(await probe('https://api.example/api',{fetchImpl:async()=>htmlResponse(),retryDelayMs:0}),false);
  // retry: first attempt fails, second answers
  let calls=0;
  assert.equal(await probe('https://api.example/api',{fetchImpl:async()=>{calls++;if(calls===1)throw Error('offline');return jsonResponse();},retryDelayMs:0}),true);
  assert.equal(calls,2,'a failed probe is retried once');
  // both attempts fail
  assert.equal(await probe('https://api.example/api',{fetchImpl:async()=>{throw Error('offline');},retryDelayMs:0}),false);

  // cache: one probe per minute, force re-probes
  const reach=createReachability({fetcher:async()=>{calls++;return jsonResponse();}});calls=0;
  assert.equal(await reach.check('https://api.example/api'),true);
  assert.equal(await reach.check('https://api.example/api'),true);
  assert.equal(calls,1,'a cached probe is reused within the minute');
  assert.equal(await reach.check('https://api.example/api',{force:true}),true);
  assert.equal(calls,2,'force re-probes');

  // local login: reachable blocks, unknown blocks, 30-day window
  assert.equal(localLoginDecision({reachable:true,lastOnlineAt:Date.now()}).allowed,false);
  assert.equal(localLoginDecision({reachable:null,lastOnlineAt:Date.now()}).allowed,false);
  assert.equal(localLoginDecision({reachable:false,lastOnlineAt:0}).allowed,false);
  assert.equal(localLoginDecision({reachable:false,lastOnlineAt:Date.now()-29*86400000}).allowed,true);
  const old=localLoginDecision({reachable:false,lastOnlineAt:Date.now()-(MAX_LOCAL_DAYS+1)*86400000});
  assert.equal(old.allowed,false);
  assert.match(old.reason,/older than/);

  // cached entitlement is the last server read-only decision, not a recomputed date
  assert.deepEqual(cachedEntitlement({readOnly:false,lastOnlineAt:Date.now()}),{readOnly:false,reason:null});
  const cached=cachedEntitlement({readOnly:true,lastOnlineAt:Date.parse('2026-11-20T00:00:00Z')});
  assert.equal(cached.readOnly,true);assert.match(cached.reason,/read-only/);

  // store: missing file is "never signed in", a record round-trips
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'gnj-login-policy-'));
  assert.equal(await store.read(root),null);
  const saved=await store.recordOnlineSignIn(root,{api:'https://api.example/api',readOnly:true,now:Date.parse('2026-11-27T10:00:00Z')});
  assert.deepEqual(await store.read(root),saved);
  const stat=await fs.stat(path.join(root,store.FILE));
  assert.ok(stat.isFile(),'the policy file is written');
  await fs.rm(root,{recursive:true,force:true});
  console.log('PASS network-first login policy: JSON health probe with retry, one-minute cache, 30-day local fallback and cached read-only entitlement');
})().catch(e=>{console.error(e);process.exitCode=1});
