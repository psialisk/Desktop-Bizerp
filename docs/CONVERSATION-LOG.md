# Conversation log

## 2026-11-21 — Pickleball schema parity and installer

Updated `scripts/build-calendar.ps1` to include Cloud migrations `128_fitness_courts_open_play.sql` and `129_fitness_reservation_billing.sql` in the Desktop fresh schema and the existing-store compatibility migration. The 0.4.15 upgrade manifest entry uses the generated migration and its verified hash; the runtime still requires the existing explicit backup-and-upgrade flow.

Built portable Desktop 0.4.19 at `artifacts/BusinessERP-Desktop-0.4.19-Pickleball-Parity-20261121` and NSIS installer at `artifacts/installers-pickleball-parity-20261121/BusinessERP-Desktop-0.4.19-Setup.exe`. Installer SHA-256 `DFF2C074D245D9ADFB6E2B12E17FF8E09BC755B5A2DA14582B56852AC7612FFC`; Authenticode is `NotSigned`. No existing database was upgraded, and no installer launch or Cloud deployment was performed.

## 2026-11-18 — Package signup UI update

Built Desktop 0.4.5 portable output and NSIS installer from the current feature working tree. The package retains app ID `com.gnj.businesserp.desktop`, embeds the responsive Desktop signup window and current Desktop runtime bundle. Installer: `artifacts/installers-signup-flow-20261118/BusinessERP-Desktop-0.4.5-Setup.exe`, SHA-256 `3ACC226F67A3C65B55A86FFE5AFEEB4A397F106AC298E239A90AA42CF187756C`; Authenticode reports `NotSigned`. No installer launch, tests, or deployment. Signup popup targets the canonical live Cloud URL; the Cloud web redesign still needs deployment.


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

## 2026-11-11 — Desktop installer launch and existing local business recovery
User reported Setup Finish opening a Missing Shortcut dialog for `Business ERP.exe`, and local login disabled on an existing business. Root cause: portable app executable is `Business ERP Desktop.exe` while NSIS inferred its target name from `productName: Business ERP`; local sign-in is deliberately blocked while a reviewed schema upgrade is pending. Set Electron Builder `executableName` to match the packaged executable. Made local-business/license bootstrap idempotent: when a prior local profile already has business metadata, recover the tenant/package from the same database, preserve its tenant ID and metadata, and create/apply a local trial only when no license token exists. Existing schema-upgrade backup/copy verification remains required before login; no database was opened or migrated here. Built an updated portable development folder and unsigned installer. Installer SHA-256 `3AA03A7D7734208F6A7AEC95F1E10258D8792A5EAC1C0BF523F4E89D7FC1369F`; installer Authenticode status `NotSigned`. Source syntax checks and `git diff --check` passed; no test suite or user-PC installation was run. No website deployment. Fresh-profile setup still uses the existing Desktop enrollment flow; public release signing remains unresolved.

## Cloud public signup — 2026-11-11

- Partial: added Android cloud signup from the portal chooser, live industry/package selection from the public catalog, owner registration through the existing signup endpoint, and a one-time generated password summary that continues to Business sign-in. The access end date shown comes from the API response.
- Desktop sign-in keeps `https://bizerpsme.shop` read-only for standard cloud access and offers a right-side **Connect Local ERP** toggle that makes the address editable for a local/LAN ERP. Existing local-PC sign-in and local-business creation remain available.
- Android Kotlin compilation succeeded with `:app:compileDebugKotlin`. No tests, APK packaging, device signup, live account creation, Desktop package/build, or deployment was performed. Full device/API acceptance remains pending.

## 2026-11-12 — Android and Desktop local package checkpoint

`assembleDebug` succeeded (UP-TO-DATE). Copied the verified APK to `artifacts/cloud-first-signup-20261112/Business ERP.apk` (23,371,046 bytes; SHA-256 `26BC035611761AA2C17951D9C2FFD1ED38A9AA1792C53289CF97545ACF1139B3`). Package metadata is `com.gnj.bizerp.android.dev`, version `0.13.0-dev`, target SDK 36; APK signature verifies with Android Debug certificate. This is a development build, not the selected production ID/signing identity. No Android tests or connected-device acceptance were run.

## Desktop package checkpoint — 2026-11-12

Built the shared backend and Desktop-specific Next standalone bundle, assembled portable folder `Desktop-Development/BusinessERP-Desktop/artifacts/BusinessERP-Desktop-0.4.2-Signup-Downloads-20261112`, and produced `artifacts/installers/BusinessERP-Desktop-0.4.2-Setup.exe` (235,171,751 bytes; SHA-256 `25B4009F62FC70236FA2D80EF2E3E635639B1BBCB1EFF641B41466239FACF0CF`). Authenticode is `NotSigned`; Windows publisher identity/certificate is still unresolved. Existing installer files were retained under `artifacts/installers-previous-20261112`. No installer runtime/hardware tests or deployment were performed.

## 2026-11-13 — Packaged current Android and Desktop builds

Android release 0.14.5 (24) was assembled and signed with the existing production identity at `artifacts/packaging-20261113/Business ERP.apk`; signature verification passed. It is byte-identical to the 0.14.5 artifact from Nov 12 because no Android source changed. Consequently this APK does not contain the recently added web Retail business-line catalog filtering.

Desktop backend and Desktop-specific Next standalone builds passed. Portable bundle: `artifacts/BusinessERP-Desktop-0.4.2-Retail-Business-Lines-20261113`; setup installer: `artifacts/installers-20261113/BusinessERP-Desktop-0.4.2-Setup.exe`. Version remains 0.4.2 to preserve the existing activation/schema contract. Installer Authenticode status is NotSigned; the build emitted a default Electron icon warning. Previous packages remain intact. No test suite, device installation, installer launch, upload or deployment was performed.

## 2026-11-13 — Desktop product photo editor package

Rebuilt the Desktop-specific Next.js standalone frontend from the shared Cloud product editor (file upload, camera and industry-suggested photos) and assembled portable package `artifacts/BusinessERP-Desktop-0.4.2-Product-Photos-20261113`. Desktop's local-only video camera permission allowlist remains the camera boundary. No source code changes were needed in the Electron wrapper for the shared photo UI. Installer packaging is in progress; runtime camera/photo acceptance not performed.

### 2026-11-13 — Product-photo installer result

The shared Cloud photo UI was built into a fresh portable Desktop folder and NSIS installer. Installer: `artifacts/installers-product-photos-20261113/BusinessERP-Desktop-0.4.2-Setup.exe`, 258,047,999 bytes, SHA-256 `39653E12407DB7AAA9583C589D55B6D2491BF300C63D15EEF5CE59435586E241`; Authenticode is `NotSigned`. Desktop version remains 0.4.2. Next, portable and installer builds succeeded; no test suite, installation, first-run or camera flow was run. Verification is in `artifacts/installers-product-photos-20261113/verification.json`.

## 2026-11-13 Desktop counter configuration upgrade
- Fixed upgrade validation for packaged migrations 103–105: manifest declares counter-staples-103-105 configuration expansion; tenant_foundations/audit_logs may change, while all other existing table fingerprints remain checked.
- Added resulting Retail/Food block and workflow validation; NULL workflow selections retain legacy all-eligible semantics.
- Kept backup/clone/switch-after-success behavior; installed user profile was not opened or modified.
- Added isolated PostgreSQL integration check for source versions 102, 103, 104: all passed, including idempotency, backups and original copies.
- Fixed installer script to honor InstallerDirectory rather than YAML's hardcoded output location.
- Portable artifact: BusinessERP-Desktop-0.4.2-Counter-Upgrade-20261113. Installer: installers-counter-upgrade-20261113.
- Reuses existing packaged frontend build; this release verifies schema/config upgrade, not installed-device acceptance or full transaction data integrity.

## 2026-11-14 — Desktop login portals
- Aligned the desktop sign-in screen with the supplied Business/POS portal layout and added the existing Cloud Customer login as a network-only portal.
- Removed the local business selector and local setup/license links from the login view; the local/network switch and local Business/POS authentication remain.
- Customer authentication continues through the existing renter login and renter workspace checks. No auth backend changes, tests, packaging, or deployment were performed.

## 2026-11-14 Desktop package refresh — 0.4.4
- Backend `nest build` and shared frontend desktop production build passed, including frontend prebuild checks. Portable runtime and NSIS installer generated.
- Installer: `artifacts/installers-subscription-extension-20261114/BusinessERP-Desktop-0.4.4-Setup.exe`, 259,181,364 bytes; SHA-256 `788D065A0E2FE873E7B736A0EF9436C414F6B0E94A2ADA33300EDA7011BF06B6`.
- Authenticode status is `NotSigned`; no trusted Windows publisher certificate was configured. No installation/runtime acceptance was performed. Existing user profile data was not opened or modified.

## 2026-11-18 — Optional owner email and phone sign-in package

- Packaged Desktop `0.4.7` portable build with owner email optional, password-based phone sign-in, and migration 114 plus a recognized forward mapping from the 0.4.6 schema.
- Portable output: `artifacts/BusinessERP-Desktop-0.4.7-Owner-Email-20261118` (27,376 files; 883,374,018 bytes).
- Installer: `artifacts/installers-owner-email-20261118/BusinessERP-Desktop-0.4.7-Setup.exe` (301,351,615 bytes; SHA-256 `2EB34AA5F61D915BDED50741755BFBBD2E741F7FB921622428D61DAD92DA1D48`). Windows Authenticode reports it as unsigned.
- Backend build and Web type/build passed. No automated tests or live-account acceptance were run. Cloud migration 114 remains unapplied and Cloud deployment remains pending.

## 2026-11-19 — Desktop cloud tenant bootstrap repair (0.4.16)
- Investigated a fresh-install failure after successful cloud authentication. The packaged schema omitted migration 112 (`tenant_business_first_logins`), and descending snapshot replay encountered stock trigger dependencies before stock locations/opening stock were present.
- Added the missing 106/107/112 schema migrations and a reviewed automatic 0.4.15 repair route. Dependency retries retain pending records, and a successful cloud login can open its workspace when local preparation is pending. No automatic backup was added.
- Replayed all 87 records from the affected local pending queue in an isolated PostgreSQL-compatible database successfully; the installed database and queue were not changed. Native Android sync work remains pending while this Desktop blocker is addressed.

### Desktop 0.4.16 repair package — 2026-11-19
- Installer-only release: `D:\Business ERP\Desktop-Development\BusinessERP-Desktop\artifacts\installers-schema-repair-20261119\BusinessERP-Desktop-0.4.16-Setup.exe`; 372,415,204 bytes; SHA-256 `D9E7D8015B98398CE0660D0214AA16812A6D11D1C20222991903BDDC9E00B970`; unsigned. Embedded schema, repair SQL and sync/login source hashes match the tested bundle.
- Packaged fresh schema and automatic migrations from 0.4.13 and 0.4.15 passed. The packaged importer replayed all 87 affected pending events across 32 tables in an isolated database. Existing installed data and its retry queue were not modified; no backup was created. Install over 0.4.15 and retry cloud Business login to apply the repair.
- No new cloud API deployment was required. Android cloud/local sync implementation and patch packaging remain pending following this Desktop blocker.

## 2026-11-20 — Desktop licensed staff automatic local setup, installer 0.4.17
- Added automatic local tenant setup after licensed Business staff/manager cloud login, without requiring an owner to first provision this PC. The signed owner/tenant container supplies commercial scope and reference identity; only the actual staff password is cached. Staff-only setup does not create owner credentials or permit owner login/sync authority. Existing owner setup and tenant-profile selection remain supported.
- Mirrored signed workflow permissions into local roles; loopback requests recheck signed identity, role, credential version and permission maps. Cloud record feeds and writes enforce workflow scope, separate sales/purchasing access and cashier-owned tills. Current cloud license/account/assignment/qualification checks remain authoritative. Signed cached staff access supports offline login within its lease.
- Added per-transaction sync grouping and originating-user attribution, while retaining device event time for per-record latest-wins and full event history. Staff upload only their own journaled transactions; other users' queues are retained. Receipt, stock, settlements and balanced accounting replay together; derived stock/alert rows are rebuilt at their authoritative layer. Staff history queries are limited to their own changes; owner review remains available.
- Cloud additive migrations 125/126 and startup application, shared authorization, record-sync changes and Desktop 0.4.17 commerce metadata were pushed to the existing deploy branch: commits `8a3cbf47` and `b8639ccb563fd99b1c90872b89a5032c43cf9e59`. Live API readiness returns OK and the public catalog reports Desktop 0.4.17. No real production user credentials were used for acceptance tests.
- Installer-only deliverable: `D:/Business ERP/Desktop-Development/BusinessERP-Desktop/artifacts/installers-staff-sync-final-20261120/BusinessERP-Desktop-0.4.17-Setup.exe`; 372,454,727 bytes; SHA-256 `1687A3CBB3666132853AF2AEAD516F45C899FCA95DF8361FEA1FCFFB20318C57`. Windows ProductVersion is 0.4.17; Authenticode status remains NotSigned. Existing Desktop application ID and NSIS update behavior are preserved. No portable deliverable was produced.
- Verification: isolated deploy-source backend build passed; real staff tenant-bootstrap/checkout/sync integration, sales/purchase scope separation, manager review vs cashier isolation, prior owner enrollment, Android staff regression, journal/history and current-version Desktop purchase checks passed. Desktop protocol/guard, Team bridge, signup isolation, workspace preload and tenant-upload authority checks passed.
- Fresh packaged schema and automatic 0.4.13→0.4.17 and 0.4.16→0.4.17 migrations passed, preserving business rows and role history without creating a backup. New schema hash: `10a8353d98ec44caed78f9290b4ef2709f1ee4b0321a744a61565f58c787b56a`. Existing migration routes are carried forward and extended with additive changes.
- Windows smoke used a fresh synthetic profile and private PostgreSQL/Nest/Next on isolated test ports 55881/39121/39120. It passed real local staff login, workflow denial, owner-login denial, checkout actor/transaction stamping, scoped sync and offline cached login. The running installed business and its original ports/profile were left unchanged. The NSIS installation wizard was not run over the user's installation.
- Final installer archive integrity passed (27,384 payload files); 14 critical application/backend/schema/manifest files match the tested staging tree byte-for-byte. Payload hashes, build log and release evidence are stored beside the installer. The first in-progress installer build was stopped and superseded after the final permission-scope fix; only the final folder above is the release.

## 2026-11-20 — Automatic trial-to-permanent native activation patches
- Verified the complete approved-payment path for existing Android/Desktop trial enrollments. Pending payments remain temporary; verified one-time purchases yield perpetual signed grants on the ordinary proof-bound recheck, retaining the activation, tenant and device identity. Cloud subscription dates and staff security leases are not extended by a native purchase.
- Android 0.15.17 (44) refreshes the signed grant before connected record synchronization, schedules a startup check and retains periodic connected checks. The anonymous recheck uses the issuer keys already trusted during enrollment, so it needs no interactive user login. The binding refresh preserves password verifiers, staff workflow scope, queues, records and history. Device/tenant/activation checks and expiry-state reset are covered by the added unit test.
- Desktop 0.4.18 refreshes commercial policy on the normal sync cycle and publishes a validated grant for the running backend guard, without restarting the workspace. Locally-created trials apply the matching signed activation returned by Cloud registration directly to the same database. No automatic backup or database switch occurs. The rebuilt frontend includes Local License purchase instructions and current signed status.
- Verification: 182 Android unit/render tests, debug/release lint, signer continuity and 16 KB alignment passed. Twelve Desktop protocol/refresh/guard tests passed. Actual isolated PostgreSQL/Nest/Next staff login, checkout, scope denial, transaction sync/history, permanent refresh with the same backend PID and offline cached login passed. Fresh schema and 0.4.16/0.4.17 upgrade checks passed, preserving existing rows and role history without backups. Full frontend preflight/production build and its local-license page test passed.
- Cloud catalog patch versions and expanded payment/recheck integration checks were pushed to the existing GitHub main deploy branch (8159a8d4); live public catalog reports Android 0.15.17 and Desktop 0.4.18. No new database migration was required.
- No connected Android device was available, so phone installation/background-scheduler acceptance was not performed. Desktop tests used only isolated synthetic profiles and test ports; the installed business was not changed. Installer archive verification and artifact hashes are recorded in the release folders.

### 2026-11-20 — Final automatic-activation deliverables
- Android: `D:/Business ERP/Android-Development/BusinessERP-Native/artifacts/release-v0.15.17/Business ERP.apk`, also project-root APK; 19,847,173 bytes; SHA-256 `F34B408A7FD8DDE2BAB424733F2AB2390C7A290B56C636394DB8B0AD1D7B3A94`. Version 0.15.17/44; original application ID and production signer retained. Final build: 182 tests, both lint variants, signature and 16 KB alignment passed. No connected phone acceptance.
- Desktop: `D:/Business ERP/Desktop-Development/BusinessERP-Desktop/artifacts/installers-automatic-activation-20261120/BusinessERP-Desktop-0.4.18-Setup.exe`; 373,342,941 bytes; SHA-256 `39FCE2931301367D2A211DE03125115CD0C388D7A17638FD5B732C964C5D4678`. ProductVersion 0.4.18, Authenticode NotSigned. No portable deliverable. NSIS extraction and archive integrity passed for 27,578 payload files; 16 critical files match the tested stage byte-for-byte. Schema unchanged from 0.4.17 (`10a8353d98ec44caed78f9290b4ef2709f1ee4b0321a744a61565f58c787b56a`); earlier reviewed migration routes retained.
- Release notes, source/payload hashes and build/runtime evidence are beside the deliverables. The NSIS wizard was not run on the existing installation. No automatic backup, uninstall or real business data reset was performed.

## 2026-11-21 — Android0.15.18 / Desktop0.4.20 Cloud comparison
Android0.15.18/versionCode45 packaged at Android-Development/BusinessERP-Native/artifacts/release-v0.15.18/Business ERP.apk (19,880,309bytes; SHA2569D3F94E7190B84C5089482C7319F48E83BD40F40DBF858110863BBF0485B0D29).184 unit/render/contract tests and debug/release lint passed; signature continuity and16KB alignment passed. Native owner publication, weekly hours and per-slot prices added; fees shown in native proof list. Customer discovery/login is an explicit online browser entry; native venue profile/feed management remains incomplete. No connected device, so phone acceptance was unavailable.
Desktop0.4.20 shared frontend/backend stage includes Cloud venue/media/schedule/rates/cash/QR/fee/refund flows and migrations120–127,130–132. Production frontend build, Cloud fitness suites,16 Desktop license/permission tests, fresh schema,0.4.19upgrade preserving records/roles, and isolated PostgreSQL/Nest/Next staff/checkout/sync/offline/license runtime acceptance passed. NSIS build is still in progress. Earlier source and artifacts preserved; no Cloud deployment or installed-profile mutation.

Final Desktop0.4.20 installer completed: D:\Business ERP\Desktop-Development\BusinessERP-Desktop\artifacts\installers-cloud-parity-20261121\BusinessERP-Desktop-0.4.20-Setup.exe; 374558626 bytes; SHA256 88E0C66BA69D6311A57F1AB0EEEDFEAFAFF99EEE104A30032A315AE4D165BB48; Authenticode NotSigned. NSIS compressed payload integrity passed (27,793 files); five critical payload hashes match the tested stage. Installer wizard/upgrade over installed real data was not executed. Android0.15.18 APK is signed and verified; no phone connected.

## 2026-11-27 — Desktop0.4.26 pricing/counter/Spa release
Rechecked existing feature/retail-team-shifts D: checkout; preserved prior committed work and old installers. Native Android0.15.24 was verified and packaged first. Desktop0.4.26 includes current Cloud resources, Spa consumer routing, scheduled pricing/counter SQL and the preserving0.4.25 upgrade. Fixed D profile startup before appData lookup, slow-disk initialization/service budgets, and backend working directory for Spa/pricing startup migrations. Source-level, real PostgreSQL/Nest/Next, owner/customer Electron, shared POS modal, schema preservation and embedded installer payload checks passed. Installer is unsigned; wizard/real installed-profile upgrade not executed. Full evidence and hashes are beside installers-pricing-counters-release-20261127/BusinessERP-Desktop-0.4.26-Setup.exe. Only D: files/profiles/caches were deliberately written; no worktree/new branch. The old standalone calendar fixture remains unchanged; current signed-enrollment Water calendar coverage lives in tests/water-calendar-runtime.cjs.
