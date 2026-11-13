param(
 [string]$PortableApp='D:\Business ERP\Desktop-Development\BusinessERP-Desktop\artifacts\BusinessERP-Desktop-0.4.2-Offline-Camera-20261111',
 [string]$InstallerDirectory='installers-retail-pos-staple-20261113',
 [string]$BuilderVersion='26.0.12'
)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path "$PSScriptRoot\..").Path
if($InstallerDirectory -notmatch '^installers(?:-[a-zA-Z0-9.-]+)?$'){throw 'Invalid installer artifact directory'}
$portable=(Resolve-Path $PortableApp).Path
$required=@('Business ERP Desktop.exe','icudtl.dat','resources.pak','chrome_100_percent.pak','locales\en-US.pak','resources\app\package.json','resources\runtime\manifest.json','resources\runtime\node\node.exe')
foreach($relative in $required){if(-not(Test-Path (Join-Path $portable $relative))){throw "Portable desktop package is incomplete; missing $relative"}}
$out=Join-Path $repo ('artifacts\'+$InstallerDirectory)
if(Test-Path $out){$existing=Get-ChildItem $out -File -ErrorAction SilentlyContinue;if($existing){throw "Installer output already exists at $out; retain it and choose a new output directory before rebuilding."}}
Push-Location $repo
try{
 & npx --yes "electron-builder@$BuilderVersion" --projectDir $repo --prepackaged $portable --win nsis --publish never --config (Join-Path $repo 'electron-builder.yml')
 if($LASTEXITCODE -ne 0){throw "electron-builder failed with exit code $LASTEXITCODE"}
 $installer=Join-Path $out 'BusinessERP-Desktop-0.4.2-Setup.exe'
 if(-not(Test-Path $installer)){throw 'electron-builder completed without creating the expected setup installer'}
 Get-Item $installer | Select-Object FullName,Length,LastWriteTime
 Get-FileHash $installer -Algorithm SHA256 | Select-Object Algorithm,Hash
}finally{Pop-Location}
