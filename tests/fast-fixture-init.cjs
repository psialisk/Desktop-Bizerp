// Functional fixtures may skip only the initial empty-cluster disk flush. Production never uses this helper.
module.exports=rt=>{if(process.env.ERP_QA_FAST_INIT!=='1')return;const run=rt.run.bind(rt);rt.run=(exe,args,env,timeout)=>run(exe,/initdb\.exe$/i.test(exe)?[...args,'--no-sync']:args,env,timeout)};
