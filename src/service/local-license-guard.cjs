const fs=require('node:fs');
function createLocalLicenseGuard({required,licenseFile,keysFile,binding,verify,trial,assertScope=()=>{},clock=()=>new Date()}){
 let lastSeen=binding?.lastSeen;
 return (req,res,next)=>{
  if(!required||['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const route=String(req.originalUrl||req.url||'').split('?')[0];
  if(req.method==='POST'&&['/api/auth/staff/login','/api/auth/pos/login','/api/auth/refresh','/api/auth/logout'].includes(route))return next();
  try{
   const now=clock();
   if(trial&&!fs.existsSync(licenseFile)){const status=require('./auto-trial.cjs').trialStatus({...trial,lastSeen:lastSeen||trial.lastSeen},now);if(!status.writable)throw Error('Local trial expired; import a purchased key. Reading and export remain available');assertScope({snapshot:{foundation:trial.grants}},req.method,route.replace(/^\/api/,''),req.body);lastSeen=now.toISOString();return next();}
   const token=fs.readFileSync(licenseFile,'utf8'),keys=JSON.parse(fs.readFileSync(keysFile,'utf8'));
   const claims=verify(token,keys,{...binding,lastSeen},now,true);
   if(claims.kind!=='perpetual'&&now.getTime()>=Date.parse(claims.graceEndsAt))throw Error('Local license expired; read and export remain available');
   assertScope({snapshot:{foundation:claims.grants}},req.method,route.replace(/^\/api/,''),req.body);
   lastSeen=now.toISOString();return next();
  }catch(e){return res.status(403).json({statusCode:403,message:e.message||'Local license review required',code:'LOCAL_LICENSE_READ_ONLY'});}
 };
}
module.exports={createLocalLicenseGuard};
