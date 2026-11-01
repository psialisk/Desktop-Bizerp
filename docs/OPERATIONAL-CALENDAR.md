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


## Specialist follow-up implemented 2026-11-02
After the priority cloud/Desktop/Android checkpoint, added Salon appointment starts, Laundry promised releases, Services site visits and Auto/Trades work windows from their typed sources. Food pickups have no recorded promise date, so waiting pickups remain unscheduled until collected/cancelled, including after kitchen served status. Bookstore, clothing, furniture, grocery, hardware and toy-store variants inherit the General Retail delivery/expiry/task calendar; no rental/alteration/clinical workflow is fabricated.

Native 0.7.1-dev/code11 adds a cloud-calendar-only Business mode for compatible Salon/Laundry/Food/Auto/Services foundations. It does not enable native specialist checkout or create local service books. These source actions use Cloud Platform; native device-local activation/books remain the supported Retail/Water/Pharmacy workflows. Native terminal filtering includes no_show, matching server rules.

Latest Android artifact: D:/Business ERP/BusinessERP-Android-0.7.1-dev-Operational-Calendar.apk
SHA256: 6daa89c32adc3dc19060960ddde0e83a6bc836b9ae92bf3ac330da52dfc567d2
42 JVM tests pass, APK/instrumentation assembly and lint pass, original development certificate retained. No attached Android device; no physical UI/printer/instrumentation execution claimed. Earlier 0.7.0 artifact remains retained.

All specialist API source/date/status tests pass, including served-but-waiting Food pickups, no_show terminal filtering and property isolation. Legacy compatible foundation reads derive the basic calendar without changing stored rows or signed grants. Finance balances reuse authoritative posted-balance SQL. Historical Water/071, customer-account specialist, specialist lifecycle, activation, pricing and retail regressions pass. One old Water test incorrectly expected reference identity despite pre-existing customer-account derivation; reproduced that failure on pre-calendar d2c6231f and updated the test to assert immutable inputs and no Fleet widening instead.

Cloud and standalone Desktop production builds/preflights pass; 198 loopback page/asset checks pass. Staff/industry handbooks now explain the calendar and boundaries. Desktop original-schema preservation and Electron sandbox/context-isolation startup smoke passed. Final all-package runtime sweep is recorded in calendar-desktop-all-runtime.log.

Desktop repository: https://github.com/psialisk/Desktop-Bizerp, branch feature/retail-operational-calendar. Source contains a reproducible, hash-verified installer recovery script and build instructions; runtime dependencies, real profiles and private keys stay outside Git. User provided this remote explicitly. All four repositories use the same feature branch; no main merge or production deployment.

## Explicit scope decisions
- Keep Desktop purchasedVersion0.4.2 so existing exact-version activation remains valid; cost: this is a development portable update, not a newly signed installer or new paid-version offer.
- Calendar derives basic source access from existing licensed Retail-family capabilities; cost: existing contracts are not rewritten and source-specific permission guards still apply.
- Other native specialists use cloud source calendars; cost: there are no new offline Salon/Laundry/Food/Auto/Services books or specialist checkout.
- Resource/capacity reservations, staff/branch assignment filters, hour/week planning, recurring exceptions, source-document drag/reschedule and OS push remain outside this initial calendar release. Explicit operational task rescheduling is delivered; it is not a resource booking engine.

Review: both priority findings (posted balances, partially_completed) and both specialist findings (served Food queue, no_show status) reproduced with failing tests and fixed. No important review findings left unresolved. No installed profile or production records were modified.

Final Desktop runtime result:8/8 packages passed (Retail, Water, Pharmacy, Salon, Laundry, Food, Auto and Services), with real private Postgres/Nest/Next owner login, task retry/feed and page shell assertions. Windows locked one synthetic temporary fixture during cleanup; the harness now retries or retains that fixture and remaining runtime assertions passed. Final machine-readable evidence: docs/OPERATIONAL-CALENDAR-RELEASE.json. No functional runtime assertions failed.
