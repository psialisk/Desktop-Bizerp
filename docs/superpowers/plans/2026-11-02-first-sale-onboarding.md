# First-sale onboarding — 2 November 2026

User specified mandatory Create product → Restock → Ready for checkout → POS; always-visible industry photos and floating remaining-setup reminders. Use existing Next/Nest/SQL APIs and RetailDialog required behavior. No new schema or authorization grants. Scope Business web/shared Desktop frontend source; native APK not changed by this web request.

1. Add read-only authenticated first-sale evidence endpoint: tenant/foundation/Operations+checkout checks, active product and any historical positive receipt; completed users stay complete after selling out. Do not use localStorage as completion authority.
2. Keep photos permanently visible; industry defaults/examples using existing library. Implement mandatory first-sale gate under the dashboard shell, individual retry-safe product/photo and stock stages, immutable account scope, persisted readback before Ready. Include location, tracked lot and actual cost as applicable; preserve Pharmacy checks and do not assume selling price is cost. Never auto-submit stock or cash session.
3. Remaining business setup floats after product creation; all statuses from existing foundation checklist. Respect permissions/read-only and unrelated industries; no mandatory creation of fake business activity/purchases.
4. Tests: observed RED→GREEN source evidence, exact stages, duplicate-click/retry, photo errors, stock failure, scoped state, permission and unrelated-business behavior; build/nav198 HTTP; fresh review; MD records and feature-branch push.

Design decisions: only users allowed to create inventory and use checkout enter this flow. Existing read-only/cashier accounts get no new privileges. Mandatory forms have no dismiss/cancel; sign-out remains possible. First-sale does not mean all business setup or professional compliance is complete. Readiness means saved product and opening receipt; cash-session and checkout safety gates remain.

## Completion evidence
All four tasks complete. Backend/source-evidence, frontend helper/render/actual-handler tests, existing photo/stock/Pharmacy/POS checks, frontend production build and198 HTTP routes passed. Important permission-guard review finding reproduced RED→GREEN; final review clear. No production deployment or SQL; see docs/FIRST-SALE-ONBOARDING.md for scope and deployment order.
