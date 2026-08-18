# Booking System — Backend Specification

> **Goal:** Implementation spec for the appointment/booking feature that **extends** the existing Punched API. Aligns 1:1 with `feature.md` (the architecture reconciliation). No code is changed here — this is a spec.
>
> **Runtime:** .NET 8 (`PunchedApi.csproj` → `<TargetFramework>net8.0</TargetFramework>`). Route prefix `/v1` (`[Route("v1/[controller]")]` on every controller; Axios base `http://localhost:5000/v1`, `punched-pwd/lib/api/client.ts:12`).
>
> **Conventions (verified):** REST controllers `[ApiController]` + `[Route("v1/[controller]")]` + `[Produces("application/json")]` ([LoyaltyCardController.cs:13-17], [BusinessController.cs:14-17]). Responses wrapped in `ApiResponse<T>` ([AuthDTOs.cs:15]), camelCase JSON ([ExceptionMiddleware.cs:81]). Service returns `ApiResponse.Fail(code, msg)`; controller maps HTTP status from `result.Error?.Code`; `ExceptionMiddleware` only catches hard exceptions ([ExceptionMiddleware.cs:45-73]). Per-domain service class (`IBusinessService`, `ILoyaltyService`, `IStampService`, `IRedemptionService`) — new domain → new `I*Service`. JWT emits `sub/email/name/jti/userId/ClaimTypes.Role` only (**no `businessId` claim**; [JwtTokenService.cs:59-67]); roles `Customer/Business/Staff/Admin` ([UserRole.cs]). Tenant derived from caller (owner `Business.OwnerId`, staff `User.StaffBusinessId`, customer via validated request `BusinessId` — mirrors `EnrollCardRequest`). DI: `AddScoped<I*Service,*Service>()` ([Program.cs:101-137]); `BusinessService` ctor = `IUnitOfWork, ApplicationDbContext, ILogger` ([BusinessService.cs:14-23]). EF: one `DbSet<T>` per root ([ApplicationDbContext.cs:17-43]); explicit snake mapping ([UserConfiguration.cs],[StaffShiftConfiguration.cs]).

## 1. Existing domain REUSED

### 1.1 `Appointment` — `appointments` ([Appointment.cs])
Columns: `id, business_id, customer_id, staff_user_id?(nullable), scheduled_at(timestamptz), status`(varchar20, default `"booked"`), `created_at`. Indexes: `(business_id, scheduled_at)`, `(staff_user_id, scheduled_at)`, `customer_id` ([AppointmentFoundationConfiguration.cs]).

> **Extend:** add `EndAt` (non-null `DateTime`→timestamptz). Required by the overlap guard (§5) + calendar UI. Table is empty today (no controller), so `NOT NULL` needs no backfill. Do **not** rename `booked`→`pending` (avoids a data migration; `booked` is the initial status).

### 1.2 `AppointmentStatusHistory` — `appointment_status_history` ([AppointmentStatusHistory.cs])
`appointment_id, status`(varchar20), `changed_at`(default now), `changed_by_user_id?`→users(set null), `note`(varchar300). Append one row per status transition (audit). ### 1.3 `ServiceCatalogItem` — `services` ([ServiceCatalogItem.cs])
`id, business_id, name`(120), `duration_minutes`(int), `price`(numeric 10,2), `is_active`(bool default true), `created_at`. Index `(business_id, is_active)`.

### 1.4 `StaffServiceAssignment` — `staff_services` ([StaffServiceAssignment.cs])
`staff_user_id`→users, `service_catalog_item_id`→services(cascade), `business_id`→businesses. Staff can serve a service iff a row exists. Indexes: `(service_id)`, `(business_id, service_id)`, `(staff_user_id, business_id)`.

### 1.5 `StaffShift` — `staff_shifts` ([StaffShift.cs], [StaffShiftConfiguration.cs])
`staff_user_id, business_id, date`(DateOnly), `start_hour`(0-23), `end_hour`(0-23), `is_working`(default true), `created_at`. Indexes `(staff_user_id, date)`, `(business_id, date)`; check on hours. **This is the availability primitive** (§5): `IsWorking=true` windows are bookable; `IsWorking=false` (or no row) = blocked/off. Existing CRUD: `GetStaffShiftsAsync`/`UpsertStaffShiftAsync` ([BusinessService.cs:1333, 1362]).

### 1.6 Tenant anchors (access resolution)
`User.StaffBusinessId` (nullable, indexed [UserConfiguration.cs:62]) — staff→business; `Business.OwnerId` — owner→business ([BusinessConfiguration.cs:78]).

## 2. New domain model (minimal)

### 2.1 `AppointmentResource` (NEW) — `appointment_resources`
Join + snapshot of an appointment's catalog services (snapshot rationale = `LoyaltyCard` snapshots `LoyaltyProgram`).
```
Id, AppointmentId(FK→appointments,cascade), ServiceCatalogItemId(FK→services,set null),
Name(varchar120), DurationMinutes(int), Price(numeric10,2), SortOrder(int), CreatedAt
```
Indexes `(appointment_id)`, `(service_catalog_item_id)`. Named `AppointmentResource` (not `AppointmentService`) per `feature.md` §9.2.

### 2.2 Status lifecycle (existing string column, extended values)
`booked`(initial) → `confirmed`(Business/Staff) → `completed`(Business/Staff after end) / `no_show`(Business/Staff); `cancelled`(Customer before cutoff / Business/Staff). Each transition appends `AppointmentStatusHistory` + updates `Appointment.Status`. ## 3. New services (per-domain pattern; not in `BusinessService`)

### 3.1 `IAppointmentService` / `AppointmentService` (NEW, `Application/Services/`)
Owns **all** appointment logic so no controller/service duplicates it:
- `GetAvailableSlotsAsync(AvailabilityQueryRequest)` → delegates math to `AppointmentAvailabilityService`.
- `CreateAppointmentAsync(callerUserId, role, CreateAppointmentRequest)` — transactional; customer books for self (businessId validated from body), Business/Staff book-on-behalf (businessId derived from caller; request businessId must match → `FORBIDDEN` otherwise).
- `RescheduleAsync(callerUserId, role, id, RescheduleRequest)` — re-runs availability + overlap guard inside one transaction.
- `CancelAsync`, `ConfirmAsync`, `CompleteAsync`, `MarkNoShowAsync` — status transitions with history append.
- `GetCustomerAppointmentsAsync`, `GetBusinessAppointmentsAsync`, `GetStaffAppointmentsAsync` — calendar/list queries (role-scoped).

DI ctor mirrors `BusinessService` ([BusinessService.cs:14-23]): `IUnitOfWork, ApplicationDbContext, AppointmentAvailabilityService, ILogger<AppointmentService>`.

### 3.2 `AppointmentAvailabilityService` (NEW, `Application/Services/`)
Pure slot engine, `AddScoped`, injected by `AppointmentService`. No controller of its own (conflict #3 in `feature.md` §9). ## 4. Controller placement (mirrors existing role-segregated routes)

**Do NOT** put every appointment action on one role-agnostic controller — the codebase **segregates by role via distinct routes** (e.g. `GET /v1/businesses/staff/analytics` [Staff] vs `GET /v1/businesses/staff/{id}/analytics` [Business]; `GET /v1/cards` [Customer] vs `GET /v1/businesses/me/...` [Business]).

- **`AppointmentController`** — `[Route("v1/appointments")]`, `[Authorize]` (controller-level), actions `[Authorize(Roles="Customer")]`. Customer self-service only: `GET /v1/appointments`, `GET /v1/appointments/{id}`, `POST /v1/appointments`, `POST /v1/appointments/{id}/reschedule`, `POST /v1/appointments/{id}/cancel`. Mirrors `LoyaltyCardController`/`RedemptionController`. Uses `GetUserId()` ([LoyaltyCardController.cs:91]).
- **`BusinessController`** — extend with owner/staff appointment routes (mirrors existing staff-shift routes `/v1/businesses/me/staff/{id}/shifts` [Business], `/v1/businesses/staff/analytics` [Staff]):
  - owner `[Authorize(Roles="Business")]`: `GET /v1/businesses/me/appointments`, `GET .../{id}`, `POST .../appointments` (book-on-behalf), `POST .../{id}/reschedule|cancel|confirm|complete|no-show`;
  - staff `[Authorize(Roles="Staff")]`: `GET /v1/businesses/staff/appointments`, `GET .../appointments/{id}`, `POST .../{id}/confirm|complete|no-show`.
- **`ServiceCatalogController`** (NEW) — `[Route("v1/services")]`, `[Authorize(Roles="Business")]`; `GET /v1/services/me`, `GET /v1/services/me/{id}`, `POST /v1/services/me`, `HttpPatch /v1/services/me/{id}`, `HttpDelete /v1/services/me/{id}` (soft via `IsDeleted`); plus public `[AllowAnonymous] GET /v1/services/{businessId:guid}` (mirrors public `GET /v1/cards/program/{businessId}` on LoyaltyCardController).

All three delegate data work to `IAppointmentService` / `IBusinessService` (BusinessController appointments call into `IAppointmentService`, reusing the existing `GetUserId()` + ownerId/staffUserId resolution pattern from `BusinessController.cs:290-330`).

## 5. Availability algorithm (in `AppointmentAvailabilityService`)

`GetAvailableSlotsAsync(businessId, serviceIds, staffId?, startDate, endDate)` → for each candidate staff:
1. **Validate business** exists & active (`_context.Businesses`).
2. **Validate services** belong to `businessId` & `IsActive` (else `SERVICE_NOT_FOUND`). `totalMinutes = Σ ServiceCatalogItem.DurationMinutes`.
3. **Candidate staff set:** if `staffId` given → that staff (must belong to business; else `STAFF_NOT_FOUND`); else → staff assigned (via `StaffServiceAssignments`) to **all** requested services for `businessId`.
4. **Per date** in `[startDate,endDate]`, per staff: load `StaffShifts` for `(staff,date)`. If none or all `IsWorking=false` → skip (unavailable). Else for each `IsWorking=true` window `[StartHour,EndHour)`: step at grid (default 15 min) producing candidate `startAt` where `startAt + totalMinutes <= EndHour`.
5. **Remove overlaps:** existing `_context.Appointments` for `(businessId, staff, date)` where `[a.ScheduledAt, a.EndAt)` overlaps `[startAt, startAt+totalMinutes)` → drop. (Uses new `EndAt`.)
6. **Return** slots `{ startAtUtc, endAtUtc, staffUserId, staffName }` (UTC). No staff-time-off/BusinessBlockedTime tables (availability = shift-based; `IsWorking=false`/absence = blocked; `feature.md` §9.1).

## 6. Conflict / double-booking safety (transactional; no PG exclusion constraint)

Per `feature.md` §9.7 — codebase uses FK/check constraints only, no range/exclusion constraints. Double-booking is prevented by a **transactional explicit overlap guard**:

`CreateAppointmentAsync` / `RescheduleAsync` run inside `_unitOfWork` / `IDbContextTransaction`:
1. `SELECT … FOR UPDATE` (or EF `.FirstOrDefaultAsync` within explicit transaction) existing appointments for `(businessId, staffUserId, date)` where `[ScheduledAt, EndAt)` overlaps the requested `[start, start+duration]`.
2. If any → return `ApiResponse.Fail("OVERBOOKING"/"SLOT_UNAVAILABLE")` → controller → **HTTP 409 Conflict** (mirrors `BusinessController` mapping `BUSINESS_EXISTS`→Conflict, [BusinessController.cs:81]).
3. On success insert `Appointment` + `AppointmentResource`(s) + `AppointmentStatusHistory` row — all committed atomically.

No `Idempotency-Key` (none in codebase; `feature.md` §9.8). `EndAt` is computed as `ScheduledAt + totalMinutes` and stored (not recomputed from services later), so the overlap check is a cheap range compare. ## 7. Endpoint catalog (exact routes, roles, controller, service)

| Method | Route | Controller | Role | Service method |
|---|---|---|---|---|
| GET | `/v1/businesses/{businessId}/availability?serviceIds=&staffId=&startDate=&endDate=` | BusinessController | AllowAnonymous | AppointmentService.GetAvailableSlotsAsync |
| GET | `/v1/businesses/{businessId}/services` | ServiceCatalogController | AllowAnonymous | GetServicesForBusinessAsync |
| GET | `/v1/services/me` | ServiceCatalogController | Business | GetMyServicesAsync |
| GET | `/v1/services/me/{id}` | ServiceCatalogController | Business | GetServiceAsync |
| POST | `/v1/services/me` | ServiceCatalogController | Business | CreateServiceAsync |
| PATCH | `/v1/services/me/{id}` | ServiceCatalogController | Business | UpdateServiceAsync |
| DELETE | `/v1/services/me/{id}` | ServiceCatalogController | Business | DeleteServiceAsync (IsDeleted=true) |
| GET | `/v1/appointments?upcoming=&status=&from=&to=` | AppointmentController | Customer | GetCustomerAppointmentsAsync |
| GET | `/v1/appointments/{id}` | AppointmentController | Customer | GetAppointmentAsync (ownership enforced) |
| POST | `/v1/appointments` | AppointmentController | Customer | CreateAppointmentAsync |
| POST | `/v1/appointments/{id}/reschedule` | AppointmentController | Customer | RescheduleAsync (self, cutoff-aware) |
| POST | `/v1/appointments/{id}/cancel` | AppointmentController | Customer | CancelAsync (self, before cutoff) |
| GET | `/v1/businesses/me/appointments?staffId=&customerId=&serviceId=&status=&from=&to=&page=&pageSize=` | BusinessController | Business | GetBusinessAppointmentsAsync (paged) |
| GET | `/v1/businesses/me/appointments/{id}` | BusinessController | Business | GetAppointmentAsync |
| POST | `/v1/businesses/me/appointments` | BusinessController | Business | CreateAppointmentOnBehalfAsync |
| POST | `/v1/businesses/me/appointments/{id}/reschedule` | BusinessController | Business | RescheduleAsync |
| POST | `/v1/businesses/me/appointments/{id}/cancel` | BusinessController | Business | CancelAsync |
| POST | `/v1/businesses/me/appointments/{id}/confirm` | BusinessController | Business | ConfirmAsync |
| POST | `/v1/businesses/me/appointments/{id}/complete` | BusinessController | Business | CompleteAsync |
| POST | `/v1/businesses/me/appointments/{id}/no-show` | BusinessController | Business | MarkNoShowAsync |
| GET | `/v1/businesses/staff/appointments?from=&to=&status=` | BusinessController | Staff | GetStaffAppointmentsAsync |
| GET | `/v1/businesses/staff/appointments/{id}` | BusinessController | Staff | GetAppointmentAsync (own) |
| POST | `/v1/businesses/staff/appointments/{id}/confirm` | BusinessController | Staff | ConfirmAsync |
| POST | `/v1/businesses/staff/appointments/{id}/complete` | BusinessController | Staff | CompleteAsync |
| POST | `/v1/businesses/staff/appointments/{id}/no-show` | BusinessController | Staff | MarkNoShowAsync |

Owner/staff routes follow the **existing** `(businessId, staffId)` scoping in `BusinessController` (`/my-business`, `/me/...`), and reuse `GetUserId()` + the ownerId/staffUserId→businessId resolution already in `BusinessService.cs`.

## 8. DTOs (shape only; types in `Application/DTOs/`)

- `AvailabilityQueryRequest { businessId, serviceIds: Guid[], staffUserId?, startDate: DateOnly, endDate: DateOnly }`
- `AvailabilitySlotResponse { startAtUtc: DateTime, endAtUtc: DateTime, staffUserId: Guid, staffName: string, serviceIds: Guid[] }`
- `CreateAppointmentRequest { businessId: Guid, serviceIds: Guid[], staffUserId: Guid?, scheduledAt: DateTime, customerId?: Guid, note?: string }`
  - `Customer`: `businessId` validated + `customerId` ignored (forced = caller). `Staff/Business`: `businessId` must equal caller's tenant (else `FORBIDDEN`); `customerId` required + must be a `Customer` role user.
- `RescheduleAppointmentRequest { scheduledAt: DateTime, serviceIds?: Guid[], staffUserId?: Guid?, note?: string }`
- `ServiceCatalogItemResponse { id, businessId, name, durationMinutes, price, isActive, createdAt }`
- `CreateServiceRequest { name, durationMinutes, price }` / `UpdateServiceRequest { name?, durationMinutes?, price?, isActive? }`
- `AppointmentResponse { id, businessId, customerId, staffUserId?, scheduledAt, endAt, status, services: AppointmentServiceSnapshot[], createdAt, updatedAt }`
- `AppointmentServiceSnapshot { serviceCatalogItemId, name, durationMinutes, price, sortOrder }` (mirrors the `appointment_resources` snapshot)
- `AppointmentCalendarItemResponse { id, staffUserId?, customerId, startAt, endAt, status, services }` → reuse in the calendar component.

## 9. HTTP status mapping (controller → status)

Follow `BusinessController.cs:81,220` pattern (`switch` on `result.Error?.Code`):
- `NOT_FOUND`, `SERVICE_NOT_FOUND`, `STAFF_NOT_FOUND`, `CUSTOMER_NOT_FOUND` → **404**
- `FORBIDDEN` → **403**
- `OVERBOOKING`, `SLOT_UNAVAILABLE`, `INVALID_STATUS_TRANSITION` → **409**
- `STAFF_NOT_AVAILABLE`, `VALIDATION_ERROR`, `BUSINESS_NOT_FOUND`(client) → **400**
- success → **200** (create returns 200; existing controllers use 201 only where `Created` semantics apply — appointments use 200 to match `StampController`/`RedemptionController` POST behavior).

## 10. Migration (`Migrations/20260820_AddAppointmentBooking.cs`)

Adds the minimal booking schema on top of the already-existing migrated tables (appointments/services/staff_services/staff_shifts are already created in `20260807190729`):
1. `ALTER TABLE appointments ADD COLUMN end_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'utc')` (safe — table empty at implementation time; implementer may drop the default after).
2. `CREATE TABLE appointment_resources` (`id` uuid PK, `appointment_id` uuid FK→appointments ON DELETE CASCADE, `service_catalog_item_id` uuid FK→services ON DELETE SET NULL, `name` varchar(120), `duration_minutes` int, `price` numeric(10,2), `sort_order` int, `created_at` timestamptz). Indexes `(appointment_id)`, `(service_catalog_item_id)`.
3. Re-create FK for `AppointmentResource` in `ApplicationDbContextModelSnapshot.cs` (model-builder entry), mirroring `StaffServiceAssignment`/`LoyaltyCard` FK configuration.

No PG range/exclusion constraints (conflict #7, `feature.md` §9.7). No `StaffTimeOff`/`BusinessBlockedTime` (conflict #1).

## 11. DI registration (`Program.cs`, after line 131)

```csharp
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<AppointmentAvailabilityService>();   // concrete; no interface needed
// ServiceCatalogController needs no extra registration beyond its controller.
```
Follow the existing `AddScoped<I*Service, *Service>()` + concrete-helper style ([Program.cs:101-137]).

## 12. EF plumbing changes
- `ApplicationDbContext.cs`: add `public DbSet<AppointmentResource> AppointmentResources => Set<AppointmentResource>();` (after line 41, alongside `StaffServiceAssignments`). Add `Appointment.EndAt` property + `AppointmentResource` navigation on `Appointment`.
- `IUnitOfWork.cs`: add `IRepository<AppointmentResource> AppointmentResources { get; }` (and recommended `IRepository<Appointment> Appointments` for consistency with `Users`/`Businesses`/`.StaffInvitations`).
- `Repository<T>`: no change (generic; already supports CRUD).
- Configurations: add `AppointmentResourceConfiguration` (`ToTable("appointment_resources")`, snake `HasColumnName`, indexes, FKs) — mirrors `StaffServiceAssignment` config. Extend `Appointment` config to map `EndAt`→`end_at` (add to `AppointmentFoundationConfiguration.cs`).

## 13. Multi-tenancy enforcement (summary)

- `BusinessController`/`AppointmentController` extract `userId = GetUserId()` ([BusinessController.cs:599]); **reject if null → 401**.
- Owner tenant: `Businesses.FirstOrDefault(b => b.OwnerId == userId)` — any resource access asserts `b.Id == resource.BusinessId` (else `FORBIDDEN`).
- Staff tenant: `Users.FirstOrDefault(u => u.Id == userId && u.StaffBusinessId == businessId)` ([BusinessService.cs:564-567]).
- Customer: `businessId` comes from the booking request and is **validated** (must be an active business); `customerId` is always forced to the caller — never trusted.
- **Never** accept a `businessId` claim from the client (none exists in the JWT — see `feature.md` §3).

## 14. Testing approach (xUnit + Moq)

`Infrastructure.Tests` / `Application.Tests` (existing test projects). Scenarios to cover for `AppointmentService` + `AppointmentAvailabilityService`:
- Availability excludes `IsWorking=false`/absent shifts; returns slots within `[StartHour,EndHour)` not overlapping existing `Appointment`s.
- Multi-service duration = Σ durations; staff must be assigned to **all** requested services, else excluded.
- `CreateAppointmentAsync` blocks an overlapping slot under concurrency (two concurrent creates for the same `[start,end]` → one succeeds, one `OVERBOOKING`).
- Status transitions: `confirmed→completed` ok; `completed→cancelled` rejected (`INVALID_STATUS_TRANSITION`); append `AppointmentStatusHistory`.
- Multi-tenancy: customer GET `/v1/appointments/{id}` for another customer's appointment → `FORBIDDEN`.
- Staff booking-on-behalf forces `customerId` validation; staff without assignments → no slots.

## 15. Out of scope / future hooks (re-extend, don't rewrite)

- **Notifications:** no booking event is dispatched now (conflict #6, `feature.md` §9.6). Hook point: `AppointmentService` can later call the existing `INotificationsService`/`NotificationDispatchService` ([BusinessController.cs:21]) to send a confirmation — reuse that, no new infra.
- **Idempotency:** none (conflict #8). Re-invoke safety can later add an `Idempotency-Key` header → `IdempotencyRequest` table.
- **Timezone:** `StaffShift.StartHour/EndHour` are UTC hour-ints today; correct localization requires a `Business.TimeZoneId` column (future, minimal) — see `feature.md` §9.12 / `frontend.md` §9.
- **Recurring schedules / waitlists / calendar sync / SMS** — deferred.

End of `backend.md`.





