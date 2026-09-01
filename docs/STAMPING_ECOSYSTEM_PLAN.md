# Stamping Ecosystem — Full Production Plan

## Context Audit (What Already Exists)

The stamping core is substantially built and battle-tested. This plan covers closing the remaining gaps, guided UX flows, side effects, and production hardening — **not** a rewrite.

**Already implemented & tested (do not rebuild):**
- `StampService.AwardStampAsync` (PunchedApi/Application/Services/StampService.cs): QR token hash validation, business-scope check, atomic token claim (`ExecuteUpdateAsync`), `FOR UPDATE` row lock on loyalty_cards, counter increments, reward-ready detection.
- `QrService`: 45s rotating single-use SHA256-hashed tokens, enrollment verification.
- `RedemptionService.ClaimRewardAsync`: atomic conditional claim (double-tap safe).
- SSE (`SseController` + `ISseService`): live stamp events to customer.
- `StampController` with `[RequireModule("stamps")]`, rate limiting, error-code→HTTP mapping.
- Frontend: `QRScanner`, `StampSuccessOverlay`, business & staff scan pages, customer cards, programs CRUD, staff invitations, analytics dashboards, referrals, module entitlement gates.
- Tests: EntitySchemaTests, NotificationAndStampSchemaTests, PermissionEnforcementTests, ModuleEnforcementIntegrationTests, etc.

**Identified gaps this plan closes:**
1. Dead-end flow: staff scan of a not-enrolled customer fails with `NOT_ENROLLED` — no in-flow resolution.
2. No stamp correction (void/undo) — staff mistakes are permanent.
3. Redemption fulfillment is customer-claimed only — no staff-verified in-store redemption.
4. No manual fallback for customers without a working phone (phone-number lookup).
5. No offline queue for scanner pages (dead network = dead POS).
6. Guided flows are implicit — user must discover the scan page, program creation, staff invites.
7. Side effects incomplete (see §6).

---

## Phase 1 — Database & Domain Extensions

**New entities** (Domain/Entities, follow BaseEntity + snake_case migration conventions):
- `StampAdjustment`: Id, CardId, AdjustedByUserId, AdjustedByRole, Delta (-N or +N), Reason (enum: VoidMistake, ManualCorrection, Goodwill, SystemFix), Note (max 500), RelatedStampId (nullable), CreatedAt. FK → loyalty_cards (RESTRICT), users (SET NULL). Index (card_id, created_at).
- `RedemptionStatus` enum on `Redemption`: `Pending` → `Fulfilled` | `Cancelled`. Add columns: `FulfilledByUserId`, `FulfilledAt`, `FulfilmentCode` (short 6-char code shown on customer phone, hashed at rest like QR tokens).
- `IdempotencyKey`: Id, Key (unique, indexed), UserId, RequestHash, ResponseJson (jsonb), CreatedAt, ExpiresAt. Used by `/stamps/award` and `/redemptions/claim` for client-retry safety (belt-and-suspenders on top of the token claim).

**Program extensions** (nullable, backwards compatible):
- `StampExpiryDays` (int?, null = never); expire whole card progress via `LastStampAt + StampExpiryDays`.
- `MaxStampsPerVisit` (int, default 1) for multi-stamp purchases.

**Migrations**: single EF migration `StampingEcosystemExtensions`; backfill existing redemptions to `Fulfilled`; update `applied_check.sql` verification script; extend `EntitySchemaTests` + `NotificationAndStampSchemaTests` to assert new columns, FKs, CHECK constraints (delta != 0, max_stamps_per_visit > 0).


---

## Phase 2 — APIs (PunchedApi)

All endpoints follow existing conventions: `ApiResponse<T>`, error codes, `[Authorize(Roles=...)]`, `[RequireModule]`, rate limiting, DTOs + FluentValidation in Application/Validators.

| Endpoint | Method | Role | Purpose |
|---|---|---|---|
| `/v1/stamps/award` | POST | Business,Staff | **Extend**: optional `Idempotency-Key` header; optional `StampCount` (1..MaxStampsPerVisit) |
| `/v1/stamps/resolve` | POST | Business,Staff | Body: `{ token }`. Pre-scan resolution: customer name, card status, stamps remaining — scanner UI *guides* before committing ("Maya is 2 stamps from a reward") |
| `/v1/stamps/adjust` | POST | Business | Body: `{ cardId, delta, reason, note }`. Creates StampAdjustment, SSE notify customer, card row lock. Business-only (permission `stamps.adjust`) |
| `/v1/stamps/lookup` | POST | Business,Staff | Body: `{ phone }`. Manual fallback when QR unavailable; award proceeds via a server-issued one-time manual token (rate-limited 5/hr/staff, ApiEventLog audit) |
| `/v1/cards/enroll-and-stamp` | POST | Business,Staff | Body: `{ token, stamps }`. Fixes the `NOT_ENROLLED` dead end: enrolls customer into program + awards first stamp in one transaction; scanned QR = consent proof |
| `/v1/redemptions/fulfill` | POST | Business,Staff | Body: `{ cardId, fulfilmentCode }`. Staff-verified in-store redemption; marks Fulfilled, SSE + notification to customer |
| `/v1/redemptions/{id}/cancel` | POST | Business | Cancels a Pending redemption, restores stamps atomically |

**Service layer side effects (per award):** SSE `stamp.awarded` → customer; reward-ready → SSE `reward.ready` + notification + email (extend NotificationsService/EmailService with a reward-ready template); AnalyticsAggregationService bump (staff_daily + business_daily); ApiEventLog for manual lookups & adjustments.

---

## Phase 3 — Frontend (punched-pwd)

New/changed pages under `app/dashboard/...` following existing style (lucide-react, CSS vars, toasts, `useRoleGuard`):

**Business dashboard**
- `business/scan` → **guided scan console**: call `/stamps/resolve` first; show customer name + progress ring + "2 stamps from a free coffee" pre-award card with a single confirm button. On `NOT_ENROLLED` show inline "Enroll & give first stamp" CTA → `enroll-and-stamp`; on `TOKEN_EXPIRED` show "Ask customer to refresh QR" with countdown; add manual phone-lookup tab; offline banner with queued awards (localStorage queue, replayed with idempotency keys on reconnect).
- `business/stamping` (new): live ops board — today's stamps, live SSE activity feed, staff leaderboard (existing analytics endpoints), pending redemptions queue with "Verify code" action.
- `business/rewards`: redemptions list + fulfill/cancel actions.
- Stamp correction UI on customer detail (`business/customers/[id]`): reason picker + confirmation.


---

## Phase 4 — Side Effects & Reliability

- **Idempotency middleware** on award/claim: header key → IdempotencyKey table; replay returns stored response; keys expire in 24h (CleanupService extension).
- **Offline queue replay**: frontend queues failed awards with `Idempotency-Key`; server dedupe makes replay safe.
- **Notifications**: reward-ready (SSE + in-app + email), redemption fulfilled, stamp adjustment ("Your card was corrected by {business}"), win-back nudge at 30 days inactivity (SegmentationService scores exist; add cron in AnalyticsWorker backed by NotificationLog).
- **Rate limits**: named policies — `manual-lookup` (5/hr/user), tightened `award`, `enroll-and-stamp` (20/hr/user).
- **Audit**: every adjust/lookup/enroll-and-stamp writes ApiEventLog with actor, target card, before/after counters.
- **Concurrency**: reuse FOR UPDATE pattern; `enroll-and-stamp` relies on the unique (customer_id, business_id) index then stamps within the same transaction.
- **Expiry worker**: extend CleanupService to expire cards past `StampExpiryDays` and notify customers.

---

## Phase 5 — Testing (production gate)

- **Unit (xUnit, PunchedApi.Tests)**: StampAdjustment validation, expiry logic, fulfilmentCode verify (correct/expired/wrong-business), idempotency replay, enroll-and-stamp idempotent enrollment.
- **Integration**: full journeys — enroll → generate QR → resolve → award (×N) → reward ready → staff fulfill; concurrent award + claim race (extend existing race tests); adjustment after partial progress; cross-business token rejection (regression).
- **Frontend (vitest, per `punched-pwd/lib/api/__tests__` convention)**: scan console state machine (resolve→confirm→success/error branches, offline queue replay).
- **E2E (Playwright, new `e2e/` at repo root)**: 3 golden paths — (1) customer sees stamp live via two browsers + SSE assertion; (2) staff scans not-enrolled customer and completes enroll-and-stamp; (3) business adjusts a stamp, customer receives notification.
- **Load (k6)**: `/stamps/award` — p95 < 300ms; zero duplicate stamps under 50 concurrent same-token requests.
- **Run gates**: `dotnet test`, `npm test`, `npm run build`, `docker compose up` smoke (health checks + seeded E2E tenant).

---

## Phase 6 — Sequencing & Risks

1. Phase 1 (DB) → 2. Phase 2 APIs + unit tests → 3. Phase 3 frontend (scan console first, then guided onboarding) → 4. Phase 4 side effects → 5. Phase 5 E2E + load + smoke. Phases 2 and 3 (scan console) can overlap contract-first via the `/stamps/resolve` DTO.

**Estimate**: ~3–4 weeks for one developer.

**Top risks & mitigations:**
- Redemption status migration — backfill existing redemptions to `Fulfilled`; run in the same migration, verify with EntitySchemaTests.
- Offline queue correctness — idempotency keys make replay safe by construction; E2E covers reconnect.
- SSE reliability at scale — in-memory SSE is single-instance only; document the horizontal-scale escape hatch (Redis pub/sub backplane) as a follow-up, not a blocker for single-tenant production.

**Staff dashboard**
- Mirror guided scan console on `staff/scan` (resolve → confirm → success, enroll-and-stamp CTA, manual lookup, no adjustment rights).
- `staff/activity`: personal stamping history incl. visible adjustments.

**Customer app**
- Card detail (`dashboard/cards/[cardId]`): show the 6-char fulfilment code prominently when reward ready — "Show this code at the counter" + countdown. Claim flow now creates Pending redemption → staff fulfills.
- Post-stamp celebration: after SSE `stamp.awarded`, deep-link card state ("2 more stamps!").

**Guided onboarding (the "should not make the user think" requirement)**
- Business: post-registration wizard (existing onboarding hooks): 1) Create program (pre-filled defaults, "Start with 10 stamps = free item" suggestion) → 2) "Meet your first customer" + printable QR poster (`/dashboard/business/poster`, new) → 3) Invite staff → 4) "Go to Scan". Progress persisted, resumes where left off.
- Staff: invitation accept → "Try a scan" demo → scan page.
- Customer: after first enrollment → card detail with "Show this QR at the counter to collect stamps" coach mark.

- `StampAdjustment`: Id, CardId, AdjustedByUserId, AdjustedByRole, Delta (-N or +N), Reason (enum: VoidMistake, ManualCorrection, Goodwill, SystemFix), Note (max 500), RelatedStampId (nullable), CreatedAt. FK → loyalty_cards (RESTRICT), users (SET NULL). Index (card_id, created_at).
- `RedemptionStatus` enum on `Redemption`: `Pending` → `Fulfilled` | `Cancelled`. Add columns: `FulfilledByUserId`, `FulfilledAt`, `FulfilmentCode` (short 6-char code shown on customer phone, hashed at rest like QR tokens).
- `IdempotencyKey`: Id, Key (unique, indexed), UserId, RequestHash, ResponseJson (jsonb), CreatedAt, ExpiresAt. Used by `/stamps/award` and `/redemptions/claim` for client-retry safety (belt-and-suspenders on top of the token claim).

**Program extensions** (nullable, backwards compatible):
- `StampExpiryDays` (int?, null = never); expire whole card progress via `LastStampAt + StampExpiryDays`.
- `MaxStampsPerVisit` (int, default 1) for multi-stamp purchases.

**Migrations**: single EF migration `StampingEcosystemExtensions`; update `applied_check.sql` verification script; extend `EntitySchemaTests` + `NotificationAndStampSchemaTests` to assert new columns, FKs, CHECK constraints (delta != 0, max_stamps_per_visit > 0).
