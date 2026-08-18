# Booking System — Feature Specification

> **Purpose:** Implementation-ready design for the booking/appointment feature that **extends the existing Punched codebase** rather than replacing it. This document reconciles the earlier (conflicting) drafts with the real architecture and serves as the single source of truth for `backend.md`, `frontend.md`, and `prd.md`.
>
> **Status:** Spec only — **no application code changes** in this step.
> **Scope:** Multi-tenant appointment booking for businesses that already run loyalty programs on Punched.
> **Legacy:** `booking-management.md` (the prior draft) is **archived/superseded** by this set.

---

## 0. Guiding principle: reuse the existing domain

Punched already scaffolded the booking schema in migration `20260807190729_CompleteAnalyticsDataInfrastructure` (+ FK hardening in `20260807191300_AnalyticsHardeningForeignKeys`). The tables exist in the DB and are mapped in the model snapshot, but **no API/service/frontend wires them up yet**. The booking feature therefore:

- **REUSES** existing entities, migrations, auth, API conventions, and frontend patterns.
- **EXTENDS** existing entities minimally (one column) and reuses join-table + snapshot patterns already present.
- **ADDS** only the small, strictly-needed new pieces: an availability engine, appointment lifecycle service, two new controllers, and one new join table.

---

## 1. What already exists (scaffolded, no API yet)

| Concept (docs term) | Existing entity / table | File | Reused? |
|---|---|---|---|
| Appointment | `Appointment` → `appointments` | `Domain/Entities/Appointment.cs` | **Yes** |
| Appointment status audit | `AppointmentStatusHistory` → `appointment_status_history` | `Domain/Entities/AppointmentStatusHistory.cs` | **Yes** |
| Service (catalog item) | `ServiceCatalogItem` → `services` | `Domain/Entities/ServiceCatalogItem.cs` | **Yes** |
| Staff–service assignment | `StaffServiceAssignment` → `staff_services` | `Domain/Entities/StaffServiceAssignment.cs` | **Yes** |
| Staff working hours | `StaffShift` → `staff_shifts` | `Domain/Entities/StaffShift.cs` | **Yes** |
| Staff–business link | `User.StaffBusinessId` → `users.staff_business_id` | `Domain/Entities/User.cs` | **Yes** |
| Business owner | `Business.OwnerId` → `businesses.owner_id` | `Domain/Entities/Business.cs` | **Yes** |
| JWT identity | `userId` + `role` claims (see §3) | `Application/Services/JwtTokenService.cs` | **Yes** |

Confirmed in the model snapshot (`PunchedApi/Migrations/ApplicationDbContextModelSnapshot.cs`) and EF configurations (`Infrastructure/Data/Configurations/`).

### Existing schema shapes (verbatim)

`Appointment` (`appointments`): `id`, `business_id`, `customer_id`, `staff_user_id` (nullable), `scheduled_at` (timestamphz), `status` varchar(20) **default `"booked"`**, `created_at`.
Indexes: `(business_id, scheduled_at)`, `(staff_user_id, scheduled_at)` (from `AppointmentFoundationConfiguration`), and `customer_id` (from `AnalyticsHardeningForeignKeys`).

`StaffShift` (`staff_shifts`): `id`, `staff_user_id`, `business_id`, `date` (date), **`start_hour` int 0–23**, **`end_hour` int 0–23**, `is_working` bool default true, `created_at`. Indexes: `(staff_user_id, date)`, `(business_id, date)`; check constraint `start_hour`/`end_hour` ∈ 0–23.

`ServiceCatalogItem` (`services`): `id`, `business_id`, `name` (varchar 120), `duration_minutes` int, `price` numeric(10,2), `is_active` bool, `created_at`. Index: `(business_id, is_active)`.

`StaffServiceAssignment` (`staff_services`): `id`, `staff_user_id`→users, `service_id`→`services` (cascade), `business_id`→businesses. Indexes: `(service_id)`, `(business_id, service_id)`, `(staff_user_id, business_id)`.

> **Open question from the earlier draft is answered:** `StaffShift` has **no** `DayOfWeek`/`StartTime`/`EndTime` (minute)/`EffectiveDate`/`IsRecurring` fields. It is a **per-calendar-date, hour-granularity** window. See §5 (availability) and §9 (conflict resolution).
### Backend NEW
- `AppointmentController.cs` — `GET /v1/appointments` (Customer: "my appointments") + book/reschedule/cancel. Mirrors `LoyaltyCardController`/`RedemptionController`.
- `ServiceCatalogController.cs` — `/v1/services/me` CRUD (`Business` role) + public `GET /v1/services/{businessId}`.
- `AppointmentService.cs` / `IAppointmentService.cs` — owns appointment CRUD, lifecycle, calendar queries; delegates pure slot math to `AppointmentAvailabilityService`. Mirrors `ILoyaltyService`/`IStampService` (per-domain service).
- `AppointmentAvailabilityService.cs` — pure availability/slot engine, DI-registered, injected by `AppointmentService`.
- `AppointmentResource.cs` entity + the `EndAt` column on `Appointment`.
- New DTOs: `CreateAppointmentRequest`, `RescheduleAppointmentRequest`, `AppointmentResponse`, `AppointmentCalendarItemResponse`, `AvailabilitySlotResponse`, `ServiceCatalogItemResponse`, `CreateServiceRequest`, `UpdateServiceRequest`, `AvailabilityQueryRequest`.

### Backend MODIFY
- `BusinessService.cs` — add owner/staff appointment calendar + lifecycle endpoints (`/v1/businesses/me/appointments`, `/v1/businesses/staff/appointments`, status actions) **delegating to `IAppointmentService`** (no duplicated data logic). Mirrors how staff-shift endpoints already live on `BusinessController`.
- `BusinessController.cs` — add availability + owner/staff appointment routes.
- `ApplicationDbContext.cs` — add `DbSet<AppointmentResource>`.
- `IUnitOfWork.cs` — add `IRepository<AppointmentResource> AppointmentResources` (recommended: also add `Appointments` for consistency; `StaffShift`/`ServiceCatalogItem`/`StaffServiceAssignment` are accessed via `_context` today, which `AppointmentService` may follow).
- `ExceptionMiddleware.cs` — **no new branches** (business errors travel as `ApiResponse.Fail`; see §8).

### Frontend NEW
- `lib/api/appointments.ts`, `lib/api/services.ts` (reuse `apiClient` + `cachedFetch`).
- `hooks/useBooking.ts` (progressive-flow orchestrator).
- Zustand `useBookingStore` (cart/session state).
- `features/appointments/*` (Customer wizard: ServiceList → StaffSelector → SlotPicker → Review).
- `features/calendar/AppointmentCalendar.tsx` (owner/staff calendar).
- Dashboard pages: `/dashboard/appointments`, `/dashboard/appointments/[id]`, `/dashboard/business/appointments`, `/dashboard/staff/appointments`.
- Type additions to `punched-pwd/types/index.ts`; RHF+Zod schemas in `lib/validations/appointments.ts`.

### Frontend REUSE (unchanged)
- `lib/api/client.ts` (`apiClient` axios w/ Bearer + auto-refresh + cookie), `lib/api/cache.ts` (`cachedFetch`/`invalidateCache`), `store/authStore.ts`, `hooks/useAuth.ts`, `hooks/useRoleGuard.ts` (`useRoleGuard(requiredRole)`), `app/dashboard/layout.tsx` (role-gated; resolves header business via `businessesApi.getMine()` / `getStaffBusiness()`), Tailwind design tokens.

---

## 8. Conflict & error-handling conventions (corrected)

- **HTTP mapping is done in controllers**, not the middleware. Pattern from `BusinessController`/`LoyaltyCardController`: call service → on `!result.Success` switch on `result.Error?.Code` to `Ok`/`BadRequest`/`NotFound`/`Conflict`. `ExceptionMiddleware` (`ExceptionMiddleware.cs:45-73`) only catches **hard exceptions**: `ArgumentException`→`INVALID_REQUEST`(400), `UnauthorizedAccessException`→`UNAUTHORIZED`(401), `KeyNotFoundException`→`NOT_FOUND`(404), `InvalidOperationException`→`CONFLICT`(409), else→`SERVER_ERROR`(500). **Booking errors are returned as `ApiResponse.Fail` with documented codes (see `backend.md` §6), so no middleware edit is required.**
- **JSON:** camelCase (`JsonNamingPolicy.CamelCase`, `ExceptionMiddleware.cs:81`). Responses always wrapped in `ApiResponse<T>` (`Application/DTOs/AuthDTOs.cs:15`).
- **No idempotency keys** anywhere (verified: none in `Program.cs`/controllers). **Omitted from MVP** (see §9.4).

---

## 9. Architectural conflicts resolved (this vs. earlier drafts vs. codebase)

| # | Earlier draft proposed | Codebase reality | Decision |
|---|---|---|---|
| 1 | New `Service`/`StaffService`/`StaffWorkingHour`/`StaffTimeOff`/`BusinessWorkingHour`/`BusinessBlockedTime` | Existing `ServiceCatalogItem`→`services`, `StaffServiceAssignment`→`staff_services`, `StaffShift`→`staff_shifts` | **Reuse** the three existing entities; model time-off/closed windows as `StaffShift` rows with `IsWorking=false` (or absence of a row). **No** `StaffTimeOff`/`BusinessBlockedTime` tables. |
| 2 | Generic `AppointmentService` join named "AppointmentService" | Rejected name collides with the concept | Single join named **`AppointmentResource`** (`appointment_resources`), snapshot columns included. |
| 3 | Standalone `AvailabilityEngine` micro-service / new layers | One service class per domain (`ILoyaltyService`, `IStampService`, `IBusinessService`) | Availability lives in `AppointmentAvailabilityService`, DI-registered, **invoked by `AppointmentService`** — no new architectural layers. |
| 4 | `GET /availability`, `/api/v1/...` | `/v1/{controller}` (`[Route("v1/...")]` in every controller; Axios base `http://localhost:5000/v1`) | Follow `/v1/...` REST convention (§10). |
| 5 | TanStack Query | `cachedFetch` + Zustand (`lib/api/cache.ts`, `store/authStore.ts`) | Reuse `cachedFetch` + Zustand; **no** TanStack Query. |
| 6 | Domain events / notification microservice | `NotificationDispatchService` exists but bookings emit none; frontend only | **Notifications out of scope** for MVP; booking emits no domain events. Hook points for later extraction noted in `backend.md`. |
| 7 | PostgreSQL exclusion constraint for double-booking | Codebase uses FK + check constraints only (`staff_shifts` check on hours; no range/exclusion constraints) | **Transaction + explicit overlap check** in `CreateAppointmentAsync`/`RescheduleAsync`. No exclusion constraint. |
| 8 | `Idempotency-Key` header | None anywhere | **Omitted from MVP**; client uses retry-then-GET pattern. (Future option documented.) |
| 9 | Client-supplied `businessId` / "BusinessOwner" role | `businessId` NOT in JWT; roles are `Customer`/`Business`/`Staff`/`Admin`; `businessId` derived from `userId` | Server-derived tenant for `Business`/`Staff`; client `BusinessId` accepted **only** for `Customer` and validated. |
| 10 | snake_case DB objects everywhere | EF maps Pascal entities → snake tables via explicit `ToTable`/`HasColumnName` (e.g. `UserConfiguration`, `StaffShiftConfiguration`) | New entities follow same explicit snake_case mapping. |
| 11 | .NET 9 | `PunchedApi.csproj` → `<TargetFramework>net8.0</TargetFramework>` | Target **.NET 8** (`net8.0`). |
| 12 | Recurring weekly working hours (`DayOfWeek`) | `StaffShift` is per-date `DateOnly Date` + hour ints `StartHour`/`EndHour` (0-23) + `IsWorking` | Availability computed from **per-date** shifts; recurring-weekly templates are a future enhancement. |
| 13 | `Appointment` is a fresh entity | `Appointment` already exists (default status `"booked"`, no `EndAt`) | **Extend** it (add `EndAt`); reuse `"booked"` as the initial status (do not introduce a `"pending"` value to avoid a data migration). |

---

## 10. API surface at a glance (exact routes + roles)

> Prefix `/v1` (set in `Program.cs` middleware/`UseRouting`; controllers use `[Route("v1/...")]`). Auth via `Authorization: Bearer <accessToken>` (axios interceptor, `lib/api/client.ts:73-78`; cookie mirror in middleware `punched-pwd/middleware.ts`).

| Method | Route | Role | Purpose |
|---|---|---|---|
| `GET` | `/v1/businesses/{businessId}` | anonymous | business detail (exists) |
| `GET` | `/v1/businesses/{businessId}/services` | anonymous | active service catalog (NEW) |
| `GET` | `/v1/businesses/{businessId}/availability` | anonymous | available slots (NEW) |
| `GET` | `/v1/appointments` | Customer | my appointments (NEW) |
| `GET` | `/v1/appointments/{id}` | Customer | my appointment detail (NEW) |
| `POST` | `/v1/appointments` | Customer | book (NEW) |
| `POST` | `/v1/appointments/{id}/reschedule` | Customer | reschedule self (NEW) |
| `POST` | `/v1/appointments/{id}/cancel` | Customer | cancel self (NEW) |
| `GET` | `/v1/businesses/me/appointments` | Business | business calendar (NEW) |
| `GET` | `/v1/businesses/me/appointments/{id}` | Business | detail (NEW) |
| `POST` | `/v1/businesses/me/appointments` | Business | book on behalf (NEW) |
| `POST` | `/v1/businesses/me/appointments/{id}/{reschedule\|cancel\|confirm\|complete\|no-show}` | Business | lifecycle (NEW) |
| `GET` | `/v1/businesses/staff/appointments` | Staff | my calendar (NEW) |
| `POST` | `/v1/businesses/staff/appointments/{id}/{confirm\|complete\|no-show}` | Staff | deliver (NEW) |
| — | `/v1/services/me[+/{id}]` | Business | service catalog CRUD (NEW; mirrors `/v1/programs/me`) |

## 11. Out of MVP scope (deferred)

Payments, SMS/email confirmations, calendar-sync (Google/Outlook), waitlists + over-booking, recurring-appointment templates, staff self-scheduling of shifts via the public booking UI, business timezone localization field, per-service staff pricing overrides, and GraphQL/webhooks. These map cleanly onto the same entities but are intentionally deferred.

## 12. New file manifest (this spec, no code)

`feature.md` (this file), `prd.md`, `backend.md`, `frontend.md`. Legacy `booking-management.md` retained for history.


