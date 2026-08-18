# PUNCHED — Multi-Tenant PWA Architecture Audit & Implementation Plan

## Executive Summary

Punched is a well-architected loyalty rewards SaaS platform with a single-tenant deployment model. The current codebase supports four roles (Customer, Staff, Business, Admin) under a single hostname (`punched.app`). **There is zero tenant awareness in the current architecture.** The existing PWA is a single installable app with a static manifest, shared service worker, and shared cache. Authentication uses JWT stored in localStorage with a cookie mirror for middleware — **no subdomain-aware cookie configuration exists**. The platform is ready for single-tenant production but requires significant architectural changes to support the desired multi-tenant PWA model where each business gets its own installable app, hostname, manifest, service worker, icons, and theme.

---

## 1. Current Architecture Overview

### Deployment Model
- Single Docker Compose deployment: `db` (PostgreSQL 16) → `api` (.NET 8) → `web` (Next.js 14)
- Single hostname: `punched.app` / `localhost:3000`
- Single frontend build with `NEXT_PUBLIC_API_URL` baked in at build time
- Docker health checks between services

### Frontend (punched-pwd)
- **Framework**: Next.js 14 App Router with `standalone` output
- **State**: Zustand with localStorage persistence (auth + theme)
- **API Client**: Axios with interceptors for token attachment and 401 auto-refresh
- **Auth**: JWT access + refresh tokens stored in localStorage; cookie mirror for middleware
- **Routing**: Role-based client-side routing via `useRoleGuard()` + middleware.ts
- **PWA**: Single manifest.ts, single sw.js, single PWAInstallPrompt component
- **Icons**: 2 SVG icons (192×192 and 512×512) — shared across all users
- **Theme**: 5 preset themes (blue, green, purple, amber, slate) via CSS custom properties — user-selectable, not tenant-driven

### Backend (PunchedApi)
- **Framework**: .NET 8 Web API with Controllers
- **Auth**: JWT Bearer authentication, symmetric HMAC-SHA256, role-based authorization
- **Database**: PostgreSQL 16 via EF Core, 12 entities, auto-migrate on startup
- **Tenancy**: Zero tenant resolution — business context is resolved via `OwnerId` from JWT claims
- **Middleware**: Only ExceptionMiddleware exists — no tenant resolution middleware
- **CORS**: Static list of allowed origins — no wildcard or dynamic origin support

---

## 2. Existing PWA Capabilities

| Aspect | Current State | Multi-Tenant Requirement |
|--------|--------------|--------------------------|
| **Manifest** | Single static `manifest.ts` returning hardcoded values | Dynamic per-business manifest with unique name, short_name, start_url, scope, icons, colors |
| **Service Worker** | Single `sw.js` with hardcoded `CACHE_NAME = "punched-v1"` | Scoped per tenant with unique cache name to prevent cross-tenant cache sharing |
| **Registration** | Single `/sw.js` registration | Dynamic registration URL per tenant or scoped registration |
| **Install Prompt** | Single prompt for "Punched" | Per-business install prompt with business name and icon |
| **Icons** | 2 shared SVG icons | Per-business icon set (192×192, 512×512, maskable, apple-touch) |
| **Offline** | Basic stale-while-revalidate for static assets | Per-business offline pages, cached assets |
| **Start URL** | `/` | `/` (with tenant context resolved from hostname) |
| **Scope** | `/` (default) | `/` per hostname (naturally scoped by subdomain) |
| **Theme Color** | `#2563EB` (hardcoded) | Per-business theme color from database |

---

## 3. Existing Authentication Architecture

### Current Flow
1. User registers via `POST /v1/auth/register` → email verification
2. User logs in via `POST /v1/auth/login` → receives JWT access token + refresh token
3. Tokens stored in **localStorage** under keys `punched_access_token` and `punched_refresh_token`
4. Cookie `access_token` written with `path=/; SameSite=Strict` — **no domain specified**
5. Axios interceptor attaches `Authorization: Bearer <token>` to all requests
6. 401 response triggers auto-refresh via `POST /v1/auth/refresh-token`
7. Next.js middleware.ts reads `access_token` cookie, decodes JWT without signature verification for role-based route protection

### Key Limitation for Multi-Tenant
- **Cookie has no domain attribute** — `SameSite=Strict` prevents cross-subdomain cookie sharing. When a user navigates from `acme.domain.com` to `elite.domain.com`, the cookie is not sent.
- **localStorage is per-origin** — `acme.domain.com` cannot access `elite.domain.com`'s localStorage
- **JWT contains role and userId but no businessId/tenantId** — the backend resolves business via `OwnerId` claim

### What Must Change
- Cookies must use `Domain=.domain.com` to work across subdomains
- JWT must include `businessId` or `tenantId` claim
- Token refresh must work across subdomains (requires cookie domain fix)
- Auth state must be shared across subdomains or re-fetched

---

## 4. Existing Tenant Architecture

### Current Tenant Resolution
- **Backend**: No tenant resolution middleware exists. Business context is resolved by looking up the authenticated user's relationship:
  - Business owner: `Business.OwnerId == userId`
  - Staff: `User.StaffBusinessId` → `Business`
  - Customer: `LoyaltyCard.BusinessId` from enrollment
- **Frontend**: No tenant context. The header label is fetched dynamically via `businessesApi.getMine()` or `businessesApi.getStaffBusiness()`
- **Database**: `Business` entity has NO `Slug`, `Domain`, or `Hostname` field
- **Migration**: 7 migrations, none add tenant-related columns

### What Must Change
- Add `Business.Slug` (unique, URL-safe) and `Business.Hostname` columns
- Create `TenantResolutionMiddleware` that reads `Host` header and resolves the business
- Inject `ITenantContext` into services for automatic query filtering
- Create tenant-to-hostname mapping (could be database table, DNS, or reverse proxy)

---

## 5. Existing Routing Architecture

### Next.js Routes
```
/                          → Splash → redirect to /dashboard or /login
/(auth)/login              → Login form
/(auth)/register           → Registration form
/(auth)/verify-email       → Email verification
/(auth)/forgot-password    → Password reset
/dashboard                 → Role-based redirect (customer landing)
/dashboard/admin/*         → Admin routes
/dashboard/business/*      → Business owner routes
/dashboard/staff/*         → Staff routes
/dashboard/cards/*         → Customer cards
/dashboard/explore/*       → Business discovery
/dashboard/profile         → Profile settings
/refer/[code]              → Referral deep link
```

### Role-Based Routing
- **Middleware layer**: Token decoded without signature verification → redirects based on role
- **Client layer**: `useRoleGuard(requiredRole)` hook → redirects if wrong role
- **Backend layer**: `[Authorize(Roles = "Business")]` attributes on controllers
- **No tenant-based routing exists** — no `[slug]` or `[tenant]` dynamic segments

### What Must Change
- Routes remain the same but are served from different hostnames
- Middleware must also resolve tenant from hostname
- Role-based redirects (e.g., `/dashboard` → `/dashboard/business`) must consider tenant context

---

## 6. Existing Branding Architecture

### Current Branding
- **Theme**: 5 hardcoded themes in `globals.css` as CSS custom properties, user-selectable via `themeStore.ts`
- **Logo**: Hardcoded `CreditCard` icon in dashboard layout, SVG icons in `/public/icons/`
- **Business Name**: Fetched dynamically via API and displayed in `DashboardLayout` header
- **Favicon**: Static `/icons/icon-192.svg` defined in `layout.tsx`
- **Colors**: No business-specific colors — all businesses share the same theme

### What Must Change
- **Dynamic CSS variables** per business: `--brand`, `--accent`, `--background` loaded from business profile
- **Dynamic favicon** via Next.js `route handler` or `generateMetadata`
- **Dynamic logo** per business
- **Splash screen** per business (PWA `background_color`)

---

## 7. Existing Service Worker Architecture

### Current SW (`public/sw.js`)
```javascript
const CACHE_NAME = "punched-v1";  // Single cache name — NOT tenant-aware
const STATIC_ASSETS = ["/", "/login", "/register", "/manifest.json", "/icons/*"];

// API calls: network-first with cache fallback
if (url.pathname.startsWith("/v1/") || url.pathname.startsWith("/api/")) { ... }

// Static assets: stale-while-revalidate
```

### Key Issues
- **Cache name is hardcoded** — `"punched-v1"` shared across all tenants
- **No tenant differentiation** — different tenants could accidentally share cached responses
- **No tenant-specific offline pages**
- **SW is registered as `/sw.js`** — scope is `/` (cannot be easily scoped per tenant)

### Recommendations
- Use hostname-based cache names: `"punched-v1-acme"`, `"punched-v1-elite"`
- Generate dynamic SW per tenant that includes only their cached assets
- Use `Cache-Control: private, no-cache` for API responses to prevent proxy caching
- Consider using Next.js PWA plugin or custom SW generation via API route

---

## 8. Existing Manifest Architecture

### Current Manifest (`app/manifest.ts`)
```typescript
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Punched — Loyalty Rewards',
    short_name: 'Punched',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563EB',
    icons: [
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
```

### Key Issues
- **Static function** — no request context (no `request` parameter in `MetadataRoute.Manifest`)
- **No tenant awareness** — same manifest for all businesses
- **SVG icons only** — some Android/iOS versions have inconsistent SVG support in PWA manifests
- **No `scope` property** — defaults to `/`

### What Must Change
- Manifest must be generated dynamically per hostname
- Next.js `manifest.ts` can access `headers()` from `next/headers` to read the hostname
- Per-business icons, name, start_url, theme_color, background_color
- Add PNG fallback icons for maximum compatibility

---

## 9. Infrastructure Assessment

### Current Infrastructure
- **Docker Compose** with 3 services: `db`, `api`, `web`
- **Single instance** of each service
- **No reverse proxy** configured (NGINX, Cloudflare, etc.)
- **CORS**: Static list of up to 4 origins
- **API URL**: Baked into frontend build via `NEXT_PUBLIC_API_URL` build arg
- **No CDN** for static assets

### Changes Required
- **Reverse proxy** (NGINX, Caddy, or Cloudflare) to route subdomains to the same backend
- **Wildcard DNS** `*.domain.com` pointing to the server
- **Dynamic CORS** — allow all subdomains via origin validation
- **API URL** must be relative or resolved from the hostname
- **SSL certificates** for all subdomains (wildcard SSL)
- **CDN** for tenant-specific icons and static assets

---

## 10. Gap Analysis

| Area | Current State | Desired State | Gap | Priority |
|------|--------------|---------------|-----|----------|
| **Tenant Resolution** | No tenant middleware; business resolved via JWT `OwnerId` | Hostname-based resolution via middleware | Must add `TenantResolutionMiddleware` + `Business.Hostname` field | **Critical** |
| **Business Entity** | No `Slug` or `Hostname` field | `Slug` (unique), `Hostname` (nullable, unique) | Migration + entity update | **Critical** |
| **Multi-Business User** | `User.StaffBusinessId` is single nullable Guid | Many-to-many business-user relationship | New join table + migration | **Critical** |
| **Authentication Cookies** | `SameSite=Strict`, no domain attribute | `Domain=.domain.com`, `SameSite=Lax` for subdomain sharing | Cookie configuration change | **Critical** |
| **JWT Claims** | Contains `userId`, `role`, `sub`, `email` | Add `businessId`/`tenantId` claim | JWT service update | **Critical** |
| **Manifest** | Static, single manifest for all | Dynamic per-hostname manifest | `manifest.ts` refactor | **High** |
| **Service Worker** | Single `sw.js`, shared cache | Per-tenant SW with isolated cache | Dynamic SW generation | **High** |
| **Icons** | 2 shared SVG icons | Per-business icon set (PNG + SVG) | Icon generation pipeline | **High** |
| **Branding** | User-selectable theme, not tenant-driven | Business-specific colors, logo, favicon | Dynamic CSS + metadata | **High** |
| **CORS** | Static origin list | Accept all subdomains via pattern | Dynamic CORS policy | **High** |
| **API URL** | Baked at build time via `NEXT_PUBLIC_API_URL` | Relative or hostname-resolved | Config change, reverse proxy | **High** |
| **Install Prompt** | Single "Install Punched" | Per-business install prompt | Component refactor | **Medium** |
| **Offline Support** | Basic offlining of static assets | Per-business offline pages, cached data | SW + offline strategy | **Medium** |
| **Role Separation** | Role-based routing works, but not isolated | Three distinct installable apps (Customer, Staff, Business) | PWA distribution strategy | **Medium** |
| **Infrastructure** | Single Docker Compose | Reverse proxy + wildcard DNS + SSL | Infrastructure setup | **High** |
| **Testing** | No multi-tenant tests | Full tenant isolation test suite | New test infrastructure | **Medium** |

---

## 11. Risks

### Technical Risks
1. **Service Worker Scope**: SW registered at `/sw.js` has scope `/`. Cannot be scoped to subdirectory. Must rely on hostname isolation.
2. **Cache Isolation**: Shared cache namespace `"punched-v1"` could leak data between tenants if SW is not properly scoped.
3. **Next.js Standalone Output**: The single Node.js server must handle all subdomains. Next.js 14 supports `host`-based routing via `rewrites()` or middleware.
4. **SSE Connections**: SSE currently uses cardId as the channel key. No hostname context.
5. **Build-time API URL**: `NEXT_PUBLIC_API_URL` is baked at build time — all subdomains must use the same API URL.

### Security Risks
1. **Cross-Tenant Data Leakage**: Without proper tenant query filtering, a user from one business could access another business's data.
2. **JWT Without Tenant Claim**: Current tokens don't carry tenant context — backend relies on ownership lookups.
3. **Cookie Domain**: Setting `Domain=.domain.com` makes cookies available to all subdomains, increasing CSRF surface area.
4. **SW Cache Poisoning**: Malicious tenant could inject cached content that serves to other tenants if cache isolation is broken.

### Migration Risks
1. **Existing Users**: Users already registered have JWT tokens without tenant claims. Migration must handle backward compatibility.
2. **Existing Businesses**: No `Slug` or `Hostname` values. Must generate slugs for existing businesses.
3. **Referral Links**: Current referral URLs use `/refer/[code]` on `punched.app`. Future URLs will be per-business hostname.
4. **Staff Single-Business Constraint**: Current `User.StaffBusinessId` only allows one business per staff member. Desired architecture requires many-to-many.

### Service Worker Risks
1. **SW Update Conflict**: Old SW cached on user devices may conflict with new per-tenant SW.
2. **Cache Stampede**: When deploying new SW, all tenants' caches are cleared simultaneously.
3. **Offline First Boot**: First-time visitor to a new subdomain has no cached assets.

### Deployment Risks
1. **Wildcard SSL**: Certificate management for dynamic subdomains.
2. **DNS Propagation**: New businesses need DNS entries before they can serve.
3. **Reverse Proxy Config**: Single point of failure; must handle routing for all tenants.

---

## 12. Recommended Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DNS / CDN                                 │
│              *.domain.com → Reverse Proxy                         │
│              (Cloudflare / NGINX / Caddy)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Reverse Proxy / Load Balancer                  │
│    Host: acme.domain.com → Rewrite: /api → backend:8080/v1       │
│    Host: acme.domain.com → Rewrite: /* → frontend:3000           │
│    Host: elite.domain.com → Rewrite: /api → backend:8080/v1      │
│    Host: elite.domain.com → Rewrite: /* → frontend:3000          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌──────────────────────┐      ┌──────────────────────┐
│   Next.js Frontend    │      │   .NET 8 API           │
│   (Single Instance)   │      │   (Single Instance)    │
│                       │      │                        │
│   /manifest.json      │───→  │   TenantResolution     │
│   (dynamic per host)  │      │   Middleware            │
│                       │      │                        │
│   /sw.js              │      │   ITenantContext        │
│   (dynamic per host)  │      │                        │
│                       │      │   All queries filtered  │
│   Middleware:          │      │   by BusinessId         │
│   - resolve tenant    │      │                        │
│   - set branding      │      └────────────────────────┘
│   - route guard       │                 │
└──────────────────────┘      ┌────────────┴────────────┐
                              │  PostgreSQL 16           │
                              │  ┌────────────────────┐  │
                              │  │ Business           │  │
                              │  │  - Slug (UNIQUE)   │  │
                              │  │  - Hostname(UNIQUE)│  │
                              │  │  - ThemeColor      │  │
                              │  │  - LogoUrl         │  │
                              │  └────────────────────┘  │
                              └─────────────────────────┘
```

### Key Design Decisions
1. **Single backend + single frontend instance** — no duplicate deployments
2. **Hostname-based tenant resolution** — backend reads `Host` header, resolves business
3. **Dynamic manifests** — Next.js manifest.ts reads `headers().get("host")` to generate per-tenant manifest
4. **Dynamic service workers** — SW generated via API route or Next.js handler
5. **Cookie domain change** — `Domain=.domain.com` for cross-subdomain auth
6. **JWT tenant claim** — `businessId` added for backend authorization
7. **Many-to-many business-user** — join table for staff/users across multiple businesses
8. **Reverse proxy** — NGINX or Cloudflare for subdomain routing

---

## 13. Step-by-Step Implementation Roadmap

### Phase 1: Infrastructure & DNS Setup (Days 1-3)
**Objectives**: Set up reverse proxy, wildcard DNS, and SSL
**Files to modify**: `docker-compose.yml`, new `nginx/` directory
**Dependencies**: DNS provider, SSL certificate authority
**Complexity**: Medium
**Risks**: DNS propagation delays, SSL configuration errors
**Validation**: `curl -H "Host: acme.domain.com" http://localhost` returns the app

### Phase 2: Database Schema — Tenant Fields (Days 3-5)
**Objectives**: Add `Slug`, `Hostname`, `ThemeColor`, `LogoUrl` to Business entity; create many-to-many business-user relationship
**Files to modify**: `Domain/Entities/Business.cs`, `Domain/Entities/User.cs`, new `BusinessUser.cs`, `ApplicationDbContext.cs`, new migration
**Dependencies**: Phase 1
**Complexity**: High
**Migration**: Generate slugs for existing businesses, set default hostnames
**Validation**: Migration runs successfully, existing seed data has slugs

### Phase 3: Backend Tenant Resolution Middleware (Days 5-8)
**Objectives**: Create `TenantResolutionMiddleware`, `ITenantContext`, update all services to filter by business
**Files to modify**: New `API/Middleware/TenantResolutionMiddleware.cs`, new `Domain/Interfaces/ITenantContext.cs`, `Program.cs` (add middleware + DI), `BusinessService.cs` (update queries)
**Dependencies**: Phase 2
**Complexity**: High
**Risks**: Existing queries not filtered correctly could leak data
**Validation**: After middleware, requests to `acme.domain.com` return only Acme's data

### Phase 4: Authentication — Cross-Subdomain (Days 8-10)
**Objectives**: Update cookie domain, add `businessId` to JWT, update login flow
**Files to modify**: `punched-pwd/lib/api/client.ts` (cookie domain), `PunchedApi/Application/Services/JwtTokenService.cs` (add businessId claim), `PunchedApi/Application/Services/AuthService.cs` (include business context)
**Dependencies**: Phase 3
**Complexity**: High
**Risks**: Existing sessions will have tokens without businessId — backward compatibility needed
**Validation**: Login on `acme.domain.com`, navigate to `elite.domain.com` without re-authentication

### Phase 5: Dynamic Manifests (Days 10-12)
**Objectives**: Generate per-tenant manifest dynamically
**Files to modify**: `punched-pwd/app/manifest.ts` (use `headers()` to get hostname, fetch business data)
**Dependencies**: Phase 3
**Complexity**: Medium
**Risks**: Next.js manifest.ts runs during SSR — must handle async business lookup
**Validation**: `curl http://localhost:3000/manifest.json -H "Host: acme.domain.com"` returns Acme's manifest

### Phase 6: Dynamic Branding (Days 12-14)
**Objectives**: Load business-specific colors, logo, favicon
**Files to modify**: `punched-pwd/app/layout.tsx` (dynamic metadata), new `app/favicon/route.tsx`, new `app/api/branding/route.ts`, `punched-pwd/app/globals.css` (dynamic CSS variables)
**Dependencies**: Phase 5
**Complexity**: Medium
**Validation**: Open `acme.domain.com` — see Acme's logo, colors, and favicon

### Phase 7: Service Worker Isolation (Days 14-16)
**Objectives**: Generate per-tenant service worker, isolate caches
**Files to modify**: New `app/api/sw.ts` or `app/sw/[slug]/route.ts`, `punched-pwd/components/ServiceWorkerRegistrar.tsx` (register per-tenant SW)
**Dependencies**: Phase 5
**Complexity**: High
**Risks**: SW update conflicts, cache stampede
**Validation**: `acme.domain.com` has its own cache namespace, no cross-tenant cache sharing

### Phase 8: Dynamic Icons & Splash Screens (Days 16-18)
**Objectives**: Generate per-tenant icons, apple-touch-icon, splash images
**Files to modify**: New icon generation service, `punched-pwd/app/manifest.ts` (dynamic icons), `punched-pwd/public/apple-touch-icon.svg` (dynamic)
**Dependencies**: Phase 6
**Complexity**: Medium
**Risks**: SVG support varies across browsers; may need PNG fallback
**Validation**: Lighthouse PWA audit passes for each tenant

### Phase 9: Install Flow — Per-Business Prompt (Days 18-20)
**Objectives**: Update install prompt to show business name, icon, description
**Files to modify**: `punched-pwd/components/PWAInstallPrompt.tsx` (tenant-aware prompt)
**Dependencies**: Phase 8
**Complexity**: Low
**Validation**: Install prompt shows "Install Acme Salon" instead of "Install Punched"

### Phase 10: Offline Support — Per-Tenant (Days 20-22)
**Objectives**: Cache per-tenant assets, offline pages
**Files to modify**: Generated SW (Phase 7), add offline fallback pages
**Dependencies**: Phase 7
**Complexity**: Medium
**Validation**: Airplane mode on `acme.domain.com` shows Acme's offline page

### Phase 11: Many-to-Many Business-User (Days 22-25)
**Objectives**: Replace `User.StaffBusinessId` with join table, support multi-business staff
**Files to modify**: New `Domain/Entities/BusinessUser.cs`, `User.cs` (remove StaffBusinessId), `BusinessService.cs` (update queries), `ApplicationDbContext.cs`
**Dependencies**: Phase 2
**Complexity**: High
**Risks**: Breaking change for existing staff users
**Migration**: Migrate existing `StaffBusinessId` values to new join table
**Validation**: User can be staff at multiple businesses, switch between them

### Phase 12: Testing (Days 25-30)
**Objectives**: Full test suite for tenant isolation
**Files to modify**: New test files
**Dependencies**: All previous phases
**Complexity**: Medium
**Validation**: All tests pass, tenant isolation verified

---

## 14. Suggested File/Folder Structure After Implementation

```
punched/
├── docker-compose.yml
├── nginx/
│   ├── nginx.conf              # Reverse proxy with subdomain routing
│   └── includes/
│       └── tenant-routing.conf  # Rewrite rules for subdomain → API/Frontend
│
├── PunchedApi/
│   ├── API/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   │   ├── ExceptionMiddleware.cs
│   │   │   └── TenantResolutionMiddleware.cs  # NEW: Host header → Business
│   │   └── Filters/
│   │       └── TenantAuthorizationFilter.cs   # NEW: Verify tenant access
│   ├── Application/
│   │   ├── DTOs/
│   │   │   └── TenantContext.cs               # NEW: Tenant info DTO
│   │   ├── Services/
│   │   │   ├── JwtTokenService.cs
│   │   │   ├── TenantService.cs               # NEW: Hostname→Business lookup
│   │   │   └── ...
│   │   └── Settings/
│   ├── Domain/
│   │   ├── Entities/
│   │   │   ├── Business.cs                    # + Slug, Hostname, ThemeColor
│   │   │   ├── BusinessUser.cs                # NEW: Many-to-many join table
│   │   │   ├── User.cs                        # - StaffBusinessId
│   │   │   └── ...
│   │   └── Interfaces/
│   │       ├── ITenantContext.cs              # NEW: Tenant resolution contract
│   │       └── ...
│   ├── Infrastructure/
│   │   ├── Data/
│   │   │   ├── ApplicationDbContext.cs
│   │   │   └── Configurations/
│   │   │       └── BusinessConfiguration.cs   # + Hostname unique index
│   │   └── Services/
│   │       └── TenantContextService.cs        # NEW: Scoped tenant context
│   └── Migrations/
│       └── *AddTenantFields.cs               # NEW migration
│
├── punched-pwd/
│   ├── app/
│   │   ├── manifest.ts                       # Dynamic per-hostname manifest
│   │   ├── api/
│   │   │   ├── sw/                           # NEW: Dynamic SW generation
│   │   │   │   └── [slug]/route.ts
│   │   │   └── branding/                     # NEW: Branding API
│   │   │       └── [slug]/route.ts
│   │   ├── layout.tsx                        # Dynamic metadata + favicon
│   │   ├── middleware.ts                     # + Hostname tenant resolution
│   │   └── ...
│   ├── components/
│   │   ├── PWAInstallPrompt.tsx              # Tenant-aware prompt
│   │   ├── ServiceWorkerRegistrar.tsx        # Dynamic SW registration
│   │   ├── ThemeApplier.tsx                  # Business-specific theme
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTenant.ts                     # NEW: Tenant context hook
│   │   └── ...
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── themeStore.ts
│   │   └── tenantStore.ts                   # NEW: Current tenant state
│   ├── lib/
│   │   └── api/
│   │       ├── client.ts                    # Cookie domain = .domain.com
│   │       └── tenant.ts                    # NEW: Tenant API client
│   └── public/
│       └── icons/                           # Dynamic per-tenant icons
│           └── [slug]/
│               ├── icon-192.png
│               ├── icon-512.png
│               └── maskable-512.png
│
└── scripts/
    ├── generate-icons.sh                    # NEW: Icon generation script
    └── seed-tenant-hostnames.sh             # NEW: Generate slugs/hostnames
```

---

## 15. Recommended Testing Strategy

### Unit Tests
- `TenantResolutionMiddleware` — verify hostname parsing, business lookup, error cases
- `JwtTokenService` — verify `businessId` claim inclusion
- `TenantService` — verify hostname-to-business resolution
- `BusinessService` — verify queries are filtered by tenant context

### Integration Tests
- Create test fixtures for multiple tenants
- Verify each tenant's API returns only their data
- Verify cross-tenant access returns 403/404
- Verify SSE events are scoped per tenant

### E2E Tests
- Login on `business-a.test` → navigate to `business-b.test` without re-auth
- Install PWA from `business-a.test` → verify manifest has business-a's name
- Install PWA from `business-b.test` → verify manifest has business-b's name
- Verify both PWAs appear as separate apps on home screen

### PWA Audit
- Lighthouse PWA audit for each tenant
- Verify `start_url`, `scope`, `display`, `icons` are correct per tenant
- Verify offline support works for each tenant independently

### Security Tests
- Cross-tenant data access attempts
- Host header injection
- JWT without `businessId` claim (backward compatibility)
- SW cache isolation verification

---

## 16. Rollback Strategy

### Phase-by-Phase Rollback
1. **Infrastructure**: Keep old Docker Compose file; revert DNS changes
2. **Database**: Create migration for rollback (`ef migrations remove` or reverse migration)
3. **Auth**: Keep old token validation logic; deploy flag to enable/disable new claims
4. **Manifest**: Keep old manifest.ts as fallback; feature flag
5. **SW**: Old SW remains cached on user devices; `skipWaiting()` on new SW

### Global Rollback
1. Revert Docker Compose to previous version
2. Restore database from backup
3. Revert DNS to single hostname
4. Clear CDN cache

### Feature Flags
- `MultiTenantEnabled` — controls whether tenant resolution middleware is active
- `CrossSubdomainAuth` — controls cookie domain setting
- `DynamicManifests` — controls per-tenant manifest generation

---

## 17. Future Enhancements

1. **Tenant-specific SEO**: Per-business meta tags, Open Graph images, sitemaps
2. **Analytics**: Per-business analytics with tenant isolation in reporting
3. **Custom Domains**: Allow businesses to use their own domain (e.g., `rewards.acmesalon.com`)
4. **Automated Onboarding**: Create tenant, generate icons, set up DNS, deploy automatically
5. **Tenant-specific Feature Flags**: Enable/disable features per business
6. **Multi-Region Deployment**: Tenants in different regions with data residency
7. **Tenant Usage Metrics**: Track per-tenant API usage, storage, active users
8. **White-Labeling**: Full white-label with custom domain, complete CSS customization
9. **Automated Icon Generation**: Service that generates PWA icons from business logo
10. **Tenant Migration Tools**: Export/import tenant data for migration between instances


What I ran

docker compose up -d db
docker compose build api
docker compose run --rm --entrypoint sh -e Seed__Enabled=true api -lc "dotnet PunchedApi.dll db migrate-seed && cat /app/seed-report.json"
docker compose up -d api web
Result

Database migration completed in Docker.
Seeding completed successfully in Docker.
API container is healthy on http://localhost:8080
Web container is running on http://localhost:3000
Seed report was generated inside the run at /app/seed-report.json and printed successfully.
Seed totals from the successful run:
Businesses: 5
Users: 79
Customers: 58
Staff: 15
Loyalty cards: 58
Stamps: 1016
Redemptions: 108
Referrals: 25
CLI commands now available

dotnet run -- db migrate
dotnet run -- db seed
dotnet run -- db migrate-seed
dotnet run -- migrate
dotnet run -- seed
dotnet run -- migrate-seed
For Docker, the important command is:
docker compose run --rm -e Seed__Enabled=true api db migrate-seed

Credentials
Admin

Email: admin@gmail.com
Password: @Admin1234
Business 1: Aurelia Luxe Hair Atelier

Owner: elena.njeri@aurelialuxe.co.ke / Owner@1234!
Manager: ivy.wambui@aurelialuxe.co.ke / Staff@1234!
Receptionist: ruth.kendi@aurelialuxe.co.ke / Staff@1234!
Demo Customer: diana.achieng.b101@demo.punched.app / Customer@1234!
Business 2: Harborline Modern Barbers

Owner: samuel.otieno@harborlinebarbers.com / Owner@1234!
Manager: david.ndungu@harborlinebarbers.com / Staff@1234!
Receptionist: nina.akinyi@harborlinebarbers.com / Staff@1234!
Demo Customer: diana.achieng.b201@demo.punched.app / Customer@1234!
Business 3: Velvet Petals Nail Studio

Owner: faith.cheruiyot@velvetpetals.co.ke / Owner@1234!
Demo Customer: diana.achieng.b301@demo.punched.app / Customer@1234!
Business 4: Serein Beauty Spa

Owner: miriam.wanjiru@sereinspa.com / Owner@1234!
Demo Customer: diana.achieng.b401@demo.punched.app / Customer@1234!
Business 5: Northlight Wellness Center

Owner: brian.kimani@northlightwellness.africa / Owner@1234!
Demo Customer: diana.achieng.b501@demo.punched.app / Customer@1234!
Password pattern for the seeded accounts:

All owners use Owner@1234!
All staff use Staff@1234!
The first customer for each business uses Customer@1234!
All other customers use Cust@1234!


<!-- What We Need To Do -->

# App Header
1. Remove the logout icon and its functionality.
2. Replace that with a notification icon, that when tapped/clicked it will open a notification page.

# Others
1. Implement a debouncer for all search fields

# Business Owner Dashboard
# Dashboard
1. We have a button to add a new program (+ Add), we need to make this button redirect to the page to create a new program.
2. When the user taps/clicks the program we need to go to the programs details page.
3. We need to improve the Staff section and also when the user taps/clicks the staff we should be redirected to the staff details page.
4. We need to add a way for the user to choose their own date range along the 7D, 30D and 90D, this should be done by having a calender where the user will select the range and we will have dynamic data depending on the range.

# Customer Page
1. The Export button is outside the screen we need to position that properly.
2. We need to make the search field in this page to perform a database first search not UI.
3. When we drill down to the customer details page, the data/ui stretches outside the screen lets have that UI positioned well and refactored.
3. We need pagination added and it should be a backend first pagination and sorting.
4. Lets add an intelligent filtering functionality that is backend first.

# Staff Page
1. The Add button is outside the screen we need to position that properly.
2. We need to make the search field in this page to perform a database first search not UI.
3. We need pagination added and it should be a backend first pagination and sorting.
4. Lets add an intelligent filtering functionality that is backend first.
5. Lets have the default listing to be, the staff with the most stamps in the top and the top 3 should have a golden star.

# Settings Page
1. Add the change password functionality that is inside the owners profile into this main page so that the owners profile doesnt have the password functionality.
<!-- Owner Profile Page -->
1. Remove the password functionality.
2. Make this page mainly for displaying, this means we will not have fields that are prefilled, we will only have the owners profile displayed.
3. Remove the Owner Profile title and improve the design of that page.
4. Add a button or a strategic way that when the user taps/clicks a page to edit the profile opens, this page is different from the display profile.
5. If there is data that can be added to the profile add it.
<!-- Business Profile Page -->
1. Make this page mainly for displaying, this means we will not have fields that are prefilled, we will only have the business profile displayed.
2. Add a button or a strategic way that when the user taps/clicks a page to edit the business profile opens, this page is different from the display profile.
3. If there is data that can be added to the profile add it.
4. Redesign and improve the design of this pages.




# What To Think About
1. The refferal program.
2. The Loyalty program including the loyalty cards and more.
3. When a user enrolls to a business they get one free stamp as default.
4. This default stamps should come from the DB, this means it should be created or set when creating the program, this way differnt businesses can have different defaults.



# Customer Owner Dashboard

# Explore Page
1. The cards overflow the screens, position them properly.
2. The 2 switch tab buttons overflow the screen too, improve the switching animation.
3. We need pagination added and it should be a backend first pagination and sorting.
4. Backend first search with a UI debouncer.
5. The filtering is not working, implement this to completion and it should be a backend first filter.

# Staff Owner Dashboard

# Activity Page
1. For the recent activity/stamps have it paginated(backend first).
2. For the recent activity, when a user clicks/taps a customer they should be taken to the customer page.
2. I see we have a daily goal, we need to have that as a dynamic factor that is set by the business owner per user and with a default value per business.
