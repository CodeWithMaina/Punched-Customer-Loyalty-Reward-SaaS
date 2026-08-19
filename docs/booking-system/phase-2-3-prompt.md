# Prompt: Implement Phase 2 & Phase 3 (Booking System)

Run this prompt against the repo root `C:\Users\PeterMainaChege\Downloads\LearningProjects\Punched-Customer-Loyalty-Reward-SaaS`. Ground every action in `docs/booking-system/` (`backend.md` is the **authoritative spec** for routes/methods/DTOs/error-codes; `implementation-plan.md` is the phase checklist; `stack-and-guidelines.md` is the conventions source of truth). The agent is autonomous: build → test → commit per step; stop with a `// BLOCKED:` note only on a hard blocker.

> **Naming precedent:** this repo keeps service interfaces in `Domain/Interfaces/` (e.g. `IRedemptionService`, `IStampService`), implementations in `Application/Services/`, DTOs in `Application/DTOs/`, validators in `Application/Validators/`, mapping profiles in `Application/Mappings/`. New files must follow those folders exactly. Where `implementation-plan.md` sketch names (e.g. `CreateAsync`/`GetMineAsync`) drift from `backend.md`, **`backend.md` wins** because it is the spec; the plan is a checklist.

## Verified preconditions (DO NOT re-derive — these are true now)
- **Phase 1 is committed on `booking/phase-0-1`.** `Appointment` now has required `EndAt` + `ICollection<AppointmentResource> Resources`; `AppointmentResource` entity + `AppointmentResourceConfiguration` exist; `DbSet<AppointmentResource>` registered; migration `20260818092234_AddAppointmentEndAtAndAppointmentResources` created `appointments.end_at` + `appointment_resources`. `dotnet build PunchedApi/PunchedApi.csproj` green.
- **Backend stack:** .NET 8 (`net8.0`), Npgsql EF Core 8.0.11, FluentValidation 11 (auto-registered via `AddValidatorsFromAssemblyContaining<RegisterRequestValidator>()`, `Program.cs:170`), AutoMapper 12 (registered via `AddAutoMapper(typeof(MappingProfile))`, `Program.cs:166`), **no MediatR**. Routes prefix `/v1`.
- **Response/error model:** every service returns `ApiResponse<T>`; failures via `ApiResponse<T>.Fail("CODE","message")` (`AuthDTOs.cs:35`). Controllers (Phase 4) will map `Error.Code → HTTP status`; services only return codes.
- **DI pattern:** `builder.Services.AddScoped<I*Service, *Service>()` (`Program.cs:108-137`); service ctor mirrors `LoyaltyService(IUnitOfWork, ApplicationDbContext, …, ILogger<T>)`.
- **Repo/UoW:** generic `IRepository<T>` + `UnitOfWork` expose lazy `IRepository<T>` properties grouped in `IUnitOfWork` (`IUnitOfWork.cs`, `UnitOfWork.cs`). `UserAuths/Users/Businesses/…/StaffInvitations` are wired; **appointment-domain repos are NOT yet exposed** (this prompt wires them).
- **Auth/tenant:** JWT has no `businessId` claim; identity claim is `userid`; roles `Customer|Business|Staff|Admin` (`UserRole`). Owner tenant = `Businesses.FirstOrDefault(b => b.OwnerId == ownerUserId)`; staff tenant = `Users.FirstOrDefault(u => u.Id == userId && u.StaffBusinessId == businessId)`; customer `customerId` is **always forced from the caller** (mirror `LoyaltyService.EnrollAsync`). Controllers own `GetUserId()` (private helper, e.g. `BusinessController.cs:599`) — **controllers are Phase 4, out of scope here**.
- **Entity facts that override the doc:** `ServiceCatalogItem.Price` is `decimal?` (nullable); snapshot `AppointmentResource.Price` is `decimal`. `ServiceCatalogItem` has `IsActive` but **no `IsDeleted`** → "delete a service" = `IsActive = false`. `Appointment` has **no `UpdatedAt`** column → derive `updatedAt` in `AppointmentResponse` from the most recent `AppointmentStatusHistory.ChangedAt` (fallback `CreatedAt`); do **not** add a column/migration here.
- **Toolchain present:** .NET SDK 8.0.424, EF CLI 10.0.6, npm 11.19.0. (Local Postgres is not running in this env — do not attempt `dotnet ef database update`; Phase 2/3 introduces no migration anyway.)

---

## Phase 2 — Backend DTOs + validators (`implementation-plan.md` §2; `backend.md` §6 §7 §8)

> No services, no controllers, no migration. Just DTOs + validators. `git status` after commit must show only the four new files.

### Step 2.1 — Create `Application/DTOs/AppointmentDTOs.cs` (NEW)
camelCase JSON via `[JsonPropertyName(...)]` (match `AuthDTOs.cs` style). Contents (shapes from `backend.md` §8):

```csharp
// Requests
AvailabilityQueryRequest  { businessId: Guid, serviceIds: Guid[], staffUserId?: Guid, startDate: DateOnly, endDate: DateOnly }
CreateAppointmentRequest  { businessId: Guid, serviceIds: Guid[], staffUserId?: Guid, scheduledAt: DateTime, note?: string }
CreateAppointmentOnBehalfRequest { businessId: Guid, serviceIds: Guid[], staffUserId?: Guid, scheduledAt: DateTime, customerId: Guid, note?: string }
RescheduleAppointmentRequest { scheduledAt: DateTime, serviceIds?: Guid[], staffUserId?: Guid, note?: string }
CancelAppointmentRequest  { note?: string }

// Availability
AvailabilitySlotResponse { startAtUtc: DateTime, endAtUtc: DateTime, staffUserId: Guid, staffName: string, serviceIds: Guid[] }

// Responses
AppointmentResponse       { id, businessId, customerId, staffUserId?, scheduledAt, endAt, status, services: AppointmentServiceSnapshot[], createdAt, updatedAt }
AppointmentServiceSnapshot { serviceCatalogItemId, name, durationMinutes, price, sortOrder }
AppointmentCalendarItemResponse { id, staffUserId?, customerId, startAt, endAt, status, services: AppointmentServiceSnapshot[] }
PaginatedResponse<T>      { items: List<T>, page, pageSize, total, totalPages }
```

> `PaginatedResponse<T>` is used by `GetBusinessAppointmentsAsync` (`backend.md` §7: `page`, `pageSize`). `updatedAt` derived as described in preconditions.

### Step 2.2 — Create `Application/DTOs/ServiceDTOs.cs` (NEW)
```csharp
ServiceCatalogItemResponse { id, businessId, name, durationMinutes, price, isActive, createdAt }
CreateServiceRequest       { name, durationMinutes, price }
UpdateServiceRequest       { name?, durationMinutes?, price?, isActive? }
```

### Step 2.3 — Create `Application/Validators/AppointmentValidators.cs` (NEW)
One `AbstractValidator<T>` per request (FluentValidation style from `AuthValidators.cs`, `RegisterRequestValidator`):
- `AvailabilityQueryRequestValidator`: `serviceIds`.`NotEmpty()`; each `serviceId` `NotEmpty()`; `startDate <= endDate` (else fail `"START_DATE_AFTER_END_DATE"`).
- `CreateAppointmentRequestValidator` / `CreateAppointmentOnBehalfRequestValidator`: `businessId` non-empty; `serviceIds.NotEmpty()` (min 1 service) + items non-empty; `scheduledAt.GreaterThan(DateTime.UtcNow)` (future slot; add `AddMinutes(1)` slack for clock skew); `note` `MaximumLength(500)`; on-behalf validator also `customerId` non-empty.
- `RescheduleAppointmentRequestValidator`: `scheduledAt.GreaterThan(DateTime.UtcNow)`; `serviceIds` (when provided) `NotEmpty()` + items non-empty; `note` `MaximumLength(500)`.
- `CancelAppointmentRequestValidator`: `note` `MaximumLength(500)` (optional).
- Role-dependent rules (customerId-required for Business/Staff, staff-assignment membership, overlap) are **service concerns** (`backend.md` §6) — keep them out of the validator.

### Step 2.4 — Create `Application/Validators/ServiceValidators.cs` (NEW)
- `CreateServiceRequestValidator`: `name` `NotEmpty()` + `MaximumLength(120)`; `durationMinutes` `GreaterThan(0)`; `price` `GreaterThanOrEqualTo(0)`.
- `UpdateServiceRequestValidator`: same rules, applied only when each field is non-null (`When(x => x.Name != null)` etc.); `price` `GreaterThanOrEqualTo(0)` when provided.

### Step 2.5 — Build + commit
- `dotnet build PunchedApi/PunchedApi.csproj` → green.
- Commit message: `feat(booking): Phase 2 appointment/service DTOs + FluentValidation validators`
- **Acceptance:** build green; `git status` = 4 new files only (2 DTOs + 2 validators). New validators are picked up automatically (`AddValidatorsFromAssemblyContaining`); do **not** hand-register them.

---

## Phase 3 — Backend services (+ UoW plumbing, DI, mapping) (`implementation-plan.md` §3; `backend.md` §3 §5 §6 §11 §12)

### Step 3.1 — Wire appointment repositories (`IUnitOfWork.cs` + `UnitOfWork.cs`)
Add lazy repo properties (mirror `Notifications`/`StaffInvitations`):
- `IRepository<Appointment> Appointments`
- `IRepository<AppointmentResource> AppointmentResources`
- `IRepository<AppointmentStatusHistory> AppointmentStatusHistory`
- `IRepository<ServiceCatalogItem> ServiceCatalogItems`
- `IRepository<StaffShift> StaffShifts`
- `IRepository<StaffServiceAssignment> StaffServiceAssignments`
Each implemented in `UnitOfWork` as a `_field ??= new Repository<T>(_context);` lazily-backed `IUnitOfWork` property (copy the existing pattern for `StaffInvitations`). Verify `dotnet build` before moving on.

### Step 3.2 — Create `Domain/Interfaces/IAppointmentService.cs` (NEW)
Interface takes the caller identity + `string role`; it never trusts a `businessId` from the DTO when the caller's tenant can be resolved locally:
```csharp
Task<ApiResponse<List<AvailabilitySlotResponse>>> GetAvailableSlotsAsync(Guid userId, string role, Guid businessId, AvailabilityQueryRequest request);
Task<ApiResponse<AppointmentResponse>> CreateAppointmentAsync(Guid callerUserId, string role, CreateAppointmentRequest request);
Task<ApiResponse<AppointmentResponse>> CreateAppointmentOnBehalfAsync(Guid callerUserId, string role, CreateAppointmentOnBehalfRequest request);
Task<ApiResponse<AppointmentResponse>> RescheduleAsync(Guid callerUserId, string role, Guid appointmentId, RescheduleAppointmentRequest request);
Task<ApiResponse<AppointmentResponse>> CancelAsync(Guid callerUserId, string role, Guid appointmentId, CancelAppointmentRequest request);
Task<ApiResponse<AppointmentResponse>> ConfirmAsync(Guid callerUserId, string role, Guid appointmentId);
Task<ApiResponse<AppointmentResponse>> CompleteAsync(Guid callerUserId, string role, Guid appointmentId);
Task<ApiResponse<AppointmentResponse>> MarkNoShowAsync(Guid callerUserId, string role, Guid appointmentId);
Task<ApiResponse<List<AppointmentResponse>>> GetCustomerAppointmentsAsync(Guid customerId);
Task<ApiResponse<AppointmentResponse>> GetAppointmentAsync(Guid callerUserId, string role, Guid appointmentId);
Task<ApiResponse<PaginatedResponse<AppointmentResponse>>> GetBusinessAppointmentsAsync(Guid ownerUserId, string? status, DateTime? from, DateTime? to, Guid? staffUserId, Guid? customerId, Guid? serviceId, int page, int pageSize);
Task<ApiResponse<List<AppointmentResponse>>> GetStaffAppointmentsAsync(Guid staffUserId, string? status, DateTime? from, DateTime? to);
```
> `PaginatedResponse<AppointmentResponse>` is only needed for the business list (`backend.md` §7); the customer and staff lists are plain `List<AppointmentResponse>` per the endpoint catalog.

### Step 3.3 — Create `Application/Services/AppointmentAvailabilityService.cs` (NEW)
Concrete `AddScoped` helper (no interface — `backend.md` §3.2; the plan's `IAppointmentAvailabilityService` sketch is superseded) injected into `AppointmentService`. Implements `backend.md` §5 exactly: validate the business exists/is-active (`NOT_FOUND`), validate all `serviceIds` belong to `businessId` & `IsActive` (else `SERVICE_NOT_FOUND`), compute `totalMinutes = Σ DurationMinutes`, build the candidate staff set (given `staffUserId` must belong to the business else `STAFF_NOT_FOUND`; otherwise staff assigned to **all** requested services); then per date in `[startDate,endDate]` load that staff's `StaffShifts`, skip when none or all `IsWorking=false`, else for each `IsWorking=true` window `[StartHour,EndHour)` step at a 15-min grid producing `startAt` where `startAt + totalMinutes <= EndHour`; drop any that overlap existing `Appointment`s (`[ScheduledAt, EndAt)` overlap, using the new `EndAt`); return `AvailabilitySlotResponse { startAtUtc, endAtUtc, staffUserId, staffName }` in UTC.

### Step 3.4 — Create `Application/Services/AppointmentService.cs` (NEW; interface at `Domain/Interfaces/IAppointmentService.cs`)
Ctor: `(IUnitOfWork, ApplicationDbContext, AppointmentAvailabilityService, IMapper, ILogger<AppointmentService>)` (mirror `LoyaltyService`; `IMapper` per the AutoMapper DI). Enforce `backend.md` §6 + §13:
- **Ownership before action.** Resolve the caller's tenant: Business → `Businesses.FirstOrDefault(b => b.OwnerId == userId)`; its `Id` is the enforced `businessId`, and any DTO `businessId` that differs → `FORBIDDEN`. Staff → `User.StaffBusinessId` (`Users.FirstOrDefault(u => u.Id == userId && u.StaffBusinessId == businessId)`). Customer → the DTO `businessId` must resolve to an active business else `BUSINESS_NOT_FOUND`.
- **Create (customer self-service):** force `CustomerId = callerUserId` and ignore any DTO `customerId`. Book-on-behalf (Business/Staff): `customerId` required and must be a `Customer`-role non-deleted user else `CUSTOMER_NOT_FOUND`; staff must be assigned to **all** requested services else `STAFF_NOT_AVAILABLE`.
- **Transactional overlap guard (`backend.md` §6):** inside one explicit `IDbContextTransaction`, read existing `Appointment`s for `(businessId, staffUserId, targetDate)` with `scheduled_at < requestedEnd && end_at > requestedStart` (i.e. `[ScheduledAt, EndAt)` overlaps `[start, start+totalMinutes]`). On any overlap → `ApiResponse<AppointmentResponse>.Fail("OVERBOOKING", …)` and roll back. On success insert the `Appointment` (`EndAt = scheduledAt + totalMinutes`, `Status = "booked"`), one `AppointmentResource` per requested service (`Name/DurationMinutes/Price` snapshotted from the catalog, nullable `Price → 0`, `SortOrder` = array index), and one `AppointmentStatusHistory` row (`status="booked"`, `changed_by_user_id=callerUserId`, `changed_at=UtcNow`). Commit atomically via `_unitOfWork.SaveChangesAsync()`.
- **Status transitions:** `booked → confirmed → completed`, `booked → cancelled`, `confirmed → no_show`; anything else → `ApiResponse<AppointmentResponse>.Fail("INVALID_STATUS_TRANSITION", …)`. Each transition appends a status-history row + updates `Appointment.Status`. Only Business/Staff may `confirm/complete/no-show` (controllers enforce in Phase 4; the service still re-checks ownership).
- **Role-scoped reads (`backend.md` §13):** `GetAppointmentAsync` asserts the appointment belongs to the caller's tenant (owner `appt.BusinessId == resolvedOwnerBusinessId`, staff `appt.StaffUserId == callerUserId`, customer `appt.CustomerId == callerUserId`) else `FORBIDDEN`.
- **Mapping:** use the injected `IMapper` for `Appointment → AppointmentResponse`; set `updatedAt = latest appointment_status_history.ChangedAt` (fallback `CreatedAt`); `services` from `Resources` ordered by `SortOrder`.

### Step 3.5 — Create `Domain/Interfaces/IServiceCatalogService.cs` + `Application/Services/ServiceCatalogService.cs` (NEW)
Per-plan granularity (`implementation-plan.md` §3.4), clean split from appointments. Backs the ServiceCatalog endpoints + public per-business service list (`backend.md` §7):
```csharp
Task<ApiResponse<List<ServiceCatalogItemResponse>>> GetServicesForBusinessAsync(Guid businessId); // public: IsActive only; else NOT_FOUND
Task<ApiResponse<List<ServiceCatalogItemResponse>>> GetMyServicesAsync(Guid ownerUserId);         // owner: all incl. inactive
Task<ApiResponse<ServiceCatalogItemResponse>> GetServiceAsync(Guid ownerUserId, Guid serviceId);  // owner scoped; else FORBIDDEN/NOT_FOUND
Task<ApiResponse<ServiceCatalogItemResponse>> CreateServiceAsync(Guid ownerUserId, CreateServiceRequest request);
Task<ApiResponse<ServiceCatalogItemResponse>> UpdateServiceAsync(Guid ownerUserId, Guid serviceId, UpdateServiceRequest request);
Task<ApiResponse<bool>> DeleteServiceAsync(Guid ownerUserId, Guid serviceId);                       // soft: IsActive = false
```
Ctor `(IUnitOfWork, ILogger<ServiceCatalogService>)`. New services are `IsActive = true`. `ServiceCatalogItemResponse.Price` maps `decimal? → decimal` via `?? 0`. Owner-scoped methods resolve `Businesses.FirstOrDefault(b => b.OwnerId == ownerUserId)` and assert `service.BusinessId == business.Id` (else `FORBIDDEN`/`NOT_FOUND`).

### Step 3.6 — Add mapping profile + DI
- **`Application/Mappings/AppointmentMappingProfile.cs`** (NEW): `CreateMap<Appointment, AppointmentResponse>()` (`services` ← `Resources` ordered by `SortOrder`), `CreateMap<AppointmentResource, AppointmentServiceSnapshot>()`, `CreateMap<ServiceCatalogItem, ServiceCatalogItemResponse>()` (`price` coalesced `?? 0`). Do **not** edit the existing `MappingProfile.cs`; the new `Profile` in the same assembly is auto-discovered by `AddAutoMapper(typeof(MappingProfile))` (`Program.cs:166`).
- **`Program.cs`** — add after the `IPayoutService` registration (~line 137):
  ```csharp
  builder.Services.AddScoped<IAppointmentService, AppointmentService>();
  builder.Services.AddScoped<AppointmentAvailabilityService>();
  builder.Services.AddScoped<IServiceCatalogService, ServiceCatalogService>();
  ```

### Step 3.7 — Build, quick verification, commit
- `dotnet build PunchedApi/PunchedApi.csproj` → **must be green** (services/DI/mapping resolve).
- `dotnet build PunchedApi.Tests/PunchedApi.Tests.csproj` → green (no regressions).
- Review `git status`; commit: `feat(booking): Phase 3 appointment + availability + service-catalog services (UoW wiring, DI, mapping)`

### Acceptance — Phase 3
- [ ] `IUnitOfWork`/`UnitOfWork` expose the 6 appointment-domain repositories.
- [ ] `IAppointmentService` + `AppointmentService` implement the delegates in `backend.md` §7 (`GetAvailableSlotsAsync` → availability engine; create/on-behalf/reschedule/cancel/confirm/complete/no-show; customer get-mine; ownership-enforced `GetAppointmentAsync`; business paged list; staff list).
- [ ] Transactional overlap guard → `OVERBOOKING`; illegal transitions → `INVALID_STATUS_TRANSITION`; tenant mismatches → `FORBIDDEN` (codes from `backend.md` §9, emitted by services).
- [ ] `AppointmentAvailabilityService` implements `backend.md` §5 (window × assignment × busy subtraction, 15-min grid, UTC).
- [ ] `IServiceCatalogService`/`ServiceCatalogService` owner CRUD (delete = `IsActive=false`) + public active list.
- [ ] `AppointmentMappingProfile` registered (auto); DI registered in `Program.cs`; validators auto-registered.
- [ ] `dotnet build PunchedApi` + `dotnet build PunchedApi.Tests` green; `git status` clean.

---

## End-to-end verification (end of Phase 3)
- [ ] `dotnet build PunchedApi/PunchedApi.csproj` green.
- [ ] `dotnet build PunchedApi.Tests/PunchedApi.Tests.csproj` green.
- (Phase 4 controllers + Phase 5 tests are later phases — not in this prompt. Do not create controllers/tests here.)

End of `phase-2-3-prompt.md`.