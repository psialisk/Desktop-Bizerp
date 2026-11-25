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
CopyTree "$backend\sql" "$runtime\backend\sql"
CopyTree "$frontend\.next-desktop\standalone" "$runtime\frontend"
CopyTree "$frontend\.next-desktop\static" "$runtime\frontend\.next-desktop\static"
CopyTree "$frontend\public" "$runtime\frontend\public"
$reportingUi=Get-ChildItem "$frontend\.next-desktop\static\chunks" -Filter '*.js' -File | Select-String -SimpleMatch -Pattern 'Business intelligence' -Quiet
if(-not $reportingUi){throw 'Build the shared frontend with the reports and BI dashboard before staging Desktop'}
$utf8=[Text.UTF8Encoding]::new($false)
$fitnessPrerequisites="ALTER TABLE fitness_courts ADD COLUMN IF NOT EXISTS publicly_listed boolean NOT NULL DEFAULT false;`nALTER TABLE fitness_open_plays ADD COLUMN IF NOT EXISTS publicly_listed boolean NOT NULL DEFAULT false;`nALTER TABLE fitness_open_plays ADD COLUMN IF NOT EXISTS access_code_hash text;`nALTER TABLE fitness_open_play_attendees ADD COLUMN IF NOT EXISTS player_count integer NOT NULL DEFAULT 1 CHECK(player_count BETWEEN 1 AND 100);`nALTER TABLE fitness_open_play_attendees ADD COLUMN IF NOT EXISTS additional_players jsonb NOT NULL DEFAULT '[]'::jsonb;`n"
$delta=$fitnessPrerequisites+(@('120_android_record_sync.sql','121_record_sync_derived_history.sql','122_strict_cloud_contract_period.sql','123_package_amendment_contracts.sql','124_android_staff_bootstrap.sql','125_desktop_staff_bootstrap.sql','126_record_sync_transaction_identity.sql','127_unified_license_management.sql','130_fitness_venue_profile.sql','131_fitness_court_slot_rates.sql','132_fitness_payment_fees.sql','133_reports_analytics.sql','134_app_updates_and_backups.sql','135_platform_payment_options.sql','136_app_update_native_proofs.sql','137_app_release_migration_compatibility.sql','138_android_local_users.sql','139_fitness_shared_venues_check_in.sql')|ForEach-Object{[IO.File]::ReadAllText("$backend\sql\$_")}) -join "`n`n"
# Append the additive delta once. Every statement in 120-133 is guarded, so a repeat
# is harmless to PostgreSQL, but repeating it in every release quietly rewrites the
# file the route hashes describe. The sentinels are the last objects the delta adds.
$markers=@('desktop_sync_protocol','report_saved_views','fitness_court_public_profiles')
function Test-DeltaComplete([string]$text){foreach($marker in $markers){if(-not $text.Contains($marker)){return $false}};return $true}
if(-not (Test-DeltaComplete ([IO.File]::ReadAllText("$runtime\schema.sql")))){[IO.File]::AppendAllText("$runtime\schema.sql","`n`n"+$delta,$utf8)}
$manifest=Get-Content "$runtime\manifest.json" -Raw|ConvertFrom-Json
$manifest.version=(Get-Content "$repo\package.json" -Raw|ConvertFrom-Json).version
$manifest.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.builtAt=[DateTime]::UtcNow.ToString('o')
foreach($route in $manifest.upgrades){
 $file=Join-Path $runtime $route.file
 if(-not (Test-DeltaComplete ([IO.File]::ReadAllText($file)))){[IO.File]::AppendAllText($file,"`n`n"+$delta,$utf8)}
 $route.toHash=$manifest.schemaHash
 $route.migrationHash=(Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant()
}
$deltaFile='migrations/139_shared_venues_check_in.sql'
[IO.File]::WriteAllText((Join-Path $runtime $deltaFile),$delta,$utf8)
# A code-only rebuild ships the schema it started from, so it must not declare an upgrade route that
# begins at the packaged schema hash: the shipping gate rejects that, and installed clients need no
# migration because their schema already matches. Routes are added only when the hash really moves.
if($manifest.schemaHash -ne $previous.schemaHash){
 if($manifest.upgrades|Where-Object{$_.fromHash -eq $previous.schemaHash}){
  Write-Output "Schema changed; upgrade route from $($previous.version) is already declared"
 }else{
  $manifest.upgrades+=@{recordSyncExpansion='desktop-record-sync-v1';fromVersion=$previous.version;fromHash=$previous.schemaHash;toHash=$manifest.schemaHash;file=$deltaFile;migrationHash=(Get-FileHash (Join-Path $runtime $deltaFile) -Algorithm SHA256).Hash.ToLowerInvariant()}
 }
}else{
 Write-Output 'Schema unchanged from the previous stage; no upgrade route added'
}
[IO.File]::WriteAllText("$runtime\manifest.json",($manifest|ConvertTo-Json -Depth 30),$utf8)
# Never hand a stage to make-installer.ps1 until its hashes describe the files it ships.
& node (Join-Path $repo 'scripts\verify-runtime-package.cjs') $Output --previous (Resolve-Path $Base).Path
if($LASTEXITCODE -ne 0){throw 'Staged package failed the runtime shipping gate; fix the stage before building an installer from it'}
Write-Output "Staged $Output"