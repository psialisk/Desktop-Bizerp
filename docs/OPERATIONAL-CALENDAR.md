# Operational calendar - priority implementation

Updated 2026-11-02. User approved General Retail, Water Refilling and Pharmacy first across cloud, Desktop and Android, followed by other Retail sub-specializations.

## Delivered priority scope
- Separate /dashboard/operational-calendar and /operations-calendar API; Boarding House calendar stays unchanged. No Property dependency or rent buttons.
- Month grid, date agenda, Today/Overdue/Upcoming/Unscheduled, event type and active/status filters, source references/links, loading and duplicate-command guards.
- Explicit date-only operational tasks: stock counts, pickup/delivery promises, supplier arrivals, container returns, cleaning, equipment service, recall follow-up and ordinary follow-up. Optional due date leaves work unscheduled. Version/reason/audit and stable request keys protect edits/retries. Completing a task posts no money, stock, custody or dispensing.
- General Retail: scheduled deliveries; outstanding posted balances (actual invoices less credits, settlements and applied deposits, plus refunds) under Finance permission; open/partially completed orders without an active delivery commitment are unscheduled.
- Water: same shared sources plus real fleet trip dates. Custody movement history never implies a future container return or repeat refill order; enter an explicit task when a promise is agreed.
- Pharmacy: stocked lot expiry, held-stock follow-up, owner-only credential deadlines and restricted prescription validity/review queue. Prescription summaries contain no patient/prescriber/directions. Access requires manager/owner or currently authorized pharmacist. No automatic refill or dispensing.
- Asia/Manila date semantics. Queries cap each feed at 1000 with a visible limitation notice. Active overdue work is limited to one year before the selected month; terminal history belongs to its actual month. Further-future work requires selecting later months. Failed requests show unavailable, not a zero-work success.

## Platforms
Cloud builds with existing source permissions and licensed Retail inventory capability. Existing signed grants/contracts are not rewritten. Source data remains authoritative.
Android 0.7.0-dev/code10: local calendar tasks and local stocked lots/holds/credentials/prescriptions are encrypted in existing Room records and run on IO. No schema reset, new local account or activation reset. Cloud orders, balances and fleet are not silently merged into SQLite. Unsupported source actions use Cloud Platform. Existing green/white UI and process loading remain.
APK: D:/Business ERP/BusinessERP-Android-0.7.0-dev-Operational-Calendar.apk
SHA256: 7ed30325ffb49847b4d4d5ca9e03d0294dfacff51d201e135337ea516f5c0f58
Development certificate SHA256: a0ed46563ea98e32c31f74a77cac6d972c06e8f457c788993591205c6413311d.
Desktop source recovered from the supplied Electron installer into D:/Business ERP/Desktop-Development/BusinessERP-Desktop. Local Git branch feature/retail-operational-calendar; no remote configured. Packaged shared Nest/Next/PostgreSQL calendar runs offline on private loopback ports. Portable development folder under artifacts/; this is not a newly signed installer. Purchased version 0.4.2 is retained to preserve exact-version activation checks. No signature/binding/expiry/capacity bypass. Paid Pharmacy Desktop commerce remains excluded until a paid offering is reviewed; local compatible development/trial workflows are testable.

## Verification
Cloud frontend production build/preflights passed; 198 local page/asset checks passed (page shells do not prove signed-in actions). API PGlite tests cover tenant/permission separation, true delivery timezone dates, task date/retry/version/audit, source transitions, restricted Rx and posted balance behavior. Retail/Pharmacy, POS scope, activation, package pricing and Desktop licensing regressions pass.
Android 40 JVM tests passed; debug app and instrumentation APKs assembled; lint passed. No connected Android device; physical UI/printer/instrumentation acceptance is not claimed.
Desktop original-schema migration test passed with exact old-row/column preservation, normalizing only equivalent numeric scale without JS floating conversion. Temporary isolated PostgreSQL/Nest/Next tests passed owner login, calendar task/retry/feed and page shell for retail-store, water-refilling and retail-pharmacy. Test harness disables all cloud registration/network; installed profile untouched.
Independent review found posted-balance and partially-completed queue defects; regression tests reproduced them and shared authoritative SQL/status handling fixed them. No production database migration, deployment, merge, installed-app upgrade or financial operation was performed.

## Next features and rollout gate
Other sub-specializations follow only after the priority automated platform gate. Keep source-backed dates: Salon appointments, Laundry promises, service visits; missing Food pickup/Auto handover promises stay explicit tasks or unscheduled. Store variants reuse the General Retail calendar, expiry and manual campaign/count tasks. Native local sources must exist before claiming local parity for specialized operational books.
Resource capacity/conflict booking, staff assignment/branch filters, week/hour planner, controlled source rescheduling, recurring-task exceptions and OS push are subsequent work. Current task edits are not source-document rescheduling or resource reservations.
