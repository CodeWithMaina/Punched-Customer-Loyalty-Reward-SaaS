# Plugin Module Architecture — Status Audit & Production Plan

> This document replaces `plugin-module-architecture-plan.md` (the original
> architecture proposal). It records **what is actually implemented today**
> (verified against the codebase, not the plan), what remains, what needs
> improvement, and a step-by-step plan to finish the module system and make
> the codebase production-stable.

---

## 1. What has been done (verified in code)

### 1.1 Entitlement data layer — ✅ DONE
- Entities: `Module`, `SubscriptionPlan`, `PlanModule`, `BusinessSubscription`,
  `BusinessModule` (with `Source` PLAN/OVERRIDE/ADMIN, `OverridesAt`,
  `OverriddenByUserId`) in `PunchedApi/Domain/Entities/`.
- EF configurations for all five tables; `DbSet`s in `ApplicationDbContext`.
- Migration `20260827173930_AddModuleCatalogAndSubscriptionTables` (+ snapshot).
- Idempotent `ModuleCatalogSeeder` wired into startup (`Program.cs`) —
  reconciles the DB `modules` table against the code catalog every boot.
- Seed data: `ModuleSeedData`, `SubscriptionPlanSeedData` (starter/pro/enterprise),
  `PlanModuleSeedData`.

### 1.2 Entitlement engine + authorization — ✅ DONE
- `ModuleCatalog` (code = runtime authority) with visibility
  (Core/Standard/Premium/Enterprise), dependencies, roles, permissions, and
  `CloseDependencies`.
- `PermissionMatrix` (static, no DB) + `IPermissionService` — registered in DI.
- `IModuleEntitlementService` / `ModuleEntitlementService`: plan → overrides →
  subscription-status resolution, **per-business IMemoryCache (60s TTL)** and
  `Invalidate(businessId)`.
- `BusinessContext` (`IBusinessContext`): server-side role/businessId
  resolution, memoized once per request; lazy effective-module set with
  dependency closure; **fail-open pass-through while
  `Modules:EnforcementEnabled=false`** (currently `false` in appsettings.json).
- `RequireModuleAttribute` authorization filter exists in
  `PunchedApi/API/Filters/` returning `403 MODULE_DISABLED` shape.

### 1.3 API surface — ✅ DONE
- `GET /v1/me/modules` — caller entitlements + permissions + plan
  (Admin → full catalog; Customer → catalog customer-facing read modules;
  Business/Staff → server-resolved tenant).
- `GET /v1/businesses/me/modules` — owner per-module detail view.
- `PUT/DELETE /v1/businesses/me/modules/{moduleKey}` — owner toggles
  (`source=OVERRIDE`, audit fields, cache invalidation; Core cannot be
  disabled; Premium/Enterprise cannot be self-enabled → 403
  `PLAN_UPGRADE_REQUIRED`).
- `GET/PUT/DELETE /v1/admin/businesses/{businessId}/modules…` — admin
  force-enable/disable with reason (logged Warning-level), `source=ADMIN`,
  business-existence validation (404 anti-probing).
- `GET /v1/modules/entitlements/{businessId}` — admin diagnostic.

### 1.4 Frontend module system — ✅ DONE
- Registry: 12 module manifests (`punched-pwd/registry/modules/*`) + shell
  profiles (`registry/shells.ts`), ids matching backend keys exactly.
- `useModules()` hook (entitlements + permissions, dependency closure,
  fail-open on fetch error, admin bypass, no-upgrade-flash semantics).
- `useModuleNav(scope)` — registry-driven nav for all four shells; **used by
  `app/dashboard/layout.tsx` today** (`moduleNav` drives sidebar/bottom bar).
- `<RequireModule module=…>` guards applied to ~18 module-owned pages
  (appointments ×5, customers ×2, staff ×3, analytics, referral, scan ×2,
  cards ×2, notifications) + `UpgradePrompt` component.
- `modulesApi` client with owner + admin override mutations; all mutations
  bust `invalidateCache("modules:")`.
- Owner UI: `app/dashboard/business/profile/modules/page.tsx` (optimistic
  toggles with rollback). Admin UI:
  `app/dashboard/admin/businesses/[businessId]/modules/page.tsx`.
- `BusinessController` split into module partials
  (Customers/Staff/Appointments/Analytics).

### 1.5 Tests & docs — ✅ PARTIAL
- Backend: `ModuleEntitlementServiceTests` + `ModuleEntitlementCacheTests`
  (16 entitlement/cache tests, green) and existing service/controller suites.
- Frontend: Jest + RTL toolchain present; 17 tests pass (store + validations).
- `docs/modules-entitlements.md` documents the system, endpoints, invalidation
  audit, security model, performance targets.

---

## 2. What is NOT done (gaps vs the original plan)

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| G1 | **`[RequireModule]` is not applied to any backend controller** | **Critical** | The filter exists but zero endpoints are decorated. The backend currently performs *no* module enforcement even with the toggle on. |
| G2 | **No back-compat `pro` grant is seeded** | **Critical** | `ModuleCatalogSeeder` does not create `business_subscriptions` for existing businesses. When enforcement flips on, every existing business loses all non-Core modules (no subscription → no access). |
| G3 | **Enforcement toggle is still `false`** | High | Correct during rollout, but with G1+G2 unfixed it cannot be flipped safely. |
| G4 | **No subscription lifecycle / billing** | High | Nothing creates/expires/renews `business_subscriptions`. `status/ends_at` fields exist; no service, scheduler, or webhook (M-Pesa/Stripe). Expiry is only evaluated at cache-miss time (≤60s grace past `ends_at`). |
| G5 | **Legacy nav arrays are half-dead** | Medium | `layout.tsx` computes `customerNav/businessNav/staffSideNav/adminNav` then `void`s them — but `staffBottomNav[0]`/`[1]` are **still used** for the floating Scan buttons (~lines 620, 786). Blind deletion breaks the staff shell. |
| G6 | **No fine-grained permission checks in services** | Medium | `IPermissionService` exists but no service calls `HasPermission`/`CanAsync` (e.g. staff `appointments.manage` denial, `createOnBehalf`). |
| G7 | **`ValidateConfiguration` not implemented** | Medium | Plan §14.1 authoring-time dependency validation for plan/override changes is missing (admin can create override sets with missing deps). |
| G8 | **Pre-existing test failures** | Medium | `BusinessAnalyticsCadenceTests` ×3 fail on the current working tree (unrelated to modules but blocks the "all green" production gate). |
| G9 | **No catalog-sync test** | Medium | Plan requires a test asserting `ModuleSeedData` (DB) == `ModuleCatalog` (code) == manifest ids (frontend). Keys currently match by convention only. |
| G10 | **`ModuleAccessMiddleware` (coarse gate) not built** | Low | Optional per plan; the `[RequireModule]` filter layer suffices once G1 lands. |
| G11 | **Pricing is cosmetic** | Low | Owner UI shows static client-side add-on prices; server-side plan pricing exists but there is no purchase/upgrade flow. |
| G12 | **No frontend module tests** | Low | `useModules`/`useModuleNav`/`RequireModule`/nav-generation tests are absent (only store/validation tests exist). |
| G13 | **Stray artifacts** | Low | `wrap-pages.ps1`, `IMPLEMENTATION_PROMPT_PHASES_*.md`, `phases-7-9-implementation.md` should be archived/removed. |
| G14 | **OutputCache doc drift** | Low | `docs/analytics-query-performance-fix-*.md` claims OutputCache policies (`analytics`,`dashboard`, vary-by Authorization) exist; `Program.cs` has no `AddOutputCache` — `UseOutputCache()` is a no-op. Implement or correct docs. |
| G15 | **Rate limiting on `/v1/me/modules`** | Low | Covered by `general` policy only; fine for now, revisit if abused. |

---

## 3. What needs improvement (quality issues in current implementation)

1. **Cached entitlement result is a shared mutable object** —
   `GetBusinessModulesAsync` returns the same cached instance to every caller
   within the TTL. Read-only today, but a defensive copy (or immutable
   record) removes the foot-gun.
2. **Owner override semantics divergence** — the original plan let owners
   enable add-ons their plan lacks; the implementation deliberately blocks
   self-enabling Premium/Enterprise. This is the *safer* behavior — keep it
   (documented in `docs/modules-entitlements.md`) and surface it in UI copy.
3. **Customer entitlements ignore the business plan** — `me/modules` for
   customers uses catalog `RequiredRoles`, not their business's entitlements.
   Acceptable while customer modules are Core/read-side; revisit if a gated
   customer-facing module is added.
4. **`me/modules` empty fallback** — a Business/Staff caller with no
   resolvable business gets empty entitlements (frontend fails open). Add a
   distinct error code so the UI can prompt a fix instead of failing open.
5. **Admin override `reason` is only logged, not persisted** — add a nullable
   `Reason` column to `business_modules` in the next migration.
6. **Enforcement-off pass-through is untestable** — `HasModuleAsync` returns
   `true` while the toggle is off; add toggle-on integration tests before
   flipping.
7. **Commit hygiene** — the module migration, feature work, and unrelated
   changes are mixed in one working tree; needs to be split (Step 0).

---

## 4. Step-by-step plan — complete the module system & reach production stability

### Step 0 — Commit hygiene (prerequisite)
- [ ] Commit the working tree in logical commits: module data layer →
  engine+authz → API → frontend registry+nav → owner/admin UI → tests/docs.
- [ ] Delete `wrap-pages.ps1`; archive `IMPLEMENTATION_PROMPT_PHASES_*.md` and
  `phases-7-9-implementation.md` into `docs/archive/`.
- [ ] Set up CI gating on: `dotnet build`, `dotnet test`, `tsc --noEmit`,
  `npm test`, `npm run build`.

### Step 1 — Stabilize the base (G8)
- [ ] Fix the 3 failing `BusinessAnalyticsCadenceTests`.
- [ ] Full suites (`dotnet test`, `npm test`, `npm run build`) 100% green.
  **Nothing else proceeds until this passes.**

### Step 2 — Catalog sync test (G9)
- [ ] `ModuleCatalogSyncTests`: every `ModuleCatalog.Modules` key exists in
  `ModuleSeedData`; every frontend manifest id in `punched-pwd/registry/modules`
  matches a catalog key; every seeded plan module's dependencies are also
  seeded (seed-level subset of G7).

### Step 3 — Back-compat `pro` grant (G2) — MUST precede enforcement
- [ ] Extend `ModuleCatalogSeeder` with an idempotent one-time grant: every
  existing `Business` with no active `business_subscriptions` row gets a `pro`
  subscription (`status="active"`, no `ends_at`). Guard with a one-shot marker
  (config flag or provenance column) so it never re-runs.
- [ ] Verify the seeder runs in production (not gated behind demo `SeedOptions`).
- [ ] Tests: existing business without subscription → gets `pro` → non-Core
  accessible; second boot adds no duplicate rows.

### Step 4 — Wire backend enforcement (G1, G6, G7, G10)
- [ ] Decorate module-rooted endpoints with `[RequireModule("…")]`:
  `BusinessController.Customers`→`customers`; `.Staff`→`staff`;
  `.Appointments` + business/staff routes of `AppointmentController`→`appointments`;
  `.Analytics`→`analytics`; `Stamp`/`Qr` scan routes→`stamps`;
  `LoyaltyProgram`/`LoyaltyCard`→`loyalty`; `Redemption`→`rewards`;
  `Referral`→`referral`; `ServiceCatalog`→`serviceCatalog`.
- [ ] Leave open (Core/platform): auth, `me/modules`, notifications/SSE,
  profile, admin routes.
- [ ] Emit `MODULE_DISABLED` in the standard `ApiResponse` error envelope so
  the frontend renders `UpgradePrompt`.
- [ ] Implement `ValidateConfiguration(planModules)` on
  `IModuleEntitlementService`; call it in admin override PUT (400 with missing
  deps, allow `force=true`).
- [ ] Add `IPermissionService.CanAsync` checks inside services for per-action
  rules (staff cannot `appointments.manage`; staff may `stamps.award`;
  `createOnBehalf` Business-only).
- [ ] Record decision: skip `ModuleAccessMiddleware` (filter layer suffices).

### Step 5 — Enforcement toggle flip (G3) — staged rollout
- [ ] Toggle-on integration tests (WebApplicationFactory + InMemory/SQLite):
  pro has all modules; starter lacks analytics; expired subscription removes
  non-Core; override beats plan; dependency closure accessible; cross-tenant
  isolation; admin bypass; customer read-side; unentitled → 403 MODULE_DISABLED.
- [ ] Flip `Modules:EnforcementEnabled=true` in staging; verify nav still
  matches for all four roles; watch 403 rates.
- [ ] Flip in production after a clean 48h staging soak AND confirmation the
  Step 3 grant ran ("Back-compat grant applied: N businesses" log line).

### Step 6 — Frontend tests & nav cleanup (G5, G12)
- [ ] Jest tests: `useModuleNav` generation for all role/plan combos
  (snapshot vs legacy arrays); hidden modules absent from nav AND mobile
  bottom bar; `<RequireModule>` blocks direct navigation with `UpgradePrompt`;
  `useModules` fail-open behavior; widgets respect `hasModule`.
- [ ] Refactor the two `staffBottomNav[N]` floating-button usages in
  `layout.tsx` to derive from `shellProfiles`/manifests, then delete all five
  legacy arrays and the `void` lines; keep the comparison as a test.

### Step 7 — Subscription lifecycle & billing (G4, G11)
- [ ] `ISubscriptionLifecycleService`: `ChangePlanAsync`, `ExpireAsync`,
  `RenewAsync`, `CancelAsync` — each calls
  `IModuleEntitlementService.Invalidate(businessId)`.
- [ ] Hosted `BackgroundService` to flip `active→expired` past `ends_at`
  daily + invalidate.
- [ ] Admin endpoint to assign/change a business's plan (manual billing path).
- [ ] Migration: persist override `reason` (nullable `Reason` column on
  `business_modules`).
- [ ] Owner upgrade flow: plan comparison + checkout (M-Pesa STK / Stripe
  webhook); webhook flips subscription + invalidates cache.
- [ ] Replace static `ADDON_PRICING` in the owner modules page with plan
  prices from the API.

### Step 8 — Cleanup (Phase 9 completion)
- [ ] Remove `Modules:EnforcementEnabled` / `ModuleEnforcementOptions` /
  toggle check in `BusinessContext` — fail-closed forever after.
- [ ] Remove dead nav remnants + `void` statements; run lint.
- [ ] Resolve OutputCache drift (G14): implement the documented
  `analytics`/`dashboard` policies with `SetVaryByHeader("Authorization")` or
  fix the stale doc; keep `/v1/me/modules` un-cached at the HTTP layer.
- [ ] Update `docs/modules-entitlements.md` status + API reference.

### Step 9 — Production hardening & acceptance
- [ ] Security checklist: grep audit for client-supplied `businessId` in authz;
  all admin routes `Roles="Admin"`; tenant scoping on new queries; rate-limit
  review on `me/modules` (G15).
- [ ] Performance: `me/modules` P95 < 50ms cached; nav generation < 10ms;
  `PermissionMatrix` static; one businessId resolution per request.
- [ ] Observability: metrics for `MODULE_DISABLED` 403s + entitlement cache
  hit rate (override mutations already logged).
- [ ] Acceptance: all CI suites green, enforcement on, toggle removed,
  back-compat grant confirmed, docs current.

---

## 5. Key files map (current state)

| Area | Path | State |
|------|------|-------|
| Catalog (authority) | `PunchedApi/Application/Modules/ModuleCatalog.cs` | done |
| Engine | `PunchedApi/Application/Services/{I,}ModuleEntitlementService.cs` | done (+cache/Invalidate) |
| Authz | `PunchedApi/Application/Authorization/{BusinessContext,PermissionMatrix,IPermissionService}.cs` | done |
| Filter | `PunchedApi/API/Filters/RequireModuleAttribute.cs` | built, **unused** |
| Controllers | `ModulesController.cs`, `AdminModulesController.cs`, `BusinessController.*.cs` | done |
| Toggle | `PunchedApi/appsettings.json` → `Modules:EnforcementEnabled` | `false` |
| Seeder | `PunchedApi/Infrastructure/Data/Seeding/ModuleCatalogSeeder.cs` | catalog only, **no pro grant** |
| FE registry | `punched-pwd/registry/` (12 manifests + shells) | done |
| FE hooks | `punched-pwd/hooks/{useModules,useModuleNav}.ts` | done |
| FE guards | `punched-pwd/components/modules/{RequireModule,UpgradePrompt}.tsx` | done; applied to ~18 pages |
| Nav shell | `punched-pwd/app/dashboard/layout.tsx` | uses `useModuleNav`; legacy arrays half-dead (`staffBottomNav` still referenced) |
| Owner/Admin UI | `.../business/profile/modules/`, `.../admin/businesses/[businessId]/modules/` | done |
| Docs | `docs/modules-entitlements.md` | current |
| Tests | `PunchedApi.Tests/ModuleEntitlement{Service,Cache}Tests.cs` | green |

*Decisions of record:* keep the fail-safe owner-toggle rule (no self-enabling
Premium/Enterprise) and the catalog-based customer entitlements — both are
safer than the original plan wording and are documented.


