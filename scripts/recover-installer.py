"""Recover the original public runtime dependency bundle without installing the ERP or reading a profile."""
import argparse,hashlib,json,struct,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--installer',type=Path,required=True);p.add_argument('--seven-zip',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
expected='160ee795cd4e8466e8917b0cf5617d7d78ff51f5b330c310039f1f9f6b566db5'
if hashlib.sha256(a.installer.read_bytes()).hexdigest()!=expected:raise SystemExit('Installer differs from the reviewed 0.4.2 recovery source')
out=a.output.resolve()
if out.exists() and any(out.iterdir()):raise SystemExit('Choose an empty recovery folder; existing files are retained')
out.mkdir(parents=True,exist_ok=True)
subprocess.run([str(a.seven_zip),'x',str(a.installer),'-o'+str(out/'installer'),'-y'],check=True)
subprocess.run([str(a.seven_zip),'x',str(out/'installer/$PLUGINSDIR/app-64.7z'),'-o'+str(out/'application'),'-y'],check=True)
asar=out/'application/resources/app.asar';root=out/'original-source';root.mkdir();count=0
with asar.open('rb') as f:
 sizes=struct.unpack('<4I',f.read(16));header=json.loads(f.read(sizes[3]))
 def walk(entries,parent=Path()):
  global count
  for name,item in entries.items():
   target=root/parent/name
   if not target.resolve().is_relative_to(root.resolve()):raise ValueError('Archive path escaped recovery root')
   if 'files' in item:target.mkdir(parents=True,exist_ok=True);walk(item['files'],parent/name)
   elif 'link' in item:raise ValueError('Linked archive entries require independent review')
   else:
    if item.get('unpacked'):data=(Path(str(asar)+'.unpacked')/parent/name).read_bytes()
    else:f.seek(8+sizes[1]+int(item['offset']));data=f.read(item['size'])
    target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);count+=1
 walk(header['files'])
print('Recovered',count,'original source files; current Git checkout and installed data untouched')
