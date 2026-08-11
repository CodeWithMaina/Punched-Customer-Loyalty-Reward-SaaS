# Database Seeding Framework

## Overview

This project includes a modular, production-safe database seeding framework designed for development and QA environments.

Key properties:

- Strongly typed options via `SeedOptions`.
- Hard production safety gate (seeding never executes in production).
- Deterministic random mode via `Seed.RandomSeed`.
- Multiple execution modes: idempotent, reset, clear, append.
- Step-based architecture with one responsibility per seeding module.
- Structured JSON reporting to `seed-report.json`.

## Configuration

Configure seeding in `appsettings.Development.json` or environment-specific settings:

```json
{
  "Seed": {
    "Enabled": true,
    "ResetDatabase": false,
    "ClearExistingData": false,
    "AppendData": false,
    "GenerateReport": true,
    "RandomSeed": 12345,
    "BusinessCount": 5,
    "VerboseLogging": true,
    "ReportPath": "seed-report.json"
  }
}
```

`Enabled` must be true for seeding to run.

## Execution Modes

The framework resolves execution mode from options in this order:

1. `ResetDatabase`
2. `ClearExistingData`
3. `AppendData`
4. default idempotent mode

### Idempotent

- Upserts stable deterministic records.
- Re-running does not create duplicates.

### ResetDatabase

- Drops and recreates database from migrations before seeding.
- Intended for local/dev refresh scenarios.

### ClearExistingData

- Clears tenant/domain data and reseeds.
- Preserves admin bootstrap identity.

### AppendData

- Keeps baseline deterministic records.
- Adds additional activity data (stamps/redemptions) each run.

## Startup Integration

Seeding is integrated into startup after migrations and before default admin bootstrap.

Safety behavior:

- Production: always skipped.
- Non-production with `Enabled=false`: skipped with log entry.
- Skipping does not fail application startup.

## CLI Runner

The API now supports explicit database commands without starting the web server.

Examples:

```powershell
dotnet run -- db migrate
dotnet run -- db seed
dotnet run -- db migrate-seed
```

Shorthand aliases also work:

```powershell
dotnet run -- migrate
dotnet run -- seed
dotnet run -- migrate-seed
```

## Docker Usage

Because the `api` container runs with `ASPNETCORE_ENVIRONMENT=Production`, startup seeding is intentionally skipped there. Use the explicit CLI runner instead.

Bring up the database:

```powershell
docker compose up -d db
```

Rebuild the API image after seed code changes:

```powershell
docker compose build api
```

Run migrations and seeding as a one-off container:

```powershell
docker compose run --rm -e Seed__Enabled=true api db migrate-seed
```

Read the generated report from inside a one-off run:

```powershell
docker compose run --rm --entrypoint sh -e Seed__Enabled=true api -lc "dotnet PunchedApi.dll db migrate-seed && cat /app/seed-report.json"
```

## Architecture

Primary orchestrator:

- `IDatabaseSeeder` / `DatabaseSeeder`

Step pipeline:

1. `DatabasePreparationSeedStep`
2. `IdentitySeedStep`
3. `BusinessSeedStep`
4. `StaffLinkSeedStep`
5. `LoyaltyProgramSeedStep`
6. `ReferralProgramSeedStep`
7. `LoyaltyActivitySeedStep`
8. `ReferralSeedStep`
9. `SessionSeedStep`
10. `ValidationAndReportSeedStep`

All steps are DI-resolved and asynchronous.

## Report Output

If `GenerateReport` is true, a JSON report is generated containing:

- generation timestamp
- resolved random seed
- execution mode
- created totals
- warnings and errors
- demo credentials
- schema capability matrix

## Extending

To add a new module:

1. Create a new class implementing `ISeedStep`.
2. Add it to DI registration in startup in the desired order.
3. Add module capability status in `CapabilityMatrix`.
4. Update the report counters and docs as needed.

## Notes

The current schema supports loyalty and referral domains but does not yet include appointments, invoices/payments ledger, notifications, reviews, inventory, or audit-log tables. See `docs/seed-schema-capability-report.md` and `docs/seed-scaffold-proposals.md`.
