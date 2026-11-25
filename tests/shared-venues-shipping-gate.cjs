const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
const previous=path.resolve(process.env.ERP_PREVIOUS_STAGE||'artifacts/BusinessERP-Desktop-0.4.23-Seed-Floater-20261125');
const r=cp.spawnSync(process.execPath,['scripts/verify-runtime-package.cjs',previous],{encoding:'utf8'});
assert.notEqual(r.status,0,'The shipping gate must reject a pre-shared-venues runtime');
assert.match(r.stdout+r.stderr,/fitness_venues|fitness_court_public_profiles|checked_in_count/);
console.log('PASS shipping gate rejects old runtime without shared venues/check-in');
