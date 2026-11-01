const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto'),{Readable}=require('node:stream');
function localStorage(drive,db,root,errors){
 const {ForbiddenException,NotFoundException,BadRequestException}=errors;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const filePath=(tenant,id)=>{if(!uuid.test(tenant)||!uuid.test(id))throw new NotFoundException('Invalid file');return path.join(root,tenant,id);};
 drive.status=async()=>({configured:false,connected:false,uploadsEnabled:true,storageMode:'local-desktop',localFallback:true});
 drive.validate=async user=>{drive.owner(user);return {valid:true,checks:[{name:'Local desktop storage',passed:true,message:'Files stay in this store and its backups.'}]};};
 for(const method of ['authorize','callback','disconnect'])drive[method]=async()=>{throw new ForbiddenException('Cloud storage is disabled in this offline desktop edition');};
 drive.upload=async(user,category,name,mime,buffer)=>{
  if(!user?.tenantId||!['staff','renter'].includes(user.principalType))throw new ForbiddenException('Tenant authentication required');
  if(!['documents','profile-pictures','payment-proofs','maintenance-attachments','listing-images'].includes(category)||!Buffer.isBuffer(buffer)||buffer.length>10*1024*1024)throw new BadRequestException('Invalid local upload');
  const id=randomUUID(),target=filePath(user.tenantId,id),safeName=String(name).replace(/[\r\n\x00-\x1f]/g,'').slice(0,190)||'upload';
  // Active content never receives an executable inline MIME type.
  const safeMime=['image/png','image/jpeg','image/webp','application/pdf','text/plain'].includes(mime)?mime:'application/octet-stream';
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,buffer,{flag:'wx'});
  try{await db.query('INSERT INTO drive_files(id,tenant_id,drive_id,category,owner_type,owner_id,file_name,mime_type) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,user.tenantId,'local:'+id,category,user.principalType,user.sub,safeName,safeMime]);}catch(e){await fs.unlink(target).catch(()=>{});throw e;}
  return {filename:id,path:'/api/storage/files/'+id,size:buffer.length};
 };
 drive.download=async(id,user)=>{if(!uuid.test(id))throw new NotFoundException('File not found');const [file]=await db.query('SELECT * FROM drive_files WHERE id=$1 AND tenant_id=$2',[id,user.tenantId]);if(!file||file.drive_id!=='local:'+id)throw new NotFoundException('Local file not found');await drive.checkRead(file,user);const body=await fs.readFile(filePath(user.tenantId,id)).catch(()=>{throw new NotFoundException('Local file is missing; restore a complete backup');});return {file,body:Readable.toWeb(Readable.from([body]))};};
 return drive;
}
module.exports={localStorage};
