const {AsyncLocalStorage}=require('node:async_hooks');
function installSyncActor(dataSource){
 const storage=new AsyncLocalStorage(),create=dataSource.createQueryRunner.bind(dataSource);
 dataSource.createQueryRunner=(...args)=>{const runner=create(...args),query=runner.query.bind(runner);runner.query=async(sql,params,result)=>{
  if(!/^(?:ROLLBACK|COMMIT|SAVEPOINT|RELEASE|START TRANSACTION|BEGIN)\b/i.test(String(sql).trim()))await query("SELECT set_config('erp.desktop_actor',$1,false)",[storage.getStore()?.userId||'']);
  return query(sql,params,result);
 };return runner;};
 return (userId,next)=>storage.run({userId},next);
}
module.exports={installSyncActor};
