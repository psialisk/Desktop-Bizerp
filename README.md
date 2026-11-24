# Business ERP Desktop - recovered development source

Recovered Electron 0.4.2 source; branch feature/retail-operational-calendar. GitHub remote: https://github.com/psialisk/Desktop-Bizerp. See RECOVERY.md for original installer provenance.

## Calendar build
1. Build D:/GitHub/bizerp.gnj/backend (`npm run build`).
2. Build frontend with ERP_DESKTOP_BUILD=1, NEXT_PUBLIC_API_URL=/api (`npm run build`). This creates .next-desktop separately from the cloud output.
3. Run scripts/build-calendar.ps1. It copies the recovered Electron/Node/PostgreSQL runtimes and built shared code into ignored artifacts/. It does not use or overwrite an installed database. The generated schema includes Cloud migrations 128/129 for Fitness courts, Pickleball open play and reservation billing.
4. Existing stores require the explicit Back up and upgrade copies action. It writes and verifies a local recovery backup, then uploads an encrypted copy to the tenant's cloud account when the licence includes cloud backup; a missing entitlement or offline PC leaves the verified local backup in place and does not block the migration. Originals remain retained. Versions older than a manifest-supported schema must first upgrade using a supported package; no untested direct upgrade is advertised.
5. **Restore latest cloud backup** (Local settings → Business records) asks the cloud for the newest verified backup that is schema/contract compatible, downloads it through the restore ticket, verifies its SHA-256, decrypts it with this PC's tenant backup key and restores into a new local database. The current database is retained; an older-schema backup then requires Back up and upgrade.

The development package keeps purchasedVersion 0.4.2 so existing exact-version activation checks remain effective. It does not relax signature, issuer, machine, business, revision, expiry or capacity checks. Cloud/Desktop books remain separate. Pharmacy paid Desktop enrollment is still excluded from cloud commerce until its paid offering is explicitly reviewed; this source includes the local workflows for compatible development/trial testing.

The recovered installer omitted the original installer recipe, tests and Git history. The new build is a portable development folder, not a newly signed production installer. Existing issuer maps remain unchanged. Never commit private keys, credentials, bundle/, artifacts/ or local profiles.

## Build a Windows setup installer
Run `scripts/make-installer.ps1` after creating a complete portable build. It packages the whole Electron app folder (including `icudtl.dat`, locales, Chromium resources and the ERP runtime) as an assisted per-user NSIS installer. It retains the user's `%APPDATA%\Business ERP Desktop` data on uninstall. The generated installer is unsigned and requires a verified code-signing certificate before public distribution.

## Restore the runtime dependency bundle on another machine
Retain the original reviewed installer outside Git. With Python and 7-Zip installed, use `python scripts/recover-installer.py --installer <original-exe> --seven-zip <7z.exe> --output <empty-recovery-folder>`. This verifies the recorded installer SHA256, unpacks runtime dependencies and original source without launching the installer, and refuses to overwrite a populated recovery directory. Pass the recovered application directory to `scripts/build-calendar.ps1 -RecoveredApplication <path>` along with the built shared Backend/Frontend checkouts. Runtime binaries and real local profiles are never source-controlled.
