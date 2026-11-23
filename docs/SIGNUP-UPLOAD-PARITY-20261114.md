# Signup and upload authority — verified 2026-11-14

Android 0.15.1 (28), production application ID `com.gnj.bizerp.android`: native Cloud Package -> Account flow, Taglish fields, industry search/filter, responsive package summary, trial/monthly/annual choices, inline credentials and automatically requested Android/Desktop enrollment keys. Combined credentials text export uses Android's document picker. Key retries reuse the existing owner account; partial key failures remain visible. Optional payment uses the original GCash/Maya/BPI QR files, server quote amounts, receipt upload and a stable request key; platform billing review remains authoritative. Installer download requires terms agreement. Signup uses an isolated Cloud session and never changes a local business's upload authority.

Desktop 0.4.3: Register business in the cloud opens the canonical HTTPS signup in an isolated Electron session, with no local preload, IPC or filesystem bridge. This uses the actual Cloud UI and its automatic keys, inline credentials, text download and payment-review flow. Existing offline local creation/activation is retained separately.

Android device-local product photos stay encrypted locally. Camera/gallery selection accepts source images up to 20 MB. Server sessions upload normalized JPEGs to their current authenticated API only; device-local LocalErpApi never calls the server photo uploader. Token and server are checked before accepting completion. Desktop local photo data goes to the local backend/database; local document/profile files use tenant folders under the local profile. Cloud sessions use their Cloud server.

Verification:
- Android: 155 tests, zero failures/errors/skips; debug/release lint; debug/release APK assembly and instrumentation APK assembly passed. Portrait and landscape signup renders were reviewed. APK v2 signature and 16 KB alignment verified; production ID/version and 33-entry bundled catalog including Pure HRIS checked inside the APK.
- Desktop: shared frontend production build and backend build passed. 14 unit/contract checks passed. Packaged PostgreSQL/Nest/Next ran in a temporary profile using a synthetic signed enrollment grant: local owner/staff login, cloud-token rejection, Team authorization and product-photo write/read passed. No real enrollment key was consumed or installed business profile altered. Packaged signup source bytes matched the updated source. NSIS installer generated successfully.
- Original payment QR assets matched the Cloud files byte-for-byte.

Limits: no phone was connected for installation/camera acceptance, and the Windows installer has no trusted Authenticode signature. Android build is production signed. New signup/payment code was covered through native tests and the previously verified live Cloud endpoints; no new real payment was made. This work does not expand offline industry transaction coverage or introduce photo sync.

Artifacts:

- `D:\Business ERP\Android-Development\BusinessERP-Native\artifacts\release-v0.15.1\Business ERP.apk`
  - 19716097 bytes; SHA256 `4b1c965ce4946dc7a95930b6168fc890821108eb065095ae50c25d51af7a6167`

- `D:\Business ERP\Desktop-Development\BusinessERP-Desktop\artifacts\installers-cloud-signup-20261114\BusinessERP-Desktop-0.4.3-Setup.exe`
  - 259177535 bytes; SHA256 `fe9e190a66fabe4f62f2f56102f0f1bd6a157b139a3f3a43402efe748d3f557e`

## Package refresh — 2026-11-14
Desktop 0.4.4 installer rebuilt after backend and desktop frontend builds passed. NSIS artifact: `artifacts/installers-subscription-extension-20261114/BusinessERP-Desktop-0.4.4-Setup.exe`, 259,181,364 bytes, SHA-256 `788D065A0E2FE873E7B736A0EF9436C414F6B0E94A2ADA33300EDA7011BF06B6`. Authenticode is `NotSigned`; installer runtime acceptance was not performed. This refresh does not change the signup/upload behavior recorded above.
