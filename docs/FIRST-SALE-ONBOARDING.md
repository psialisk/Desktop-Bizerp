# First-sale product and stock onboarding

2 November 2026. User requested always-visible industry photos, then mandatory Create product, mandatory Restock, a Ready for Checkout modal and redirect to POS, with a floating reminder for unfinished business setup. Water examples must use gallon and New Stock.

## Delivered web flow
- Eligible Business users with Retail inventory and Retail POS plus Operations/checkout edit access enter first-use guidance before the dashboard workspace opens. Other industries, read-only users, cloud reporting-only Desktop-primary access and standalone POS logins gain no additional rights.
- The first modal is Create product, with no Close/Cancel/Escape dismissal. It shows the suggested-photo panel permanently, with all ten industry examples by default; typing a product name no longer hides unrelated suggestions. Manual suggestion search remains available. Examples for Water use a gallon SKU/name/unit and a contextual selling-price placeholder. Saving a photo remains part of the product-save workflow, never an unsolicited upload.
- The second mandatory modal is Restock. Quantity must be positive, with New Stock as the default editable reason and placeholder. Water asks for number of gallons. It uses the existing stock/adjustment APIs, actual selected/default stock location, lot/serial and expiry where required, and entered actual cost when valuation requires it. Selling price is never used as receipt cost. Tracked/valued adjustments still require Finance authorization.
- Pharmacy medicine setup uses existing lot-tracking and medicine-classification endpoints before stock. Non-medicine merchandise is distinct. Missing interrupted medicine classification resumes in Create product. Existing saved classification cannot be silently changed by a retry. Opening lot expiry must be a valid date today or later. No pharmacist, prescription or controlled-drug restrictions are relaxed.
- Only successful persisted receipt evidence enables You are now ready for Checkout. Its Go to POS action runs once and routes to /dashboard/retail-pos. Existing own cash-session opening and checkout safety checks still apply; no cash session/payment is automatically created.
- A floating Finish business setup reminder appears after a product is recorded while selected checklist steps remain unfinished. It remains reachable across dashboard workspaces, expands to the permitted setup links, indicates steps requiring an authorized editor, and disappears once setup is complete. This does not force fake purchases, contacts, activities or custody entries.
- Sign out stays available inside mandatory forms. Profile, licence/subscription and Help routes remain available for account maintenance. Completion is based on server records, not a browser-only completion flag.

## Persistence and recovery
GET /retail/first-sale is a read-only, tenant-scoped evidence endpoint. It validates the Business portal, compatible foundation and Operations/checkout permissions. It selects an existing active first product where available and checks historical positive stock receipts. Refresh resumes saved work; a business that has already received stock never re-enters first-use guidance merely because it sells out.

Product creation reuses an exact matching saved SKU after an interrupted response. In-flight writes have a synchronous lock. Photo errors retain the saved product in the same step for retry. Stock retries preserve their request key when details are unchanged; a pre-write source check prevents an extra opening receipt after an ambiguous success. Failed/unverified stock stays on Restock. Changed business sessions cannot continue old product/photo/stock commands. Locations can be retried after transient loading failure.

## Verification
- Backend build and PostgreSQL-compatible first-sale tests pass: product → stock → complete, existing product resume, sold-out history remains complete, tenant/portal/foundation/permission separation and interrupted Pharmacy classification.
- Frontend helper tests pass for Water examples, matching-product recovery, positive receipt validation, receipt key, account changes, persisted verification, classification consistency and expired-lot rejection.
- Actual rendered dialog checks pass: mandatory product/stock/ready titles, no dismiss controls, gallon/New Stock examples and visible photos. A regression invokes the actual DepartmentContent mutation guard against the rendered wizard submit metadata, confirming General-view users with proper Operations/Finance rights do not get trapped behind a disabled Save button.
- Actual wizard handler tests pass: double-submit creates once, photo retry reuses the product, receipt failure does not advance, receipt retry keeps its key and POS continuation runs once.
- Existing photo session/save safety, foundation/navigation, POS cash-session behavior, Pharmacy, Retail store and checkout regressions pass. Frontend production build/preflights pass.198 local HTTP destinations pass, including POS. HTTP route checks are page-shell checks; no live customer transaction or physical device test was performed.
- Fresh review found one Important route-permission interaction and a locations recovery issue; both fixed, the permission regression was observed failing before the fix. Final re-review found no remaining Critical/Important findings.

## Rollout and scope
This change adds no database migration. Deploy the updated backend (including GET /retail/first-sale) before the updated frontend. Existing prerequisites/migrations for enabled modules still apply; this does not supersede the earlier calendar087 rollout requirement. No production deployment or SQL execution was performed.

Implementation is Business web and shared frontend/backend source. Desktop can inherit it when rebuilt with the shared sources; its packaged portable artifact was not rebuilt in this task. Native Android code/APK and installed local records were not changed. The request used the website product modal, so this release does not claim native onboarding parity.

Feature branch: feature/retail-operational-calendar. Conversation and verification saved in all four repositories under the standing Markdown-record instruction.
