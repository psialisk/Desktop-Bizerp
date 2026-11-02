# Operational calendar alignment and reconciliation

2 November 2026 (UTC+8). Supersedes the earlier count-only Retail calendar and its on-demand-only event list.

## Requested behavior
User: follow the Boarding House calendar strictly; save dated business records into the operational calendar; corresponding reminders begin three days before events; every login checks backend additions and updates. User then instructed: proceed. Conversation recorded without credentials.

## Delivered
- Cloud and shared Desktop UI follow the existing Boarding House structure: summary cards, previous/Today/next controls, Monday-first 42-day grid, colored event-title pills (three plus overflow), current/selected date styling and selected-day agenda. Existing Boarding House rent actions and sources remain intact. Loading locks prevent repeated commands; failed loads show an error.
- Dated events are saved to operations_calendar_events, separately per authorized recipient. Source records remain authoritative; the projection is rebuildable. Stable tenant/recipient/source keys replace stale dates and remove deleted or no-longer-authorized entries. Reconciliation covers all source dates, independently of the displayed month or feed display limit.
- Backend refresh runs after verified staff login (including the existing cloud Android/desktop login path), on calendar and notification reads, and in the existing background attention worker. Invalid credentials never run it. Reconciliation errors are logged and retried; they do not turn valid credentials into a sign-in failure.
- Each active future event enters the reminder window three Asia/Manila calendar days before its date. The same reminder stays active through due/overdue until its source completes/cancels/disappears or moves outside the window. A login missed on day minus three catches up within the window. Stable reminder identity prevents duplicate rows. Unchanged reads remain read; changed reminder contents or reopened reminders become unread. Completed history has no actionable reminder.
- Upserts are batched per recipient so historical event volume does not cause one network write per record during login. Existing department permissions and enabled foundations gate each source. Finance balances still use posted invoices less credits/settlements/applied deposits plus refunds; a draft order date is an explicitly planned date, never posted debt. Prescription entries remain opaque and restricted; owner-only pharmacist credential reminders remain restricted.

## Dated business sources
Tasks/commitments; deliveries; posted balance deadlines; planned order payment dates; sales/purchase record dates; quotations and trade quote expiry; promotion start/end; stock movement/count history; sales/receiving documents; supplier invoice dates; authorized POS receipt history; Water custody history; fleet start/end; stocked lot expiry; pharmacist credential validity; restricted approved prescription validity and submitted review queue; dated activities; authorized payroll period boundaries; Salon appointments and end times; Laundry promised release; Service site visits and end times/milestones; trade work start/end and recurring planning dates.

Enabled modules and department permissions still apply. Business-date reminders are distinct from technical row-update timestamps, profile dates, and already-completed transaction history. A record with no agreed operational date stays in Needs a date; no return/delivery/refill date is invented from its creation time. Display feeds retain a visible 1000-row-per-source limit and a one-year overdue display bound; persistence/reconciliation has no selected-month cutoff. Selecting a historical/future month loads that month and all adjacent cells in its six-week grid.

## Android
0.7.2-dev, versionCode12. Named event cells, 42-day grid, summary cards and selected-day agenda replace count-only cells. Cloud sessions use backend reconciliation. Local login reconciles encrypted device-local calendar events/reminders inside the IO/Room transaction; local task edits and calendar refresh do likewise. Local receipt/custody dates are history. Device books remain separate from cloud books; no sales synchronization, account reset or activation reset. Local reminders appear in the local calendar; these are in-app reminders, not OS push/background alarms.

APK: D:/Business ERP/BusinessERP-Android-0.7.2-dev-Operational-Calendar.apk
SHA256: ad1d9f58fb61672bd1ebcf53e813050f09f1529b43b908122600287825522e1e
Development signing certificate remains a0ed46563ea98e32c31f74a77cac6d972c06e8f457c788993591205c6413311d.
Install as an update; retain existing app data.

## Database and deployment
New cloud migration: backend/sql/087_calendar_reconciliation.sql, after085/086. It adds only the projection table/index and tenant-recipient foreign key. 085/086 were already applied on the prior approved rollout; 087 has NOT been executed against production in this task. Deploy updated backend/frontend only after087. No production application deployment or main merge performed here.

Desktop packages the additive original0.4.2 composite and a separate087-only path from the previously generated calendar schema hash. Upgrade uses retained copies/backups and compares old values. PurchasedVersion0.4.2 and activation enforcement remain unchanged. Portable development folder is not a newly signed installer. No installed Desktop profile modified. Android generic encrypted Room records need no manual SQLite migration.

## Verification and review
- Backend build; real PostgreSQL-compatible tests for saved dates, three-day threshold, retry/read state, date changes, completion/deletion, access revocation, far-future dates, quotation/promotion and planned-order sources, actual valid/invalid login handlers and bounded batched writes pass.
- Existing calendar tests preserve tenant/department/Rx restrictions, authoritative posted balances, source statuses and all specialist foundation behavior. Industry notification, Pharmacy, Retail store and POS regressions pass.
- Cloud and Desktop frontend production builds/preflights pass; actual rendered component verifies42 cells/named pills/selected-day agenda;198 local HTTP destinations pass. HTTP page-shell checks do not prove signed-in actions.
- Android44 JVM tests pass; debug/instrumentation APK assembly and lint pass; signature verified. No attached device; physical UI, printer and instrumentation execution are not claimed.
- Desktop original-schema upgrade preservation test passes. Current runtime checks pass for General Retail, Water and Pharmacy using isolated actual PostgreSQL/Nest/Next profiles. A separate actual-inbox/repeat-login test passes for Retail; calendar reminders remain active and unique. Machine-readable evidence: OPERATIONAL-CALENDAR-RECONCILIATION-RELEASE.json.
- Fresh whole-change review found three Important issues: old SQL refresh resolved derived-calendar reminders; grid source range omitted late adjacent-month cells; native month filter hid adjacent-month pills. The SQL refresh and source range findings were reproduced with failing tests and fixed; native adjacent-month filtering was corrected and the app rebuilt/linted. Actual SQL085 refresh now preserves calendar actions using a real enabled backing block. Source ranges are Monday grid start plus42 days. Final read-only re-review reports no remaining Critical/Important findings.

Resource capacity booking, hour/week planning, recurring exceptions, source-document drag/reschedule and OS push remain outside this change. Event/task date changes and corresponding in-app reminders are delivered.
