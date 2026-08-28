# Phases 7-9 Implementation Prompts

## Phase 7: Business Module Overrides UI

### Context

Phases 1-6 are complete. The enforcement toggle exists but the ability for business owners to toggle add-on modules is not yet built. Phase 7 adds the override management UI and API endpoints.

### 7.1 Backend: Override Management Endpoints

**PUT `/v1/businesses/me/modules/{moduleKey}`**
- Authorization: `[Authorize(Roles="Business")]` + ownership verification
- Body: `{ "enabled": true }`
- Behavior: Upsert `business_modules` row with `source=OVERRIDE`
- Invalidate `IModuleEntitlementService` cache

**DELETE `/v1/businesses/me/modules/{moduleKey}`**
- Removes the override, reverting to plan-driven entitlement

**Files:**
- `ModulesController.cs` — add override methods
- `IModuleEntitlementService.cs` — add `Invalidate(Guid businessId)`

### 7.2 Backend: Admin Override Endpoints

**PUT `/v1/admin/businesses/{businessId}/modules/{moduleKey}`**
- Authorization: `[Authorize(Roles="Admin")]`
- Body: `{ "enabled": true, "reason": "Enterprise custom agreement" }`

**File:** `AdminModulesController.cs` (new)

### 7.3 Frontend: Owner Module Management

**File:** `punched-pwd/app/dashboard/business/profile/modules/page.tsx`

Features:
- List all modules with metadata (name, description, icon, visibility)
- Toggle switches for add-on modules
- Display pricing for paid add-ons
- Optimistic UI updates with rollback on failure
- Call `invalidateCache("modules:")` after toggle

### 7.4 Frontend: Admin Module Management

**File:** `punched-pwd/app/dashboard/admin/businesses/[id]/modules/page.tsx`

Features:
- Search businesses
- View business's current plan and effective modules
- Force-enable/disable any module with reason field

---

## Phase 8: Testing & Hardening

### 8.1 Cache Invalidation Hardening

Audit all mutation points:
- `BusinessService.ChangePlanAsync` → `moduleEntitlementService.Invalidate(businessId)`
- `ModulesController` override endpoints → already invalidate
- `AdminModulesController` → invalidate
- `SubscriptionLifecycleService` → handle expiry/renewal

### 8.2 OutputCache Review

Ensure `GET /v1/me/modules` is NOT output-cached without proper vary-by.

### 8.3 Comprehensive Test Matrix

Backend integration tests:
- Pro business has all modules
- Starter business lacks analytics
- Expired subscription removes non-Core modules
- Override takes precedence over plan
- Dependency closure works
- Cross-tenant isolation
- Admin bypasses module checks
- Customer gets customer-facing modules

Frontend tests:
- Nav generation for all role/plan combinations
- Hidden modules absent from nav
- Direct navigation blocked
- Widgets respect entitlements

### 8.4 Security Review

- `IBusinessScopeResolver` used for ALL module authorization
- Cross-tenant queries properly scoped
- Admin endpoints require Admin role
- No client-supplied businessId for authorization

---

## Phase 9: Migration & Cleanup

### 9.1 Remove Enforcement Toggle

After enforcement has been live and stable:
- Remove `Modules:EnforcementEnabled` config
- Remove toggle checks in `BusinessContext`
- Remove `ModuleEnforcementOptions` class

### 9.2 Remove Legacy Nav Arrays

- Delete `customerNav`, `businessNav`, `staffSideNav`, `staffBottomNav`, `adminNav` from `layout.tsx`
- Keep only `useModuleNav(scope)` calls

### 9.3 Back-Compat Grant Cleanup

After grace period, remove the one-time `pro` plan grant for existing businesses.

### 9.4 Documentation

- Update API docs with new endpoints
- Document module entitlement system
- Add inline XML comments to key classes

### 9.5 Performance Targets

- `GET /v1/me/modules` P95 < 50ms (cached)
- `BusinessContext` resolves businessId once per request
- `PermissionMatrix` is static (no DB hits)
- Frontend nav generation < 10ms
