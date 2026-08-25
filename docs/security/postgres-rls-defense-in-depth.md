# PostgreSQL Row-Level Security — Defense-in-Depth Guide

Status: **prepared, opt-in** (not enabled by application default). Companion script:
`docs/security/postgres-rls-defense-in-depth.sql`

## Why RLS here

The API already enforces tenant isolation at every service layer: business scope is
always derived server-side from the authenticated identity (`OwnerId` / `StaffBusinessId`),
never from client-supplied `businessId`. RLS adds a **database-level backstop** so that a
future query that accidentally drops the tenant predicate still cannot read or modify
another tenant's rows.

## Architecture

```
Request → JWT → resolve owner/staff → businessId
      ↓
BEGIN
  SELECT set_config('app.business_id', :businessId, true)   -- transaction-scoped
  SELECT set_config('app.user_id',     :userId,     true)
  ... normal EF Core queries ...
COMMIT   -- GUCs die with the transaction
```

Key property: `set_config(..., is_local := true)` values are bound to the current
transaction. When the transaction ends — commit or rollback — the setting disappears,
so a pooled Npgsql connection returned to the pool **cannot** carry one tenant's context
into the next request. This is the pooling-safety requirement from the audit.

## Roles

| Role | Purpose | Privileges |
|---|---|---|
| `punched_app` | API requests | Normal DML, **no** `BYPASSRLS`, no DDL |
| `punched_elevated` | Workers, admin analytics, seeding, backfill | `BYPASSRLS`; credentials treated as secrets; only ever used by background hosts |

Admin endpoints and background jobs (analytics aggregation, payout, cleanup, backfill)
are intentionally cross-tenant, which is exactly why they must run under the elevated
role rather than disabling policies per-session ad hoc.

## Activation checklist

1. Run the SQL script in a maintenance window (idempotent; safe to re-run).
2. Add request-scoped transaction + `set_config` plumbing, e.g. an
   `IMiddleware` that opens an explicit transaction and sets both GUCs before the
   controller runs, or an `IDbTransactionInterceptor`. Do **not** use plain `SET`
   (session-scoped) — it survives connection reuse.
3. Move the API connection string to `punched_app`; move worker/host connections
   to `punched_elevated`.
4. Run cross-tenant tests (read/update/delete/create/search/analytics for Business A
   against Business B IDs) — every unauthorized operation must return zero rows or fail.
5. Verify SSE and long-running request paths do not hold transactions open longer than
   needed (RLS does not change this, but the new explicit transaction wrapper must not
   wrap streaming responses).
6. Only after (4)/(5): consider `ALTER TABLE ... FORCE ROW LEVEL SECURITY` to constrain
   the table owner as well.

## Performance notes

- Policies evaluate per row but with `business_id = <uuid>` equality they compile to the
  same predicate the app already issues; existing composite indexes beginning with
  `business_id` serve them directly.
- The `stamps`, `appointment_status_history`, and `appointment_resources` policies use a
  subquery through parent keys; these are indexed FK lookups.
- Measure before/after activation with `EXPLAIN (ANALYZE, BUFFERS)` on the P0 list
  endpoints (customer search, dashboard, staff analytics).

## Related optimizations shipped in this pass

- `AddDbContextPool` (context pooling) — safe here because `ApplicationDbContext` holds
  no per-instance state beyond EF internals.
- `IBusinessScopeResolver` — cached `ownerId → businessId` mapping (60 s TTL, invalidated
  on business creation, 2 s negative TTL) removes one DB round trip per hot request.
- pg_trgm GIN indexes migration (`20260822210433_AddTrgmSearchIndexes`) backing all
  `ILIKE '%term%'` searches.
