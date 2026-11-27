const fs=require('node:fs'),path=require('node:path');
function configureProfile(app,env=process.env){
 if(!env.BIZERP_PROFILE_ROOT)return;
 const root=path.resolve(env.BIZERP_PROFILE_ROOT);
 if(!/^D:\\/i.test(root))throw Error('Explicit Desktop profile must be on D:');
 for(const [key,folder] of Object.entries({appData:'Roaming',userData:'profile',sessionData:'session',crashDumps:'crashes'})){
  const value=path.join(root,folder);fs.mkdirSync(value,{recursive:true});app.setPath(key,value);
 }
}
module.exports={configureProfile};
