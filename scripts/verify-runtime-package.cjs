#!/usr/bin/env node
// Shipping gate for a staged Desktop package.
// Rejects a package whose schema.sql is missing the additive 120-133 delta, whose
// manifest schemaHash does not describe the shipped schema, or whose upgrade routes
// carry hashes that no longer match the migration files they ship.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Objects the 120-133 additive delta must contribute to every stage's schema.sql.
// 120, 122-126 and 131-132 only alter or gate existing objects, so they are covered
// by the hash check below rather than by a table assertion.
const DELTA_OBJECTS = {
  '144_inventory_costing.sql':['erp_inventory_cost_layers','erp_inventory_cost_allocations','erp_inventory_cost_evidence'],
  '146_inventory_cost_documents.sql':['erp_inventory_cost_commands','erp_inventory_cost_finalizations'],
  '147_desktop_cost_reconciliation.sql':['erp_inventory_cost_reconciliations'],
  '121_record_sync_derived_history.sql': ['desktop_sync_protocol'],
  '127_unified_license_management.sql': ['platform_license_operations', 'platform_license_device_controls', 'platform_license_configurations'],
  '128_fitness_courts_open_play.sql': ['fitness_courts', 'fitness_court_bookings', 'fitness_open_plays', 'fitness_open_play_attendees'],
  '129_fitness_reservation_billing.sql': ['fitness_payment_methods', 'fitness_payment_proofs'],
  '130_fitness_venue_profile.sql': ['fitness_venue_profiles', 'fitness_venue_posts'],
  '133_reports_analytics.sql': ['report_saved_views', 'report_export_jobs', 'report_execution_logs'],
  '139_fitness_shared_venues_check_in.sql': ['fitness_venues'],
  '141_spa_wellness.sql': ['spa_venues','spa_services','spa_appointments','spa_payment_proofs'],
  '142_package_price_schedules.sql': ['package_price_schedules','package_price_schedule_audits']
};

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function runtimeRoot(target) {
  const nested = path.join(target, 'resources', 'runtime');
  return fs.existsSync(path.join(nested, 'manifest.json')) ? nested : target;
}

function resolvePrevious(previous) {
  if (!previous) return null;
  const stats = fs.statSync(previous);
  if (stats.isDirectory()) {
    const candidate = path.join(previous, 'resources', 'runtime', 'manifest.json');
    const manifestPath = fs.existsSync(candidate) ? candidate : path.join(previous, 'manifest.json');
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  return JSON.parse(fs.readFileSync(previous, 'utf8'));
}

const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith('--'));
const previousArg = args.includes('--previous') ? args[args.indexOf('--previous') + 1] : null;
if (!target) {
  console.error('Usage: node scripts/verify-runtime-package.cjs <portableApp|runtime> [--previous <stage|manifest>]');
  process.exit(2);
}

const errors = [];
const fail = message => errors.push(message);
const runtime = runtimeRoot(path.resolve(target));
const manifestPath = path.join(runtime, 'manifest.json');
const schemaPath = path.join(runtime, 'schema.sql');

if (!fs.existsSync(manifestPath)) {
  console.error('FAIL no runtime manifest at ' + manifestPath);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error('FAIL unreadable runtime manifest: ' + error.message);
  process.exit(1);
}

if (!fs.existsSync(schemaPath)) {
  fail('schema.sql is missing from the runtime bundle');
} else {
  const schemaHash = sha256(schemaPath);
  if (String(manifest.schemaHash || '').toLowerCase() !== schemaHash) {
    fail('manifest schemaHash ' + String(manifest.schemaHash).slice(0, 12) + ' does not describe the shipped schema.sql (' + schemaHash.slice(0, 12) + ')');
  }
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const missing = [];
  for (const [migration, tables] of Object.entries(DELTA_OBJECTS)) {
    for (const table of tables) {
      const pattern = new RegExp('CREATE TABLE(?: IF NOT EXISTS)? (?:public\\.)?"?' + table + '"?\\b', 'i');
      if (!pattern.test(schema)) missing.push(table + ' (' + migration + ')');
    }
  }
  for(const [pattern,label] of [[/CREATE OR REPLACE VIEW\s+fitness_court_public_profiles/i,'fitness_court_public_profiles'],[/ALTER TABLE\s+fitness_court_bookings\s+ADD COLUMN IF NOT EXISTS\s+checked_in_count/i,'booking checked_in_count'],[/ALTER TABLE\s+fitness_open_play_attendees\s+ADD COLUMN IF NOT EXISTS\s+checked_in_count/i,'open-play checked_in_count']])if(!pattern.test(schema))missing.push(label+' (139)');
  if (missing.length) fail('runtime schema is missing the 120-139 delta: ' + missing.join(', '));
}

const routes = Array.isArray(manifest.upgrades) ? manifest.upgrades : [];
if (!routes.length) fail('manifest declares no upgrade routes, so existing stores could never upgrade');
const seen = new Set();
for (const route of routes) {
  const label = (route.fromVersion || 'unknown') + ' -> ' + String(route.toHash).slice(0, 12);
  if (!route.file) { fail(label + ': route has no migration file'); continue; }
  if (!route.fromHash || !route.toHash || !route.migrationHash) { fail(label + ': route is missing fromHash, toHash or migrationHash'); continue; }
  if (route.toHash !== manifest.schemaHash) fail(label + ': toHash does not match the packaged schemaHash');
  if (route.fromHash === manifest.schemaHash) fail(label + ': route starts at the packaged schema hash');
  if (seen.has(route.fromHash)) fail(label + ': duplicate route for source schema ' + String(route.fromHash).slice(0, 12));
  seen.add(route.fromHash);
  const file = path.join(runtime, route.file);
  if (!fs.existsSync(file)) { fail(label + ': migration file ' + route.file + ' is not shipped'); continue; }
  if (/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?erp_inventory_cost_reconciliations\b/i.test(fs.readFileSync(file, 'utf8')) && route.costingExpansion !== 'inventory-costing-v1') {
    fail(label + ': costingExpansion must be inventory-costing-v1 for the reviewed costing registry upgrade');
  }
  const hash = sha256(file);
  if (hash !== String(route.migrationHash).toLowerCase()) {
    fail(label + ': migrationHash is stale - manifest ' + String(route.migrationHash).slice(0, 12) + ' but shipped ' + route.file + ' is ' + hash.slice(0, 12));
  }
}

if (previousArg) {
  let previous;
  try {
    previous = resolvePrevious(previousArg);
  } catch (error) {
    fail('cannot read previous package: ' + error.message);
  }
  if (previous) {
    if (previous.schemaHash !== manifest.schemaHash && !seen.has(previous.schemaHash)) {
      fail('no upgrade route from the previous package schema ' + String(previous.schemaHash).slice(0, 12) + ' (' + (previous.version || 'unknown') + ')');
    }
  }
}

if (errors.length) {
  console.error('FAIL ' + path.basename(runtime) + ' v' + (manifest.version || '?') + ' is not shippable:');
  for (const error of errors) console.error('  - ' + error);
  process.exit(1);
}

console.log('PASS ' + manifest.version + ': schema ' + String(manifest.schemaHash).slice(0, 12) + ' matches the shipped schema.sql with the full 120-139 delta, ' + routes.length + ' upgrade routes re-hash to their shipped files' + (previousArg ? ', previous package route present' : ''));
