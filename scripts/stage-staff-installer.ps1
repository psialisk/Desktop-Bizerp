param([string]$Stage=(Join-Path $env:TEMP 'BusinessERP-Desktop-0.4.17-Installer\stage'),[string]$Backend='D:\GitHub\bizerp.gnj\backend')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path "$PSScriptRoot\..").Path
$stageRoot=(Resolve-Path $Stage).Path
$runtime=Join-Path $stageRoot 'resources\runtime'
$proof=Join-Path (Split-Path $stageRoot -Parent) 'previous-proof\resources\runtime'
if(-not(Test-Path (Join-Path $runtime 'manifest.json'))){throw 'Extract the reviewed previous installer into the staging folder first'}
New-Item -ItemType Directory -Path $proof -Force | Out-Null
if(-not(Test-Path (Join-Path $proof 'manifest.json'))){Copy-Item "$runtime\manifest.json","$runtime\schema.sql" $proof}
$previous=Get-Content "$proof\manifest.json" -Raw | ConvertFrom-Json
if($previous.version -ne '0.4.16'){throw 'Expected the reviewed 0.4.16 installer source'}
function Copy-Tree([string]$From,[string]$To){& robocopy $From $To /E /MT:8 /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null;if($LASTEXITCODE -gt 7){throw "Copy failed: $From"}}
Copy-Tree "$repo\src" "$stageRoot\resources\app\src"
Copy-Tree "$repo\ui" "$stageRoot\resources\app\ui"
Copy-Item "$repo\package.json" "$stageRoot\resources\app\package.json" -Force
Copy-Tree "$repo\src\service" "$runtime\desktop"
Copy-Item "$repo\src\cloud-local.cjs","$repo\src\cloud-guard.cjs","$repo\src\license-contract.cjs" "$runtime\desktop" -Force
Copy-Tree "$Backend\dist" "$runtime\backend\dist"
$utf8=[Text.UTF8Encoding]::new($false)
$delta=(@('121_record_sync_derived_history.sql','125_desktop_staff_bootstrap.sql','126_record_sync_transaction_identity.sql')|ForEach-Object {[IO.File]::ReadAllText((Join-Path "$Backend\sql" $_))}) -join "`n`n"
[IO.File]::WriteAllText("$runtime\schema.sql",([IO.File]::ReadAllText("$proof\schema.sql")+"`n`n"+$delta),$utf8)
# The previous installer already contains reviewed routes for earlier schema hashes.
# Add this release's additive changes to every route and retain their source hashes.
$manifest=Get-Content "$proof\manifest.json" -Raw | ConvertFrom-Json
$manifest.version=(Get-Content "$repo\package.json" -Raw|ConvertFrom-Json).version
$manifest.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.builtAt=[DateTime]::UtcNow.ToString('o')
foreach($route in $manifest.upgrades){$file=Join-Path $runtime $route.file;$text=[IO.File]::ReadAllText($file);if(-not $text.Contains('origin_actor_id')){[IO.File]::AppendAllText($file,"`n`n"+$delta,$utf8)};$route.toHash=$manifest.schemaHash;$route.migrationHash=(Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant()}
[IO.File]::WriteAllText("$runtime\migrations\125_126_desktop_staff_sync.sql",$delta,$utf8)
$manifest.upgrades+=@{fromVersion='0.4.16';fromHash=$previous.schemaHash;toHash=$manifest.schemaHash;file='migrations/125_126_desktop_staff_sync.sql';migrationHash=(Get-FileHash "$runtime\migrations\125_126_desktop_staff_sync.sql" -Algorithm SHA256).Hash.ToLowerInvariant();recordSyncExpansion='desktop-record-sync-v1'}
[IO.File]::WriteAllText("$runtime\manifest.json",($manifest|ConvertTo-Json -Depth 30),$utf8)
Write-Output "Installer staging prepared: $stageRoot"
Write-Output "Previous schema: $($previous.schemaHash)"
Write-Output "New schema: $($manifest.schemaHash)"
