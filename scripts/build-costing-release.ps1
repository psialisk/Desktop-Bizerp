param([string]$Base='D:\Business ERP\Desktop-Development\BusinessERP-Desktop\artifacts\BusinessERP-Desktop-0.4.26-Pricing-Counters-Verified-20261127')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path "$PSScriptRoot\..").Path
$version=(Get-Content "$repo\package.json" -Raw|ConvertFrom-Json).version
$output=Join-Path $repo "artifacts\BusinessERP-Desktop-$version-Costing-Final-20261128"
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
$previousHash=$manifest.schemaHash
$deltaFiles=@('143_invoice_documents.sql','144_part_issue_scope_link.sql','144_inventory_costing.sql','145_inventory_receipt_costs.sql','145_job_fee_rules.sql','146_inventory_cost_documents.sql','147_desktop_cost_reconciliation.sql','147_trade_quotation_documents.sql','148_trade_counter_sales.sql','149_trade_vehicles.sql')
$sql=($deltaFiles|ForEach-Object{[IO.File]::ReadAllText((Join-Path "$backend\sql" $_))}) -join "`n`n"
# Older native bundles omitted the revisioned trade scope schema required by the
# shared invoice module. Add it only where absent; keep existing scope records intact.
$scopeSql=[IO.File]::ReadAllText("$backend\sql\080_industry_trades_flow.sql") -replace '(?m)^BEGIN;\s*','' -replace '(?m)^COMMIT;\s*',''
$sql='DO $native_scope$ BEGIN IF to_regclass(''trade_scope_lines'') IS NULL THEN EXECUTE $scope_definition$'+$scopeSql+'$scope_definition$; END IF; END $native_scope$;' + "`n`n" + $sql

if([IO.File]::ReadAllText("$runtime\schema.sql").Contains('CREATE TABLE IF NOT EXISTS erp_inventory_cost_reconciliations')){throw 'Review base schema: Costing already included'}
[IO.File]::AppendAllText("$runtime\schema.sql","`n`n"+$sql,$utf8)
foreach($file in @($manifest.upgrades.file|Select-Object -Unique)){[IO.File]::AppendAllText((Join-Path $runtime $file),"`n`n"+$sql,$utf8)}
[IO.File]::WriteAllText("$runtime\migrations\147_from_0426_inventory_costing.sql",$sql,$utf8)
$manifest.version=$version;$manifest.schemaHash=(Get-FileHash "$runtime\schema.sql" -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest.sharedBackendHash=(Get-FileHash "$runtime\backend\dist\main.js" -Algorithm SHA256).Hash.ToLowerInvariant();$manifest.builtAt=[DateTime]::UtcNow.ToString('o')
foreach($u in $manifest.upgrades){$u | Add-Member -NotePropertyName costingExpansion -NotePropertyValue 'inventory-costing-v1' -Force;$u.toHash=$manifest.schemaHash;$u.migrationHash=(Get-FileHash (Join-Path $runtime $u.file) -Algorithm SHA256).Hash.ToLowerInvariant()}
$manifest.upgrades+=@{costingExpansion='inventory-costing-v1';fromVersion='0.4.26';fromHash=$previousHash;toHash=$manifest.schemaHash;file='migrations/147_from_0426_inventory_costing.sql';migrationHash=(Get-FileHash "$runtime\migrations\147_from_0426_inventory_costing.sql" -Algorithm SHA256).Hash.ToLowerInvariant()}
[IO.File]::WriteAllText("$runtime\manifest.json",($manifest|ConvertTo-Json -Depth 20),$utf8)
& node "$repo\scripts\verify-runtime-package.cjs" $output
if($LASTEXITCODE -ne 0){throw 'Runtime shipping verification failed'}
Write-Output "Staged $output"
