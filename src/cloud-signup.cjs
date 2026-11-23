function signupTarget(){return 'https://www.bizerpsme.shop/signup';}
function signupWindowOptions(){return {title:'Business ERP · Register business',width:1200,height:850,minWidth:420,minHeight:500,autoHideMenuBar:true,webPreferences:{partition:'persist:business-erp-cloud-signup',nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}};}
function registerCloudSignup({ipcMain,BrowserWindow,shell,trusted,control}){
 let window;
 ipcMain.handle('desktop:cloud:signup',async event=>{
  trusted(event);
  if(window&&!window.isDestroyed()){window.show();window.focus();return true;}
  window=new BrowserWindow({...signupWindowOptions(),parent:control});
  const current=window;
  current.webContents.session.setPermissionRequestHandler((_wc,_permission,done)=>done(false));
  current.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//i.test(url))shell.openExternal(url);return {action:'deny'};});
  current.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!=='https://www.bizerpsme.shop'){event.preventDefault();if(/^https:\/\//i.test(url))shell.openExternal(url);}});
  current.on('closed',()=>{if(window===current)window=null;});
  await current.loadURL(signupTarget());return true;
 });
}
module.exports={signupTarget,signupWindowOptions,registerCloudSignup};
