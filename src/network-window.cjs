function networkTarget(raw,kind){
 if(typeof raw!=='string'||raw.length>2048||!['pos','owner'].includes(kind))throw Error('Enter a valid ERP website address');
 const u=new URL(raw.trim());const host=u.hostname;
 const local=['localhost','127.0.0.1','[::1]'].includes(host)||/^10\.(\d{1,3}\.){2}\d{1,3}$/.test(host)||/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)||/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host);
 if(u.username||u.password||u.search||u.hash||!['','/'].includes(u.pathname)||(u.protocol!=='https:'&&!(u.protocol==='http:'&&local)))throw Error('Use an HTTPS website origin, or local LAN HTTP; omit passwords, paths and query strings');
 return u.origin+(kind==='pos'?'/pos-login':'/business-login');
}
module.exports={networkTarget};
