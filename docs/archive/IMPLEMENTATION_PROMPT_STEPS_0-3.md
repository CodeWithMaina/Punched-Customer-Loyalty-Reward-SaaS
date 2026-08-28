# Implementation Prompt: Steps 0–3 — Branch Hygiene, Base Stabilization, Catalog Sync & Back-Compat Grant

## ⚠️ ABSOLUTE CONSTRAINTS — READ FIRST

1. **`main` must NEVER be touched.** Do not commit to, merge into, rebase,
   reset, or push to `main`. Not once, under any circumstance.
2. **All work happens on a new branch: `plugin-stablization`**
   (exact spelling), created from the current `main` HEAD:
   ```
   git checkout -b plugin-stablization
   ```
3. Never run `git merge`, `git rebase`, `git push origin main`,
   `git reset --hard main`, or any command whose target/ref includes `main`
   other than the initial read-only `git log`/`diff` inspection.
4. Verify the branch before EVERY commit:
   `git branch --show-current` must print `plugin-stablization`.
5. Do not delete or move any file unless this prompt explicitly says to.

## Context

You are continuing the plugin-module architecture for the Punched Customer
Loyalty Reward platform. Phases 1–8 of the module system are implemented;
the authoritative status audit and full roadmap live in
**`MODULE_SYSTEM_STATUS_AND_PLAN.md`** — read §2 (gaps) and §4 (Steps 0–9)
first. This prompt implements **Steps 0 through 3 only**:

- **Step 0** — commit hygiene: organize the working tree into logical
  commits on `plugin-stablization`; archive stray artifacts.
- **Step 1** — fix the 3 pre-existing `BusinessAnalyticsCadenceTests`
  failures so the entire suite is green.
- **Step 2** — add `ModuleCatalogSyncTests` (code catalog ↔ DB seed ↔
  frontend manifest key parity).
- **Step 3** — implement the idempotent back-compat `pro` grant in
  `ModuleCatalogSeeder` (CRITICAL prerequisite before enforcement can ever
  be flipped on).

**Do NOT** implement Steps 4–9 (no `[RequireModule]` decoration, no toggle
flip, no billing). Do not change `Modules:EnforcementEnabled` (stays
`false`).

## Codebase conventions (source of truth)

- Backend: .NET 8, EF Core 8 + Npgsql, controllers under
  `PunchedApi/API/Controllers/`, services in `PunchedApi/Application/Services/`,
  seeders in `PunchedApi/Infrastructure/Data/Seeding/`, xUnit tests in
  `PunchedApi.Tests/` (EF InMemory database pattern — see
  `ModuleEntitlementCacheTests.cs` for the ctor/seed/dispose pattern).
- Frontend: Next.js 14 App Router in `punched-pwd/`, registry manifests in
  `punched-pwd/registry/modules/`, Jest + RTL (`npm test`).
- Startup seeding: `Program.cs` calls `IModuleCatalogSeeder.EnsureModuleCatalogAsync()`
  in ALL environments after `Database.MigrateAsync()`.
- Modules/plans seed data: `PunchedApi/Infrastructure/SeedData/`
  (`ModuleSeedData`, `SubscriptionPlanSeedData`, `PlanModuleSeedData`).

---

## Step 0 — Branch + commit hygiene

1. Create and switch to the branch:
   ```
   git checkout -b plugin-stablization
   git branch --show-current   # must print: plugin-stablization
   ```
2. Split the current working tree into logical commits (use `git add <paths>`
   per group, never `git add .` for the whole tree):
   - `feat(modules): entitlement data layer` —
     `Domain/Entities/{Module,SubscriptionPlan,PlanModule,BusinessSubscription,BusinessModule}.cs`,
     `Infrastructure/Data/Configurations/*Module*|*Subscription*|*Plan*.cs`,
     `Migrations/20260827173930_AddModuleCatalogAndSubscriptionTables*`,
     `ApplicationDbContext.cs`, `Domain/Entities/Business.cs`,
     `Infrastructure/SeedData/`.
   - `feat(modules): entitlement engine + authorization` —
     `Application/Modules/`, `Application/Authorization/`,
     `Application/Services/{I,}ModuleEntitlementService.cs`,
     `API/Filters/`, `Program.cs`, `appsettings.json`.
   - `feat(modules): API endpoints + controller split` —
     `API/Controllers/ModulesController.cs`,
     `AdminModulesController.cs`, `BusinessController*.cs`, `ModuleDTOs.cs`,
     and the controller enforcement-adjacent edits.
   - `feat(modules): frontend registry, nav, guards` — `punched-pwd/registry/`,
     `hooks/{useModules,useModuleNav}.ts`, `components/modules/`,
     `lib/api/modules.ts`, `app/dashboard/layout.tsx`, all wrapped pages,
     `types/index.ts`.
   - `feat(modules): owner + admin module management UI` — the two new
     `modules/page.tsx` routes + profile/admin link edits.
   - `test(modules): entitlement + cache tests` — `PunchedApi.Tests/Module*`.
   - `docs: module system status, plan and entitlements docs` —
     `MODULE_SYSTEM_STATUS_AND_PLAN.md`, `docs/modules-entitlements.md`.
3. Artifacts:
   - Delete `wrap-pages.ps1` (one-off script; its output is already applied).
   - `mkdir docs/archive`; move `IMPLEMENTATION_PROMPT_PHASES_1-3.md`,
     `IMPLEMENTATION_PROMPT_PHASES_4-6.md`,
     `phases-7-9-implementation.md` into it; commit as
     `chore: archive phase implementation prompts`.
   - Leave `notes.md`, `README.md`, other `docs/**` untouched.
4. Confirm: `git status` is clean; `git log --oneline` shows the grouped
   commits; `git log main..HEAD --oneline` shows only this work and
   `git log main --oneline -1` is unchanged.

---

## Step 1 — Fix the 3 failing analytics tests (G8)

File: `PunchedApi.Tests/BusinessAnalyticsCadenceTests.cs` (failing tests:
`VisitCadence_UsesPeriodPredecessorAndPreservesTenantIsolation`,
`VisitCadence_HandlesTenThousandStampsSetBased`,
`VisitCadence_ReturnsNullForEmptyAndSingleStampCards`).

1. Run and capture the actual failure output first:
   `dotnet test PunchedApi.Tests --filter "FullyQualifiedName~BusinessAnalyticsCadence"`
2. Diagnose root cause before editing — inspect the visit-cadence logic in
   the analytics service (BusinessService analytics partials) and the test
   fixtures. Do NOT delete or `[Skip]` tests; make them pass by fixing
   whichever side is wrong (production bug → fix service; fixture bug → fix
   test setup). Preserve tenant-isolation assertions.
3. Acceptance: `dotnet test PunchedApi.Tests` → **0 failed, all passed**;
   `dotnet build PunchedApi` 0 warnings/errors; `npm test --prefix punched-pwd`
   and `npx tsc --noEmit` in `punched-pwd` stay clean.
4. Commit: `fix(analytics): visit cadence edge cases and test fixtures`.

---

## Step 2 — Catalog sync tests (G9)

New file: `PunchedApi.Tests/ModuleCatalogSyncTests.cs` (follow the existing
test constructor pattern; the seed data can be checked in memory — no DB
required).

Assertions:
1. Every `ModuleCatalog.Modules` key (code authority,
   `PunchedApi/Application/Modules/ModuleCatalog.cs`) exists in
   `ModuleSeedData.GetModules()` by `Key` — and vice versa (no orphans).
2. For matching keys: `Version` matches; `IsCore` matches
   `Visibility == ModuleVisibility.Core`; dependency lists are equal
   (catalog `Dependencies` vs parsed `DependenciesJson`).
3. Every `(planKey, moduleKey)` in `PlanModuleSeedData.GetPlanModules()`
   references existing keys. Assert dependency coverage per plan: each
   granted module's dependency keys are also granted by the same plan, OR
   the seed relies on runtime dependency closure — in that case assert at
   minimum that dependency keys exist in the catalog, and document in a
   comment which rule the seed uses.
4. Plan seed sanity: `starter`, `pro`, `enterprise` exist and are active.

**Frontend parity:** create `punched-pwd/registry/__tests__/catalogKeys.test.ts`
with a hardcoded list of the 12 expected backend module keys (comment:
"MUST equal ModuleCatalog keys — update both together"), asserting
`moduleRegistry.map(m => m.id)` equals it exactly, and that every id in
`shells.ts` `moduleOrder` resolves via `findModule`. `npm test` stays green.

Commit: `test(modules): catalog ↔ seed ↔ manifest key parity tests`.

---

## Step 3 — Back-compat `pro` grant (G2) — CRITICAL

File: `PunchedApi/Infrastructure/Data/Seeding/ModuleCatalogSeeder.cs`
(read fully first; keep the existing catalog reconciliation intact).

Behavior (idempotent):
1. After catalog reconciliation, find every `Business` with **no**
   `business_subscriptions` row with `status IN ("active","trial")`.
2. For each, insert a `BusinessSubscription` for the `pro` plan
   (`SubscriptionPlanSeedData` key `"pro"`): `status = "active"`,
   `StartsAt = UtcNow`, `EndsAt = null`.
3. One-shot semantics: the natural rule "grant only where no active
   subscription exists" is already restart-idempotent, but new businesses
   registered after rollout would also match. Add a config flag
   `Modules:BackCompatGrantEnabled` (bind via a new option on the existing
   `ModuleEnforcementOptions`/Modules section, default **true**). Operators
   set it to `false` after the grace period. Document this in code comments.
4. Log at startup:
   `"Back-compat pro grant applied to {N} businesses."` (and a 0-case line).
5. Must run in ALL environments (verify it is not gated behind demo-data
   `SeedOptions` skip).
6. Do NOT touch `Modules:EnforcementEnabled` (stays `false`).

Tests — new `PunchedApi.Tests/ModuleBackCompatGrantTests.cs` (EF InMemory):
- Business with no subscription → after `EnsureModuleCatalogAsync`, exactly
  one active `pro` subscription; `ModuleEntitlementService` shows non-Core
  modules with `HasAccess = true`.
- Business already on an active `starter` subscription → untouched.
- Running the seeder twice → still exactly one subscription per business.
- Flag `BackCompatGrantEnabled = false` → no grants inserted.

Commit: `feat(modules): idempotent back-compat pro grant for existing businesses`.

---

## Validation (all must pass, in order)

```
dotnet build PunchedApi -v q            # 0 errors, 0 warnings
dotnet test PunchedApi.Tests            # 0 failed
cd punched-pwd && npx tsc --noEmit      # clean
npm test                                # all green (incl. new catalogKeys tests)
git branch --show-current               # plugin-stablization
git status --short                      # clean
git log main..HEAD --oneline            # only this work; main untouched
```

## Important notes

1. `Modules:EnforcementEnabled` remains `false`. Nothing in this prompt may
   change runtime access behavior for existing users — the pro grant only
   adds subscriptions, it removes nothing.
2. `main` is read-only. All commits land on `plugin-stablization`. No
   merges, no pushes to `main`, no force-anything.
3. If the Step-1 fix requires changing production analytics logic, keep the
   change minimal and add a regression test capturing the bug.
4. Do not start Steps 4–9 of `MODULE_SYSTEM_STATUS_AND_PLAN.md`.

---

*Follows `MODULE_SYSTEM_STATUS_AND_PLAN.md` §4 Steps 0–3.*
