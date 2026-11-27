const fs=require('node:fs'),path=require('node:path');
const cloud=path.resolve(process.argv[2]||'D:/GitHub/bizerp.gnj.fe/frontend');
const ts=require(path.join(cloud,'node_modules/typescript')),out=path.resolve(__dirname,'../src/package-workspace');fs.mkdirSync(out,{recursive:true});
for(const name of ['package-workspace','foundation-navigation','counter-workflows','foundation','department-access'])fs.writeFileSync(path.join(out,name+'.js'),ts.transpileModule(fs.readFileSync(path.join(cloud,'lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText);
for(const name of ['package-workspaces.json','foundation-catalog.json'])fs.copyFileSync(path.join(cloud,'lib',name),path.join(out,name));
fs.copyFileSync(path.join(cloud,'tests/fixtures/package-foundations.json'),path.resolve(__dirname,'../tests/package-foundations.json'));
console.log('Exported exact Cloud package routing and authorization helpers');
