# Retail Team and dated shifts — development

Cloud-bound Desktop keeps account assignment, role presets, credentials and pharmacist verification under cloud control. Cached signed employee identities are mirrored into employees/team_employee_links without wage or payroll links. Staff still enroll online before their first local login. Device-local dated shifts stay on this PC; they are not synchronized to cloud or Android.

The Retail Team calendar uses morning 08:00–16:00 (yellow), midshift 12:00–20:00 (orange) and night 20:00–04:00 next day (pink). Hours remain editable and batches cover 1–7 days. Shared Nest authorization checks tenant, Operations permission, linked employee read scope, overlap, idempotency and cancellation version. Cloud-bound identity/role mutations remain blocked locally; dated operational shifts reach the shared authorized API.

The isolated local workspace preload exposes cloudManagedStaff and openCloudTeam(). The latter has no URL argument and opens only https://www.bizerpsme.shop/dashboard/team after an active owner local main-frame IPC check. No generic external URL opener is exposed. Legacy profiles report false for cloudManagedStaff; network workspaces receive no local preload.

## Verification ledger

2026-11-04: 11 Node tests passed for signed scope, cloud identity guards, fixed Team opener and preload marker. Full-schema PGlite provisioning passed. Fresh/042/086/087 schema tests passed, including rerunnable additive migration, retained original fingerprints, historical attendance/shift/product values, existing wages, tenant boundaries and new wage-independent shifts.

Packaged runtime verification and artifact checksums are pending the final shared backend and Desktop frontend production builds. No production SQL, profile update, installation or deployment is performed by source tests.

## Schema and packaging

Fresh schema includes additive cloud starter/activation and Team migrations 088–091. Portable build supports preserved recovered042, calendar086 and reconciliation087 schema hashes through verified clone/backup upgrades. Existing originals are retained. The builder does not overwrite an existing output folder and excludes private environment/key files.

The expected new development folder is artifacts/BusinessERP-Desktop-0.4.2-Team-Shifts. Run the EXE with its entire portable folder. It is unsigned development output, not a production installer or signing assertion. Keep existing customer profiles and installers.

## Final packaged verification - 2026-11-04
Final cloud and Desktop frontend builds passed; backend bundle includes legacy effective-foundation shift reminder fix. Packaged synthetic PostgreSQL/Nest/Next setup, owner/staff login, Team batch/retry/cancel and authorization smoke passed. PostgreSQL042/086/087 clone upgrades passed with original databases, exact values, uploads and backup dumps retained. Synthetic upload fixture uses valid tenant/file UUID paths; backup safety validation is unchanged. Final11Node identity/bridge tests passed. No production profile was touched.
Portable folder: D:\Business ERP\Desktop-Development\BusinessERP-Desktop\artifacts\BusinessERP-Desktop-0.4.2-Team-Shifts
EXE SHA256: 92FB72E30296129CDA2EC93E8061B761F5E3A02E420C3751CEA046340371A1CC
Bundled calendar source SHA256: 2BFB9812553F1CB4FBCE2ADAFAC59EC102F4DE2A60F95BD10FBE3246B2AF4B0D
Use the entire portable folder; launcher hash alone does not identify shared runtime changes. Unsigned development output; physical/hardware/live-cloud acceptance remains pending.
