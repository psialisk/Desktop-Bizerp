param(
 [string]$RecoveredApplication='D:\Business ERP\Desktop-Development\Recovered-0.4.2\application',
 [string]$Backend='D:\GitHub\bizerp.gnj\backend',
 [string]$Frontend='D:\GitHub\bizerp.gnj.fe\frontend'
)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path "$PSScriptRoot\..").Path
$output=Join-Path $repo 'artifacts\BusinessERP-Desktop-0.4.2-Operational-Calendar'
if(-not (Test-Path "$Backend\dist\modules\retail\operations-calendar.js")){throw 'Build the shared backend first'}
if(-not (Test-Path "$Frontend\.next-desktop\standalone\server.js")){throw 'Build frontend with ERP_DESKTOP_BUILD=1 and NEXT_PUBLIC_API_URL=/api first'}
function Copy-Tree([string]$From,[string]$To,[string[]]$Extra=@()){
 New-Item -ItemType Directory -Path $To -Force | Out-Null
 & robocopy $From $To /E /MT:8 /NFL /NDL /NJH /NJS /NP /R:1 /W:1 @Extra | Out-Null
 if($LASTEXITCODE -gt 7){throw "Copy failed: $From"}
}
# No installed profile, keys or local databases are included. No files are deleted by this script.
Copy-Tree $RecoveredApplication $output @('/XF','app.asar','/XD',"$RecoveredApplication\resources\runtime\frontend","$RecoveredApplication\resources\runtime\backend\dist")
$app=Join-Path $output 'resources\app';Copy-Tree "$repo\src" "$app\src";Copy-Tree "$repo\ui" "$app\ui";Copy-Item "$repo\package.json" "$app\package.json"
$runtime=Join-Path $output 'resources\runtime'
Copy-Tree "$Backend\dist" "$runtime\backend\dist"
Copy-Tree "$Frontend\.next-desktop\standalone" "$runtime\frontend" @('/XF','.env*')
Copy-Tree "$Frontend\.next-desktop\static" "$runtime\frontend\.next-desktop\static"
Copy-Tree "$Frontend\public" "$runtime\frontend\public"
Copy-Item "$repo\scripts\schema_calendar.sql" "$runtime\schema.sql"
New-Item -ItemType Directory -Path "$runtime\migrations" -Force | Out-Null
Copy-Item "$repo\scripts\upgrade_042_calendar.sql" "$runtime\migrations\086_operations_calendar.sql"
$old=Get-Content "$RecoveredApplication\resources\runtime\manifest.json" -Raw | ConvertFrom-Json
$oldHash=$old.schemaHash
$old.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$old.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant()
$old.builtAt=[DateTime]::UtcNow.ToString('o')
$old | Add-Member -NotePropertyName calendarBuild -NotePropertyValue '2026-11-01-development' -Force
# Keep purchasedVersion 0.4.2: existing activation checks require exact version, no licensing bypass.
$old.upgrades=@(@{fromVersion='0.4.2';fromHash=$oldHash;toHash=$old.schemaHash;file='migrations/086_operations_calendar.sql';migrationHash=(Get-FileHash "$runtime\migrations\086_operations_calendar.sql" -Algorithm SHA256).Hash.ToLowerInvariant()})
[IO.File]::WriteAllText("$runtime\manifest.json",($old|ConvertTo-Json -Depth 20),[Text.UTF8Encoding]::new($false))
Write-Output "Built portable development folder: $output"
