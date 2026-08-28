# Implementation Prompt: Steps 4–6 — Backend Enforcement, Toggle Flip, Frontend Tests & Nav Cleanup

## ⚠️ ABSOLUTE CONSTRAINTS — READ FIRST

1. **`main` must NEVER be touched.** All work continues on the existing
   branch **`plugin-stablization`** (no new branch, no merge, no rebase,
   no push to `main`). Verify with `git branch --show-current` before
   every commit — it must print `plugin-stablization`.
2. **Precondition:** Steps 0–3 are complete and green
   (`git log main..HEAD` contains the Step 0–3 commits; `dotnet test`
   passes; the back-compat `pro` grant is implemented and tested). If not,
   STOP and finish Steps 0–3 first (`IMPLEMENTATION_PROMPT_STEPS_0-3.md`).
3. **Enforcement flip rules:** `Modules:EnforcementEnabled` may only be set
   to `true` in a **staging/dev config** for integration tests
   (`appsettings.Development.json` or test-server fixture config). The
   committed **production `appsettings.json` stays `false`** — the actual
   production flip is an operations action (Step 5), not a code change.
4. Do **not** implement Steps 7–9 (billing, toggle removal, hardening).

## Context

Continue from `MODULE_SYSTEM_STATUS_AND_PLAN.md` §4. Steps 0–3 delivered:
clean branch, green suites, catalog-sync tests, and the idempotent
back-compat `pro` grant in `ModuleCatalogSeeder`. This prompt implements:

- **Step 4 (G1, G6, G7, G10)** — wire `[RequireModule]` onto module-rooted
  endpoints, add `ValidateConfiguration`, add fine-grained
  `IPermissionService` checks in services.
- **Step 5 (G3)** — toggle-on integration tests proving the full test
  matrix, then document the staged production flip (do NOT flip prod).
- **Step 6 (G5, G12)** — frontend Jest tests for the module system, then
  refactor the last `staffBottomNav` usages and delete the five legacy nav
  arrays from `layout.tsx`.

## Codebase conventions (source of truth)

- Filter: `PunchedApi/API/Filters/RequireModuleAttribute.cs` —
  `[RequireModule("moduleKey")]` on class or action; resolves via
  `IBusinessContext` (Admin bypass, Customer catalog read-side,
  Business/Staff entitlements + dependency closure); fail-open while
  `Modules:EnforcementEnabled=false`.
- Errors: every failure returns the `ApiResponse<T>` envelope
  (`ApiResponse<T>.Fail(code, message)`), HTTP 403 with
  `code = "MODULE_DISABLED"`.
- Tests: xUnit + EF InMemory (`PunchedApi.Tests/`); for filter/endpoint
  tests prefer `WebApplicationFactory<Program>` with InMemory/SQLite if the
  project already references it — otherwise test `BusinessContext` +
  `RequireModuleAttribute` directly with a stubbed `IBusinessContext`
  (check what's available before choosing; do not add heavy deps).
- Frontend: Jest + RTL configured (`npm test`); registry in
  `punched-pwd/registry/`, hooks in `punched-pwd/hooks/`, guards in
  `punched-pwd/components/modules/`; legacy nav arrays at the top of
  `app/dashboard/layout.tsx`.

---

## Step 4 — Wire backend enforcement (G1, G6, G7, G10)

### 4.1 Apply `[RequireModule]` to module-rooted endpoints

Read each controller first; add attributes at the **narrowest correct
scope** (class-level when every action shares the module, action-level
when mixed). Never place `[RequireModule]` on Core/platform routes.

| Controller / partial | Module key |
|---|---|
| `BusinessController.Customers.cs` (all actions) | `customers` |
| `BusinessController.Staff.cs` (all actions) | `staff` |
| `BusinessController.Appointments.cs` + business/staff-scope actions of `AppointmentController.cs` | `appointments` |
| `BusinessController.Analytics.cs` | `analytics` |
| `StampController.cs` (award/scan/history routes) | `stamps` |
| `QrController.cs` (stamp-scanning routes only) | `stamps` |
| `LoyaltyProgramController.cs`, `LoyaltyCardController.cs` | `loyalty` |
| `RedemptionController.cs` | `rewards` |
| `ReferralController.cs` | `referral` |
| `ServiceCatalogController.cs` | `serviceCatalog` |

Leave WITHOUT `[RequireModule]`: auth, `ModulesController` (`me/modules`,
owner/admin module management), `SseController`, notifications, user
profile, `AdminController`/`AdminModulesController` (platform-level),
customer explore/browse routes, health endpoints.

Customer-facing actions inside otherwise-gated controllers: check the
module's `RequiredRoles` in `ModuleCatalog`. If an action serves Customer
role and the module is customer-visible, keep the attribute (it enforces
the business-side entitlement while customers pass via `BusinessContext`).
If an action is Customer-only, do not gate it.

### 4.2 MODULE_DISABLED error shape

Confirm `RequireModuleAttribute` returns
`403 ApiResponse<object>.Fail("MODULE_DISABLED", "The <module name> module is not enabled for this business.")`.
Check `punched-pwd/lib/api/client.ts` error propagation and special-case
`MODULE_DISABLED` in the frontend error toast so `UpgradePrompt` messaging
surfaces (small, contained change).

### 4.3 ValidateConfiguration (G7)

- Add to `IModuleEntitlementService`:
  `IReadOnlyList<string> ValidateConfiguration(IEnumerable<(string ModuleKey, bool Enabled)> overrides)`
  returning problems like "module 'x' enabled without dependency 'y'".
- Wire into `AdminModulesController.SetBusinessModuleOverride`: validate the
  resulting override set; if problems exist and `Force` is false, return
  `400 ApiResponse.Fail("DEPENDENCY_MISSING", …)`. Add `Force` (bool,
  default false) to `AdminSetModuleOverrideRequest`.
- Unit tests: missing deps → problem listed; deps satisfied → empty list;
  `Force = true` bypasses.

### 4.4 Fine-grained permission checks (G6)

Inject `IPermissionService` where per-action rules exist; keep existing
tenant-scope checks intact. Rules:
- Staff creating/updating/canceling business appointments → requires
  `appointments.manage` (staff lacks it → 403 FORBIDDEN).
- Staff stamp awarding → requires `stamps.award` (staff has it → allowed).
- `createOnBehalf` booking → Business role already gates it; add the
  permission check only where a role gap exists.
- Distinct failure: `ApiResponse.Fail("FORBIDDEN", …)` 403 — never confuse
  with `MODULE_DISABLED`.
- Unit-test each rule at the service level.

### 4.5 Decision of record (G10)

Do NOT build `ModuleAccessMiddleware`. Add one comment in `Program.cs`
near `UseAuthorization()`:
`// Module gating is enforced per-endpoint via [RequireModule] filters (MODULE_SYSTEM_STATUS_AND_PLAN.md Step 4); no coarse middleware by design.`

Commit: `feat(modules): enforce module entitlements on module-rooted endpoints`.

---

## Step 5 — Toggle-on integration tests + staged flip (G3)

### 5.1 Toggle-on test suite

New file(s): `PunchedApi.Tests/ModuleEnforcementIntegrationTests.cs`.
Set `Modules:EnforcementEnabled = true` in the test fixture (via
`WebApplicationFactory` config override, or by constructing
`BusinessContext`/`RequireModuleAttribute` with
`Options.Create(new ModuleEnforcementOptions { EnforcementEnabled = true })`
if going the unit route — check what the test project already references
before choosing).

Full matrix (each is a test):
1. **Pro business has all modules** — every catalog key in
   `GetEffectiveModuleKeysAsync`.
2. **Starter business lacks analytics** — `analytics` absent.
3. **Expired subscription removes non-Core** — `ends_at` in the past →
   non-Core `HasAccess = false`.
4. **Override beats plan** — plan grants `analytics`, override (disabled)
   denies; enabled override grants outside plan (admin row).
5. **Dependency closure works** — module enabled whose deps are NOT
   explicitly enabled → deps accessible (closure), but absent from the
   explicit nav list.
6. **Cross-tenant isolation** — Business A's overrides never affect
   Business B; A cannot mutate B's modules via owner endpoints.
7. **Admin bypasses module checks** — `HasModuleAsync` true for any key.
8. **Customer gets customer-facing modules** — catalog `RequiredRoles`
   containing `Customer`, read-side only.
9. **Toggle off = fail-open** — `EnforcementEnabled=false` →
   `HasModuleAsync` true for any module (regression guard).
10. **Unentitled endpoint call → 403 MODULE_DISABLED** through the filter;
    entitled call passes through.

### 5.2 Staged production flip — DOCUMENT ONLY

Add a "Production rollout checklist" section to
`docs/modules-entitlements.md`: confirm the back-compat grant log line
("Back-compat pro grant applied to N businesses"), flip the toggle in
staging first, watch `MODULE_DISABLED` 403 metrics for 48h, then flip in
production. **Do not change production appsettings.json in code.** Setting
it `true` is allowed only in `appsettings.Development.json` for local
testing; note that in the doc.

Commit: `test(modules): toggle-on enforcement integration matrix + rollout checklist`.

---

## Step 6 — Frontend tests & nav cleanup (G5, G12)

### 6.1 Jest tests

New file `punched-pwd/registry/__tests__/useModuleNav.test.ts(x)` (or match
the existing test location conventions):
- **Nav generation for role × plan combos**: mock `useModules` with
  entitlement sets — full (pro), starter (no analytics), expired (core
  only), admin (all), customer (read-side). Assert generated `NavItem[]`
  per `shellProfiles` scope: entitled modules appear in order, non-entitled
  absent.
- **Hidden modules absent from nav AND mobile bottom bar**: no NavItem href
  of a locked module's route exists for reduced sets.
- **`<RequireModule>`**: children when entitled; `UpgradePrompt` fallback
  when not; neutral render while `isLoaded === false`.
- **`useModules` fail-open**: mock `modulesApi.getMyModules` rejection →
  `hasModule` true for all catalog ids; success with empty entitlements →
  closed set.
- **Widget gating**: one representative component using
  `hasModule("analytics")` renders its locked/upgrade variant when
  unentitled.

Mocking rules: `jest.mock("@/lib/api/modules")`; never hit the network;
use the real `moduleRegistry`/`closeDependencies` for genuine closure
semantics.

### 6.2 Delete the legacy nav arrays (G5)

In `app/dashboard/layout.tsx`:
1. The **only** remaining live references are `staffBottomNav[0]` and
   `staffBottomNav[1]` (floating Scan buttons, ~lines 620 and 786). First
   refactor: extend `registry/shells.ts` `ShellProfile` with optional
   `floatingActions?: NavItem[]` (staff: the Activity + Scan entries
   mirroring current `staffBottomNav`), expose via a small
   `useShellFloatingActions(scope)` helper, and use it at both call sites.
2. Verify visual parity: same labels/hrefs/icons/active states as before.
3. Then delete `customerNav`, `businessNav`, `staffSideNav`,
   `staffBottomNav`, `adminNav` and all `void …` lines; remove now-unused
   lucide imports.
4. `useModuleNav(scope)` remains the single source of `sideNavItems` and
   bottom-bar items.

Commit: `refactor(nav): derive staff floating actions from registry; delete legacy nav arrays`.

---

## Validation (all must pass, in order)

```
dotnet build PunchedApi -v q            # 0 errors, 0 warnings
dotnet test PunchedApi.Tests            # 0 failed (incl. enforcement matrix)
cd punched-pwd && npx tsc --noEmit      # clean
npm test                                # all green (incl. new nav/guard tests)
npm run build                           # production build succeeds
git branch --show-current               # plugin-stablization
git status --short                      # clean
git log main..HEAD --oneline            # only this work; main untouched
grep -n "EnforcementEnabled" PunchedApi/appsettings.json   # still false
```

## Important notes

1. Production `appsettings.json` keeps `"EnforcementEnabled": false`. Only
   test fixtures / `appsettings.Development.json` may set true.
2. With the toggle off, all endpoints behave exactly as today — the
   `[RequireModule]` attributes must be no-ops in the default config
   (fail-open). The toggle-on suite proves they will bite when flipped.
3. `main` remains read-only; every commit lands on `plugin-stablization`.
4. Do not start Steps 7–9 (billing, toggle removal, OutputCache work).

---

*Follows `MODULE_SYSTEM_STATUS_AND_PLAN.md` §4 Steps 4–6.*
