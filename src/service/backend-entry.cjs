// Separate deployment entry point; shared cloud dist/main.js is never executed or modified.
const path=require('node:path');
const bundle=process.env.ERP_RUNTIME_ROOT;
if(process.env.ERP_DEPLOYMENT_MODE!=='desktop'||!bundle||!process.env.DATABASE_URL_ERP?.startsWith('postgresql://'))throw Error('Explicit private desktop runtime configuration required');
const load=p=>require(path.join(bundle,'backend/node_modules',p));
console.log('Loading desktop backend modules');
load('reflect-metadata');
const {NestFactory}=load('@nestjs/core'),{ValidationPipe}=load('@nestjs/common'),{DataSource}=load('typeorm');
const {AppModule}=require(path.join(bundle,'backend/dist/app.module'));
const {DriveStorageService}=require(path.join(bundle,'backend/dist/modules/storage/drive-storage.service'));
const {initializeDriveStorage}=require(path.join(bundle,'backend/dist/common/drive-upload-storage'));
const {localStorage}=require('./local-storage.cjs');
const {createLocalLicenseGuard}=require('./local-license-guard.cjs');
const licenseRequired=process.env.ERP_LOCAL_LICENSE_REQUIRED==='1';
const binding=licenseRequired?JSON.parse(process.env.ERP_LOCAL_LICENSE_BINDING||'{}'):{};
const verify=(text,keys,bound,now,readOnly)=>text.trim().startsWith('GNJD1.')?require(path.join(bundle,'backend/dist/common/desktop-license')).verifyDesktopGrant(text,keys,bound,now,readOnly):require('./license-contract.cjs').verifyOfflineGrant(text,keys,bound,now,readOnly);
(async()=>{console.log('Initializing desktop application');const app=await NestFactory.create(AppModule,{logger:['warn','error']});app.enableShutdownHooks();app.use(load('express').json({limit:'100kb'}));if(process.env.ERP_CLOUD_BINDING){const binding=JSON.parse(process.env.ERP_CLOUD_BINDING);app.use(require('./cloud-guard.cjs').createCloudGuard({binding,query:(s,p)=>app.get(DataSource).query(s,p).then(rows=>({rows})),verifyJwt:t=>load('jsonwebtoken').verify(t,process.env.JWT_SECRET,{algorithms:['HS256']}),assertScope:require(path.join(bundle,'backend/dist/common/package-foundation')).assertPackageWriteScope}));}else app.use(createLocalLicenseGuard({required:licenseRequired,licenseFile:process.env.ERP_LOCAL_LICENSE_FILE,keysFile:process.env.ERP_LICENSE_PUBLIC_KEYS_FILE,binding,verify,assertScope:require(path.join(bundle,'backend/dist/common/package-foundation')).assertPackageWriteScope,trial:JSON.parse(process.env.ERP_LOCAL_TRIAL||'null')}));app.setGlobalPrefix('api');app.enableCors({origin:'http://127.0.0.1:38120',credentials:true});app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));const drive=app.get(DriveStorageService);initializeDriveStorage(localStorage(drive,app.get(DataSource),process.env.UPLOAD_DIR,load('@nestjs/common')));await app.listen(Number(process.env.PORT),'127.0.0.1');console.log('Desktop backend ready on loopback');})().catch(()=>{console.error('Desktop backend failed to start; inspect local database/runtime readiness');process.exitCode=1;});
