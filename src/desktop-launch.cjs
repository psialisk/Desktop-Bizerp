// Legacy --setup shortcuts now resolve to the single login entry point.
function launchTarget(){return 'login';}
function showMaximized(window){if(window.isMinimized())window.restore();window.maximize();window.show();window.focus();}
function openLaunchTarget(_target,_runtime,showLogin){return showLogin();}
module.exports={launchTarget,showMaximized,openLaunchTarget};
