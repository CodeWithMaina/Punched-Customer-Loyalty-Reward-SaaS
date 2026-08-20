# Prompt: Implement Phase 4 & Phase 5 (Booking System)

Run this prompt against the repo root `C:\Users\PeterMainaChege\Downloads\LearningProjects\Punched-Customer-Loyalty-Reward-SaaS`. Ground every action in `docs/booking-system/` (`backend.md` is the **authoritative spec** for routes/methods/DTOs/error-codes; `implementation-plan.md` is the phase checklist; `stack-and-guidelines.md` is the conventions source of truth). The agent is autonomous: build → test → commit per step; stop with a `// BLOCKED:` note only on a hard blocker.

> **Naming precedent:** this repo keeps service interfaces in `Domain/Interfaces/`, implementations in `Application/Services/`, DTOs in `Application/DTOs/`, validators in `Application/Validators/`, mapping profiles in `Application/Mappings/`, controllers in `API/Controllers/`, tests in `PunchedApi.Tests/`. Where `implementation-plan.md` sketch names (e.g. `ServiceController.cs`) drift from `backend.md`, **`backend.md` wins** because it is the spec; the plan is a checklist.

## Verified preconditions (DO NOT re-derive — these are true now)

- **Phase 1/2/3 are committed on `booking/phase-0-1`.** `dotnet build PunchedApi/PunchedApi.csproj` and `dotnet build PunchedApi.Tests/PunchedApi.Tests.csproj` are both green. Existing API routes, controllers, services, DTOs, and validators are all in place and untouched by this prompt's new files.
- **Services exist and are DI-registered** (`Program.cs`, after the `IPayoutService` block):
  - `IAppointmentService`/`AppointmentService` (`Domain/Interfaces/IAppointmentService.cs`, `Application/Services/AppointmentService.cs`) — ctor `(IUnitOfWork, ApplicationDbContext, AppointmentAvailabilityService, IMapper, ILogger<AppointmentService>)`.
  - `AppointmentAvailabilityService` (concrete, no interface) — `Application/Services/AppointmentAvailabilityService.cs` — ctor `(ApplicationDbContext, ILogger<AppointmentAvailabilityService>)`.
  - `IServiceCatalogService`/`ServiceCatalogService` (`Domain/Interfaces/IServiceCatalogService.cs`, `Application/Services/ServiceCatalogService.cs`) — ctor `(IUnitOfWork, ILogger<ServiceCatalogService>)`.
  - `AppointmentMappingProfile` (`Application/Mappings/AppointmentMappingProfile.cs`) auto-discovered by `AddAutoMapper(typeof(MappingProfile))`.
- **Service methods (authoritative signatures — the controllers call these exactly):**
  - `GetAvailableSlotsAsync(Guid userId, string role, Guid businessId, AvailabilityQueryRequest request)` → `ApiResponse<List<AvailabilitySlotResponse>>`. `userId`/`role` are **unused** by the service (delegates to the availability engine), so the anonymous availability endpoint can pass `Guid.Empty` / `"Anonymous"`.
  - `CreateAppointmentAsync(Guid callerUserId, string role, CreateAppointmentRequest request)` → `ApiResponse<AppointmentResponse>`
  - `CreateAppointmentOnBehalfAsync(Guid callerUserId, string role, CreateAppointmentOnBehalfRequest request)` → `ApiResponse<AppointmentResponse>`
  - `RescheduleAsync(Guid callerUserId, string role, Guid appointmentId, RescheduleAppointmentRequest request)`
  - `CancelAsync(Guid callerUserId, string role, Guid appointmentId, CancelAppointmentRequest request)`
  - `ConfirmAsync(Guid callerUserId, string role, Guid appointmentId)`
  - `CompleteAsync(Guid callerUserId, string role, Guid appointmentId)`
  - `MarkNoShowAsync(Guid callerUserId, string role, Guid appointmentId)`
  - `GetCustomerAppointmentsAsync(Guid customerId)` → `ApiResponse<List<AppointmentResponse>>` (no filters)
  - `GetAppointmentAsync(Guid callerUserId, string role, Guid appointmentId)`
  - `GetBusinessAppointmentsAsync(Guid ownerUserId, string? status, DateTime? from, DateTime? to, Guid? staffUserId, Guid? customerId, Guid? serviceId, int page, int pageSize)` → `ApiResponse<PaginatedResponse<AppointmentResponse>>`
  - `GetStaffAppointmentsAsync(Guid staffUserId, string? status, DateTime? from, DateTime? to)` → `ApiResponse<List<AppointmentResponse>>`
  - `IServiceCatalogService`: `GetServicesForBusinessAsync(Guid businessId)`, `GetMyServicesAsync(Guid ownerUserId)`, `GetServiceAsync(Guid ownerUserId, Guid serviceId)`, `CreateServiceAsync(Guid ownerUserId, CreateServiceRequest)`, `UpdateServiceAsync(Guid ownerUserId, Guid serviceId, UpdateServiceRequest)`, `DeleteServiceAsync(Guid ownerUserId, Guid serviceId)`.
- **Request DTOs already exist** (`Application/DTOs/AppointmentDTOs.cs`, `ServiceDTOs.cs`) and are FluentValidation-validated: `AvailabilityQueryRequest`, `CreateAppointmentRequest`, `CreateAppointmentOnBehalfRequest`, `RescheduleAppointmentRequest`, `CancelAppointmentRequest`, `CreateServiceRequest`, `UpdateServiceRequest`.
- **Response/error model:** services return `ApiResponse<T>`; failures carry an `Error.Code`. **Controllers are responsible for mapping `Error.Code → HTTP status`** (`backend.md` §9). Services never set HTTP statuses.
- **Auth:** JWT has **no `businessId` claim**; the identity claim is `"userId"` (lowercase `d`, see `LoyaltyCardController.GetUserId()` and `BusinessController.GetUserId()`); roles are `Customer|Business|Staff|Admin` (`UserRole`). Controllers read `User.FindFirst("userId")`.
- **Controller conventions (verified):** `[ApiController]`, lowercase `[Route("v1/...")]`, `[Produces("application/json")]`, `[Authorize(...)]` at action level, private `Guid? GetUserId()` reading the `"userId"` claim, and `[AllowAnonymous]` for public endpoints. `BusinessController` already has staff-shift routes under `/v1/businesses/me/staff/{staffId}/shifts` (`BusinessController.cs:290-314`) and a `GetUserId()` helper (`BusinessController.cs:599-603`) — mirror those.
- **Controllers that exist and are NOT to be created:** `BusinessController` (extend it), `AppointmentController` (create), `ServiceCatalogController` (create). **Do not** duplicate routes already in `BusinessController`.
- **HTTP status mapping (from `backend.md` §9):** `NOT_FOUND`, `SERVICE_NOT_FOUND`, `STAFF_NOT_FOUND`, `CUSTOMER_NOT_FOUND` → **404**; `FORBIDDEN` → **403**; `OVERBOOKING`, `SLOT_UNAVAILABLE`, `INVALID_STATUS_TRANSITION` → **409**; `STAFF_NOT_AVAILABLE`, `VALIDATION_ERROR`, `BUSINESS_NOT_FOUND` → **400**; success → **200** (appointments use 200, matching `StampController`/`RedemptionController` POST behavior — **not** 201).
- **Test stack (`PunchedApi.Tests/PunchedApi.Tests.csproj`):** xunit 2.5.3, Moq 4.20.70, `Microsoft.EntityFrameworkCore.InMemory` 8.0.11, `Testcontainers.PostgreSql` 3.10.0. **`Microsoft.EntityFrameworkCore.Sqlite` is NOT yet referenced — Phase 5 adds it** (EF Core InMemory does not support `BeginTransactionAsync`, which `AppointmentService` needs; SQLite does).
- **Toolchain:** .NET SDK 8.0.424, EF CLI 10.0.6, npm 11.19.0. Local Postgres is not running in this env — **do not** attempt `dotnet ef database update`. Phase 4/5 introduces **no migration**.

---

## Phase 4 — Backend controllers + HTTP mapping (`implementation-plan.md` §4; `backend.md` §4 §7 §9)

> No services, no DTO changes, no migration. Controllers only: bind DTOs, resolve `userId` from claims, delegate to the existing services, map `Error.Code → HTTP status`. Review `git status` after commit — it must show only the intended new/changed files.

### Step 4.1 — Create `API/Controllers/AppointmentController.cs` (NEW)
Customer self-service only. Mirrors `LoyaltyCardController`: `[ApiController]` + `[Route("v1/appointments")]` + `[Produces("application/json")]` + `[Authorize]` + a private `Guid? GetUserId()` reading the `"userId"` claim. Inject `IAppointmentService`. Actions (all `[Authorize(Roles = "Customer")]`, pass role literal `"Customer"`):

- `GET /v1/appointments` — `[FromQuery] bool? upcoming, string? status, DateTime? from, DateTime? to` → `_appointmentService.GetCustomerAppointmentsAsync(userId)`.
  > The current service signature takes only `customerId` (returns the full list). Bind the four query params for forward-compat but do **not** add unused service parameters — call `GetCustomerAppointmentsAsync(userId.Value)`.
- `GET /v1/appointments/{id:guid}` → `GetAppointmentAsync(userId, "Customer", id)`.
- `POST /v1/appointments` — `[FromBody] CreateAppointmentRequest` → `CreateAppointmentAsync(userId, "Customer", request)`.
- `POST /v1/appointments/{id:guid}/reschedule` — `[FromBody] RescheduleAppointmentRequest` → `RescheduleAsync(userId, "Customer", id, request)`.
- `POST /v1/appointments/{id:guid}/cancel` — `[FromBody] CancelAppointmentRequest` → `CancelAsync(userId, "Customer", id, request)`.

Map every result through the shared error→status helper (Step 4.4). `GetUserId() == null → Unauthorized()`.

### Step 4.2 — Extend `API/Controllers/BusinessController.cs` (MODIFY)
Add `IAppointmentService` to the ctor (field `_appointmentService`). Reuse the existing private `GetUserId()` (`BusinessController.cs:599`). Add these routes alongside the existing staff-shift routes (mirror `/me/staff/...` and `/staff/...` scoping):

**Owner — `[Authorize(Roles = "Business")]`, role literal `"Business"`:**
- `GET /v1/businesses/me/appointments` — `[FromQuery] Guid? staffId, Guid? customerId, Guid? serviceId, string? status, DateTime? from, DateTime? to, int page = 1, int pageSize = 20` → `GetBusinessAppointmentsAsync(userId, status, from, to, staffId, customerId, serviceId, page, pageSize)`.
- `GET /v1/businesses/me/appointments/{id:guid}` → `GetAppointmentAsync(userId, "Business", id)`.
- `POST /v1/businesses/me/appointments` — `[FromBody] CreateAppointmentOnBehalfRequest` → `CreateAppointmentOnBehalfAsync(userId, "Business", request)`.
- `POST /v1/businesses/me/appointments/{id:guid}/reschedule` — `[FromBody] RescheduleAppointmentRequest` → `RescheduleAsync(userId, "Business", id, request)`.
- `POST /v1/businesses/me/appointments/{id:guid}/cancel` — `[FromBody] CancelAppointmentRequest` → `CancelAsync(userId, "Business", id, request)`.
- `POST /v1/businesses/me/appointments/{id:guid}/confirm` → `ConfirmAsync(userId, "Business", id)`.
- `POST /v1/businesses/me/appointments/{id:guid}/complete` → `CompleteAsync(userId, "Business", id)`.
- `POST /v1/businesses/me/appointments/{id:guid}/no-show` → `MarkNoShowAsync(userId, "Business", id)`.

**Staff — `[Authorize(Roles = "Staff")]`, role literal `"Staff"`:**
- `GET /v1/businesses/staff/appointments` — `[FromQuery] string? status, DateTime? from, DateTime? to` → `GetStaffAppointmentsAsync(userId, status, from, to)`.
- `GET /v1/businesses/staff/appointments/{id:guid}` → `GetAppointmentAsync(userId, "Staff", id)`.
- `POST /v1/businesses/staff/appointments/{id:guid}/confirm` → `ConfirmAsync(userId, "Staff", id)`.
- `POST /v1/businesses/staff/appointments/{id:guid}/complete` → `CompleteAsync(userId, "Staff", id)`.
- `POST /v1/businesses/staff/appointments/{id:guid}/no-show` → `MarkNoShowAsync(userId, "Staff", id)`.

**Public availability — `[AllowAnonymous]`:**
- `GET /v1/businesses/{businessId:guid}/availability` — `[FromQuery] Guid[] serviceIds, Guid? staffId, DateOnly startDate, DateOnly endDate` → build `AvailabilityQueryRequest { BusinessId = businessId, ServiceIds = serviceIds, StaffUserId = staffId, StartDate = startDate, EndDate = endDate }` → `GetAvailableSlotsAsync(Guid.Empty, "Anonymous", businessId, request)`. Do **not** call `GetUserId()` here (anonymous).

> The customer list lives only on `AppointmentController`; owner/staff `GET .../appointments` go through `GetBusinessAppointmentsAsync`/`GetStaffAppointmentsAsync`. Do **not** add a generic customer list to `BusinessController`.

### Step 4.3 — Create `API/Controllers/ServiceCatalogController.cs` (NEW)
`backend.md` §4 names this **`ServiceCatalogController`** (repo wins over the plan's `ServiceController.cs` sketch). `[Route("v1/services")]`, `[ApiController]`, `[Produces("application/json")]`. Inject `IServiceCatalogService`. Private `Guid? GetUserId()` reading `"userId"`. Actions:

- `GET /v1/services/me` `[Authorize(Roles = "Business")]` → `GetMyServicesAsync(userId)`.
- `GET /v1/services/me/{id:guid}` `[Authorize(Roles = "Business")]` → `GetServiceAsync(userId, id)`.
- `POST /v1/services/me` `[Authorize(Roles = "Business")]` — `[FromBody] CreateServiceRequest` → `CreateServiceAsync(userId, request)`.
- `PATCH /v1/services/me/{id:guid}` `[Authorize(Roles = "Business")]` — `[FromBody] UpdateServiceRequest` → `UpdateServiceAsync(userId, id, request)`.
- `DELETE /v1/services/me/{id:guid}` `[Authorize(Roles = "Business")]` → `DeleteServiceAsync(userId, id)` (soft delete — returns the `ApiResponse<bool>`).
- `GET /v1/services/{businessId:guid}` `[AllowAnonymous]` → `GetServicesForBusinessAsync(businessId)` (public active list). Do **not** call `GetUserId()` here.

### Step 4.4 — HTTP error→status mapping helper
Add one private helper per controller (or a shared internal static in `API/Controllers`) that maps `ApiResponse` failure codes to `IActionResult` per `backend.md` §9. Shape (mirror the `BusinessController.cs:81,220` switch-on-code style):

```csharp
private IActionResult MapFailure(ApiResponse result)
    => result.Error?.Code switch
    {
        "NOT_FOUND" or "SERVICE_NOT_FOUND" or "STAFF_NOT_FOUND" or "CUSTOMER_NOT_FOUND" => NotFound(result),
        "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, result),
        "OVERBOOKING" or "SLOT_UNAVAILABLE" or "INVALID_STATUS_TRANSITION" => Conflict(result),
        _ => BadRequest(result)   // STAFF_NOT_AVAILABLE, VALIDATION_ERROR, BUSINESS_NOT_FOUND, fallback
    };
```
> If no non-generic `ApiResponse` base exists, overload `MapFailure<T>` per method's return type. **Success always returns `Ok(result)`.** Confirm-route success returns 200 (not 201).

### Step 4.5 — Build + commit
- `dotnet build PunchedApi/PunchedApi.csproj` → **must be green** (controllers resolve services/DI).
- `dotnet build PunchedApi.Tests/PunchedApi.Tests.csproj` → green (no regressions).
- Review `git status`; commit: `feat(booking): Phase 4 appointment + service-catalog controllers (role-segregated routes, error mapping)`

### Acceptance — Phase 4
- [ ] `AppointmentController` exposes the 5 customer self-service routes (`/v1/appointments` list/get/create/reschedule/cancel) with `[Authorize(Roles="Customer")]`.
- [ ] `BusinessController` extended with owner (`/me/appointments...`) + staff (`/staff/appointments...`) routes and the public `/v1/businesses/{businessId}/availability` endpoint; the ctor now injects `IAppointmentService`.
- [ ] `ServiceCatalogController` exposes owner CRUD (`/v1/services/me...`) + public `/v1/services/{businessId}`.
- [ ] All routes match `backend.md` §7 exactly (method + route + role + service method).
- [ ] Error codes map to the correct statuses per `backend.md` §9 (404/403/409/400); success → 200.
- [ ] `GetUserId()` guards every authenticated action (`null → 401`); public endpoints do not call it.
- [ ] `dotnet build PunchedApi` + `dotnet build PunchedApi.Tests` green; `git status` clean (only new `AppointmentController.cs`, `ServiceCatalogController.cs`, and the `BusinessController.cs` diff).

---

## Phase 5 — Backend tests (`implementation-plan.md` §5; `backend.md` §10; xunit + Moq + SQLite in-memory)

> Test the **services** (not controllers). Follow the existing `InvitationServiceTests` pattern: build a real `ApplicationDbContext` over an in-memory store, construct the real service with a real `UnitOfWork(context)` and a configured mapper, assert on the returned `ApiResponse`. **Because `AppointmentService` calls `BeginTransactionAsync()`, use SQLite in-memory (which supports transactions), NOT EF Core InMemory.**

### Step 5.0 — Test infrastructure (MODIFY `PunchedApi.Tests/PunchedApi.Tests.csproj` + NEW helper)
- Add `<PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="8.0.11" />` (matches EF Core 8.0.11). Do **not** remove the existing InMemory/Testcontainers references.
- In a new `PunchedApi.Tests/BookingTestBase.cs` (or within each test file), add helpers:
  - `CreateContext()` → `ApplicationDbContext` over `UseSqlite("DataSource=:memory:")`, **keeping the `SqliteConnection` open for the lifetime of the test** (open it before creating the context; dispose at the end) so the schema persists across calls.
  - `CreateMapper()` → `new MapperConfiguration(cfg => cfg.AddProfile<AppointmentMappingProfile>()).CreateMapper()`.
  - `CreateAppointmentService(context)` → `new AppointmentService(new UnitOfWork(context), context, new AppointmentAvailabilityService(context, TestHelpers.CreateLogger<AppointmentAvailabilityService>()), CreateMapper(), TestHelpers.CreateLogger<AppointmentService>())`.
  - `CreateAvailabilityService(context)` → `new AppointmentAvailabilityService(context, TestHelpers.CreateLogger<AppointmentAvailabilityService>())`.
  - `CreateCatalogService(context)` → `new ServiceCatalogService(new UnitOfWork(context), TestHelpers.CreateLogger<ServiceCatalogService>())`.
  - Entity builders for `Business`, `User` (roles Customer/Business/Staff), `ServiceCatalogItem`, `StaffServiceAssignment`, `StaffShift`, `Appointment`, `AppointmentStatusHistory` (seed via `context.AddAsync` + `SaveChangesAsync`).

### Step 5.1 — Availability engine tests (`AppointmentAvailabilityServiceTests.cs` — NEW)
Cover `backend.md` §5. **Run:** `dotnet test --filter "FullyQualified~AppointmentAvailability"`.
- [ ] `IsWorking=false` and absent-shift days produce **no** slots; `IsWorking=true` windows produce slots strictly within `[StartHour, EndHour)`.
- [ ] Multi-service request: `EndAtUtc - StartAtUtc == Σ DurationMinutes`, and a slot is dropped when `start + Σ durations > EndHour`.
- [ ] Staff must be assigned to **all** requested services: a staff assigned to only one of two requested services is excluded; a staff assigned to both is included.
- [ ] Busy subtraction: an existing `Appointment` whose `[ScheduledAt, EndAt)` overlaps a candidate `[start, start+duration)` drops that slot; a non-overlapping adjacent slot remains.
- [ ] 15-minute grid: slots advance by exactly 15 minutes; a slot exactly at `EndHour - duration` is included, `EndHour` itself is not.
- [ ] Invalid inputs: unknown business → `NOT_FOUND`; a service not belonging to the business / inactive → `SERVICE_NOT_FOUND`; a `staffUserId` not in the business → `STAFF_NOT_FOUND`.

### Step 5.2 — AppointmentService creation/overlap/audit tests (`AppointmentServiceTests.cs` — NEW)
**Run:** `dotnet test --filter "FullyQualified~Appointment"`.
- [ ] `CreateAppointmentAsync` (Customer): `EndAt == ScheduledAt + Σ DurationMinutes`; `Status == "booked"`; **one** `AppointmentResource` per requested service with snapshot `Name/DurationMinutes/Price` and correct `SortOrder`; **one** `AppointmentStatusHistory` row with `status="booked"`, `changed_by_user_id = caller`, `changed_at ≈ now`.
- [ ] `CreateAppointmentOnBehalfAsync` (Business): forces `customerId` to a real `Customer`-role user (`CUSTOMER_NOT_FOUND` otherwise); enforces staff assignment (`STAFF_NOT_AVAILABLE` for a staff not assigned to all services); mismatched DTO `businessId` vs owner tenant → `FORBIDDEN`.
- [ ] **Overlap guard:** seed an existing `booked` appointment `[10:00, 11:00)`; a `CreateAppointmentAsync` for `[10:30, 11:30)` → `OVERBOOKING`; a request for `[11:00, 12:00)` (touching, not overlapping) succeeds.
- [ ] `RescheduleAsync`: new `ScheduledAt`/`EndAt` persisted; replacing `serviceIds` replaces the `AppointmentResource` snapshots and recomputes `EndAt`; an overlap with a **different** appointment → `OVERBOOKING` (self is excluded).

### Step 5.3 — Multi-tenant scoping tests (`AppointmentServiceTests.cs` — NEW)
**Run:** `dotnet test --filter "FullyQualified~Appointment"`.
- [ ] Customer `GetAppointmentAsync` for **another** customer's appointment → `FORBIDDEN`.
- [ ] Business owner `GetAppointmentAsync` for an appointment in a different business → `FORBIDDEN`; for their own business → success.
- [ ] Staff `GetAppointmentAsync` for an appointment assigned to a different staff member → `FORBIDDEN`.
- [ ] `GetBusinessAppointmentsAsync` returns only the owner's business rows and applies `status`/`staffUserId`/`customerId`/`serviceId` filters + paging; `GetStaffAppointmentsAsync` returns only that staff's rows.

### Step 5.4 — Status-transition tests (`AppointmentServiceTests.cs` — NEW)
**Run:** `dotnet test --filter "FullyQualified~Appointment"`.
- [ ] `booked → confirmed` (Business) ok; `confirmed → completed` ok; `booked → cancelled` (Customer) ok; `confirmed → no_show` (Business) ok.
- [ ] Illegal transitions rejected with `INVALID_STATUS_TRANSITION`: `completed → cancelled`, `booked → completed`, `no_show → confirmed`, `confirmed → confirmed`.
- [ ] Each successful transition appends an `AppointmentStatusHistory` row with the correct status and `changed_by_user_id`; the appointment's `Status` is updated.
- [ ] Customer cannot `confirm`/`complete`/`no-show` (→ `FORBIDDEN`); customer **can** `cancel` their own appointment.

### Step 5.5 — ServiceCatalogService tests (`ServiceCatalogServiceTests.cs` — NEW)
**Run:** `dotnet test --filter "FullyQualified~ServiceCatalog"`.
- [ ] `CreateServiceAsync` sets `IsActive = true` and `Price` from the request; returns the created item.
- [ ] `UpdateServiceAsync` applies only the provided fields; `DeleteServiceAsync` sets `IsActive = false` (soft delete) and returns `true`.
- [ ] `GetServicesForBusinessAsync` (public) returns only `IsActive` services; `GetMyServicesAsync` (owner) returns all incl. inactive.
- [ ] Owner isolation: a second owner's `GetServiceAsync`/`UpdateServiceAsync`/`DeleteServiceAsync` on another business's service → `FORBIDDEN`; unknown service → `NOT_FOUND`; no business for an owner → `NOT_FOUND`.

### Step 5.6 — Run + commit
- `dotnet test --filter "FullyQualified~Appointment"` → all pass.
- `dotnet test --filter "FullyQualified~ServiceCatalog"` → all pass.
- `dotnet build PunchedApi.Tests/PunchedApi.Tests.csproj` → green.
- Review `git status`; commit: `test(booking): Phase 5 appointment/availability/service-catalog unit tests`

### Acceptance — Phase 5
- [ ] `Microsoft.EntityFrameworkCore.Sqlite` added to `PunchedApi.Tests.csproj`; helpers build the service stack over a long-lived SQLite in-memory connection.
- [ ] Availability engine covered (shifts × assignment × busy subtraction × 15-min grid × error codes).
- [ ] Create/on-behalf/reschedule covered incl. `OVERBOOKING`, `EndAt` math, `AppointmentResource` snapshots, and `AppointmentStatusHistory` insertion.
- [ ] Multi-tenant scoping covered (`FORBIDDEN` paths) and business list filters/paging.
- [ ] Status transitions covered (valid + `INVALID_STATUS_TRANSITION` + history append + role restrictions).
- [ ] ServiceCatalog owner CRUD + public active list + isolation covered.
- [ ] `dotnet test --filter "FullyQualified~Appointment"` and `...~ServiceCatalog` pass; `git status` clean.

---

## End-to-end verification (end of Phase 5)
- [ ] `dotnet build PunchedApi/PunchedApi.csproj` green.
- [ ] `dotnet build PunchedApi.Tests/PunchedApi.Tests.csproj` green.
- [ ] `dotnet test --filter "FullyQualified~Appointment"` green.
- [ ] `dotnet test --filter "FullyQualified~ServiceCatalog"` green.
- [ ] Flip Phase 4 (`4.1`, `4.2`, `4.3`) and Phase 5 (`5.1`, `5.2`) checkboxes to `[x]` in `implementation-plan.md` and commit the doc update.
- (Phase 6+ are the frontend — not in this prompt. Do not create frontend files.)

End of `phase-4-5-prompt.md`.
