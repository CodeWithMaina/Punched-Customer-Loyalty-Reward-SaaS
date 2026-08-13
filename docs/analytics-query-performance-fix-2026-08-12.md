# Business Analytics Query Performance Investigation and Fix

Date: 2026-08-12

## Root Cause

`ComputeVisitCadenceAsync` placed `LAG`, a window function, directly inside `AVG`, an aggregate. PostgreSQL evaluates aggregate arguments before the window-function phase and rejects this expression during parse analysis with SQLSTATE `42803`; a window result must be produced in a subquery/CTE before it can be aggregated.

EF Core did not create the invalid expression. `BusinessService.Analytics.cs` supplied it through `SqlQueryRaw`. EF wrapped the scalar query and applied `FirstOrDefaultAsync`, adding `LIMIT 1`. That operator also caused the logged nondeterministic-result warning because the raw query had no predicate or ordering visible to EF.

The previous period filter was applied before `LAG`. Consequently, the first stamp inside the period could not see the card's immediately preceding stamp before the boundary. The metric catalog defines cadence as average days between consecutive stamps per card, so that omission biased the selected-period result.

## Query Flow and Inventory

The frontend calls `GET /v1/businesses/me/analytics?period=...`. `BusinessController` derives the owner from JWT claims, and `BusinessService.GetBusinessAnalyticsAsync` resolves the business by `OwnerId`. Every downstream source query is scoped by that server-derived business ID.

| Purpose | Tables | Potential scan | Selected data | Frequency | N+1/repeat | Cache/precompute | Cost and action |
|---|---|---|---|---:|---|---|---|
| Resolve tenant/programs | businesses, loyalty_programs | One owner and programs | Business/program fields | 1 | No | 30s output cache | Low; retained |
| Hour/day heatmaps and trends | stamps, loyalty_cards | Tenant period stamps | Grouped counts | 3 | Same period source | Daily snapshot candidate | Medium; traffic now reuses daily result |
| Redemption hour/day trends | redemptions | Tenant period rows | Grouped counts | 2 | Same period source | Daily snapshot candidate | Medium; retained for live period |
| Customer demographics | loyalty_cards, users | Tenant cards | ID/gender/DOB | 1 | No | Slowly changing cache | Medium; bounded projection |
| Enrollment trend | loyalty_cards | Tenant period cards | Daily counts | 1 | No | Daily snapshot | Low |
| Card funnel/retention/top customers | loyalty_cards, users | All tenant cards | Explicit summary projection | 1 | Reused in memory | Snapshot not required | Medium; no entities/includes loaded |
| Staff period performance | stamps, cards | Tenant period stamps | Grouped staff counts | 1 | No | staff daily snapshot after verified backfill | Medium |
| Revenue totals | redemptions | Tenant period rows | Conditional sums/count/average | 1, formerly 4 | Was repeated | Daily snapshot candidate | Consolidated |
| Revenue trend | redemptions | Tenant period rows | Daily sums | 1 | Related to totals | Daily snapshot | Medium |
| Program performance | redemptions, cards | Tenant period redemptions | Required columns only | 1 | An unused duplicate query existed | Daily snapshot candidate | Duplicate removed |
| Staff all-time daily totals | stamps, cards | All attributed tenant stamps | Grouped daily counts | 1 | No | staff snapshot when complete | High growth risk; source retained because live snapshot coverage is 0/1,016 stamps |
| Visit cadence | stamps, loyalty_cards | Period stamps plus one predecessor per active card | One scalar | 1 | No | Incremental daily interval sum/count later | Bounded live SQL implemented |
| Output caching | API response | None on hit | Serialized response | 30s/token/period | Prevents repeated bursts | Existing ASP.NET OutputCache | Retained; tenant-safe key |

The business analytics request contains no query-inside-customer/program/staff loop. Its round trips remain constant as entity counts grow. The background `RecomputeStaffDayAsync` did contain two queries per active staff member; those counts are now computed in two set-based grouped queries.

## Chosen Architecture

The implemented architecture is:

1. Bounded live SQL for cadence: selected-period stamps plus one indexed predecessor per active card.
2. Existing 30-second tenant-varying output cache for burst suppression.
3. Existing `(card_id, stamped_at)` index for period-boundary predecessor lookup.
4. Existing daily snapshots retained for their current metrics, with staff recomputation made set-based.

Cadence was not added to `business_daily_analytics` in this change. A correct incremental design needs `visit_interval_sum` and `visit_interval_count`, plus reliable handling of late/out-of-order immutable stamps and guaranteed backfill. The current write path synchronously rebuilds analytics after each stamp and the live staff snapshot is not backfilled. Adding fields now would increase write work and risk incorrect reads. A later dirty-day worker can store interval sum/count once snapshot completeness is enforced.

No Redis dependency was added. The existing output cache already covers the volatile endpoint safely for 30 seconds and varies by `Authorization` and period inputs.

## SQL Before and After

Before:

```sql
SELECT AVG(
  EXTRACT(EPOCH FROM (
    s.stamped_at - LAG(s.stamped_at)
      OVER (PARTITION BY s.card_id ORDER BY s.stamped_at)
  )) / 86400.0
)
FROM stamps s
WHERE s.card_id IN (
  SELECT c.id FROM loyalty_cards c WHERE c.business_id = @bid
)
AND s.stamped_at >= @start;
```

After, abbreviated:

```sql
WITH period_stamps AS MATERIALIZED (
  SELECT s.id, s.card_id, s.stamped_at
  FROM stamps s
  JOIN loyalty_cards c ON c.id = s.card_id
  WHERE c.business_id = @bid AND s.stamped_at >= @start
),
cadence_input AS (
  SELECT * FROM period_stamps
  UNION ALL
  SELECT previous.*
  FROM (SELECT DISTINCT card_id FROM period_stamps) active_cards
  CROSS JOIN LATERAL (
    SELECT s.id, s.card_id, s.stamped_at
    FROM stamps s
    WHERE s.card_id = active_cards.card_id AND s.stamped_at < @start
    ORDER BY s.stamped_at DESC, s.id DESC
    LIMIT 1
  ) previous
),
intervals AS (
  SELECT stamped_at,
         stamped_at - LAG(stamped_at) OVER (
           PARTITION BY card_id ORDER BY stamped_at, id
         ) AS visit_interval
  FROM cadence_input
)
SELECT AVG(EXTRACT(EPOCH FROM visit_interval) / 86400.0) AS "Value"
FROM intervals
WHERE stamped_at >= @start AND visit_interval IS NOT NULL;
```

The `id` tie-breaker makes duplicate timestamps deterministic. Multiple stamps on the same day remain distinct visits, matching the existing stamp-sequence definition. The first-ever stamp contributes no interval. Staff attribution does not change cadence, and stamps are immutable with no deletion/reversal status to filter.

## Performance Findings

| Problem | Current cost | Impact | Fix | Priority |
|---|---|---|---|---|
| Invalid `AVG(LAG(...))` | Query always fails | Entire endpoint failed | Two-stage CTE | P0, fixed |
| Period-edge predecessor omitted | Biased first interval/card | Incorrect cadence | One lateral indexed predecessor/active card | P0, fixed |
| EF `FirstOrDefault` on scalar SQL | Warning and `LIMIT 1` wrapper | Log noise/unclear semantics | `SingleAsync` for guaranteed aggregate row | P0, fixed |
| Revenue totals split across four commands | Four scans/round trips | DB/network overhead | One conditional grouped aggregate | P1, fixed |
| Duplicate unused program-redemption query | One all-history query/request | Pure waste | Removed | P1, fixed |
| Week/day traffic rescanned stamps | Two extra scans/round trips | Repeated period work | Reuse daily stamp dictionary | P1, fixed |
| Staff snapshot worker `2S` loop | Two queries per active staff | Query explosion | Two grouped aggregate queries | P1, fixed |
| All-time staff request aggregation | Grows with stamp history | Long-term scan/sort | Use staff snapshot only after verified backfill | P1, open |
| Synchronous snapshot recomputation on writes | About 12+2S commands/stamp | Write latency/amplification | Dirty-key incremental worker | P1, open |
| Repeated historical period aggregation | Several live grouped scans | Growth with selected history | Read complete historical days from snapshots, live-query today | P2, open |

Cadence failure is isolated as an optional metric. It is returned as unavailable (`null`) while the exception is logged with business ID and period start; core analytics continues.

## Index Analysis

No migration or index was added.

The cadence query uses the existing `stamps(card_id, stamped_at)` index. PostgreSQL used a backward index scan for the predecessor lookup in the measured plan. The first plan on current seed data completed in 0.900 ms with 252 shared-buffer hits. The small tables caused PostgreSQL to choose a sequential scan for `loyalty_cards`; that is rational at 60 rows, and existing business-leading card indexes support growth.

The legacy live `stamps."BusinessId"` column/index was not used: source does not map it and 0/1,016 rows are populated. Indexing or querying it would be incorrect. The join through `loyalty_cards.business_id` preserves the authoritative tenant relationship.

Index write/storage cost therefore remains unchanged. A new date-first stamp index should only be reconsidered after the broader daily aggregation rewrite and `EXPLAIN (ANALYZE, BUFFERS)` on representative production-scale data.

## Changes

- `BusinessService.Analytics.cs`: bounded valid cadence SQL and deterministic scalar read.
- `BusinessService.Analytics.Traffic.cs`: reuse daily aggregates and isolate optional cadence failure.
- `BusinessService.Analytics.RevenueCore.cs`: consolidate revenue totals.
- `BusinessService.Analytics.Revenue.cs`: pass reused daily aggregates.
- `BusinessService.cs`: remove unused duplicate query and pass daily aggregates.
- `AnalyticsAggregationService.cs`: remove per-staff query loop.
- `BusinessAnalyticsCadenceTests.cs`: PostgreSQL integration regressions.
- `PunchedApi.Tests.csproj`: PostgreSQL Testcontainers dependency.
- `AssemblyInfo.cs`: test-only internal access.

Database changes: none. No new table, column, migration, background job, or index was required.

## Measurements

| Metric | Before | After |
|---|---:|---:|
| Analytics SQL commands, source inventory | approximately 22-25 | approximately 16-19 |
| Cadence execution | PostgreSQL error in 3-12 ms | 0.900 ms measured plan on seed data |
| End-to-end analytics request | Failed | HTTP 200, 387 ms local production container |
| Response payload | No response | 17,873 bytes |
| Cadence test at 10,000 stamps | No regression test | 310 ms including EF execution in test container |
| Staff snapshot recompute formula | `3 + 2S` commands | 5 fixed commands |

Database CPU, API CPU/memory, physical reads, and representative 100,000/1,000,000-row timings were not captured; no numbers are invented. Current live data is 1,016 stamps and is not representative of medium/large production scale. The 10,000-row test is a regression guard, not a capacity benchmark.

## Verification

- 26/26 backend tests pass.
- PostgreSQL-backed cadence tests cover predecessor handling, same-period intervals, multiple cards, duplicate timestamps, empty data, single-stamp cards, cross-business isolation, date range behavior, and 10,000 stamps.
- Production-mode endpoint returned HTTP 200.
- Fresh logs contained neither SQLSTATE `42803` nor the `First`/`FirstOrDefault` warning.
- Existing `(card_id, stamped_at)` index was used for predecessor lookup.

## Final Assessment

- Original error fixed: yes.
- Cadence query cheaper and bounded: yes.
- Endpoint faster: fewer round trips; local endpoint succeeds in 387 ms. Production-scale latency requires representative benchmarking.
- Database work scales better: yes for cadence, revenue totals, traffic reuse, and staff snapshot recomputation.
- N+1 eliminated: yes in the audited business endpoint and staff daily recomputation path.
- Tenant isolation preserved: yes; business ID remains server-derived and SQL-scoped.
- Analytics correct: yes for covered semantics; incomplete staff snapshots are deliberately not used as a read source.