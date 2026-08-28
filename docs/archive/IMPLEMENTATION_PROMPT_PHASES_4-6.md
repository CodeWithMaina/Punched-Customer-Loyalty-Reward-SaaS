# Implementation Prompt: Phases 4-6 — Module Endpoint, Backend Enforcement & Frontend Registry

## Context

You are continuing the plugin-based modular SaaS architecture implementation for the Punched Customer Loyalty Reward platform. Phases 1-3 are complete: database tables (`modules`, `subscription_plans`, `plan_modules`, `business_subscriptions`, `business_modules`), seed data, and `IModuleEntitlementService` now exist.

This continues the plan in `plugin-module-architecture-plan.md` (§17 Role & Permission Architecture, §18 Backend Architecture Changes, §19 Frontend Architecture Changes, §21 Navigation Architecture, §23 API Changes).

**Goal of Phases 4-6:**
- **Phase 4:** Expose entitlements via `GET /v1/me/modules` + add the permission matrix
- **Phase 5:** Enforce module access on the backend (`[RequireModule]` + `403 MODULE_DISABLED`), behind an enforcement toggle
- **Phase 6:** Build the frontend module registry, `useModules` hook, guards, and dynamic navigation

**Key principles:**
- Do NOT rewrite working business logic — enforcement is additive
- The enforcement toggle `Modules:EnforcementEnabled` defaults to **false** during rollout; the guards return "allowed" while the UI iterates on real entitlement data
- Existing codebase conventions are the source of truth: `[Route("v1/...")]` controllers, `ApiResponse<T>` envelope, `apiClient` (axios, base `http://localhost:5000/v1`), `cachedFetch` from `punched-pwd/lib/api/cache.ts` (no TanStack Query), Zustand `authStore`, server-side business resolution (never trust client-supplied `businessId`)

---

## Phase 4: `/v1/me/modules` Endpoint + Permission Matrix

### Objective
Create the backend module catalog (code), the role→permission matrix, and the endpoint that returns the caller's effective modules and permissions. This is what the frontend will consume for navigation and gating.

### Files to Create

#### 4.1 Backend Module Catalog (code is the runtime authority)

**File:** `PunchedApi/Application/Modules/ModuleCatalog.cs`
```csharp
namespace PunchedApi.Application.Modules;

public enum ModuleVisibility { Core, Standard, Premium, Enterprise, Internal }

public sealed record ModuleDefinition(
    string Key,
    string Name,
    string Description,
    string Version,
    ModuleVisibility Visibility,
    IReadOnlyList<string> Dependencies,
    IReadOnlyList<string> RequiredRoles,
    IReadOnlyList<PermissionDefinition> Permissions
);

public sealed record PermissionDefinition(string Code, IReadOnlyList<string> Roles);

public static class ModuleCatalog
{
    public static readonly IReadOnlyList<ModuleDefinition> Modules = new[]
    {
        new ModuleDefinition(
            Key: "customers", Name: "Customers",
            Description: "Customer management and profiles",
            Version: "1.0.0", Visibility: ModuleVisibility.Core,
            Dependencies: Array.Empty<string>(),
            RequiredRoles: new[] { "Business", "Staff" },
            Permissions: new[]
            {
                new PermissionDefinition("customers.view",   new[] { "Business", "Staff" }),
                new PermissionDefinition("customers.manage", new[] { "Business" }),
            }),
        // staff, settings: Core, same pattern (mirror ModuleSeedData keys)
        // appointments: deps [customers, staff], roles [Business, Staff, Customer]
        //   permissions: appointments.view (Business/Staff/Customer),
        //                appointments.manage (Business), appointments.create (Customer)
        // stamps: deps [customers], roles [Business, Staff, Customer]
        //   permissions: stamps.view (Business/Staff/Customer), stamps.award (Staff/Business)
        // loyalty: deps [customers, stamps], roles [Business, Customer]
        // rewards: deps [loyalty, stamps], roles [Business, Customer]
        // analytics: deps [], roles [Business]
        // programs: deps [loyalty], roles [Business]
        // notifications: deps [customers, staff], roles [Business, Staff, Customer]
    };

    public static ModuleDefinition? Find(string key) =>
        Modules.FirstOrDefault(m => m.Key.Equals(key, StringComparison.OrdinalIgnoreCase));
}
```

**IMPORTANT:** The catalog's `Key` values MUST match `ModuleSeedData` exactly. The DB `modules` table is the join target; the catalog is the metadata authority. Write out every module fully — do not leave comment placeholders.

#### 4.2 Permission Matrix + Permission Service

**File:** `PunchedApi/Application/Authorization/PermissionMatrix.cs`
```csharp
namespace PunchedApi.Application.Authorization;

/// <summary>
/// Static role→permission matrix. Single source of truth for fine-grained
/// operation checks. Seeded from ModuleCatalog.Permissions at startup.
/// </summary>
public static class PermissionMatrix
{
    private static readonly IReadOnlyDictionary<string, IReadOnlySet<string>> Matrix = Build();

    public static bool HasPermission(string role, string permissionCode) =>
        Matrix.TryGetValue(role, out var perms) && perms.Contains(permissionCode);

    private static IReadOnlyDictionary<string, IReadOnlySet<string>> Build()
    {
        var map = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var module in Modules.ModuleCatalog.Modules)
        foreach (var perm in module.Permissions)
        foreach (var role in perm.Roles)
        {
            if (!map.TryGetValue(role, out var set))
                map[role] = set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            set.Add(perm.Code);
        }
        return map.ToDictionary(kv => kv.Key, kv => (IReadOnlySet<string>)kv.Value.ToHashSet());
    }
}
```

**File:** `PunchedApi/Application/Authorization/IPermissionService.cs` + `PermissionService.cs`
```csharp
namespace PunchedApi.Application.Authorization;

public interface IPermissionService
{
    bool HasPermission(string role, string permissionCode);
    Task<bool> CanAsync(System.Security.Claims.ClaimsPrincipal user, string permissionCode);
}

public class PermissionService : IPermissionService
{
    public bool HasPermission(string role, string permissionCode) =>
        PermissionMatrix.HasPermission(role, permissionCode);

    public Task<bool> CanAsync(ClaimsPrincipal user, string permissionCode)
    {
        var role = user.FindFirstValue(ClaimTypes.Role)
                   ?? user.FindFirstValue("role");
        return Task.FromResult(role != null && HasPermission(role, permissionCode));
    }
}
```
> Verify the actual role claim type used by `JwtTokenService` before finalizing `CanAsync` — read `PunchedApi/Application/Services/JwtTokenService.cs` and match it exactly.

#### 4.3 Modules Controller

**File:** `PunchedApi/API/Controllers/ModulesController.cs`
```csharp
[Authorize]
[Route("v1/me")]
public class ModulesController : ControllerBase
{
    // GET v1/me/modules
    // Returns the caller's effective modules + permissions, scoped to the
    // SERVER-RESOLVED business (IBusinessScopeResolver) — no businessId param.
    [HttpGet("modules")]
    public async Task<IActionResult> GetMyModules() { ... }
}
```

Response shape (wrapped in the existing `ApiResponse<T>` envelope):
```json
{
  "success": true,
  "data": {
    "entitlements": ["customers", "staff", "appointments", "stamps"],
    "permissions": ["customers.view", "appointments.view", "appointments.create"],
    "plan": { "key": "pro", "name": "Pro", "status": "active", "endsAt": null }
  }
}
```

Implementation notes:
1. Resolve role: Admin users get **all active catalog modules + their permissions** (admin is platform-level, not business-scoped). Business/Staff resolve via `IBusinessScopeResolver` → `businessId`; Customer users get modules from the **customer-facing visibility** of their business's plan (Bookings, Stamps, Rewards) — derive from the entitlement result, not a separate query.
2. Call `IModuleEntitlementService.GetEffectiveModuleKeysAsync(businessId)`, then join with `ModuleCatalog` for display metadata and `PermissionMatrix` for the caller's permission codes (filtered to entitled modules).
3. **Dependency closure:** treat a module's dependencies as available for access purposes even if not separately enabled (per plan §14.1). Effective nav list = explicit entitlements; access set = entitlements + closed dependencies.
4. When `Modules:EnforcementEnabled=false`, this endpoint STILL returns realistic data (it must — the frontend iterates against it).

Also add `GET /v1/businesses/me/modules` (`[Authorize(Roles="Business")]`) returning the full per-module detail (enabled, source, dependencies) for the owner's module-management view.

#### 4.4 Register in DI

**File:** `PunchedApi/Program.cs`
```csharp
builder.Services.AddScoped<IPermissionService, PermissionService>();
```
(`IModuleEntitlementService` was registered in Phase 3.)

#### 4.5 Frontend API client + types

**File:** `punched-pwd/lib/api/modules.ts`
```typescript
import apiClient from "./client";
import { cachedFetch } from "./cache";
import type { ApiResponse } from "../types";

export interface MyModulesResponse {
  entitlements: string[];
  permissions: string[];
  plan: { key: string; name: string; status: string; endsAt: string | null } | null;
}

export const modulesApi = {
  getMyModules: () =>
    cachedFetch("modules:me", () =>
      apiClient.get<ApiResponse<MyModulesResponse>>("/me/modules").then((r) => r.data),
      60_000
    ),
  // invalidateCache("modules:") must be called after any module/plan change
};
```
**File:** `punched-pwd/types/index.ts` — extend with `MyModulesResponse` if the codebase keeps API types there (check where `ApiResponse` lives and follow that pattern).

---

## Phase 5: Backend Module Enforcement

### Objective
Enforce module entitlement on module-rooted API endpoints — after authentication and AFTER server-side tenant resolution — returning `403 MODULE_DISABLED` when a business lacks a module. All enforcement sits behind the `Modules:EnforcementEnabled` toggle (default **false**).

### Files to Create

#### 5.1 Enforcement toggle

**File:** `PunchedApi/appsettings.json`
```json
"Modules": { "EnforcementEnabled": false }
```

**File:** `PunchedApi/Application/Modules/ModuleEnforcementOptions.cs`
```csharp
public class ModuleEnforcementOptions
{
    public const string SectionName = "Modules";
    public bool EnforcementEnabled { get; set; }
}
```
Register: `builder.Services.Configure<ModuleEnforcementOptions>(builder.Configuration.GetSection(ModuleEnforcementOptions.SectionName));`

#### 5.2 Request-scoped business context (resolve once per request)

**File:** `PunchedApi/Application/Authorization/BusinessContext.cs`
```csharp
public interface IBusinessContext
{
    Guid? GetBusinessId();          // resolves via IBusinessScopeResolver once, memoizes
    string? GetRole();
    HashSet<string> EffectiveModules { get; }  // populated lazily on first RequireModule hit
    bool HasModule(string moduleKey);
}
```
- Scoped lifetime. On first module check: resolve `businessId` (server-side, via the existing `IBusinessScopeResolver` pattern), call `IModuleEntitlementService.GetEffectiveModuleKeysAsync`, apply dependency closure, memoize. All subsequent `[RequireModule]` checks in the same request are in-memory lookups.
- **Admin role:** bypasses module checks (platform-level). **Customer role:** module entitlement derives from their business's plan (read-side only).
- If `Modules:EnforcementEnabled=false` → `HasModule` always returns `true` (log a warning-level metric if desired). This guarantees zero lockout during rollout.

#### 5.3 RequireModule authorization filter

**File:** `PunchedApi/API/Filters/RequireModuleAttribute.cs`
```csharp
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public class RequireModuleAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string _moduleKey;
    public RequireModuleAttribute(string moduleKey) => _moduleKey = moduleKey;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext ctx)
    {
        var businessContext = ctx.HttpContext.RequestServices
            .GetRequiredService<IBusinessContext>();

        if (!await businessContext.HasModuleAsync(_moduleKey))
        {
            ctx.Result = new ObjectResult(new {
                success = false,
                error = new { code = "MODULE_DISABLED",
                    message = $"The '{_moduleKey}' module is not enabled for this business." }
            }) { StatusCode = StatusCodes.Status403Forbidden };
        }
    }
}
```
> Order matters: this runs **after** `[Authorize]` (authentication) and after server-side tenant resolution inside `IBusinessContext`. Never read `businessId` from route/query/body for authorization.

#### 5.4 Error mapping

Every controller that gets `[RequireModule]` must map `MODULE_DISABLED` in its failure switch (the existing `result.Error?.Code` → HTTP mapping pattern, e.g. `MapFailure`). Extend the shared mapping helper if one exists; otherwise add the case per controller.

### Files to Modify (decorate with `[RequireModule]`)

| Controller | Module key(s) |
|------------|---------------|
| `PunchedApi/API/Controllers/BusinessController.cs` | Split into partial classes `.Customers.cs`, `.Staff.cs`, `.Analytics.cs`, `.Appointments.cs` with their own `[RequireModule]` — keep routes identical. **UNKNOWN — exact split boundaries require review of the ~960-line file** |
| `AppointmentController.cs` | `appointments` |
| `LoyaltyProgramController.cs`, `LoyaltyCardController.cs` | `loyalty` / `programs` (confirm per-endpoint) |
| `StampController.cs`, `QrController.cs` | `stamps` |
| `RedemptionController.cs` | `rewards` |
| `ReferralController.cs` | `referral` |
| `ServiceCatalogController.cs` | `serviceCatalog` |
| `InvitationController(s).cs` | `staff` |
| `SseController.cs` / notifications | **Core — leave open** |

Fine-grained operation checks (`IPermissionService.HasPermission`) go INSIDE services where per-action rules exist (e.g., staff `stamps.award` allowed, staff `appointments.manage` denied) — preserving existing tenant-scope checks.

### Validation

1. With toggle **off**: run the full existing test suite — zero behavior change.
2. With toggle **on** (local/staging only): call a module endpoint as a business whose plan lacks the module → expect `403 MODULE_DISABLED`; entitled → 200; wrong-role permission → existing `403 FORBIDDEN` behavior preserved.
3. Confirm no endpoint resolves business from client input for authorization.

---

## Phase 6: Frontend Module Registry + Dynamic Navigation

### Objective
Replace the hardcoded per-role nav arrays in `punched-pwd/app/dashboard/layout.tsx` (`customerNav`, `businessNav`, `staffSideNav`, `staffBottomNav`, `adminNav` — lines ~103-260) with registry-driven navigation generated from module manifests + `GET /v1/me/modules` entitlements. Add page-level guards so direct navigation to a disabled module shows an upgrade prompt instead of the page.

### Files to Create

#### 6.1 Registry types

**File:** `punched-pwd/registry/types.ts`
```typescript
import type { LucideIcon } from "lucide-react";

export type ShellScope = "Customer" | "Business" | "Staff" | "Admin";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  scope: ShellScope;
}

export interface ModuleManifest {
  id: string;                      // matches backend module key: "appointments"
  name: string;
  description: string;
  icon: LucideIcon;
  version: string;
  roles: ShellScope[];             // which shells it can appear in
  nav: NavItem[];                  // generated into the shell, filtered by entitlement
  requiredPermissions: string[];   // e.g. ["appointments.view"]
  dependencies: string[];          // e.g. ["customers", "staff"]
  routes: string[];                // matched client-side for direct-nav blocking
}

export interface ShellProfile {
  scope: ShellScope;
  moduleOrder: string[];           // nav ordering of module ids
  coreRoutes: NavItem[];           // always-present items (Dashboard, Settings)
}
```

#### 6.2 Per-module manifests

**File:** `punched-pwd/registry/modules/appointments.ts` (one per module; mirror ALL of them)
```typescript
import { CalendarDays } from "lucide-react";
import type { ModuleManifest } from "../types";

export const appointmentsModule: ModuleManifest = {
  id: "appointments",
  name: "Appointments",
  description: "Book, manage and track appointments.",
  icon: CalendarDays,
  version: "1.0.0",
  roles: ["Business", "Staff", "Customer"],
  nav: [
    { label: "Appointments", href: "/dashboard/business/appointments", icon: CalendarDays, scope: "Business" },
    { label: "Appointments", href: "/dashboard/staff/appointments",    icon: CalendarDays, scope: "Staff" },
    { label: "Appointments", href: "/dashboard/appointments",          icon: CalendarDays, scope: "Customer" },
  ],
  requiredPermissions: ["appointments.view", "appointments.manage"],
  dependencies: ["customers", "staff", "serviceCatalog"],
  routes: [
    "/dashboard/business/appointments",
    "/dashboard/staff/appointments",
    "/dashboard/appointments",
  ],
};
```
Create the same manifest for every module, migrating the CURRENT hrefs/labels/icons out of the hardcoded arrays in `layout.tsx` so the generated output matches today's nav: `customers`, `staff`, `appointments`, `loyalty`, `stamps`, `rewards`, `analytics`, `programs`, `notifications`, `referral`, `serviceCatalog`, `settings`. **Unknown hrefs must be confirmed by reading the existing arrays — do not invent routes.**

#### 6.3 Registry index + shell profiles

**File:** `punched-pwd/registry/modules.ts` — aggregates all manifests into `moduleRegistry: ModuleManifest[]` with `findModule(id)`.

**File:** `punched-pwd/registry/shells.ts` — role→shell profiles:
```typescript
export const shellProfiles: Record<ShellScope, ShellProfile> = {
  Customer: { scope: "Customer", moduleOrder: ["appointments", "stamps", "loyalty", "rewards", "referral"], coreRoutes: [/* Dashboard, etc. */] },
  Business: { scope: "Business", moduleOrder: ["customers", "staff", "appointments", "stamps", "loyalty", "analytics"], coreRoutes: [/* Dashboard, Settings */] },
  Staff:    { scope: "Staff", moduleOrder: ["appointments", "stamps", "customers"], coreRoutes: [/* Activity */] },
  Admin:    { scope: "Admin", moduleOrder: [], coreRoutes: [/* existing adminNav items — Admin is not entitlement-gated */] },
};
```

#### 6.4 Hooks

**File:** `punched-pwd/hooks/useModules.ts`
```typescript
export function useModules() {
  // calls modulesApi.getMyModules() via cachedFetch (already deduped/TTL'd)
  // returns { modules, hasModule(key), hasPermission(code), isLoaded, plan }
}
```
- `hasModule` checks the entitlement set (+ dependency closure client-side for access semantics — nav still only shows explicitly entitled modules).
- For the `Admin` role, `hasModule` always returns true.
- While `isLoaded === false`, render the nav skeleton/previous state — never flash "upgrade" prompts on first paint.

**File:** `punched-pwd/hooks/useModuleNav.ts`
```typescript
export function useModuleNav(scope: ShellScope): NavItem[] {
  // shellProfiles[scope].moduleOrder → moduleRegistry manifests →
  // keep manifest nav items with matching scope IF useModules().hasModule(id)
  // AND the user's role intersects manifest.requiredPermissions
  // → prepend shellProfiles[scope].coreRoutes → return final ordered NavItem[]
}
```

#### 6.5 Guards

**File:** `punched-pwd/components/modules/RequireModule.tsx` — wraps a page (client component):
```typescript
export function RequireModule({ module, children }: { module: string; children: ReactNode }) {
  const { hasModule, isLoaded } = useModules();
  if (!isLoaded) return null;            // or a skeleton
  if (!hasModule(module)) return <UpgradePrompt module={module} />;
  return <>{children}</>;
}
```

**File:** `punched-pwd/components/modules/UpgradePrompt.tsx` — locked-state card: module name/icon, short "not part of your current plan" copy, upgrade CTA (navigation target to be confirmed at implementation time). Also export a compact `<UpgradeBadge/>` variant for dashboard widgets.

### Files to Modify

| File | Change |
|------|--------|
| `punched-pwd/app/dashboard/layout.tsx` | Mount `useModules()`; replace `customerNav`/`businessNav`/`staffSideNav`/`staffBottomNav`/`adminNav` with `useModuleNav(scope)` output. Keep the desktop sidebar and mobile bottom bar rendering logic as-is — only the source of the arrays changes. Admin nav stays static (not entitlement-gated). |
| `punched-pwd/app/dashboard/business/**/page.tsx` | Wrap module-owned pages with `<RequireModule module="...">` |
| `punched-pwd/app/dashboard/business/page.tsx` | Gate module-owned widget sections with `hasModule(...)`; locked widgets show `<UpgradeBadge/>` |
| `punched-pwd/app/dashboard/staff/page.tsx`, `punched-pwd/app/dashboard/page.tsx` | Same widget gating |
| `punched-pwd/app/dashboard/{appointments,cards,explore}/**` | Wrap with the matching `RequireModule` |
| `punched-pwd/middleware.ts` | **No change required** — entitlements are not in the unverified token; module-level blocking stays client-side + API-enforced (the backend is the security boundary) |

### Behavioral rules

- **Navigation:** missing entitlement → item hidden (both desktop sidebar and mobile bottom bar; the bottom bar takes the first N generated items, matching how `staffBottomNav` works today).
- **Direct navigation** to a disabled module route → `RequireModule` renders `<UpgradePrompt/>` — never the page, never a data leak.
- **Widgets:** consult `hasModule`; locked → upgrade affordance instead of an error/empty state.
- **Role × module:** a nav item renders only if BOTH `hasModule(id)` AND the user's role intersects `manifest.roles`/`requiredPermissions`. Entitlement ≠ permission — keep the two checks separate.
- **Rollout safety:** until Phase 5's toggle is flipped on, the API returns full entitlements, so generated nav should exactly match today's arrays — regression-compare before deleting the old arrays.

---

## Validation & Testing (Phases 4-6)

### Backend
- `GET /v1/me/modules` returns correct entitlements/permissions per role (Business, Staff, Customer, Admin) and is tenant-scoped to the server-resolved business.
- Toggle **off**: entire existing test suite passes unchanged; guards are pass-through.
- Toggle **on** (staging): unentitled module → `403 MODULE_DISABLED`; entitled → normal behavior; permission denial still `403 FORBIDDEN`.
- Business A cannot influence Business B's modules (cross-tenant test on the new endpoints).

### Frontend
- Generated nav matches today's hardcoded arrays for all four roles (snapshot/regression-compare) while entitlements are full.
- With a reduced entitlement set: nav items hidden on desktop AND mobile bottom bar; direct navigation renders `UpgradePrompt`; dashboard widgets show upgrade affordances.
- No upgrade-prompt flash before `me/modules` loads.

---

## Important Notes

1. **The backend filter — not the UI — is the security boundary.** Frontend gating is UX only.
2. **Never resolve business/tenant from client input** for authorization; reuse the `IBusinessScopeResolver` pattern.
3. **Module keys must match everywhere**: `ModuleSeedData` (DB) = `ModuleCatalog` (backend) = manifest `id` (frontend), all lowercase.
4. **Do not introduce TanStack Query** — use `cachedFetch` per the established convention.
5. **Do not delete the old nav arrays** until the generated output is verified identical (cleanup happens in a later phase).
6. Cache invalidation: call `invalidateCache("modules:")` after any module/plan/override mutation.

---

## Next Steps (After Phase 6)

- **Phase 7:** Flip `Modules:EnforcementEnabled=true` after confirming the back-compat grant and backend tests
- **Phase 8:** Subscription lifecycle + billing hooks + owner/admin module-management UI (`/v1/businesses/me/modules/{moduleKey}` PUT, admin endpoints)
- **Phase 9:** Testing & hardening, then cleanup (remove toggle + dead nav arrays)

---

*This prompt follows the implementation plan in `plugin-module-architecture-plan.md` (§17-19, §21, §23).*