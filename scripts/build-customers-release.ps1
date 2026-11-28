param([string]$Base='D:\Business ERP\Desktop-Development\BusinessERP-Desktop\artifacts\BusinessERP-Desktop-0.4.27-Costing-Final-20261128')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path "$PSScriptRoot\..").Path
$version=(Get-Content "$repo\package.json" -Raw|ConvertFrom-Json).version
$output=Join-Path $repo "artifacts\BusinessERP-Desktop-$version-Customers-20261128"
if(Test-Path -LiteralPath $output){throw 'Retain previous artifacts; choose a fresh output name'}
$frontend='D:\GitHub\bizerp.gnj.fe\frontend';$backend='D:\GitHub\bizerp.gnj\backend'
if(!(Test-Path "$frontend\.next-desktop\standalone\server.js")){throw 'Build the desktop frontend first'}
if(!(Test-Path "$backend\dist\modules\customers\customers.service.js")){throw 'Build the shared backend with the customers module first'}
function Copy-Tree($from,$to,$extra=@()){
 New-Item -ItemType Directory -Force -Path $to|Out-Null
 & robocopy $from $to /E /MT:8 /NFL /NDL /NJH /NJS /NP /R:1 /W:1 @extra|Out-Null
 if($LASTEXITCODE -gt 7){throw "Copy failed: $from"}
}
function Mirror-Tree($from,$to,$extra=@()){
 New-Item -ItemType Directory -Force -Path $to|Out-Null
 & robocopy $from $to /MIR /MT:8 /NFL /NDL /NJH /NJS /NP /R:1 /W:1 @extra|Out-Null
 if($LASTEXITCODE -gt 7){throw "Mirror failed: $from"}
}
Copy-Tree $Base $output @('/XF','.env*','*.pem','*.key','/XD',"$Base\resources\runtime\frontend","$Base\resources\runtime\backend\dist")
$app="$output\resources\app";$runtime="$output\resources\runtime"
Mirror-Tree "$repo\src" "$app\src";Mirror-Tree "$repo\ui" "$app\ui";Copy-Item "$repo\package.json" "$app\package.json" -Force
Mirror-Tree "$repo\src\service" "$runtime\desktop"
Copy-Item "$repo\src\cloud-local.cjs","$repo\src\cloud-guard.cjs","$repo\src\license-contract.cjs" "$runtime\desktop" -Force
Mirror-Tree "$backend\dist" "$runtime\backend\dist";Mirror-Tree "$backend\sql" "$runtime\backend\sql"
Mirror-Tree "$frontend\.next-desktop\standalone" "$runtime\frontend" @('/XF','.env*')
Mirror-Tree "$frontend\.next-desktop\static" "$runtime\frontend\.next-desktop\static"
Mirror-Tree "$frontend\public" "$runtime\frontend\public"
if(-not (Get-ChildItem "$runtime\frontend\.next-desktop\server\app\dashboard" -Filter 'customers*' -ErrorAction SilentlyContinue)){throw 'The desktop frontend build does not contain the customers page'}
# The customer register is code and UI only: migration 149 is already part of the
# packaged schema, so this release declares no new upgrade route.
$utf8=[Text.UTF8Encoding]::new($false)
$manifest=Get-Content "$runtime\manifest.json" -Raw|ConvertFrom-Json
$manifest.version=$version
$manifest.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.builtAt=[DateTime]::UtcNow.ToString('o')
[IO.File]::WriteAllText("$runtime\manifest.json",($manifest|ConvertTo-Json -Depth 30),$utf8)
& node "$repo\scripts\verify-runtime-package.cjs" $output
if($LASTEXITCODE -ne 0){throw 'Runtime shipping verification failed'}
Write-Output "Staged $output"
