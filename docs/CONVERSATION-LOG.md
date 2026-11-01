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
