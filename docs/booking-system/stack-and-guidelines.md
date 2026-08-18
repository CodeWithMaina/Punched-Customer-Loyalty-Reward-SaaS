# Stack & Guidelines (Booking System)

> Source of truth for every edit in this feature. **Verified against the repo** as of implementation.

## 1. Verified stack

### Backend — `PunchedApi` (`PunchedApi/PunchedApi.csproj`)
- **Runtime:** .NET 8 (`net8.0`). *Do not* use .NET 9/MediatR.
- **ORM:** `Npgsql.EntityFrameworkCore.PostgreSQL` 8.0.11 (PostgreSQL).
- **Layers:** `Domain.{Entities,Interfaces}`, `Application.{DTOs,Services}`, `Infrastructure.{Data.{Configurations,Repositories},Repositories}`, `API.Controllers`, `API.Middleware`.
- **Validation:** `FluentValidation` 11.3.0 — one `AbstractValidator<T>` per request DTO; registered via `builder.Services.AddValidatorsFromAssemblyOf<...>()` (do not hand-roll controller validation).
- **Mapping:** `AutoMapper` + `AutoMapper.Extensions.Microsoft.DependencyInjection` 12.0.1 — one `Profile` per bounded area; register with `builder.Services.AddAutoMapper(...)`.
- **DI pattern:** interfaces + concrete service, registered in `Program.cs` as `builder.Services.AddScoped<IService, Service>()` (see `Program.cs` — `ILoyaltyService`/`LoyaltyService`, etc.). New: `AddScoped<IAppointmentService, AppointmentService>()`, `AddScoped<IAppointmentAvailabilityService, AppointmentAvailabilityService>()`.
- **Unit of work / repo:** `AddScoped(typeof(IRepository<>), typeof(Repository<>))` + `AddScoped<IUnitOfWork, UnitOfWork>()`. Mutating calls must use `IUnitOfWork` within one transaction.
- **Error model:** services return `ApiResponse<T>` (Success / Fail with `Error`). Controllers set HTTP status via `ApiResponse` (no custom middleware needed). `ExceptionMiddleware` only catches hard exceptions.
- **Authn:** `JwtTokenService` (only `sub/email/name/jti/userid/role` claims in the JWT; **no `businessId` claim**). `UserId` from `User.FindFirst("userid")`.

### Frontend — `punched-pwd` (`punched-pwd/package.json`)
- **Framework:** Next.js 14.2 App Router, React 18.3, TypeScript 5.5, Tailwind 3.4, `tailwind-merge` + `clsx`.
- **HTTP:** `axios` 1.7 — `apiClient` (`punched-pwd/lib/api/client.ts`): Bearer interceptor + 401 auto-refresh (queued) + 15 s timeout. Base `http://localhost:5000/v1`.
- **Cache:** hand-rolled `cachedFetch` (`punched-pwd/lib/api/cache.ts`) — in-flight dedupe + TTL (default 15 s); `invalidateCache(prefix?)`. **This is the established data convention.**
- **State:** `zustand` 4.5 — `authStore` (persist localStorage). New `useBookingStore` is session-only (no `persist`).
- **Forms:** `react-hook-form` 7.52 + `zod` 3.23 + `@hookform/resolvers` 3.9 (already in deps).
- **Toasts:** `react-hot-toast` 2.4 (matches `useAuth`).
- **Routing:** role dashboards `/dashboard/{admin|business|staff}` (staff → `/dashboard/staff`). Booking feature routes under `/dashboard/...` (no `/dashboard/customer/` segment). `redirectByRole` in `useAuth.ts`.
- `@tanstack/react-query` 5.50 is installed but **unused** by the existing auth/data flow — do not adopt it for this feature unless explicitly directed.

### Tests
- **Backend:** xunit 2.5.3 + xunit.runner.visualstudio + `Moq` 4.20 + `Microsoft.NET.Test.Sdk` 17.8.0 (`PunchedApi.Tests`). In-memory Sqlite fixture for integration; Moq for unit.
- **Frontend:** Jest + React Testing Library (`punched-pwd` scripts). Mock `*Api` modules (match `businessesApi` mock style).

## 2. Conventions (must follow)

| Area | Rule | Example |
|---|---|---|
| Backend DTOs | camelCase JSON | `scheduledAt`, `staffUserId` |
| Enum strings | lowercase / snake_case, not PascalCase | `no_show`, `confirmed` |
| EF config | `IEntityTypeConfiguration<T>` in `Configurations/` | `AppointmentConfiguration.cs` |
| Controllers | `[ApiController] + [Route("v1/[controller]")]` + `[Authorize(Roles=...)]` | `AppointmentController` |
| Frontend URLs | kebab `/dashboard/.../page.tsx` | `/dashboard/appointments/new` |
| Frontend data | `cachedFetch` + `apiClient` + Zustand (not react-query) | `appointmentsApi.getMine` |
| Validation | Zod schemas in `lib/validations/*.ts` | `createAppointmentSchema` |

## 3. Hard rules (non-negotiable)
1. **Route prefix `/v1`**, never `/api/v1`.
2. **Roles** are `Customer` | `Business` | `Staff` | `Admin` — never "BusinessOwner/AccountOwner".
3. **No `businessId` claim** in the JWT; derive it server-side from `userId`.
4. **StaffShift** is per-`DateOnly` hours (0–23) + `is_working` — do **not** introduce recurring/weekly or `StaffTimeOff`/`BusinessBlockedTime`.
5. **No DB exclusion constraints**; overlap check is transactional code.
6. **One transaction per appointment mutation** (UnitOfWork).
7. **Snapshots** service name/duration/price onto `appointment_resources`.
8. **Store UTC**; display in browser local time only.
9. **Booking cart** = Zustand session-only (never `persist`).
10. **Tests must compile & pass** on `dotnet test` (backend) and `npm test` (frontend) before marking a step done.

End of `stack-and-guidelines.md`.
