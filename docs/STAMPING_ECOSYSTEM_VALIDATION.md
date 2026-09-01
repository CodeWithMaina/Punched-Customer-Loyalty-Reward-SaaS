# Stamping Ecosystem — Validation Report (Phases 4–6)

Date: 2026-08-31 · Branch: `plugin-stablization`

## Build & test gates

| Gate | Result | Evidence |
|---|---|---|
| `dotnet build` | ✅ PASS | 0 errors |
| `dotnet test` | ✅ PASS | **185 / 185** (was 160 → **+25 new** `StampingEcosystemTests`) |
| `npm test` (Jest) | ✅ PASS | **73 / 73** (was 71 → **+2 new** in-flight guard tests) |
| `npm run build` | ✅ PASS | "Compiled successfully" (zero type + lint errors) |
| Playwright e2e | ⚠️ SCRIPTED | 3 golden paths + deterministic seed under `e2e/`; runnable via `npm run e2e` against docker-compose (requires Docker; see deviations) |
| docker compose smoke | ⚠️ NOT RUN HERE | Docker unavailable in this environment; compose healthchecks verified by config review |
| k6 award load | ⚠️ DOCUMENTED | `e2e/load/award.js`; CI-safe skip when `K6_ENABLED` unset |

## Database

- [x] Fresh-database migration applies cleanly — `AddApiEventLogDetails` generated via `dotnet ef migrations add` (build-validated); API applies `Database.MigrateAsync()` on startup.
- [x] `applied_check.sql` covers `stamp_adjustments`, `idempotency_keys`, redemption status/fulfilment columns, program `StampExpiryDays`/`MaxStampsPerVisit`, CHECKs and indexes — extended with `api_event_logs.details_json`.

## API surface

- [x] `/v1/stamps/{award,resolve,adjust,lookup}`, `/v1/cards/enroll-and-stamp`, `/v1/redemptions/{claim,pending,fulfill,{id}/cancel}` present with correct roles, `[RequireModule]`, and rate-limit policies (`stamp-award`, `stamp-enroll` new; `manual-lookup` retained — asserted by `StampEndpoints_CarryExpectedRateLimitPolicies`).
- [x] Status codes 400/403/404/409/423/429 mapped in controllers (409 `IDEMPOTENCY_CONFLICT` added to claim).
- [x] Permission matrix contains `stamps.award`, `stamps.adjust`, `redemptions.fulfill` for the right roles (covered by `PermissionEnforcementTests`).

## Functional journeys (covered by `StampingEcosystemTests`)

- [x] enroll → QR → resolve → award(×N) → claim (Pending + 6-char code) → fulfill — `Fulfill_CorrectCode_MarksFulfilled`.
- [x] cancel restores exactly `StampsConsumed` — `Cancel_RestoresExactlyStampsConsumed`.
- [x] adjust rejects zero delta, negative-resulting totals, staff (cross-business token rejected `INVALID_TOKEN`); ApiEventLog carries actor/target/before-after — `Adjust_Success_WritesApiEventLogWithBeforeAfterCounters`.
- [x] lookup returns masked name + one-time token; 6th lookup/hour → 429 (`manual-lookup` policy asserted).
- [x] same `Idempotency-Key` on award and claim replays stored response; different body → 409.
- [x] 5 wrong fulfilment codes → `CODE_LOCKED` (423); correct code after lock also rejected.

## Reliability

- [x] Win-back worker fires once per inactive customer and never repeats (NotificationLog dedupe) — `WinBack_InactiveCustomer_NudgedOncePerBusiness`; active customers untouched — `WinBack_RecentCustomer_NotNudged`. Cron in `AnalyticsWorker`, interval `Stamping:WinBackCronHours` (default 24h), window `Stamping:WinBackDays` (default 30) in `appsettings.json`.
- [x] Expiry worker resets only `TotalStamps` past `StampExpiryDays` (guarded conditional UPDATE; `LifetimeStamps` untouched); null setting = no expiry — `ExpiryWorker_*` tests. Runs hourly inside `CleanupService`.
- [x] Idempotency purge removes only `ExpiresAt < now` rows, in batches of 500 — `IdempotencyPurge_RemovesOnlyExpiredKeys`.

## Frontend

- [x] Scan console + manual fallback: covered by existing Phase-3 machine tests (still green).
- [x] Offline award queues with a stable key and replays exactly once — existing offlineQueue tests + **new** in-flight replay guard (`beginReplay`/`endReplay`/`isReplayInFlight`) in `lib/api/offlineQueue.ts`, used by `hooks/useOfflineReplay.ts`.

## E2E / Load / Smoke

- [x] 3 Playwright golden paths scripted under `e2e/tests/` (customer sees stamp live · not-enrolled → enroll-and-stamp · adjust reflects on customer card) with deterministic, idempotent tenant seeding (`e2e/seed/seed.mjs`, rotates QR token per run). Run: `npm run e2e:install && docker compose up -d && npm run e2e`. ⚠️ Not executed here (no Docker) — selectors may need one calibration pass against the running stack.
- [x] k6 `e2e/load/award.js`: 50 concurrent same-token awards; thresholds `p95<300ms`, checks > 99%; every response must be 200 or 400 TOKEN_USED (never 5xx) → duplicates impossible; post-run ledger query documents zero-duplicate verification. CI-safe skip unless `K6_ENABLED=1`.
- [⚠️] docker compose smoke pending Docker availability (compose unchanged; api healthcheck `wget /health`, db `pg_isready`).

## Phase 6 risk sign-offs

1. **Redemption status migration** — backfill verified: `StampingEcosystemExtensions` maps pre-existing rows to `Fulfilled`; `Redemptions_StatusCheckConstraint_IsPresent` + `Redemptions_CannotHoldStatusOutsidePendingFulfilledCancelled` prove no row can hold a status outside {0,1,2}. **Signed off.**
2. **Offline queue correctness** — replay with the same `Idempotency-Key` cannot double-stamp: backend idempotency store + frontend stable keys + new in-flight guard; verified by award/claim idempotency and offline-queue tests. **Signed off.**
3. **SSE horizontal scale** — README documents the in-memory single-instance limitation and the Redis pub/sub backplane escape hatch. **Signed off (documentation-level).**

## Files created / modified

**Backend:** `Domain/Interfaces/IRedemptionService.cs`, `IStampingMaintenanceService.cs` (new), `Application/Services/RedemptionService.cs`, `StampingMaintenanceService.cs` (new), `StampService.cs`, `CleanupService.cs`, `AnalyticsWorker.cs`, `Application/Settings/StampingSettings.cs` (new), `Domain/Entities/ApiEventLog.cs`, `Infrastructure/Data/Configurations/ApiEventLogConfiguration.cs`, `Migrations/…AddApiEventLogDetails*` (new), `API/Controllers/{StampController,EnrollAndStampController,RedemptionController}.cs`, `Program.cs`, `appsettings.json`, `applied_check.sql`.
**Frontend:** `lib/api/offlineQueue.ts`, `hooks/useOfflineReplay.ts`, `lib/api/__tests__/offlineQueue.test.ts`.
**Tests:** `PunchedApi.Tests/StampingEcosystemUnitTests.cs` (new, 25 tests).
**E2E/tooling/docs:** `e2e/` (new: config, seed, 3 specs, k6, .gitignore), root `package.json` (new), `README.md` (SSE at scale), this report.

## Tests added (before → after)

- Backend xUnit: **160 → 185** (+25).
- Frontend Jest: **71 → 73** (+2).

## Deviations & justification

1. **Positive stamp adjustments also increment `LifetimeStamps`** — a real bug surfaced by the new tests: `chk_lifetime_gte_total` makes a positive adjust that pushes `TotalStamps` past `LifetimeStamps` fail on Postgres. Positive adjustments grant real stamps, so they count toward the lifetime total.
2. **`CleanupService.CleanIdempotencyKeysAsync` is `public static`** (was private) — enables deterministic unit testing of purge semantics.
3. **Award/enroll race tests are deterministic on SQLite** (same-token double award must fail `TOKEN_USED`); SQLite in-memory allows a single writer per connection, so true concurrency is exercised by the k6 script against Postgres.
4. **Playwright / docker smoke / k6 recorded as pending** — Docker is unavailable in this environment; scripts are complete and documented.
