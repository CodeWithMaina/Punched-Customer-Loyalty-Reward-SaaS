# Booking System — Implementation Architecture

## 1. Guiding principles
- **Reuse first.** Every component, endpoint, and state pattern must reuse existing scaffolding; new code only appears where the scaffold is absent.
- **Multi-tenant by default.** Business context is resolved server-side from the authenticated `userId`; never trust a client-supplied `businessId` claim (the JWT carries none — `punched-pwd/lib/api/client.ts` / `JwtTokenService`).
- **Fail-safe availability.** Availability is computed from persisted shifts + staff-service assignments + existing appointments + service durations. Double-booking is prevented by an explicit transactional overlap check (**no DB exclusion constraint**).
- **Display ≠ storage.** Persist/transport UTC; convert to the browser's local timezone for display only.

## 2. Layers & ownership
```
[Frontend]   Next page → useBooking hook → appointmentsApi / servicesApi
              ↓           ↑
              (Zustand bookingStore, session-only)   (RHF + Zod)
              ↓           ↓
              apiClient (axios) + cachedFetch  ←→  /v1/* REST
[Backend]    Controller → AppointmentService (orchestrator)
              ↓                  ↓
              AvailabilityService (helper)    AppointmentService uses UnitOfWork(1 tx)
              ↓                               ↓
              EF Core (Npgsql 8)    →  UnitOfWork.Commit()  →  Postgres
```
- Backend: controllers route to a single service orchestrator; the availability calculator is a focused helper injected by it (mirrors `ILoyaltyService`+`IRedemptionService`).
- Frontend: pages stay dumb; data + cache live in `*Api` modules; transient wizard state lives in Zustand; form logic in `useBooking`.

## 3. Request lifecycle (create appointment)
1. **Customer** `POST /v1/appointments { businessId, serviceIds, staffUserId?, scheduledAt }`.
2. **Controller** validates DTO (FluentValidation) → maps → `AppointmentService.CreateAsync`.
3. Resolve business from `businessId`; confirm each service belongs to the business and the chosen staff is assigned to all selected services; compute `EndAt = ScheduledAt + Σ service durations`.
4. **Serial overlap check** inside one `SaveChanges`: an existing appointment exists where `ScheduledAt < EndAt && EndAt > ScheduledAt && sameStaffOrAny` and status ∈ {booked, confirmed} → throw `ConflictError` → HTTP **409**.
5. Append an initial `AppointmentStatusHistory` row (status = `booked`) → commit → return appointment DTO.
6. **Client** invalidates `appointments:mine`, `appointments:calendar`, `appointments:staff`, and `availability:*` cache keys, then routes to `/dashboard/appointments/[id]`.

## 4. Availability (read path)
`GET /v1/businesses/{businessId}/availability?serviceIds=&staffUserId=&date=` → `AvailabilityService.ComputeAsync`:
- Start from working windows of `StaffShift` (`is_working=true`).
- Remove staff not `StaffService`-assigned to ALL requested services (or apply `any`-staff union).
- Subtract already-busy ranges (appointments with status ∈ {booked, confirmed}).
- Yield 30-min buckets aligned to service boundary; `EndUtc = StartUtc + Σ durations`; `IsWorking=false` windows are excluded.

## 5. Multi-tenancy & ownership rules
- **Customer:** scope "mine" by `userId`; no `createOnBehalf` path.
- **Business owner:** scope by `Business.OwnerId == userId`; `createOnBehalf` allowed.
- **Staff:** scope by `User.StaffBusinessId == userId`; only own-slot deliver actions.
- Every query carries the authenticated `userId`; `businessId` is a route param validated against ownership/assignment at the service layer.

## 6. Frontend state split
- `authStore` (Zustand, persisted) — user/role/tokens: **unchanged**.
- `useBookingStore` (Zustand, **session-only**, not persisted) — cart + wizard step. Rationale: persisting would risk booking at the wrong business on reload in a multi-tenant app.
- `cachedFetch` (10–60 s TTL, in-flight dedupe) for reads; react-query is available but **not adopted** to remain consistent with the established `cachedFetch`+`apiClient`+Zustand convention.

## 7. Consistency boundaries
- Appointments write path = **1 transaction per mutation** via `UnitOfWork`.
- No cross-table exclusion constraints — overlap is code-enforced (PostgreSQL advisory lock optional future hardening).
- `StaffShift` is per-`DateOnly`; there is **no** recurring-weekly model and **no** `StaffTimeOff`/`BusinessBlockedTime` tables.
- `appointment_resources` snapshots service name/duration/price at booking (catalog drift protection).

## 8. Failure modes to guard in code
- Stale catalog item deleted between browse and booking → snapshot prevents mismatch.
- Simultaneous booking on the same slot → overlap check throws 409; UI surfaces "slot unavailable, refresh".
- Time-zone skew between staff (UTC hours) and owner UI → documented assumption (see §13 in `feature.md`); no per-component tz math to avoid divergence.

End of `architecture.md`.
