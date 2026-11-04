function registerCloudTeamBridge({ipcMain,shell,workspaces,getRuntime,login}){
 ipcMain.handle('receipt:open-cloud-team',async(event,...args)=>{
  const rt=getRuntime(),entry=[...workspaces].find(w=>w.webContents===event.sender),ctx=entry?.desktopContext;
  if(args.length||!rt?.ready||!rt.v?.cloudBinding||!entry||entry!==login.active||entry.networkWorkspace||entry.kind!=='owner'||!ctx||ctx.mode!==rt.mode||ctx.store!==rt.v.databases?.[rt.mode]||event.senderFrame!==entry.webContents.mainFrame)throw Error('Local Team workspace denied');
  const url=new URL(entry.webContents.getURL());if(url.origin!==ctx.origin||!/^\/dashboard(?:\/|$)/.test(url.pathname)||event.senderFrame.url!==entry.webContents.getURL())throw Error('Local Team origin denied');
  await shell.openExternal('https://www.bizerpsme.shop/dashboard/team');
 });
}
module.exports={registerCloudTeamBridge};
