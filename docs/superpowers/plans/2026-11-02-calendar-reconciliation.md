# Calendar alignment and reconciliation — 2 November 2026

User instruction: match Boarding House, save dated business events, notify three days before, reconcile additions/updates at every login.

1. Extract the existing authorized source feeds; retain tenant, foundation, finance and prescription access checks. Add missing quotation/promotion/activity/payroll and transaction record dates. Historical records are calendar history; forward obligations generate reminders.
2. Migration 087 creates a rebuildable per-recipient calendar projection. Reconcile all dates, not only the displayed month; stable source/recipient reminder identity; preserve read state unless changed; resolve deleted/completed/cancelled/revoked reminders. Run after verified login, on calendar/notification reads and periodic background refresh. No client can choose a tenant for reconciliation.
3. Match the actual Boarding House visual structure: summary cards, previous/Today/next, Monday-first 42 cells, colored named event pills, selected-day agenda, responsive overflow and loading lock. Preserve task retry/version checks.
4. Carry shared changes into recovered Desktop with additive schema packaging. Align native display without merging device-local books into cloud records.
5. Verify with real PostgreSQL-compatible fixtures, frontend build/navigation, native checks and Desktop upgrade/runtime. Review the whole diff, document and push the existing authorized feature branches.

Progress: regression checks observed failing for missing migration/projection and 30 versus 42-day grid; initial reminder lifecycle checks passed before adding missing quotation/promotion coverage. Implementation ongoing.

Ruling: technical created_at/updated_at fields are not future operational deadlines. Sales/purchase record dates appear as history; scheduled business dates generate actionable reminders. Undated work stays unscheduled. Existing Boarding House source actions and payment logic are preserved.

Deployment: 085/086 were already applied separately. New 087 is additive and must precede deploying this backend. Production application deployment is separate from code changes.

## Completion evidence
All implementation tasks complete. Backend calendar/reminder/source/login tests, legacy notification/Pharmacy/Retail/POS regressions, cloud and Desktop frontend builds, actual UI render and198 HTTP destinations pass. Android44 unit tests, debug/instrumentation assembly and lint pass; no device attached. Desktop original-schema preservation plus all three priority runtime packages pass; additional actual inbox/repeat-login assertion passes. Fresh review reports no Critical/Important findings remaining after the documented fixes. See docs/OPERATIONAL-CALENDAR-RECONCILIATION-RELEASE.json. Migration087 prepared but not applied to production; no production app deployment/main merge.
