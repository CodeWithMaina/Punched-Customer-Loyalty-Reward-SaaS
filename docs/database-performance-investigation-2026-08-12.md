# Database Performance Investigation and Remediation Plan

Date: 2026-08-12  
Scope: `PunchedApi`, PostgreSQL 16 Docker container, supplied API/PostgreSQL logs  
Mode: read-only investigation; no application or database changes applied

## 1. Executive Summary

The observed outage was not initiated by an expensive payout query, an EF Core split query, connection-pool exhaustion, autovacuum, or the current data volume. Windows entered Modern Standby at 13:50:47 UTC and exited on keyboard input at 13:59:31 UTC. The API and PostgreSQL containers run inside Docker Desktop/WSL and were consequently suspended or severely deprived of scheduling time.

That host transition exactly brackets the incident:

- Payout latency first rose at 13:51:53 UTC.
- .NET heartbeat delays appeared at 13:52:32 UTC.
- Analytics took 14.780 seconds and then 36.472 seconds.
- A PostgreSQL checkpoint took 82.776 seconds while writing only two buffers.
- Autovacuum workers could not start on time.
- Npgsql timed out while opening a new physical connector for the first query in `PayoutService`.
- Windows resumed at 13:59:31 UTC; analytics finished at 13:59:37 UTC and payout returned to 5 ms by 14:00:05 UTC.

The code nevertheless contains serious scaling amplifiers. Analytics is synchronously recomputed after every stamp and redemption and again every five minutes. Staff analytics has a confirmed `2N` query loop. Payout processing uses four to five database commands per selected redemption. Several read endpoints materialize unbounded histories, notification persistence is unbounded fire-and-forget work, and every normal API request adds tenant-resolution reads plus a logging insert.

The correct response is therefore two-part:

1. Prevent production infrastructure from sleeping or being suspended. This is the P0 fix for this incident.
2. Remove repeated analytics work, N+1 round trips, unbounded operations, and multi-instance worker duplication before data and traffic grow. These changes reduce amplification but must not be presented as the cause of the August 12 stall.

## 2. Evidence and Confidence

| Evidence | Observation | Conclusion | Confidence |
|---|---|---|---|
| Windows System event 506 | Entered Modern Standby at 13:50:47 UTC due to idle timeout | Incident trigger | Confirmed |
| Windows System event 507 | Exited Modern Standby at 13:59:31 UTC due to keyboard input | Recovery trigger | Confirmed |
| API logs | Payout rose from milliseconds to 1.5-32.954 seconds after standby began | Shared host stall affected unrelated work | Confirmed |
| API logs | Heartbeat delayed by 1.07-3.97 seconds | .NET process was not scheduled promptly; warning is a symptom | Confirmed |
| PostgreSQL logs | Checkpoint total 82.776 seconds; write 1.396 seconds; sync 4.777 seconds; two buffers | Most elapsed time was host suspension/scheduling delay, not database I/O volume | Confirmed |
| PostgreSQL logs | Autovacuum worker start canceled twice, then started without worker entry | Postmaster/worker coordination was delayed by host suspension; symptom, not cause | Confirmed |
| Npgsql stack | Timeout in `RawOpen`/`OpenNewConnector` before command execution | Server/VM could not accept a new connection promptly; not proof of pool exhaustion | Confirmed |
| `EXPLAIN (ANALYZE, BUFFERS)` | Payout selector 0.761 ms; sampled analytics queries below 0.4 ms | Query plans are fast at current scale | Confirmed |
| Exact row counts | 5 businesses, 60 cards, 1,016 stamps, 108 redemptions | Current data volume cannot explain the stall | Confirmed |
| API event log | No API requests during the degradation interval | User traffic did not trigger this incident | Confirmed |
| Docker inspect | No OOM, restart, memory, CPU, or PID limits | OOM/container-limit explanations rejected | Confirmed |

Incident CPU, disk queue, and Npgsql pool counters were not captured. They are not needed to identify Modern Standby as the trigger, but they are required to diagnose any future slowdown that occurs while the host remains awake.

## 3. Root Cause Report

### Root Cause

The Windows host entered Modern Standby. Docker Desktop's Linux VM and both application processes stopped receiving normal scheduling and I/O service. This is the actual cause of the observed incident.

### Contributing Factors

1. Production-like services are running on a sleep-capable development workstation with no Docker service guard against standby.
2. Analytics performs repeated fixed and data-dependent round trips, increasing the amount of work delayed during any host stall.
3. Payout performs per-item claim/fetch/business/update commands, increasing recovery/backlog cost.
4. No connection-wait, query-count, worker-overlap, host-suspend, or PostgreSQL wait metrics are retained.
5. Background work has no cross-instance coordination and some work is unbounded.

### Symptoms

- Long checkpoints were a clock-time symptom of host suspension. Only about 6.2 seconds of the 82.8-second checkpoint was reported as write or sync work.
- Autovacuum startup warnings were consequences of delayed process scheduling.
- Heartbeat starvation warnings were consequences of the same host scheduling gap.
- The Npgsql timeout occurred while opening a connector, before the payout SQL ran.
- `SplitQueryingEnumerable` appeared because split-query behavior is configured globally. The payout selector is a scalar, one-table projection and produces one SQL command.

### Trigger

Windows idle timeout entered Modern Standby at 13:50:47 UTC. The logs contain no evidence that API traffic, analytics, payout, locks, autovacuum, WAL growth, or table size initiated the transition.

### Recovery

Keyboard input woke Windows at 13:59:31 UTC. PostgreSQL immediately returned to sub-second checkpoints, analytics completed six seconds later, and subsequent payout cycles returned to normal millisecond duration.

### Failure Cascade

Supported sequence:

```text
Windows Modern Standby
-> Docker/WSL scheduling and I/O pause
-> PostgreSQL checkpoint and worker startup wall-clock delays
-> existing queries and connector opens wait
-> connections remain occupied longer and new connector open times out
-> payout and analytics wall-clock durations rise
-> .NET heartbeat is delayed
-> host wakes
-> queued work completes and normal latency returns
```

There is no evidence in this incident for the reverse sequence in which analytics load caused checkpoint I/O pressure and then exhausted the connection pool.

## 4. Architecture and Worker Concurrency Audit

Hosted services are registered in [PunchedApi/Program.cs](../PunchedApi/Program.cs). There are no separate notification, reminder, scheduled-job, or queue-consumer hosted services. Notification work is initiated directly by application services.

| Worker | Schedule | Same-instance overlap | Multi-instance maximum | DB work | Transaction/connection scope | Failure behavior |
|---|---|---:|---:|---|---|---|
| `PayoutWorker` | Run immediately, then 30 seconds after completion | 1 | One per API instance | Select up to 100 IDs; 4-5 commands per claimed item | New DI scope/DbContext per cycle; external gateway call is outside a DB transaction | Logs and delays; no transient DB backoff |
| `AnalyticsWorker` | Run immediately, then 5 minutes after completion; in-memory 24-hour tier | 1 | One per API instance | All businesses sequentially; `1 + B(12 + 2S)` approximate near-real-time commands | One scope/DbContext for entire cycle; each save uses its own short implicit transaction | One business failure aborts remainder of cycle; logs and delays |
| `CleanupService` | Run immediately, then one hour after completion | 1 | One per API instance | Three cleanup phases; entity materialization/deletion can be unbounded | One scope/DbContext per cycle; one save per phase | Logs and delays |
| SSE heartbeat | 15 seconds per SSE connection | One loop per connection | Unbounded by connection count | No DB work | Request lifetime | Cancellation stops loop |
| Notification persistence | Per notification | Unbounded fire-and-forget | Unbounded per API instance | User read, optional business read, insert | New scope per persistence task | Exceptions logged; caller does not observe completion |

All hosted loops await completion before delaying, so they cannot overlap themselves in one process. Every API replica runs all three hosted services, so analytics and cleanup duplicate work across replicas. Payout's conditional `ExecuteUpdateAsync` claim prevents two workers from claiming the same pending row, but a crash after setting `processing` leaves the row permanently stranded.

The fake gateway derives its reference from the redemption ID, which is idempotent. A real gateway must enforce the same idempotency contract before stale `processing` rows can safely be reclaimed.

## 5. DbContext, Connection, and Transaction Audit

### DbContext

- `AddDbContext<ApplicationDbContext>` gives HTTP requests and worker scopes a scoped context. No singleton or cross-thread context sharing was found.
- A worker context lives for a complete cycle. For analytics this means tracking rows across every business. A factory-created context per bounded business/batch would reduce tracking state and release connections predictably.
- Aggregates and scalar projections are not tracked. `AsNoTracking` should be used on read-only entity/list queries, not applied indiscriminately.
- DbContext pooling is not configured. It may reduce allocation overhead but cannot fix host suspension, slow SQL, or connection occupancy.

### Connections

- The connection strings do not configure `Maximum Pool Size`, `Minimum Pool Size`, connection lifetime, connection timeout, or command timeout.
- Npgsql 8 uses pooling by default. Its normal maximum pool size is 100 per exact connection string; PostgreSQL `max_connections` is also 100 in this container.
- Current `pg_stat_activity` showed one active and one idle session, with no lock wait.
- The incident stack entered `OpenNewConnector`; it was trying to establish a physical connection, not shown waiting for an idle pooled connector.
- Increasing pool size or timeout would not prevent a timeout while the host is suspended and could overload PostgreSQL after wake-up.

### Transactions

- No long-running explicit production transactions were found. The only explicit transaction is in database seeding.
- Payout claims and final status updates are separate short auto-commit statements. Correctly, no database transaction spans the external gateway call.
- Staff analytics and segmentation mark existing rows for deletion, add replacements, then call `SaveChangesAsync` once. EF wraps that save atomically; there is no delete/insert commit gap in the current code.
- Stamp and redemption writes commit before synchronous analytics recalculation. This avoids holding locks during analytics, but it makes successful writes appear failed to a caller if analytics later throws.

## 6. N+1 and Round-Trip Audit

### Confirmed N+1 Findings

| Priority | Path | Current query formula | Expected | Remediation |
|---|---|---:|---:|---|
| P0 scaling | [AnalyticsAggregationService.cs](../PunchedApi/Application/Services/AnalyticsAggregationService.cs) `RecomputeStaffDayAsync` | `3 + 2S` per business/day, where `S` is staff with stamps; two aggregate queries execute inside the loop | 2-3 set-based commands plus one upsert | Aggregate new-customer and redemption counts by staff in set-based queries; merge in memory; bulk upsert |
| P1 | [PayoutService.cs](../PunchedApi/Application/Services/PayoutService.cs) `ProcessDueRedemptionsAsync` | Success: `1 + 4N`; failure: up to `1 + 5N`, `N <= 100` | Bounded claim plus one projection/preload and batched status persistence; external calls remain per item | Atomically claim a smaller batch, project required redemption/business fields, cache businesses, batch final state updates |
| P2 admin-only | [LoyaltyService.cs](../PunchedApi/Application/Services/LoyaltyService.cs) `BackfillProgramHistoryAsync` | `1 + P + 1`, one `AnyAsync` per program | 2 reads plus one save | Load existing program IDs once and compare in memory |
| P1 worker-level | [InsightService.cs](../PunchedApi/Application/Services/InsightService.cs) `GenerateAllBusinessInsightsAsync` | About `1 + 5B`, plus upsert read/write pairs for generated insights | A few platform-level grouped queries plus batched upsert | Generate candidates from grouped snapshots, then bulk upsert |
| P1 worker-level | [SegmentationService.cs](../PunchedApi/Application/Services/SegmentationService.cs) `RecomputeAllBusinessesAsync` | `1 + 3B` and all cards/segments rewritten | Incremental dirty-business batches | Recompute only changed businesses/customers; upsert changed rows |
| P1 backfill | [AnalyticsAggregationService.cs](../PunchedApi/Application/Services/AnalyticsAggregationService.cs) backfill methods | `B x D x (12 + 2S)` | Bounded set-based date/business batches | Group source rows by business/date and keyset through a bounded range |

`B` = businesses, `D` = days, `S` = active staff for the day, `N` = due redemptions, `P` = loyalty programs.

### Repeated Work That Is More Important Than Classical N+1

- [StampService.cs](../PunchedApi/Application/Services/StampService.cs) synchronously invokes both business-day and staff-day rebuilds after every stamp, then the worker repeats them every five minutes.
- [RedemptionService.cs](../PunchedApi/Application/Services/RedemptionService.cs) synchronously rebuilds the business day after every claim.
- Near-real-time analytics executes approximately `1 + B(12 + 2S)` commands every cycle even when no source data changed.
- `business_daily_analytics` is updated every five minutes. Live statistics already showed 185 updates and 40 dead tuples for only 20 rows.
- Staff rows are deleted and reinserted every cycle when staff activity exists, creating avoidable WAL and dead tuples.

### Investigated Patterns That Are Not N+1

- Correlated counts in `AdminService.GetBusinessAnalyticsAsync` are translated by EF Core into correlated SQL subqueries; they are not one client query per business.
- Arithmetic in the accrued-liability `SumAsync` is translated and executed by PostgreSQL; it does not lazy-load each program.
- Lazy-loading proxies are not configured.
- In-memory loops over already materialized referral, admin, business-program, and cleanup data do not issue per-item queries.
- The payout selector at line 30 has no `Include` and is one SQL statement despite the `SplitQueryingEnumerable` stack frame.

## 7. Expensive and High-Risk Query Audit

| Priority | Operation | Risk |
|---|---|---|
| P0 scaling | Synchronous analytics after stamp | Adds about `12 + 2S` analytics commands to every successful stamp request and delays the response |
| P0 scaling | Five-minute analytics rebuild | Repeats unchanged scans and writes for every business; linear business/staff growth |
| P1 | Business analytics dashboard | Approximately 24 SQL commands before API middleware overhead; includes all-history staff daily aggregation |
| P1 | Staff activity feed | Loads all matching stamps and redemptions, combines and sorts in memory, then paginates |
| P1 | Cleanup | Potentially loads/deletes every expired QR or refresh token in one phase; batch size and transaction size are unbounded |
| P1 | Payout backlog | Batch is capped at 100, but each item adds four or five sequential DB commands and one gateway call |
| P1 | Segmentation | Loads and rewrites all cards/segments for every business daily and on every process restart |
| P1 | Analytics/admin backfills | Synchronous HTTP operation, up to 15 minutes, unbounded by business/day count |
| P2 | Redemption history | Unbounded entity graph with global split query; should be paged projection |
| P2 | Referral histories | Unbounded three-entity includes; should be paged projection |
| P2 | API event middleware | Up to two tenant-resolution reads and one insert on every non-excluded request |
| P2 | Notification persistence | Unbounded fire-and-forget tasks, two lookup reads and one insert per notification |
| P2 | Business comparison | At least ten sequential aggregate commands for two periods that can be grouped into paired aggregates |

No client-side evaluation exception or implicit filtering after `ToListAsync` was found in the worker paths. The main issue is repeated, sequential database work rather than Cartesian `Include` explosions.

## 8. Query Cost Map

Current row counts are point-in-time development data. Peak durations come from the incident logs and include host suspension time, not SQL execution time.

| Operation | Endpoint/worker | Tables | Current/expected rows | Queries | N+1 | Current/peak duration | Index support | Transaction | Connection usage | Priority |
|---|---|---|---|---:|---|---|---|---|---|---|
| Due payout selection | PayoutWorker | redemptions | 108 / up to 100 IDs | 1 | No | 0.761 ms plan / connector timeout | `(status,next_retry_at)`; sort/filter not fully covered | Auto-commit read | One command | P0 incident victim |
| Payout item | PayoutWorker | redemptions, businesses | Up to 100 | `4N-5N` | Yes | Normally ms / 32.954 s cycle | PK/FK indexes | Separate auto-commits | Released between commands; gateway outside DB | P1 |
| Business day | AnalyticsWorker/write hooks | stamps, cards, programs, redemptions, daily analytics | Current business subset / all tenant rows | About 9/business/day | Worker-level | Normally sub-second / included in 36.472 s cycle | Mostly supported; paid-date gap | One save transaction | Sequential | P0 scaling |
| Staff day | AnalyticsWorker/write hook | stamps, cards, redemptions, staff daily | Current 0 rows / active staff | `3 + 2S` | Yes | Normally sub-second / included in peak | Staff/date and redemption staff/date indexes | One save transaction | Sequential | P0 scaling |
| Segmentation | Daily tier/admin | cards, customer segments | All cards/segments | `1 + 3B` | Worker-level | Not isolated | Business indexes | One save/business | Context retained across all businesses | P1 |
| Business dashboard | Business endpoint | most loyalty tables | All tenant cards; period events; all-time staff days | About 24 | Fixed fan-out | Not instrumented | Mixed | Reads | Sequential commands | P1 |
| Activity feed | Staff endpoint | stamps, redemptions, cards, users | All matching history before page | 2 | No | Not instrumented | Filters supported | Reads | Potentially long materialization | P1 |
| Cleanup | CleanupService | QR, refresh, auth | All expired rows | 3 phases | No | Normally small | Expiry indexes available | One save/phase | Potentially long per phase | P1 |
| API event log | Middleware | businesses, users, event log | One event/request | 1-3/request | API-level repeated work | Request duration excludes log persistence | Relevant indexes present | One save | Extends request context use | P2 |

## 9. PostgreSQL Resource and Index Audit

### Current Resource State

- PostgreSQL settings are standard small-instance defaults: 128 MiB shared buffers, 4 MiB work memory, 1 GiB max WAL, five-minute checkpoints, three autovacuum workers, and 100 server connections.
- At inspection: no lock waits, no deadlocks, one active and one idle database session.
- Largest table was `stamps` at 632 KiB. No bloat or large-table explanation is credible at this scale.
- `track_io_timing` is off, and `pg_stat_statements` is not configured, so historical SQL latency and I/O attribution are unavailable.
- Checkpoint statistics since startup: 36 timed, one requested, 305 checkpoint buffers, 39.749 seconds write time, 7.443 seconds sync time.

### Checkpoint and Autovacuum Causality

Autovacuum was not blocked by a long application transaction. No such transaction exists in the source or current activity. The worker startup warnings occurred during Modern Standby and are scheduling symptoms. Disabling or weakening autovacuum/checkpoints would reduce data safety and would not prevent host suspension.

### Existing Useful Indexes

- `loyalty_cards(business_id, enrolled_at)` supports enrollment aggregation.
- `loyalty_cards(business_id, program_id)` supports tenant/program access.
- `stamps(card_id, stamped_at)` supports per-business card-driven date scans.
- `stamps(awarded_by_user_id, stamped_at)` supports staff/date access.
- `redemptions(business_id, redeemed_at)` and `(business_id, user_id, redeemed_at)` support analytics.
- `redemptions(status, next_retry_at)` supports part of the payout predicate.
- Daily analytics primary keys enforce one row per business/date and staff/business/date.

### Schema Drift

The live database contains a legacy nullable `stamps."BusinessId"` column, foreign key, and index. All 1,016 values are null and the index has zero scans. Current source does not map this property. This is dead schema, not a usable tenant index.

### Supported Index Recommendations

Do not create these until the query rewrite is fixed and tested with production-scale data.

| Candidate | Query supported | Benefit | Cost/risk | Decision |
|---|---|---|---|---|
| `redemptions(business_id, paid_at) WHERE paid_at IS NOT NULL` | Five-minute payout sum by tenant/day | Bounded paid-date range scan | Extra write/storage per payout | P1 candidate after `EXPLAIN` on scaled data |
| `stamps(stamped_at, card_id)` | New all-business/day grouped analytics query | Date-first scan followed by card/business grouping | Duplicates storage overlap with `(card_id,stamped_at)` | P1 candidate only after set-based rewrite and scaled plan |
| Partial due-payout index including due/order fields | Due selector under a large backlog | Avoid broad filter/sort | Predicate complexity and write overhead | P2; current selector is below 1 ms and existing index may suffice at scale |
| Remove legacy `stamps."BusinessId"` FK/index/column | None; all values null | Removes dead index/schema ambiguity | Migration must verify no old binary depends on it | P2 cleanup |
| Remove duplicate daily analytics descending index | Latest analytics lookup | PostgreSQL can scan primary key backward | Must compare actual plans | P3 candidate |

Do not denormalize `business_id` onto stamps solely for speed without a reliable invariant. Prefer a set-based daily aggregation joined through `loyalty_cards`; denormalization creates a second tenant key that can disagree with the card.

## 10. Analytics Optimization Architecture

### Immediate Model

```text
stamp/redemption commit
-> mark (business_id, UTC date) dirty with idempotent upsert
-> return response

single coordinated analytics worker
-> claim bounded dirty keys
-> aggregate all metrics for those keys with set-based grouped queries
-> upsert business/staff snapshots atomically
-> clear dirty key
```

Requirements:

- The dirty key must include `business_id` and date; never aggregate without tenant scope.
- Coalesce repeated events into one dirty row.
- Claim with `FOR UPDATE SKIP LOCKED` or an equivalent atomic update for multiple instances.
- Process a bounded number of business/date keys per batch.
- Use set-based staff aggregates, not queries inside a staff loop.
- Preserve late-arriving-event correction by marking the affected event date dirty.
- Run a low-frequency reconciliation for a bounded recent window, such as the last two days, instead of rebuilding every business every five minutes.
- Persist the daily schedule/lease; do not use `DateTime.MinValue`, which reruns daily work on every process restart.
- Incremental segmentation should mark only customers/businesses affected by card changes. Periodic full reconciliation can be keyset-batched off-peak.

### Dashboard Reads

Dashboards should primarily read daily snapshots and issue a small number of live queries only for truly real-time values. The target is fewer than five SQL commands for the business analytics endpoint, independent of staff/customer count.

## 11. Prioritized Implementation Plan

### Phase 1 - Critical Stability Fixes

| Priority/File | Current problem | Required change | Why/impact | Risk/dependencies | Validation |
|---|---|---|---|---|---|
| P0 infrastructure/Windows deployment | Host enters Modern Standby | Run production on an always-on host; for local soak tests disable sleep/Modern Standby while services run and add a startup check/alert | Eliminates confirmed incident cause | Power policy and deployment ownership | Eight-hour idle soak; no event 506; workers remain within SLO |
| P0 [AnalyticsWorker.cs](../PunchedApi/Application/Services/AnalyticsWorker.cs) | Every replica runs duplicate analytics; restart reruns daily tier | Add persisted lease/advisory lock and persisted schedule; skip with overlap metric | Prevents duplicate writes and restart storms | PostgreSQL coordination design | Two API instances execute one cycle total; kill/restart lease recovery |
| P0 [StampService.cs](../PunchedApi/Application/Services/StampService.cs), [RedemptionService.cs](../PunchedApi/Application/Services/RedemptionService.cs) | Requests synchronously rebuild analytics | Replace rebuild calls with idempotent dirty-key enqueue in the same write transaction/outbox | Shortens request and connection occupancy; coalesces work | Dirty-key schema/outbox correctness | One stamp returns without analytics scans; snapshot converges within SLO |
| P0 [PayoutService.cs](../PunchedApi/Application/Services/PayoutService.cs) | `processing` rows never recover; batch fan-out is high | Add stale-claim recovery with explicit lease timeout and gateway idempotency key; lower/configure batch size initially | Prevents stranded payouts and bounded wake-up surge | Real gateway idempotency support | Crash after claim and after gateway success; exactly one payout/reference |
| P0 [StampService.cs](../PunchedApi/Application/Services/StampService.cs), email services | `Task.Run` and unobserved persistence are unbounded | Introduce bounded channel/outbox with one or a small fixed number of consumers and backpressure | Prevents task/thread/connection bursts | Delivery semantics and shutdown drain | Burst test proves bounded queue, memory, and DB sessions |

### Phase 2 - Query and Batch Optimization

| Priority/File | Current problem | Required change | Why/impact | Risk/dependencies | Validation |
|---|---|---|---|---|---|
| P0 [AnalyticsAggregationService.cs](../PunchedApi/Application/Services/AnalyticsAggregationService.cs) | `2S` staff queries and delete/reinsert | Produce staff metrics with grouped set-based queries and atomic upsert; update only changed rows | Query count independent of staff; less WAL/dead tuples | Verify `new customer` semantics across all history | PostgreSQL integration test asserts query count and exact metrics |
| P1 [PayoutService.cs](../PunchedApi/Application/Services/PayoutService.cs) | Four/five DB commands per item | Project needed fields, preload unique businesses, claim bounded IDs, batch final updates where outcome permits | Reduces round trips and context tracking | Preserve per-item atomic claim and failure reason | 10k backlog test; bounded memory and connections; payout correctness |
| P1 [BusinessService.cs](../PunchedApi/Application/Services/BusinessService.cs) analytics partials | About 24 commands and all-history staff scan | Read snapshots; combine paired aggregates; add period filter or snapshot for all-time staff | Target fewer than five commands | DTO compatibility and snapshot freshness | Query-counter integration test; 7/30/90-day result parity |
| P1 [BusinessService.cs](../PunchedApi/Application/Services/BusinessService.cs) activity feed | Materializes complete histories before paging | Project a union-compatible shape in SQL, order, keyset-page, and calculate summary separately/cached | Bounded rows and memory | Stable ordering across two sources | Million-row synthetic history; fixed page latency/memory |
| P1 [CleanupService.cs](../PunchedApi/Application/Services/CleanupService.cs) | Unbounded tracked deletes | Delete deterministic keyset batches with configurable size and cancellation between batches | Bounds locks, WAL, transaction, and memory | EF `ExecuteDelete` batching design | Large expired-token set; per-batch timing/locks stay bounded |
| P2 [RedemptionService.cs](../PunchedApi/Application/Services/RedemptionService.cs), [ReferralService.cs](../PunchedApi/Application/Services/ReferralService.cs) | Unbounded entity graph histories | Add keyset pagination and direct DTO projections | Removes split graph loading and bounds results | API contract pagination | Large-history query count and payload tests |
| P2 [ApiEventLoggingMiddleware.cs](../PunchedApi/API/Middleware/ApiEventLoggingMiddleware.cs) | Up to three DB commands/request | Put tenant ID in validated claims/context; write logs through bounded telemetry pipeline | Removes repeated tenant reads from hot path | Claims freshness and audit durability | Auth/tenant isolation tests; request query count |
| P2 [LoyaltyService.cs](../PunchedApi/Application/Services/LoyaltyService.cs) | Program-history backfill N+1 | Batch-read existing program IDs and insert missing rows once | `P` reads become one | Admin-only path | Query-count test |

### Phase 3 - Incremental Analytics

| Priority/File/component | Current problem | Required change | Why/impact | Risk/dependencies | Validation |
|---|---|---|---|---|---|
| P1 new dirty-key entity/config/migration | No change tracking for snapshots | Add unique `(business_id,date)` dirty queue with timestamps/attempts | Coalesces repeated events and supports recovery | Migration and event-date semantics | Duplicate events create one key; tenant FK enforced |
| P1 analytics worker/aggregation service | Scans every business every five minutes | Claim bounded dirty keys and aggregate by business/date in set-based batches | Work scales with changes, not total tenants | Lease/retry semantics | Idle system runs no source scans; hot tenant cannot block others |
| P1 segmentation service | Full daily rewrite | Mark changed customers/businesses and incrementally upsert; retain bounded reconciliation | Avoids platform-wide daily scan | Percentile threshold can affect unchanged customers | Compare incremental output with full reference rebuild |
| P2 insight service | Five-plus reads per business | Generate from snapshot windows in grouped platform queries; batch upsert | Removes worker-level N+1 | Insight deduplication | Result parity and bounded query count |
| P2 admin backfill API | Synchronous, unbounded request | Persist a backfill job with date/tenant bounds, keyset batches, progress, cancellation, and single-flight lease | Safe operational recovery | Job schema/authorization | Restart/resume and concurrent submission tests |

### Phase 4 - Database and Configuration

| Priority/File/component | Current problem | Required change | Why/impact | Risk/dependencies | Validation |
|---|---|---|---|---|---|
| P1 PostgreSQL deployment | No historical statement/I/O evidence | Enable `pg_stat_statements`; enable `track_io_timing` after measuring overhead; retain PostgreSQL logs | Makes query and I/O regressions attributable | Managed-host permissions/overhead | Dashboard shows top total/mean/p95 query costs |
| P1 migrations/configurations | Index gaps should be evaluated after rewrites | Add only scaled-plan-supported paid-date/date-first indexes | Avoids speculative write overhead | Production-like dataset | `EXPLAIN (ANALYZE, BUFFERS)` before/after and write benchmark |
| P2 migration | Dead `stamps."BusinessId"` column/index/FK | Remove after compatibility check | Eliminates schema drift and unused write/storage cost | Old deployed binaries | Mixed-version deployment check; schema test |
| P2 connection configuration | Defaults implicit; server and client both cap near 100 | Set explicit conservative app pool budget per replica so total pools remain below server capacity; retain short connect timeout and command budgets by workload | Prevents accidental aggregate overcommit | Replica count and reserved admin connections | Saturation test shows backpressure, not server connection exhaustion |
| P3 PostgreSQL checkpoint/vacuum | Defaults are not incident cause | Leave enabled; tune only from WAL, bloat, and I/O measurements on production storage | Preserves safety | Metrics history | Checkpoint/autovacuum SLO under write load |

### Phase 5 - Observability

Add OpenTelemetry/Meter-based low-cardinality metrics. Never include user IDs, emails, raw SQL parameters, tokens, or business names as metric labels.

| Metric | Required dimensions |
|---|---|
| `db.client.operation.duration` | operation family, success, timeout type |
| `db.client.connection.wait.duration` | pool/endpoint, success |
| `db.client.connections.usage` | active/idle/waiting |
| `db.query.count` | request/worker operation family |
| `worker.duration` | worker, tier, result |
| `worker.records_processed` | worker, result |
| `worker.batch.size` | worker |
| `worker.overlap` / `worker.lease.failure` | worker |
| `analytics.dirty.age` | age bucket |
| `analytics.duration` | business/staff tier without tenant label |
| `payout.duration` | outcome |
| `payout.processing.stale` | age bucket |
| PostgreSQL | sessions, waits, locks, dead tuples, WAL bytes, temp bytes, checkpoint write/sync/total, autovacuum duration |
| Host | sleep/resume events, CPU, memory pressure, disk latency/queue, Docker VM CPU/memory |

Add query-budget integration tests around worker cycles and critical endpoints. SQL text logging should be disabled or redacted in production; use normalized statement fingerprints.

## 12. Tenant Isolation Review

- Worker aggregations consistently scope by `businessId` or derive business through the loyalty card.
- Staff analytics also scopes `AwardedByUserId` within the business.
- Payout derives the business from the redemption row; `IgnoreQueryFilters` intentionally allows a soft-deleted business to complete/reconcile payout.
- Admin platform analytics is role-protected and intentionally cross-tenant.
- Optimizations must retain business/date keys in dirty work, claims, indexes, projections, and snapshot primary keys.
- Do not use the dead nullable `stamps."BusinessId"` column. It contains no tenant data.

No cross-tenant leakage was found in the audited worker paths. Every new set-based query requires multi-business fixture tests to keep this invariant.

## 13. Validation Strategy

### Baseline and Query Correctness

Capture before/after:

- normalized query count and total DB time per operation;
- p50/p95/p99 command and connection-wait duration;
- rows read/returned/written and buffer hits/reads;
- worker duration, batch size, dirty age, overlap;
- active/idle/waiting connections;
- process CPU, allocation rate, working set, thread-pool queue length;
- WAL bytes, dead tuples, checkpoint total/write/sync, autovacuum runs and duration.

Use PostgreSQL integration tests, not only the EF InMemory provider. InMemory tests do not validate translation, SQL count, indexes, locks, transactions, or `SKIP LOCKED` behavior.

### Required Scenarios

| Scenario | Dataset/load | Pass condition |
|---|---|---|
| Normal workload | Current seed | Payout and analytics meet baseline SLO; no result changes |
| Large dataset | At least 1,000 businesses, 100 staff/business, 10k cards/business, realistic events | Batch memory/transactions stay bounded; query count independent of staff/results where designed |
| Multiple businesses | One hot tenant plus many idle tenants | Tenant filters hold; hot tenant cannot prevent bounded progress for others |
| Concurrent workers | Analytics, payout, cleanup, and API traffic together | Connection wait remains bounded; no starvation; leases prevent duplicate analytics |
| Slow DB | Inject latency and connection failures | Backoff with jitter, cancellation, no retry storm, health remains responsive |
| Large payout backlog | At least 10k due rows with mixed outcomes | Bounded batch, idempotent payout, stale claim recovery, predictable drain rate |
| Multiple API instances | At least three replicas | One analytics/cleanup lease holder; payout claims unique; failover resumes safely |
| Tenant isolation | Identical IDs/shapes across several businesses | No snapshot, activity, payout, or insight crosses business scope |
| Host sleep | Local-only controlled standby test | Alert identifies suspend/resume; deployment runbook forbids this environment for production |
| Late events | Events for today/yesterday after snapshot | Correct date key becomes dirty and snapshot converges |
| Backfill restart | Kill during a large backfill | Resume from persisted key without duplicate/cross-tenant work |

Initial SLO candidates should be set from an awake-host baseline, then tightened: payout empty cycle below 100 ms, dirty-key analytics batch p95 below its interval, connection wait p95 below 50 ms under normal load, and zero stale processing rows beyond the lease threshold.

## 14. Implementation Readiness

The codebase is ready to implement Phase 1 application fixes and query instrumentation. Before production database/index tuning, collect:

1. Production-scale row distributions per business/day/staff.
2. `pg_stat_statements` data through a representative peak period.
3. Managed PostgreSQL CPU, memory, storage latency, WAL, and wait metrics.
4. Real payout gateway idempotency and reconciliation contract.
5. Expected API replica count and the total PostgreSQL connection budget.
6. Analytics freshness SLA and allowed late-event correction window.

The confirmed infrastructure fix does not require more evidence: a production database/API must not run in a host environment that enters Modern Standby.

## 15. Recommended Execution Order

1. Move/guard the runtime against Modern Standby and add host suspend/resume alerting.
2. Add DB/worker/query-count/connection-wait instrumentation and capture an awake baseline.
3. Remove synchronous analytics rebuilds from stamp/redemption requests using an idempotent dirty-key outbox.
4. Add worker leases, persisted schedules, bounded batches, and payout stale-claim recovery with idempotency.
5. Replace staff/payout N+1 paths and unbounded activity/cleanup/history operations.
6. Shift dashboard and insight reads to snapshots and incremental aggregation.
7. Re-run scaled PostgreSQL plans; only then add or remove indexes and set explicit connection budgets.
