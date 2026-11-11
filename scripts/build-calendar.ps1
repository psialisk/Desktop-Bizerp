param(
 [string]$RecoveredApplication='D:\Business ERP\Desktop-Development\Recovered-0.4.2\application',
 [string]$Backend='D:\GitHub\bizerp.gnj\backend',
 [string]$Frontend='D:\GitHub\bizerp.gnj.fe\frontend',
 [string]$OutputName='BusinessERP-Desktop-0.4.2-Team-Shifts'
)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path "$PSScriptRoot\..").Path
if($OutputName -notmatch '^BusinessERP-Desktop-[a-zA-Z0-9.-]+$'){throw 'Invalid portable development output name'}
$output=Join-Path $repo ('artifacts\'+$OutputName)
if(Test-Path $output){throw 'Output already exists; use a new artifact name to preserve previous builds'}
if(-not (Test-Path "$Backend\dist\modules\scheduling\team-shifts.js")){throw 'Build the shared backend first'}
if(-not (Test-Path "$Frontend\.next-desktop\standalone\server.js")){throw 'Build frontend with ERP_DESKTOP_BUILD=1 and NEXT_PUBLIC_API_URL=/api first'}
function Copy-Tree([string]$From,[string]$To,[string[]]$Extra=@()){
 New-Item -ItemType Directory -Path $To -Force | Out-Null
 & robocopy $From $To /E /MT:8 /NFL /NDL /NJH /NJS /NP /R:1 /W:1 @Extra | Out-Null
 if($LASTEXITCODE -gt 7){throw "Copy failed: $From"}
}
# No installed profile, keys or local databases are included. No files are deleted by this script.
Copy-Tree $RecoveredApplication $output @('/XF','app.asar','.env*','*.pem','*.key','/XD',"$RecoveredApplication\resources\runtime\frontend","$RecoveredApplication\resources\runtime\backend\dist")
$app=Join-Path $output 'resources\app';Copy-Tree "$repo\src" "$app\src";Copy-Tree "$repo\ui" "$app\ui";Copy-Item "$repo\package.json" "$app\package.json"
$runtime=Join-Path $output 'resources\runtime'
# Runtime launcher loads service files here, separately from Electron sources.
Copy-Tree "$repo\src\service" "$runtime\desktop"
Copy-Item "$repo\src\cloud-local.cjs","$repo\src\cloud-guard.cjs","$repo\src\license-contract.cjs" "$runtime\desktop"
Copy-Tree "$Backend\dist" "$runtime\backend\dist"
Copy-Tree "$Frontend\.next-desktop\standalone" "$runtime\frontend" @('/XF','.env*')
Copy-Tree "$Frontend\.next-desktop\static" "$runtime\frontend\.next-desktop\static"
Copy-Tree "$Frontend\public" "$runtime\frontend\public"
Copy-Item "$repo\scripts\schema_calendar.sql" "$runtime\schema.sql"
New-Item -ItemType Directory -Path "$runtime\migrations" -Force | Out-Null
$utf8=[Text.UTF8Encoding]::new($false)
$teamSql=[IO.File]::ReadAllText("$repo\scripts\upgrade_087_team.sql")
[IO.File]::WriteAllText("$runtime\migrations\091_from_042_team.sql",([IO.File]::ReadAllText("$repo\scripts\upgrade_042_calendar.sql")+"`n"+$teamSql),$utf8)
[IO.File]::WriteAllText("$runtime\migrations\091_from_calendar_team.sql",([IO.File]::ReadAllText("$repo\scripts\087_calendar_reconciliation.sql")+"`n"+$teamSql),$utf8)
Copy-Item "$repo\scripts\upgrade_087_team.sql" "$runtime\migrations\091_from_087_team.sql"
$old=Get-Content "$RecoveredApplication\resources\runtime\manifest.json" -Raw | ConvertFrom-Json
$oldHash=$old.schemaHash
$old.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$old.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant()
$old.builtAt=[DateTime]::UtcNow.ToString('o')
$old | Add-Member -NotePropertyName teamBuild -NotePropertyValue '2026-11-04-team-shifts-development' -Force
# Preserve purchasedVersion 0.4.2 and original copies; schema changes never rewrite signed entitlements.
$paths=@(@{hash=$oldHash;file='091_from_042_team.sql'},@{hash='1eec1ae24e6164ab90c7d6940a8eff36711e967196a29575a70a358bb7890aea';file='091_from_calendar_team.sql'},@{hash='cc01b8fb9ba73086ba5dca1ff06523c474e7f53ece9250dd89c93486c041be7a';file='091_from_087_team.sql'})
$old.upgrades=@($paths | ForEach-Object {@{fromVersion='0.4.2';fromHash=$_.hash;toHash=$old.schemaHash;file=('migrations/'+$_.file);migrationHash=(Get-FileHash (Join-Path "$runtime\migrations" $_.file) -Algorithm SHA256).Hash.ToLowerInvariant()}})
[IO.File]::WriteAllText("$runtime\manifest.json",($old|ConvertTo-Json -Depth 20),[Text.UTF8Encoding]::new($false))
Write-Output "Built portable development folder: $output"
