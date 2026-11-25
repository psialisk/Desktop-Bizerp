const assert=require('node:assert/strict');
const {authenticate,credentialInput}=require('../src/login-session.cjs');
(async()=>{
 const calls=[];const fetcher=async(url,options)=>{calls.push(url);return new Response(JSON.stringify(url.endsWith('/login')?{accessToken:'demo-token'}:{id:'demo-customer'}),{status:200});};
 const input=credentialInput({mode:'network',kind:'customer',customerFoundation:'health',email:'player@fixture.invalid',password:'fixture'});
 assert.equal(input.customerFoundation,'health');
 await authenticate('https://fixture.invalid/api',input,fetcher);
 assert.deepEqual(calls,['https://fixture.invalid/api/customer-portal/login','https://fixture.invalid/api/customer-portal/me']);
 calls.length=0;await authenticate('https://fixture.invalid/api',{...input,customerFoundation:'property'},fetcher);
 assert.deepEqual(calls,['https://fixture.invalid/api/auth/renter/login','https://fixture.invalid/api/renter/me','https://fixture.invalid/api/renter/me/foundation']);
 assert.throws(()=>credentialInput({...input,mode:'local'}),/network/);
 console.log('PASS Desktop health consumer and property renter authentication remain separate; local consumer rejected');
})().catch(e=>{console.error(e);process.exitCode=1});
