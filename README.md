# Business ERP Desktop - recovered development source

Recovered Electron 0.4.2 source; branch feature/retail-operational-calendar. No GitHub remote yet. See RECOVERY.md for original installer provenance.

## Calendar build
1. Build D:/GitHub/bizerp.gnj/backend (`npm run build`).
2. Build frontend with ERP_DESKTOP_BUILD=1, NEXT_PUBLIC_API_URL=/api (`npm run build`). This creates .next-desktop separately from the cloud output.
3. Run scripts/build-calendar.ps1. It copies the recovered Electron/Node/PostgreSQL runtimes and built shared code into ignored artifacts/. It does not use or overwrite an installed database.
4. Existing 0.4.2 stores require the explicit Back up and upgrade copies action. Originals remain retained. Versions older than the exact recovered schema must first upgrade using the original supported package; no untested direct upgrade is advertised.

The development package keeps purchasedVersion 0.4.2 so existing exact-version activation checks remain effective. It does not relax signature, issuer, machine, business, revision, expiry or capacity checks. Cloud/Desktop books remain separate. Pharmacy paid Desktop enrollment is still excluded from cloud commerce until its paid offering is explicitly reviewed; this source includes the local workflows for compatible development/trial testing.

The recovered installer omitted the original installer recipe, tests and Git history. The new build is a portable development folder, not a newly signed production installer. Existing issuer maps remain unchanged. Never commit private keys, credentials, bundle/, artifacts/ or local profiles.
