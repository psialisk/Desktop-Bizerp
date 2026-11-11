# Conversation log


## 2026-11-01 / 2026-11-02 - Operational calendar implementation approval and Desktop recovery
User authorized General Retail, Water Refilling and Pharmacy calendars on cloud/Desktop/Android first, then other sub-specs; supplied D:/Business ERP/BusinessERP-Desktop-0.4.2-Setup-Loading.exe and authorized unpacking into a folder for GitHub development; later said proceed. Recovered readable Electron source and created a local feature branch without touching installed data. Implemented source-derived calendar, auditable operational tasks, guarded cloud/native screens and private Desktop build. Priority validation and artifact details: docs/OPERATIONAL-CALENDAR.md. Other sub-specs remain behind the requested priority gate. Every conversation continues to be mirrored as Markdown; no real credentials copied.


## 2026-11-02 - Continue operational calendar
User said proceed. Priority implementation is committed locally in all four repos (backend 611ed65b, frontend 15c8549, native cc1eee6, recovered Desktop c66462d). Final Desktop runtime tests passed all three priority packages. Other sub-specs remain incomplete; specialist failing tests were added but implementation was not executed because automatic approval review reported workspace credits exhausted. No production deployment or installed-data change.


## 2026-11-02 - Specialist calendars and Desktop GitHub
Credit approval-review failure cleared and implementation continued. User explicitly selected https://github.com/psialisk/Desktop-Bizerp for recovered Desktop source. Priority source checkpoint already on GitHub; specialist follow-up adds actual Salon/Laundry/Services/Auto schedules, explicit Food unscheduled work and store-variant inheritance. Android0.7.1 provides specialist cloud-calendar mode; local specialist books are not claimed. Review fixes,42 JVM tests, cloud/offline builds and198 local route checks recorded in docs/OPERATIONAL-CALENDAR.md. Conversation and release decisions continue to be mirrored in Markdown.


## 2026-11-02 - Required SQL rollout
User asked whether migration SQL must be executed. Cloud calendar requires backend/sql/086_operations_calendar.sql. If Pharmacy085 has not already been applied, apply backend/sql/085_retail_pharmacy.sql first, assuming prior migrations through084 are already present. Back up the target database and apply pending migrations in order before using the updated backend/frontend. Production state has not been inspected and no production SQL was executed. Existing Desktop0.4.2 uses its packaged Back up and upgrade copies action; scripts/upgrade_042_calendar.sql is its reviewed Desktop-only composite, not the cloud rollout script. New Desktop stores use the packaged schema automatically. Native Android uses existing encrypted generic Room records and needs no manual SQLite SQL; update the APK without clearing data.


## 2026-11-02 02:03:32 UTC+8 - Approved cloud SQL executed
User authorized execution of the previously identified SQL. Full protected backup completed and validated, then085 Pharmacy and086 Operational Calendar applied atomically to the approved cloud database. Independent read-only verification passed: two migration history entries,8 new tables,4 active Pharmacy triggers;228 existing application table counts preserved. No app deployment, installed Desktop migration or Android local database change was performed. See docs/CLOUD-MIGRATIONS-085-086-EXECUTED.md. No credentials or backup data committed.


## 2026-11-02 - Boarding House calendar mockup only
User requested an operational calendar mockup for Boarding House and explicitly prohibited code updates. Generated a green/white desktop month-calendar and Android agenda concept with fictional demo data, rent due/source invoices, move-ins/source leases, maintenance/source work orders and lead follow-ups. Week/Agenda controls and mobile layout are proposed design, not deployed capability. Preview and exact prompt: docs/mockups/BOARDING-HOUSE-CALENDAR-v1.md; image is stored in the Desktop repository and D:/Business ERP/Mockups. No application code, migration or production data changes.


## 2026-11-02 — Calendar correction and login reconciliation
User requested Boarding House-style Retail calendar, persisted dated events, three-day reminders and backend reconciliation at every login, then said proceed. Implemented cloud/shared Desktop and native corrections on feature/retail-operational-calendar. Added migration087 (not applied to production), authorized source projection, stable deduplicated reminder lifecycle, login/read/background refresh and batched writes; retained local/cloud book separation. Tests/review and deployment boundaries: docs/OPERATIONAL-CALENDAR-RECONCILIATION.md. No credentials logged.


## 2026-11-02 — Retail-family roles and authorization analysis only
User requested Philippine role/staff/authorization comparison, pharmacist equivalents, Water checker/manager roles, pros/cons and conclusion; explicitly no code updates. Reviewed current sources and official Philippine/vendor references. Recommendation: shared action-level authorization with editable job-role presets, separately verified qualifications and scoped assignments; no new foundation per job title. Identified fixed-role/custom-role conflicts, Water custody checker gap and owner-only native local identity. Full report: docs/RETAIL-STAFF-AUTHORIZATION-ANALYSIS-2026-11-02.md. Application code, schema, configuration and deployment unchanged.


## 2026-11-02 — Leave register returns to Dashboard
User screenshot showed the Business POS cash-session modal linking Leave register to /business-login. User requested Dashboard instead. Changed only the shared frontend link in components/RetailStoreTools.tsx to /dashboard. Navigation does not clear authentication or submit/open/close a cash session. Existing POS session/navigation and foundation checks pass; frontend build and local HTTP verification recorded after completion. No backend/schema/native changes and no production deployment. Shared frontend source change will be inherited by a future Desktop build; packaged Desktop/APK not rebuilt for this web-link fix.
Verification: frontend build/preflights, existing POS session/navigation and foundation checks passed;198 local HTTP destinations passed, Dashboard returned200. No live deployment or SQL required.


## 2026-11-02 — Mandatory first-sale onboarding
User requested always-visible industry photos and mandatory Create product → Restock → Ready for Checkout → POS, with relevant Water gallon/New Stock placeholders and a floating unfinished-setup reminder. Implemented Business web/shared backend/frontend source, tenant-scoped first-sale evidence, locked/recoverable writes, existing cost/lot/Pharmacy safeguards and server-verified readiness. Build, meaningful backend/frontend/actual-handler regressions and198 local HTTP checks pass. No new SQL, live deployment or native/packaged Desktop rebuild. Full record: docs/FIRST-SALE-ONBOARDING.md.


## 2026-11-02 — Existing profit-and-loss reporting question; no code changes
User asked whether a profit/loss overview/report already exists and explicitly prohibited code updates. Source inspection confirms Finance → Financial reports (/dashboard/financial-reports, GET /ledger/reports) has monthly revenue, expenses and profit=revenue-expenses from tenant journals, plus month-end balance sheet, trial balance and account CSV export; Finance view/edit and a reporting-compatible foundation are required. Retail daily dashboard provides date/location/cashier sales figures and management/Finance gross profit only when contributing costs are known; Retail accounting has shipment gross margin for the latest100 documents, net of linked returns. Those gross-profit views exclude operating expenses. Current monthly P&L is a basic summary rather than a dedicated detailed P&L statement with comparisons/export. Missing posted costs/expenses can make results incomplete. This was code inspection, not live-production verification. Application code, SQL, configuration and deployment unchanged; only this conversation note saved.


## 2026-11-02 — P&L foundation/sub-specialization inclusion; analysis only
User asked whether existing profit/loss reporting is part of Retail foundations/sub-specs; explicitly no code updates. Read-only execution of current source packageFoundation confirms retail-store, water-refilling, retail-pharmacy and Bookstore/Clothing/Furniture/Grocery/Hardware/Toy default packages include retail-accounting and financial-reports. Retail-accounting depends on financial-reports; current stock-Retail normalization includes accounting. Salon, Laundry, Food & Beverage, Auto Repair and Services & Contracting defaults include neither, despite belonging to the Retail package family (their underlying industries differ). They would need appropriate package/foundation reporting entitlement/configuration rather than assuming the Retail family label grants it. Actual existing tenants and staff still depend on enabled blocks/Finance access; live tenant state was not inspected. No application, schema, configuration or deployment changes; conversation Markdown only.

## 2026-11-11 — Offline desktop product camera capture
Added camera capture to the local Retail product-photo editor and scoped Electron `media` permission to video-only requests from the loopback local ERP workspace. Captured JPEGs are stored through the existing tenant-local product image API/database and included in the desktop database backup. Cloud/network workspaces continue to deny camera permissions. Packaged `BusinessERP-Desktop-0.4.2-Offline-Camera` using the existing version-preserving portable development build; no database migration or cloud sync.
Final packaged folder: `artifacts/BusinessERP-Desktop-0.4.2-Offline-Camera-20261111`; Electron runtime manifest SHA-256 `55A087410C2473CE850C5CE5190B6539F024F8823958A5C03F6DDBD9BC505D70`. This is a portable development folder, not a signed installer.
