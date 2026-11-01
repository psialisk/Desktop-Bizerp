function registerLocalLicenseBridge({ipcMain,workspaces,getRuntime,login,summary,open,exportRequest}){
 async function authorize(event){
  const rt=getRuntime(),entry=[...workspaces].find(w=>w.webContents===event.sender),ctx=entry?.desktopContext;
  const validate=()=>{if(!entry||entry!==login.active||entry.networkWorkspace||entry.kind!=='owner'||!ctx||ctx.kind&&ctx.kind!=='owner'||ctx.mode!==rt.mode||ctx.store!==rt.v?.databases?.[rt.mode]||event.senderFrame!==entry.webContents.mainFrame)throw Error('Local license workspace denied');const u=new URL(entry.webContents.getURL());if(u.origin!==ctx.origin||!/^\/dashboard(?:\/|$)/.test(u.pathname)||event.senderFrame.url!==entry.webContents.getURL())throw Error('Local license workspace denied');};
  validate();const actor=await login.authorizeOwner();validate();if(actor.role!=='owner'||actor.id!==ctx.principalId)throw Error('Local license principal denied');
 }
 for(const [name,fn] of Object.entries({status:summary,open,export:exportRequest}))ipcMain.handle('local-license:'+name,async event=>{await authorize(event);return fn();});
}
module.exports={registerLocalLicenseBridge};
