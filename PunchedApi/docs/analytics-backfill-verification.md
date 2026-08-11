# Analytics Backfill Verification

This document defines the post-backfill verification flow for P1/P2 hardening.

## Files
- SQL verification script: `PunchedApi/docs/analytics-backfill-verification.sql`

## How to run
1. Apply migrations.
2. Run any backfill job/recompute routine.
3. Execute the SQL script against PostgreSQL:

```bash
psql "$DATABASE_URL" -f PunchedApi/docs/analytics-backfill-verification.sql
```

## Expected outcomes
- Section 1 (FK orphan preflight): every `orphan_count` is `0`.
- Section 2 (business_daily_analytics): query returns **0 rows**.
- Section 3 (staff_daily_analytics): query returns **0 rows**.
- Section 4 summary: `fk_integrity_status = PASS`.

## If mismatches appear
1. Recompute affected date ranges with analytics aggregation services.
2. Re-run the script.
3. If mismatch persists, inspect raw source rows in `stamps`, `loyalty_cards`, `redemptions` for timezone/date boundary assumptions.

## Notes
- Verification window defaults to the last 30 UTC days.
- Edit the `params` CTE in the SQL script to validate different windows.
