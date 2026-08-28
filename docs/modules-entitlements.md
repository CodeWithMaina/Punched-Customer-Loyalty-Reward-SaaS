# Module Entitlement System

The plugin-based modular architecture gates features per business via
**module entitlements**: plan grants layered with per-business overrides,
gated by subscription status. The backend is the security boundary; the
frontend uses the same data only for UX (nav, upgrade prompts).

## Resolution order

1. Plan grants — `business_subscriptions` → `subscription_plans` → `plan_modules`
2. Dependency closure — dependencies of entitled modules are accessible (§14.1)
3. Overrides — `business_modules` rows win over the plan (`source`: `OVERRIDE` owner toggle, `ADMIN` platform grant)
4. Subscription gate — `status ∈ {active, trial}` and `ends_at` in the future, else no access

Effective module set per business is cached (`IMemoryCache`, 60 s TTL) and
must be invalidated on every entitlement mutation via
`IModuleEntitlementService.Invalidate(businessId)`.

## API endpoints

| Method | Route | Role | Purpose |
|--------|-------|------|---------|
| GET | `/v1/me/modules` | any auth | Caller's effective modules + permissions (server-resolved tenant) |
| GET | `/v1/businesses/me/modules` | Business | Full per-module detail for the owner's management view |
| PUT | `/v1/businesses/me/modules/{moduleKey}` | Business | Owner toggle → upsert `business_modules` (`source=OVERRIDE`) |
| DELETE | `/v1/businesses/me/modules/{moduleKey}` | Business | Remove the owner override, revert to plan |
| GET | `/v1/admin/businesses/{businessId}/modules` | Admin | Target business's entitlement detail |
| PUT | `/v1/admin/businesses/{businessId}/modules/{moduleKey}` | Admin | Force on/off (`source=ADMIN`), reason logged |
| DELETE | `/v1/admin/businesses/{businessId}/modules/{moduleKey}` | Admin | Remove any override, revert to plan |
| GET | `/v1/modules/entitlements/{businessId}` | Admin | Diagnostic entitlement resolution |

Rules enforced by the owner toggle: Core modules cannot be disabled;
Premium/Enterprise modules cannot be self-enabled (plan upgrade or admin
grant required → `403 PLAN_UPGRADE_REQUIRED`).

## Cache invalidation points (Phase 8 audit)

- `ModulesController` override PUT/DELETE → `Invalidate(businessId)` ✅
- `AdminModulesController` PUT/DELETE → `Invalidate(businessId)` ✅
- Subscription mutations (expiry/renewal/plan change): the 60 s TTL bounds
  staleness; when a billing/subscription service is added it must call
  `Invalidate(businessId)` on every `business_subscriptions` mutation.
  Note: expiry gating is evaluated at resolution time, so a cached result
  can grant up to 60 s past `ends_at` — acceptable, but the lifecycle
  service should invalidate proactively.

## Caching / output cache review

`GET /v1/me/modules` is **not** output-cached (no `AddOutputCache` policies
exist; the middleware is a no-op passthrough). Only the service-level
per-business cache applies, which is invalidated as above.

## Security model

- Business/tenant is **always resolved server-side** (`IBusinessContext` /
  `IBusinessScopeResolver`); `businessId` is never accepted from client
  input for authorization.
- Owner endpoints act only on the caller's own resolved business.
- Admin endpoints require the `Admin` role and validate the target business
  exists (404 on unknown ids to prevent probing).
- Overrides/audit: `OverriddenByUserId`, `OverridesAt` recorded; admin
  actions log the supplied reason at Warning level.

## Performance

- Entitlement resolution: one indexed query set per cache miss, 60 s TTL.
- `BusinessContext` resolves businessId once per request and memoizes the
  effective module set — every `[RequireModule]` check is in-memory.
- `PermissionMatrix` is static; no DB hits.
- Frontend nav generation is a pure registry filter (`useModuleNav`).

## Deferred cleanup (requires enforcement live + stable)

Phase 9 items intentionally **not** executed yet, per their preconditions:

1. Remove `Modules:EnforcementEnabled` toggle / `ModuleEnforcementOptions`
   (flip-on first, observe, then remove — fail-closed afterwards).
2. Delete legacy nav arrays from `app/dashboard/layout.tsx` once
   `useModuleNav` output is regression-verified for all four roles.
3. Remove the one-time back-compat `pro` plan grant seed.
