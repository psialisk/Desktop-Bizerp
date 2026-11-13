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
$iconDirectory=Join-Path $Frontend 'public\icons'
New-Item -ItemType Directory -Path (Join-Path $iconDirectory 'fonts') -Force | Out-Null
Copy-Item "$repo\ui\icons\bootstrap-icons.css" (Join-Path $iconDirectory 'bootstrap-icons.css') -Force
Copy-Item "$repo\ui\icons\fonts\bootstrap-icons.woff","$repo\ui\icons\fonts\bootstrap-icons.woff2" (Join-Path $iconDirectory 'fonts') -Force
$utf8=[Text.UTF8Encoding]::new($false)
$post091Files=Get-ChildItem (Join-Path $Backend 'sql') -File | Where-Object {$_.Name -match '^(09[2-9]|10[0-5])_.*\.sql$'} | Sort-Object Name
if(-not($post091Files.Name -contains '092_hris_overhaul.sql') -or -not($post091Files.Name -contains '103_retail_pos_staple.sql') -or -not($post091Files.Name -contains '104_retail_counter_workflow.sql') -or -not($post091Files.Name -contains '105_food_counter_staple.sql')){throw 'Canonical post-091 schema migrations are incomplete'}
$post091Parts=foreach($migrationFile in $post091Files){
 $sql=[IO.File]::ReadAllText($migrationFile.FullName)
 if($migrationFile.Name -eq '097_food_finance_and_recipe_calculator.sql'){$sql=[regex]::Replace($sql,'(?m)^ALTER TABLE food_menu_items\s+DROP COLUMN recipe;\s*$','-- Desktop retains legacy recipe JSON; normalized recipe lines are already copied above.')}
 if($migrationFile.Name -eq '100_encrypted_tenant_device_keys.sql'){$sql=[regex]::Replace($sql,'(?ms)^-- Retrofit active tenants.*?(?=^COMMIT;)','-- Local desktop activation does not rewrite cloud license platform entitlements.')}
 $sql
}
$post091Sql=$post091Parts -join "`n`n"
$schema=[IO.File]::ReadAllText("$repo\scripts\schema_calendar.sql")
[IO.File]::WriteAllText("$runtime\schema.sql",$schema+"`n`n"+$post091Sql,$utf8)
New-Item -ItemType Directory -Path "$runtime\migrations" -Force | Out-Null
$teamSql=[IO.File]::ReadAllText("$repo\scripts\upgrade_087_team.sql")
[IO.File]::WriteAllText("$runtime\migrations\091_from_042_team.sql",([IO.File]::ReadAllText("$repo\scripts\upgrade_042_calendar.sql")+"`n"+$teamSql),$utf8)
[IO.File]::WriteAllText("$runtime\migrations\091_from_calendar_team.sql",([IO.File]::ReadAllText("$repo\scripts\087_calendar_reconciliation.sql")+"`n"+$teamSql),$utf8)
Copy-Item "$repo\scripts\upgrade_087_team.sql" "$runtime\migrations\091_from_087_team.sql"
$legacyPaths=@('091_from_042_team.sql','091_from_calendar_team.sql','091_from_087_team.sql')
foreach($file in $legacyPaths){$path=Join-Path "$runtime\migrations" $file;[IO.File]::AppendAllText($path,"`n`n"+$post091Sql,$utf8)}
[IO.File]::WriteAllText("$runtime\migrations\092_105_from_091_team.sql",$post091Sql,$utf8)
$retailPosSql=[IO.File]::ReadAllText((Join-Path $Backend 'sql\103_retail_pos_staple.sql'))
$retailWorkflowSql=[IO.File]::ReadAllText((Join-Path $Backend 'sql\104_retail_counter_workflow.sql'))
[IO.File]::WriteAllText("$runtime\migrations\103_104_105_from_102_retail_pos_staple.sql",($retailPosSql+"`n`n"+$retailWorkflowSql+"`n`n"+[IO.File]::ReadAllText((Join-Path $Backend 'sql\105_food_counter_staple.sql'))),$utf8)
[IO.File]::WriteAllText("$runtime\migrations\104_from_103_retail_counter_workflow.sql",$retailWorkflowSql,$utf8)
$foodCounterSql=[IO.File]::ReadAllText((Join-Path $Backend 'sql\105_food_counter_staple.sql'))
[IO.File]::WriteAllText("$runtime\migrations\104_105_from_103_retail_counter_workflow.sql",($retailWorkflowSql+"`n`n"+$foodCounterSql),$utf8)
[IO.File]::WriteAllText("$runtime\migrations\105_from_104_food_counter_staple.sql",$foodCounterSql,$utf8)
$old=Get-Content "$RecoveredApplication\resources\runtime\manifest.json" -Raw | ConvertFrom-Json
$oldHash=$old.schemaHash
$old.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$old.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant()
$old.builtAt=[DateTime]::UtcNow.ToString('o')
$old | Add-Member -NotePropertyName teamBuild -NotePropertyValue '2026-11-04-team-shifts-development' -Force
# Preserve purchasedVersion 0.4.2 and original copies; schema changes never rewrite signed entitlements.
$paths=@(
 @{hash=$oldHash;file='091_from_042_team.sql'},
 @{hash='1eec1ae24e6164ab90c7d6940a8eff36711e967196a29575a70a358bb7890aea';file='091_from_calendar_team.sql'},
 @{hash='cc01b8fb9ba73086ba5dca1ff06523c474e7f53ece9250dd89c93486c041be7a';file='091_from_087_team.sql'},
 @{hash='c133fdb2e9d05cbaf864b6cfb53cc06c50e3c1cb1f4ae25257bfb9730572fd1f';file='092_105_from_091_team.sql'},
 @{hash='c207cd263a9455acadd37f2fd56f7434031fe891833441231c6ab2551a27947b';file='092_105_from_091_team.sql'},
 @{hash='1fcaeda7fbf6ac6b8e24804874ac7044afb05ca9ab9ed5f646c488045fb3b702';file='103_104_105_from_102_retail_pos_staple.sql'},
 @{hash='26fbc3d6a1ba7e098dd1c09fe4abacaa48d45d96861e09c8cc0405b5ec1d405d';file='104_105_from_103_retail_counter_workflow.sql'},
 @{hash='f700b9a869d2b58ee16868bc9098669266622d18dfd4675bc523b45689048137';file='105_from_104_food_counter_staple.sql'}
)
$old.upgrades=@($paths | ForEach-Object {@{fromVersion='0.4.2';fromHash=$_.hash;toHash=$old.schemaHash;file=('migrations/'+$_.file);migrationHash=(Get-FileHash (Join-Path "$runtime\migrations" $_.file) -Algorithm SHA256).Hash.ToLowerInvariant()}})
[IO.File]::WriteAllText("$runtime\manifest.json",($old|ConvertTo-Json -Depth 20),[Text.UTF8Encoding]::new($false))
Write-Output "Built portable development folder: $output"
