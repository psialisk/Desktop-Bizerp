param([string]$Base='D:\Business ERP\Desktop-Development\BusinessERP-Desktop\artifacts\BusinessERP-Desktop-0.4.24-Pickleball-Verified-20261125')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path "$PSScriptRoot\..").Path
$version=(Get-Content "$repo\package.json" -Raw|ConvertFrom-Json).version
$output=Join-Path $repo "artifacts\BusinessERP-Desktop-$version-Workspace-20261125"
if(Test-Path -LiteralPath $output){throw 'Retain previous artifacts; choose a fresh output name'}
$frontend='D:\GitHub\bizerp.gnj.fe\frontend';$backend='D:\GitHub\bizerp.gnj\backend'
if(!(Test-Path "$frontend\.next-desktop\standalone\server.js")){throw 'Build the desktop frontend first'}
function Copy-Tree($from,$to,$extra=@()){
 New-Item -ItemType Directory -Force -Path $to|Out-Null
 & robocopy $from $to /E /MT:8 /NFL /NDL /NJH /NJS /NP /R:1 /W:1 @extra|Out-Null
 if($LASTEXITCODE -gt 7){throw "Copy failed: $from"}
}
Copy-Tree $Base $output @('/XF','.env*','*.pem','*.key','/XD',"$Base\resources\runtime\frontend","$Base\resources\runtime\backend\dist","$Base\resources\app\src","$Base\resources\app\ui")
$app="$output\resources\app";$runtime="$output\resources\runtime"
Copy-Tree "$repo\src" "$app\src";Copy-Tree "$repo\ui" "$app\ui";Copy-Item "$repo\package.json" "$app\package.json"
Copy-Tree "$repo\src\service" "$runtime\desktop"
Copy-Item "$repo\src\cloud-local.cjs","$repo\src\cloud-guard.cjs","$repo\src\license-contract.cjs" "$runtime\desktop"
Copy-Tree "$backend\dist" "$runtime\backend\dist";Copy-Tree "$backend\sql" "$runtime\backend\sql"
Copy-Tree "$frontend\.next-desktop\standalone" "$runtime\frontend" @('/XF','.env*')
Copy-Tree "$frontend\.next-desktop\static" "$runtime\frontend\.next-desktop\static"
Copy-Tree "$frontend\public" "$runtime\frontend\public"
$utf8=[Text.UTF8Encoding]::new($false);$manifest=Get-Content "$runtime\manifest.json" -Raw|ConvertFrom-Json
$previousHash=$manifest.schemaHash;$sql=[IO.File]::ReadAllText("$backend\sql\140_salon_cloud_workspace.sql")
if([IO.File]::ReadAllText("$runtime\schema.sql").Contains('CREATE TABLE IF NOT EXISTS salon_counter_policies')){throw 'Review base schema: Salon delta already included'}
[IO.File]::AppendAllText("$runtime\schema.sql","`n`n"+$sql,$utf8)
foreach($file in @($manifest.upgrades.file|Select-Object -Unique)){[IO.File]::AppendAllText((Join-Path $runtime $file),"`n`n"+$sql,$utf8)}
Copy-Item "$backend\sql\140_salon_cloud_workspace.sql" "$runtime\migrations\140_salon_cloud_workspace.sql"
$manifest.version=$version;$manifest.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant();$manifest.builtAt=[DateTime]::UtcNow.ToString('o')
foreach($u in $manifest.upgrades){$u.toHash=$manifest.schemaHash;$u.migrationHash=(Get-FileHash (Join-Path $runtime $u.file) -Algorithm SHA256).Hash.ToLowerInvariant()}
$manifest.upgrades+=@{fromVersion='0.4.24';fromHash=$previousHash;toHash=$manifest.schemaHash;file='migrations/140_salon_cloud_workspace.sql';migrationHash=(Get-FileHash "$runtime\migrations\140_salon_cloud_workspace.sql" -Algorithm SHA256).Hash.ToLowerInvariant()}
[IO.File]::WriteAllText("$runtime\manifest.json",($manifest|ConvertTo-Json -Depth 20),$utf8)
& node "$repo\scripts\verify-runtime-package.cjs" $output
if($LASTEXITCODE -ne 0){throw 'Runtime shipping verification failed'}
Write-Output "Staged $output"
