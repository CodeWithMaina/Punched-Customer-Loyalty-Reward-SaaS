# Implementation Prompt — Punched Stamping Ecosystem (Phases 1–3)

Copy everything below the line into your coding agent. It is self-contained: it includes context, conventions, exact deliverables, and acceptance criteria.

---

## ROLE

You are a senior full-stack engineer working on **Punched**, a .NET 8 + Next.js 14 loyalty rewards SaaS in this repo. The stamping core already exists (QR token generation/validation, atomic stamp awarding with row locks, atomic reward claiming, SSE live updates, module entitlements, analytics). Your job is to implement **Phases 1, 2, and 3** of `docs/STAMPING_ECOSYSTEM_PLAN.md` **to completion** — no placeholders, no TODOs, everything compiles and tests pass.

## REPO LAYOUT & CONVENTIONS (read before coding)

- **Backend**: `PunchedApi/` — Clean Architecture:
  - `Domain/Entities/` — entities inherit `BaseEntity`; enums in their own files (e.g. `StampSource.cs`, `UserRole.cs`)
  - `Domain/Interfaces/` — repo/service interfaces; repos via `IUnitOfWork`
  - `Application/Services/` — business logic; all public methods return `ApiResponse<T>` (`Application/DTOs/ApiResponse.cs`)
  - `Application/DTOs/` — request/response records; validation in `Application/Validators/` (FluentValidation)
  - `API/Controllers/` — `[ApiController]`, route prefix `v1/...`, `[Authorize(Roles = "...")]`, `[RequireModule("stamps")]` (from `API/Filters/`), `[EnableRateLimiting("general")]`, error-code → HTTP status switch (see `StampController.cs` for the exact pattern)
  - `Infrastructure/Data/ApplicationDbContext.cs` — snake_case table/column mapping, CHECK constraints, indexes declared in `OnModelCreating`
  - `Migrations/` — EF Core migrations; also update the schema-verification SQL `applied_check.sql`
  - DI registration in `Application/Modules/` (service module) — register every new service interface there
- **Concurrency pattern (MUST reuse)**: atomic conditional `ExecuteUpdateAsync` + `SELECT ... FOR UPDATE` on `loyalty_cards` inside a transaction — copy the pattern from `StampService.AwardStampAsync`.
- **Token hashing pattern**: SHA256 → lowercase hex (`HashToken` in `QrService.cs`) — reuse for fulfilment codes and manual tokens.
- **Frontend**: `punched-pwd/` — Next.js 14 App Router:
  - Pages in `app/dashboard/...`; guards via `useRoleGuard("Business" | "Staff" | "Customer")`; module gating via `<RequireModule module="stamps">`
  - API clients in `lib/api/*.ts` (axios wrapper `lib/api/client.ts`); types in `types/index.ts`; zod schemas in `lib/validations/`
  - UI: Tailwind + CSS variables (`var(--surface)`, `var(--text-primary)`, `text-brand`), lucide-react icons, `sonner`-style `toast` (`toast.success/error`), existing components in `components/loyalty/` (`QRScanner`, `StampSuccessOverlay`) and `components/ui/`
  - SSE: customer-side live updates already subscribe via EventSource — follow existing hook usage on `app/dashboard/cards/[cardId]/page.tsx`
- **Tests**: `PunchedApi.Tests/` (xUnit; see `TestHelpers.cs`, `BookingTestBase.cs` for fixtures). Frontend tests under `punched-pwd/lib/api/__tests__/` (vitest).

## OPERATING RULES

1. Explore before writing: read `StampService.cs`, `StampController.cs`, `QrService.cs`, `RedemptionService.cs`, `ApplicationDbContext.cs`, `LoyaltyCard.cs`, `Redemption.cs`, `LoyaltyProgram.cs`, the business/staff scan pages, and `PermissionService` permission keys before creating anything.
2. Follow existing naming/error-code style exactly (UPPER_SNAKE error codes like `NOT_ENROLLED`, `FORBIDDEN_SCOPE`).
3. Add the new permission keys (`stamps.adjust`, `redemptions.fulfill`) wherever permissions are declared (find the permission matrix used by `PermissionService` and the role seeding in `Infrastructure/SeedData/`).
4. Every backend feature ships with tests in the same change. Run `dotnet test` and `npm test` / `npm run build` at the end and fix all failures.
5. Do not modify Phases 4–6 scope (no win-back cron, no Playwright, no k6) beyond what's explicitly listed below.


## PHASE 1 — DATABASE & DOMAIN

**New entities** in `Domain/Entities/`:

1. `StampAdjustment` — Id (Guid), CardId (FK loyalty_cards, RESTRICT), AdjustedByUserId (FK users, SET NULL), AdjustedByRole (string), Delta (int, not zero — CHECK `chk_stamp_adjustment_delta_nonzero`), Reason (enum `StampAdjustmentReason { VoidMistake, ManualCorrection, Goodwill, SystemFix }`), Note (varchar 500, optional), RelatedStampId (nullable Guid), CreatedAt. Index `(card_id, created_at)`.
2. Extend `Redemption` with `Status` (new enum `RedemptionStatus { Pending = 0, Fulfilled = 1, Cancelled = 2 }`, default Pending), `FulfilledByUserId` (nullable FK users SET NULL), `FulfilledAt` (nullable timestamptz), `FulfilmentCodeHash` (varchar 255, nullable).
3. New entity `IdempotencyKey` — Id, Key (varchar 200, UNIQUE index), UserId (FK users CASCADE), RequestHash (varchar 255), ResponseJson (jsonb), CreatedAt, ExpiresAt (timestamptz). Index on `ExpiresAt` for cleanup.
4. Extend `LoyaltyProgram` with `StampExpiryDays` (int?, nullable) and `MaxStampsPerVisit` (int, default 1, CHECK `chk_program_max_stamps_per_visit_positive`).

**Migration**: one EF migration named `StampingEcosystemExtensions`. Backfill: `UPDATE redemptions SET status = 1 WHERE status IS NULL` (or default). Update `applied_check.sql` to include all new tables/columns/constraints/indexes.

**DTOs** (`Application/DTOs/`): `StampAdjustmentRequest` (cardId, delta, reason, note), `StampAdjustmentResponse`, `ResolveQrResponse` (customer first/last name, cardId, totalStamps, stampsRequired, stampsRemaining, rewardReady, programName, rewardValue), `ManualLookupRequest` (phone), `ManualLookupResponse` (customerId, masked name, cardId, card status), `EnrollAndStampRequest` (token, stamps), `FulfillRedemptionRequest` (cardId, code), `FulfillRedemptionResponse`, `CancelRedemptionRequest` (note). Extend `AwardStampRequest` with optional `StampCount` (int, 1..MaxStampsPerVisit, default 1). Add FluentValidation validators for every new request.

**Acceptance (Phase 1)**: migration present; `dotnet test` green including updated `EntitySchemaTests` asserting every new column, FK, CHECK, index; `NotificationAndStampSchemaTests` extended for `StampAdjustment` + redemption status.

## PHASE 2 — APIs

**Extend `StampService` + `StampController`:**

1. `POST /v1/stamps/award` — accept optional `StampCount` (validate ≤ program.MaxStampsPerVisit; error `STAMP_LIMIT_EXCEEDED` → 400) and optional `Idempotency-Key` header. Award N stamps in the same locked transaction (counter += N; rewardReady when total ≥ required). With idempotency key: if a completed entry exists, return the stored response (200, not re-executed); otherwise execute, store response JSON with 24h expiry.
2. `POST /v1/stamps/resolve` — same auth/permissions as award. Validates QR token (used/expired/wrong-business → same error codes as award, but NOT consumed). Returns `ResolveQrResponse` so the scanner can preview before committing. Never mutates state.
3. `POST /v1/stamps/adjust` — Business role only + `stamps.adjust` permission. Validates card belongs to actor's business, delta ≠ 0, resulting `TotalStamps` never negative (error `ADJUSTMENT_BELOW_ZERO` → 400). Inside a card row-lock transaction: apply delta to TotalStamps (LifetimeStamps untouched), insert `StampAdjustment`, SSE `stamp.adjusted` to the customer, notification "Your card was corrected by {business}", ApiEventLog entry with before/after counters.
4. `POST /v1/stamps/lookup` — Business + Staff + `stamps.award`. Rate-limit policy `manual-lookup` (5/hr/user — register the named policy where `general` is configured). Looks up user by phone among the business's loyalty cards; returns masked response. On success, issues a one-time manual token (same generation/hashing as `QrService`, 120s lifespan, stored in `qr_tokens` reusing/extending `StampSource`) so the subsequent `/stamps/award` call is unchanged and auditable.
5. `POST /v1/cards/enroll-and-stamp` — Business + Staff + `stamps.award`. Body: `{ token, stamps }`. Transaction: validate QR token exactly like award (scoped to actor's business); if no loyalty card exists for (token.CustomerId, businessId), create one for the business's active program; then award `stamps` stamps using the same lock pattern. If already enrolled, behave exactly like award (idempotent enrollment via the existing unique (customer_id, business_id) constraint). SSE `stamp.awarded` fires either way.
6. **Idempotency infra**: `IIdempotencyService` + implementation — `TryGetAsync(key, userId)` / `StoreAsync(key, userId, requestHash, responseJson)`. Wire into award and enroll-and-stamp. RequestHash = SHA256 of serialized body; same key with different body → error `IDEMPOTENCY_CONFLICT` → 409. Register service in `Application/Modules/`.


**Extend `RedemptionService` + `RedemptionController`:**

7. `POST /v1/redemptions/fulfill` — Business + Staff + `redemptions.fulfill`. Body: `{ cardId, code }`. Find the Pending redemption for the card; hash the presented code and compare with `FulfilmentCodeHash`; after 5 wrong attempts lock (`INVALID_CODE` → 400, `CODE_LOCKED` → 423). On success: row-lock transaction, set Status=Fulfilled, FulfilledByUserId, FulfilledAt, SSE `redemption.fulfilled` to the customer, notification "Enjoy your reward!", ApiEventLog entry.
8. `POST /v1/redemptions/{id}/cancel` — Business only. Pending → Cancelled inside a card row-lock transaction; restore exactly the stamps consumed at claim (read `ClaimRewardAsync` to determine the amount); notification to customer; ApiEventLog.
9. **Modify `ClaimRewardAsync`** to: generate a 6-char code (unambiguous alphabet, e.g. `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), store its hash, include the plaintext `fulfilmentCode` (shown once) in the response DTO, create the redemption with `Status = Pending`, and SSE `reward.claimed` to the business's live feed (follow existing `ISseService` event naming). Keep the existing atomic claim semantics unchanged. Update the frontend and any existing tests that assumed immediate completion to the Pending → Fulfilled model.

**Phase 2 acceptance**: `dotnet test` green with new tests: resolve never consumes a token; adjust rejects negative-resulting and cross-business cards; lookup is rate-limited (integration test); enroll-and-stamp on an already-enrolled customer awards instead of duplicating; fulfill correct/wrong/locked code paths; cancel restores stamps; idempotency replay returns the stored response and a conflicting body returns 409.


## PHASE 3 — FRONTEND (punched-pwd)

**API layer** — extend `lib/api/stamps.ts` (`resolve`, `adjust`, `lookup`, `enrollAndStamp`), `lib/api/redemptions.ts` (`fulfill`, `cancel`); pass `Idempotency-Key` via an axios request interceptor for award/enrollAndStamp retries (stable per queued item). Add new types to `types/index.ts`. Add zod schemas in `lib/validations/stamping.ts` (phone format, adjustment reason, note length, stamp count).

**Guided scan console** — `app/dashboard/business/scan/page.tsx` + `app/dashboard/staff/scan/page.tsx`: extract a shared `components/loyalty/ScanConsole.tsx` with a `role` prop; both pages wrap it with their `useRoleGuard`.

- State machine: `idle → scanning → resolving → confirm → awarding → success | error`.
- On scan: call `resolve` first. In `confirm`, show customer name, program name, progress ring, "X stamps from {reward}" copy, one big confirm button (+ Cancel). Commit with `award`.
- Error guidance (never a dead end):
  - `NOT_ENROLLED` → card with customer name + "Enroll & give first stamp" primary CTA → inline confirm → `enrollAndStamp`.
  - `TOKEN_EXPIRED` / `TOKEN_USED` → "Ask the customer to refresh their QR code" + auto-return to scanning after a countdown.
  - `INVALID_TOKEN` → "That code wasn't recognised — try scanning again."
- Success: reuse `StampSuccessOverlay`; show new totals + "2 more stamps until {reward}".
- **Manual fallback tab**: phone lookup → masked customer match → confirm → award (manual-token path). Hint: "Manual entry is logged."
- **Offline resilience**: if award fails from a network error, queue `{ idempotencyKey, token, businessId, stampCount }` in localStorage; banner "Stamp queued — will sync when back online"; on `online` (or next mount) replay with the SAME idempotency key; confirm on success.
- Staff console gets the same console minus adjustments.

**Business stamping ops** — `app/dashboard/business/stamping/page.tsx` (new): today's stamps + pending redemptions counts (existing analytics endpoints), live activity feed via the business SSE channel (`stamp.awarded` / `reward.claimed`), link cards to Scan and Rewards.

**Rewards fulfillment** — `app/dashboard/business/rewards/page.tsx` (new): pending redemptions list (existing history endpoint, filtered); "Verify code" → 6-char input → `fulfill` → toast + status badge update; Business-only "Cancel" with confirm dialog. Update existing redemption UIs to show Status badges (Pending/Fulfilled/Cancelled).


**Customer card detail** — `app/dashboard/cards/[cardId]/page.tsx`: when a Pending redemption exists, prominently show the 6-char fulfilment code (large, monospaced, "Show this code at the counter") with countdown; replace the old claim-complete state. On SSE `redemption.fulfilled`, celebrate and reset the card view. On SSE `stamp.adjusted`, toast the correction.

**Customer detail** — `app/dashboard/business/customers/[id]/page.tsx`: Business-only "Adjust stamps" section: delta stepper, reason select, note, confirm dialog showing before/after totals; list past adjustments below.

**Guided onboarding** — explore `hooks/useOnboarding*` and `components/onboarding/` first, then extend: post-business-registration wizard: 1) create program (pre-filled 10-stamp default) → 2) "Meet your first customer" + link to printable QR poster page `app/dashboard/business/poster/page.tsx` (business name, program terms, enrollment QR, print stylesheet) → 3) invite staff → 4) "Go to Scan" CTA. Persist completed steps so it resumes where left off.

**Phase 3 acceptance**: `npm run build` zero type errors; `npm test` covers the ScanConsole state machine (resolve→confirm, every error branch, offline queue replay with a stable idempotency key); manual smoke: business and staff scan flows complete end-to-end against a running API, and a not-enrolled customer can be enrolled and stamped without leaving the scan screen.

## DEFINITION OF DONE (all phases)

- `dotnet test` and `npm test` fully green; backend builds and `npm run build` clean.
- `applied_check.sql` updated; migration applies cleanly on a fresh database.
- No user-flow dead ends: every error state in scan/redeem journeys shows a visible next action.
- New endpoints in Swagger with correct status codes, permission-matrix keys, and module gating.
- Final report: files created/modified, tests added, and any deviations from this prompt with justification.

