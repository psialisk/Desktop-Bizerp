function signupTarget(kind='business'){if(!['business','health'].includes(kind))throw Error('Unknown cloud entry');return 'https://www.bizerpsme.shop'+(kind==='health'?'/discover/health':'/signup');}
function signupWindowOptions(){return {title:'Business ERP · Register business',width:1200,height:850,minWidth:420,minHeight:500,autoHideMenuBar:true,webPreferences:{partition:'persist:business-erp-cloud-signup',nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}};}
function registerCloudSignup({ipcMain,BrowserWindow,shell,trusted,control}){
 let window;let currentKind;
 ipcMain.handle('desktop:cloud:signup',async (event,kind='business')=>{
  const target=signupTarget(kind);
  trusted(event);
  if(window&&!window.isDestroyed()){if(kind===currentKind){window.show();window.focus();return true;}window.close();}
  window=new BrowserWindow({...signupWindowOptions(),parent:control});
  const current=window;currentKind=kind;
  if(kind==='health')current.setTitle('Business ERP · Explore Pickleball');
  current.webContents.session.setPermissionRequestHandler((_wc,_permission,done)=>done(false));
  current.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//i.test(url))shell.openExternal(url);return {action:'deny'};});
  current.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!=='https://www.bizerpsme.shop'){event.preventDefault();if(/^https:\/\//i.test(url))shell.openExternal(url);}});
  current.on('closed',()=>{if(window===current)window=null;});
  await current.loadURL(target);return true;
 });
}
module.exports={signupTarget,signupWindowOptions,registerCloudSignup};
