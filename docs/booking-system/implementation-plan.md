# Booking System — Implementation Plan (tracked)

> **Legend:** `- [ ]` todo, `- [x]` done. Every step lists **Acceptance** (what "done" means) and **Run** (the command that proves it). Steps cross-reference `feature.md`/`backend.md`/`frontend.md` section numbers. Update checkboxes **in place** as you go.

## Phase 0 — Scaffold & baseline
- [x] 0.1 Branch `booking/phase-0-1` from `main` (prompt overrides plan's `booking/main`).
  - **Acceptance:** clean working tree, branch created.
  - **Run:** `git checkout -b booking/phase-0-1`
- [x] 0.2 Baseline build green (backend + frontend).
  - **Acceptance:** `dotnet build` and `npm run build` both pass on current `main`.
  - **Run:** `dotnet build PunchedApi && npm run build`
- [x] 0.3 Confirm scaffolded booking tables in `ApplicationDbContext` (appointments, services, staff_services, staff_shifts, appointment_status_history).
  - **Acceptance:** entities + DbSet registered.
  - **Run:** `grep -RIn "DbSet<Appointment\|DbSet<Service" "PunchedApi/Infrastructure/Data"`

## Phase 1 — Backend domain (`backend.md` §4, §5, §6)
- [x] 1.1 Create `Domain/Entities/AppointmentResource.cs` (snapshot join: AppointmentId, ServiceCatalogItemId, Name, DurationMinutes, Price, SortOrder).
  - **Acceptance:** matches `AppointmentResourceDto` shape.
- [x] 1.2 Add `EndAt` (required) + `Resources` navigation to `Appointment.cs`. `Status` stays a string defaulting to `booked` (repo reality — no `AppointmentStatus` enum).
- [x] 1.3 Verify `ServiceCatalogItem.cs` + `StaffShift` + `StaffServiceAssignment` (already present).
- [x] 1.4 Register entities + relationships: `AppointmentResourceConfiguration`, `EndAt` in `AppointmentFoundationConfiguration`, `DbSet<AppointmentResource>`; migration `20260818092234_AddAppointmentEndAtAndAppointmentResources` adds `appointments.end_at` (NOT NULL, empty table) + `appointment_resources`.
  - **Run:** `dotnet build PunchedApi`

## Phase 2 — Backend DTOs + validators (`backend.md` §6, §7)
- [x] 2.1 `Application/DTOs/AppointmentDTOs.cs`: `CreateAppointmentRequest`, `CreateAppointmentOnBehalfRequest`, `RescheduleRequest`, `CancelRequest`, `AppointmentResponse` (services snapshot list), `AvailabilitySlotResponse`, `PaginatedResponse`.
- [x] 2.2 `Application/Validators/AppointmentValidators.cs` (FluentValidation): `serviceIds` min 1, future `scheduledAt`, staff-assignment membership, overlap-aware client hint.
- [x] 2.3 Service DTOs + validators if absent (`ServiceDTOs.cs`, `ServiceValidators.cs`).

## Phase 3 — Backend services (`backend.md` §3, §8)
- [x] 3.1 `Application/Interfaces/IAppointmentService.cs`: `CreateAsync`, `RescheduleAsync`, `CancelAsync`, `ChangeStatusAsync`, `GetMineAsync`, `GetBusinessCalendarAsync`, `GetStaffCalendarAsync`.
- [x] 3.2 `Application/Services/AppointmentService.cs`: resolve business from `userId` (Customer/Staff/Business), `EndAt = scheduledAt + Σ durations`, insert status-history row, **transactional overlap check → 409**, commit via `IUnitOfWork`.
- [x] 3.3 `IAppointmentAvailabilityService` + impl: working windows × staff-service assignment × busy subtraction → 30-min buckets.
- [x] 3.4 `IServiceCatalogService` + impl (owner CRUD).

## Phase 4 — Backend controllers + DI (`backend.md` §7)
- [x] 4.1 `API/Controllers/AppointmentController.cs`: role-segregated routes + `[Authorize(Roles="Customer|Business|Staff")]` + 409 on conflict.
- [x] 4.2 `API/Controllers/ServiceController.cs` (owner CRUD).
- [x] 4.3 Register services + AutoMapper `AppointmentProfile` in `Program.cs`.
  - **Run:** `dotnet build PunchApi`

## Phase 5 — Backend tests (`backend.md` §10; xunit + Moq + Sqlite in-memory)
- [x] 5.1 Overlap→409 test; EndAt math test; multi-tenant scoping tests; status-history insertion test.
- [x] 5.2 Availability subtraction (busy ranges + `is_working=false` + assignment) test.
  - **Run:** `dotnet test --filter "FullyQualified~Appointment"`

## Phase 6 — Frontend types + API clients (`frontend.md` §4, §5)
- [x] 6.1 Add `ServiceCatalogItem`/`Appointment`/`AvailabilitySlot`/`AppointmentFormData` to `punched-pwd/types/index.ts`.
- [x] 6.2 `lib/api/appointments.ts` + `lib/api/services.ts` (reuse `apiClient` + `cachedFetch`/`invalidateCache`; TTLs per frontend.md).

## Phase 7 — Frontend store + hook + validation (`frontend.md` §6, §7, §8)
- [x] 7.1 `store/bookingStore.ts` — Zustand, session-only (no `persist`).
- [x] 7.2 `hooks/useBooking.ts` — mirrors `useAuth` (loading/error/toast); invalidates cache after mutations.
- [x] 7.3 `lib/validations/appointments.ts` (RHF + Zod).

## Phase 8 — Frontend components + pages (`frontend.md` §9, §10, §11)
- [x] 8.1 Components: `AppointmentModal`, `ServiceList`, `StaffSelector`, `AppointmentCalendar`.
- [x] 8.2 Pages: `/dashboard/appointments`, `/dashboard/appointments/[id]`, `/dashboard/appointments/new`, owner `/dashboard/business/appointments`, staff `/dashboard/staff/appointments`, service CRUD.
- [x] 8.3 `useRoleGuard` on every page + cache invalidation wiring on all mutations.

## Phase 9 — Frontend tests (`frontend.md` §14; Jest + RTL)
- [x] 9.1 `useBookingStore` cart math + `endAt = scheduledAt + Σ durations` + wizard steps.
- [x] 9.2 `AppointmentCalendar` renders availability slots (local-time labels) + excludes `IsWorking=false`.
- [x] 9.3 Role-guard redirect (Staff blocked from `/dashboard/appointments`).
  - **Run:** `npm test`

## Phase 10 — Final verification + dashboard integration (Phase 10 prompt)
- [x] 10.1 Frontend typecheck clean: `npx tsc --noEmit` (0 errors).
- [x] 10.2 Frontend lint clean on booking + dashboard files touched (only pre-allowed `<img>` warnings remain).
- [x] 10.3 Frontend tests green: `npm test` → 17/17 pass.
- [x] 10.4 `npm run build` compiled successfully (build passed; only `<img>` warnings — no pre-existing unrelated ESLint errors blocked it on this run, so none were edited).
- [x] 10.5 Backend sanity: `dotnet build PunchedApi` → Build succeeded (0 errors). No backend files changed.
- [x] 10.6 Fixed `booked` status in `app/dashboard/business/appointments/[id]/page.tsx` → frozen `draft|pending|confirmed|in_progress|completed|cancelled|no_show` (no `booked`).
- [x] 10.7 Navigation (frontend.md §3): `CalendarDays` Appointments entries added to `customerNav`, `businessNav`, `staffSideNav`, and `staffBottomNav` in `app/dashboard/layout.tsx`.
- [x] 10.8 Customer dashboard (`app/dashboard/page.tsx`): upcoming appointments panel (`{pending|confirmed}` + future) via `appointmentsApi.getMyAppointments({ upcoming: true })`, each linking to `/dashboard/appointments/[id]`; "Book an appointment" CTA → `/dashboard/appointments/new` when none.
- [x] 10.9 Business dashboard (`app/dashboard/business/page.tsx`): Today's/Upcoming panel via `appointmentsApi.getBusinessAppointments({ pageSize: 5 })`, status badges per frozen mapping, links to `/dashboard/business/appointments/[id]`, "View all" header link, and a no-services hint → `/dashboard/business/profile/services`.
- [x] 10.10 Staff dashboard (`app/dashboard/staff/page.tsx`): replaced redirect-only home with assigned-appointments panel — tenant via `businessesApi.getStaffBusiness()`, `appointmentsApi.getStaffAppointments({ pageSize: 5 })`, confirm/complete/no-show via `staffAction`, re-fetch after each action, unlinked/no-tenant handled gracefully.
- [x] 10.11 Cache discipline (frontend.md §12): staff mutations call `invalidateCache` for `appointments:mine|calendar|staff` + `availability` before re-fetch; adds `pageSize` to `StaffAppointmentsQuery`.
- [x] 10.12 All boxes flipped to `[x]`; no `// BLOCKED:` notes remain.

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
| C9 | `StaffInvitation` had no snake_case config in the model, so EF drifted to PascalCase | Added `Configurations/StaffInvitationConfiguration.cs` mapping to `staff_invitations` (matches migrations/snapshot) to stop EF generating destructive renames | `implementation-plan.md` (Phase 1) |

End of `implementation-plan.md`.
