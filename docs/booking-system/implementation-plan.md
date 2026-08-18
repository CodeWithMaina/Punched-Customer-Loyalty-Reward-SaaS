# Booking System — Implementation Plan (tracked)

> **Legend:** `- [ ]` todo, `- [x]` done. Every step lists **Acceptance** (what "done" means) and **Run** (the command that proves it). Steps cross-reference `feature.md`/`backend.md`/`frontend.md` section numbers. Update checkboxes **in place** as you go.

## Phase 0 — Scaffold & baseline
- [ ] 0.1 Branch `booking/main` from `main`.
  - **Acceptance:** clean working tree, branch created.
  - **Run:** `git checkout -b booking/main`
- [ ] 0.2 Baseline build green (backend + frontend).
  - **Acceptance:** `dotnet build` and `npm run build` both pass on current `main`.
  - **Run:** `dotnet build PunchApi && npm run build`
- [ ] 0.3 Confirm scaffolded booking tables in `ApplicationDbContext` (appointments, services, staff_services, staff_shifts, appointment_status_history).
  - **Acceptance:** entities + DbSet registered.
  - **Run:** `grep -RIn "DbSet<Appointment\|DbSet<Service" "PunchedApi/Infrastructure/Data"`

## Phase 1 — Backend domain (`backend.md` §4, §5, §6)
- [ ] 1.1 Create `Domain/Entities/AppointmentResource.cs` (snapshot join: AppointmentId, ServiceCatalogItemId, Name, DurationMinutes, Price, SortOrder).
  - **Acceptance:** matches `AppointmentResourceDto` shape.
- [ ] 1.2 Create/verify `Domain/Entities/Appointment.cs` + `AppointmentStatus` enum + `AppointmentStatusHistory`. `EndAt` required; `Status` default `booked` (no data migration).
- [ ] 1.3 Create/verify `Domain/Entities/ServiceCatalogItem.cs` (BusinessId, Name, DurationMinutes, Price, IsActive).
- [ ] 1.4 Register new entities + relationships in `ApplicationDbContext` if missing.
  - **Run:** `dotnet build PunchApi`

## Phase 2 — Backend DTOs + validators (`backend.md` §6, §7)
- [ ] 2.1 `Application/DTOs/AppointmentDTOs.cs`: `CreateAppointmentRequest`, `CreateAppointmentOnBehalfRequest`, `RescheduleRequest`, `CancelRequest`, `AppointmentResponse` (services snapshot list), `AvailabilitySlotResponse`, `PaginatedResponse`.
- [ ] 2.2 `Application/Validators/AppointmentValidators.cs` (FluentValidation): `serviceIds` min 1, future `scheduledAt`, staff-assignment membership, overlap-aware client hint.
- [ ] 2.3 Service DTOs + validators if absent (`ServiceDTOs.cs`, `ServiceValidators.cs`).

## Phase 3 — Backend services (`backend.md` §3, §8)
- [ ] 3.1 `Application/Interfaces/IAppointmentService.cs`: `CreateAsync`, `RescheduleAsync`, `CancelAsync`, `ChangeStatusAsync`, `GetMineAsync`, `GetBusinessCalendarAsync`, `GetStaffCalendarAsync`.
- [ ] 3.2 `Application/Services/AppointmentService.cs`: resolve business from `userId` (Customer/Staff/Business), `EndAt = scheduledAt + Σ durations`, insert status-history row, **transactional overlap check → 409**, commit via `IUnitOfWork`.
- [ ] 3.3 `IAppointmentAvailabilityService` + impl: working windows × staff-service assignment × busy subtraction → 30-min buckets.
- [ ] 3.4 `IServiceCatalogService` + impl (owner CRUD).

## Phase 4 — Backend controllers + DI (`backend.md` §7)
- [ ] 4.1 `API/Controllers/AppointmentController.cs`: role-segregated routes + `[Authorize(Roles="Customer|Business|Staff")]` + 409 on conflict.
- [ ] 4.2 `API/Controllers/ServiceController.cs` (owner CRUD).
- [ ] 4.3 Register services + AutoMapper `AppointmentProfile` in `Program.cs`.
  - **Run:** `dotnet build PunchApi`

## Phase 5 — Backend tests (`backend.md` §10; xunit + Moq + Sqlite in-memory)
- [ ] 5.1 Overlap→409 test; EndAt math test; multi-tenant scoping tests; status-history insertion test.
- [ ] 5.2 Availability subtraction (busy ranges + `is_working=false` + assignment) test.
  - **Run:** `dotnet test --filter "FullyQualified~Appointment"`

## Phase 6 — Frontend types + API clients (`frontend.md` §4, §5)
- [ ] 6.1 Add `ServiceCatalogItem`/`Appointment`/`AvailabilitySlot`/`AppointmentFormData` to `punched-pwd/types/index.ts`.
- [ ] 6.2 `lib/api/appointments.ts` + `lib/api/services.ts` (reuse `apiClient` + `cachedFetch`/`invalidateCache`; TTLs per frontend.md).

## Phase 7 — Frontend store + hook + validation (`frontend.md` §6, §7, §8)
- [ ] 7.1 `store/bookingStore.ts` — Zustand, session-only (no `persist`).
- [ ] 7.2 `hooks/useBooking.ts` — mirrors `useAuth` (loading/error/toast); invalidates cache after mutations.
- [ ] 7.3 `lib/validations/appointments.ts` (RHF + Zod).

## Phase 8 — Frontend components + pages (`frontend.md` §9, §10, §11)
- [ ] 8.1 Components: `AppointmentModal`, `ServiceList`, `StaffSelector`, `AppointmentCalendar`.
- [ ] 8.2 Pages: `/dashboard/appointments`, `/dashboard/appointments/[id]`, `/dashboard/appointments/new`, owner `/dashboard/business/appointments`, staff `/dashboard/staff/appointments`, service CRUD.
- [ ] 8.3 `useRoleGuard` on every page + cache invalidation wiring on all mutations.

## Phase 9 — Frontend tests (`frontend.md` §14; Jest + RTL)
- [ ] 9.1 `useBookingStore` cart math + `endAt = scheduledAt + Σ durations` + wizard steps.
- [ ] 9.2 `AppointmentCalendar` renders availability slots (local-time labels) + excludes `IsWorking=false`.
- [ ] 9.3 Role-guard redirect (Staff blocked from `/dashboard/appointments`).
  - **Run:** `npm test`

## Phase 10 — Final verification
- [ ] 10.1 Backend green.
  - **Run:** `dotnet build PunchApi && dotnet test`
- [ ] 10.2 Frontend green.
  - **Run:** `npm run lint && npm run build`
- [ ] 10.3 All boxes flipped to `[x]`; no `// BLOCKED:` notes remain.

---
## Conflict log (repo wins; docs corrected)
| # | Earlier-draft claim | Repo reality | Doc corrected in |
|---|---|---|---|
| C1 | .NET 9 / MediatR | .NET 8, no MediatR | `stack-and-guidelines.md` |
| C2 | `/api/v1` prefix | `/v1/...` (`client.ts:12`, controllers) | `frontend.md:9`, `backend.md:9` |
| C3 | "BusinessOwner"/"AccountOwner" roles | `Customer`/`Business`/`Staff`/`Admin` | `frontend.md:9`, `backend.md:14` |
| C4 | JWT has `businessId` claim | No `businessId` claim (`JwtTokenService`) | `feature.md:10`, `backend.md:13` |
| C5 | Recurring-weekly shifts / `StaffTimeOff` | `StaffShift` per-`DateOnly` hours + `is_working` | `feature.md:11` |
| C6 | Postgres exclusion constraint | Code-enforced overlap check | `feature.md:11` |
| C7 | `/dashboard/customer/` segment | Booking under `/dashboard/...`; Staff at `/dashboard/staff` | `frontend.md:9` |
| C8 | "No TanStack Query" / RHF not in deps | `@tanstack/react-query` installed but unused; `react-hook-form` 7.52 in deps | `frontend.md:5,9` |

End of `implementation-plan.md`.
