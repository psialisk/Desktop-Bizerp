# Costing release verification — 2026-11-28

Android: 0.15.25 (52), production application ID and existing signing certificate retained.
Desktop: 0.4.27, existing Desktop branch; no worktree or branch created.

## Implemented
- Signed Desktop transactions are accepted atomically by Cloud; provisional stock, fulfillment and accounting costs are finalized together. Revenue/tender values and original document IDs remain unchanged.
- Immutable original estimates and accepted differences are retained. Incomplete, changed, legacy or unsupported costing acknowledgments remain pending instead of advancing the checkpoint.
- Weighted-average and FIFO Cloud/Desktop divergent-stock roundtrips cover exact purchasing freight/discounts, supplier matching, cash collection, original-cost returns/refunds and balanced ledgers. Specific-lot selection and valuation boundaries are covered by costing engine/API and native unit tests.
- Old known cloud echoes cannot overwrite newer local edits. Checkout-bound staff receive private FIFO/specific processing layers while finance UI/API access remains restricted.
- Zero-cost stock receipts can synchronize without an invented zero-value journal.
- Reviewed upgrades preserve exact historical business values, original databases, backups and uploaded files. Only explicitly verified costing sync-registry expansion is permitted.

## Executed evidence
- 39 backend purchasing/inventory/POS/accounting/industry/sync regression suites passed; 14 focused reviewed costing/sync runs passed including weighted-average and FIFO transport.
- Frontend prebuild checks passed except handbook generation intentionally not executed (it writes unrelated documents). Costing UI rendering/interactions and production Desktop Next build passed.
- Android 300 tests, zero failures/errors; debug/release lint, signed release assembly and instrumentation APK compilation passed. Signature and 16 KB zip alignment verified.
- Desktop transport, owner-login sync, startup profile, package login, credential, update-state/snapshot and upgrade-registry tests passed.
- Actual packaged PostgreSQL/Nest/Next: signed owner/cashier setup/login, invalid cloud-token rejection, opening valuation, purchasing approval/landed receipt/supplier bill, sale/cash collection, provisional visibility, finance denial, original-cost return/refund, balanced ledger and preserved prior COGS passed.
- Actual packaged 0.4.26 → 0.4.27 retained-data upgrade passed, including historical stock cost, original store, backup and uploaded file integrity.
- Actual Electron executable launched with a private D: profile: startupError null, sandbox/context isolation true, nodeIntegration false. Screenshot retained at D:/BuildTemp/costing-electron-0427-final/profile/electron-smoke.png.

## Limits
- No connected Android phone/emulator: on-device instrumentation/installation not performed.
- Windows installer wizard and a real user's installed profile were not exercised. Installer is unsigned.
- Desktop opening valuation and later landed-cost correction batches require Cloud review; they are stopped before upload because raw ledger transport cannot reproduce their private costing records. Complete local work remains saved/pending. This is not full offline correction-command parity.
- Production Cloud deployment/acceptance has not been verified in this release run. Clients require the matching Cloud costing API; otherwise transactions stay pending safely. Two isolated databases verified the acceptance/echo protocol locally.
- Failed/superseded stages are retained and are not release deliverables. Existing repository changes and other ongoing work were preserved.

Runtime schema SHA256: 2031e36288504c55c1cc027a1f459b6f905af8b75c2d7c3f50c55995d791307e
Runtime backend entry SHA256: e3b5aace9453ca2b85352e1df85943d5b5507f41884ffda39482fe9b8d59da68

## Delivered artifacts
- APK: D:/Business ERP/Android-Development/BusinessERP-Native/artifacts/release-v0.15.25-costing-20261128/BusinessERP-Android-0.15.25.apk
- EXE: D:/Business ERP/Desktop-Development/BusinessERP-Desktop/artifacts/installers-costing-release-20261128/BusinessERP-Desktop-0.4.27-Setup.exe
- EXE SHA256: FFA161BD8C46352469E9B9551078A770F6BB838BD1CBCF023E1FEBFE903044E2
- Completed EXE embedded ZIP tested: Everything is Ok, 28,419 files. Expected NSIS trailing-data warning; no CRC errors. Extracted final transport, tenant sync, upgrade verifier and upgrade implementation exactly match source SHA256.
- Installer wizard not executed; Windows Authenticode not signed. No automatic update publication.

## Pre-push review — 2026-11-28
The customer-release script now uses the final costing base. A source-only fixture proves the shipping gate rejects missing or unreviewed costingExpansion metadata even when schema/migration hashes match. The previously generated 0.4.28 Customers artifact is rejected by this gate and was preserved, not rebuilt or published in this source-only request. Focused transport, registry, package metadata, login, startup, credential and update tests pass. No installer binary, private key, credential or build cache belongs to the Git commit.
