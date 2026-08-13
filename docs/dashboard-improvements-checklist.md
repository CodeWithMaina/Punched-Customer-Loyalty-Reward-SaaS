# Dashboard Improvements Checklist

Last updated: 2026-08-13

Status values: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `IMPLEMENTED`, `VERIFIED`.

## Discovery Summary

- Frontend: Next.js App Router in `punched-pwd`; Axios API clients, Zustand auth, Tailwind, Lucide.
- Backend: ASP.NET Core 8 in `PunchedApi`; EF Core/PostgreSQL; owner business scope is derived from authenticated user ID.
- Existing reusable infrastructure: `cachedFetch`, `FilterSheet`, business/staff detail routes, program management, password endpoint, referral program, loyalty-card stamp ledger, and staff activity paging.
- Confirmed gaps: business customer and staff listings still load unbounded records; business analytics only exposes preset periods; notifications have no persisted user inbox.

## Requirements

| ID | Description | Frontend work | Backend/database work | Dependencies / likely files | Status |
| --- | --- | --- | --- | --- | --- |
| H1 | Replace header logout icon with notification navigation while retaining logout in account settings | Header action and notification route | Persisted notification inbox remains a future data-model addition; current page is an explicit empty state | `app/dashboard/layout.tsx`, notification route/API | IMPLEMENTED |
| S1 | Reusable debounce for every server-backed search | Hook and list-page adoption | None | `hooks/`, search pages | IN_PROGRESS |
| BO-D1 | Dashboard add-program navigation | Wire existing action to program create UI | Existing create API | business dashboard, programs route | NOT_STARTED |
| BO-D2 | Dashboard program details navigation | Add/view program route | Scoped program retrieval if absent | dashboard/program APIs | NOT_STARTED |
| BO-D3 | Staff summary clarity | Improve staff performance summary | Use scoped aggregates | business dashboard | NOT_STARTED |
| BO-D4 | Staff detail navigation | Ensure linked staff cards navigate | Existing scoped analytics | dashboard/staff details | NOT_STARTED |
| BO-D5 | Custom dashboard date range | Calendar and query state | Extend analytics range contract | analytics page/service | NOT_STARTED |
| C1 | Responsive customer export button | Flexible header controls | None | customer page | IMPLEMENTED |
| C2-C5 | Customer search, filters, paging, sorting backend-first | Debounced URL query state, controls | Scoped composed query, allowlisted sorting, metadata, indexes if justified | customer page, business API/service/DTO/tests | IMPLEMENTED |
| C3 | Responsive customer detail | Responsive layout/table states | None | customer detail page | NOT_STARTED |
| ST1 | Responsive staff add button | Flexible header controls | None | staff page | NOT_STARTED |
| ST2-ST4 | Staff search, filters, paging, sorting backend-first | Debounced URL query state, controls | Scoped composed query, allowlisted sorting, metadata | staff page, business API/service/DTO/tests | NOT_STARTED |
| ST5 | Server-ranked staff with accessible top-three indication | Rank display | Default stamps-desc ordering with deterministic ties | staff page/service | NOT_STARTED |
| SET1 | Change password in settings | Move existing password UI | Reuse authenticated change-password API | settings/profile routes | NOT_STARTED |
| OP1-OP5 | Display-first owner profile and separate editor | Read-only profile, edit route | Reuse profile update API | owner profile routes | NOT_STARTED |
| BP1-BP4 | Display-first business profile and separate editor | Read-only business profile, edit route | Reuse business update API | business profile routes | NOT_STARTED |
| LR1-LR2 | Referral/loyalty lifecycle audit | Align UI to real lifecycle | Verify existing services | referral, loyalty services | IMPLEMENTED |
| LR3 | Configurable enrollment stamps and ledger entry | Create/edit fields | Entity, migration, DTOs, atomic enrollment stamp | loyalty services, migrations/tests | NOT_STARTED |
| EX1-EX5 | Explore responsiveness, tabs, server query | Query state, responsive grids/tabs | Paginated/search/filter business query and metadata | explore page/API/service | NOT_STARTED |
| ACT1-ACT2 | Staff activity paging and customer navigation | Paging UI and links | Existing paged activity source, verify scope | staff activity page/API | NOT_STARTED |
| ACT3 | Dynamic business/staff daily goals | Owner configuration and staff display | Business default + nullable staff override, migration/API | entities/services/UI/tests | NOT_STARTED |
| API | Document modified/new API contracts | Add endpoint docs | Keep conventional responses | controller/XML or docs | NOT_STARTED |
| QA | Automated, integration, responsive, security regression | Frontend manual/type checks | Backend unit/integration tests | test projects | IN_PROGRESS |

## Modified API Contract

### `GET /v1/businesses/me/customers`

- Authentication and authorization: `Business` JWT role; the business is resolved from the authenticated owner, never a request business ID.
- Query parameters: `search`, `status` (`active` or `ready`), `enrolledFrom`, `enrolledTo`, `sortBy` (`recent`, `stamps`, `name`), `sortDirection` (`asc`, `desc`), `page`, `pageSize` (1-100).
- Success response: `ApiResponse<PaginatedResponse<BusinessCustomerResponse>>`, with `items`, `totalCount`, `page`, `pageSize`, and `totalPages`.
- Error cases: unauthenticated request, owner without a business, and invalid date range where `enrolledTo` precedes `enrolledFrom`.
- Ordering and filtering execute in PostgreSQL before pagination. Sort fields are allowlisted.

## Validation

- `dotnet build PunchedApi/PunchedApi.csproj --no-restore`: passed.
- `npx tsc --noEmit` in `punched-pwd`: passed.
- `dotnet test PunchedApi.Tests/PunchedApi.Tests.csproj --no-restore`: 26 passed, 0 failed.

## Security and Query Rules

- Business-owned queries derive the business from the authenticated owner/staff account; no client-provided business ID is trusted.
- Detail lookups include the derived business ID in their query.
- All pageable query endpoints cap `pageSize`, use allowlisted sort values, and apply filters before `Count`, `Skip`, and `Take`.
- Search results and asynchronous UI requests must ignore stale results.