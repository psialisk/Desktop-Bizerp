param([string]$Base,[string]$Output)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path "$PSScriptRoot\..").Path
$backend='D:\GitHub\bizerp.gnj\backend'
$frontend='D:\GitHub\bizerp.gnj.fe\frontend'
if(Test-Path $Output){throw 'Output exists; preserve earlier artifacts'}
function CopyTree($from,$to){& robocopy $from $to /E /XF .env* /MT:8 /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null;if($LASTEXITCODE -gt 7){throw "Copy failed: $from"}}
CopyTree $Base $Output
$runtime=Join-Path $Output 'resources\runtime'
$previous=Get-Content "$runtime\manifest.json" -Raw|ConvertFrom-Json
CopyTree "$repo\src" "$Output\resources\app\src"
CopyTree "$repo\ui" "$Output\resources\app\ui"
Copy-Item "$repo\package.json" "$Output\resources\app\package.json" -Force
CopyTree "$repo\src\service" "$runtime\desktop"
Copy-Item "$repo\src\cloud-local.cjs","$repo\src\cloud-guard.cjs","$repo\src\license-contract.cjs" "$runtime\desktop" -Force
CopyTree "$backend\dist" "$runtime\backend\dist"
CopyTree "$frontend\.next-desktop\standalone" "$runtime\frontend"
CopyTree "$frontend\.next-desktop\static" "$runtime\frontend\.next-desktop\static"
CopyTree "$frontend\public" "$runtime\frontend\public"
$reportingUi=Get-ChildItem "$frontend\.next-desktop\static\chunks" -Filter '*.js' -File | Select-String -SimpleMatch -Pattern 'Business intelligence' -Quiet
if(-not $reportingUi){throw 'Build the shared frontend with the reports and BI dashboard before staging Desktop'}
$utf8=[Text.UTF8Encoding]::new($false)
$delta=(@('120_android_record_sync.sql','121_record_sync_derived_history.sql','122_strict_cloud_contract_period.sql','123_package_amendment_contracts.sql','124_android_staff_bootstrap.sql','125_desktop_staff_bootstrap.sql','126_record_sync_transaction_identity.sql','127_unified_license_management.sql','130_fitness_venue_profile.sql','131_fitness_court_slot_rates.sql','132_fitness_payment_fees.sql','133_reports_analytics.sql')|ForEach-Object{[IO.File]::ReadAllText("$backend\sql\$_")}) -join "`n`n"
[IO.File]::AppendAllText("$runtime\schema.sql","`n`n"+$delta,$utf8)
$manifest=Get-Content "$runtime\manifest.json" -Raw|ConvertFrom-Json
$manifest.version=(Get-Content "$repo\package.json" -Raw|ConvertFrom-Json).version
$manifest.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.builtAt=[DateTime]::UtcNow.ToString('o')
foreach($route in $manifest.upgrades){$file=Join-Path $runtime $route.file;[IO.File]::AppendAllText($file,"`n`n"+$delta,$utf8);$route.toHash=$manifest.schemaHash;$route.migrationHash=(Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant()}
$deltaFile='migrations/130_132_fitness_profile_rates_fees.sql'
[IO.File]::WriteAllText((Join-Path $runtime $deltaFile),$delta,$utf8)
$manifest.upgrades+=@{recordSyncExpansion='desktop-record-sync-v1';fromVersion=$previous.version;fromHash=$previous.schemaHash;toHash=$manifest.schemaHash;file=$deltaFile;migrationHash=(Get-FileHash (Join-Path $runtime $deltaFile) -Algorithm SHA256).Hash.ToLowerInvariant()}
[IO.File]::WriteAllText("$runtime\manifest.json",($manifest|ConvertTo-Json -Depth 30),$utf8)
Write-Output "Staged $Output"