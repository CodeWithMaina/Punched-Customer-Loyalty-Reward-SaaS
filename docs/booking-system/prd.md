# Booking System — Product Requirements (Reuse / Extend)

> **Status:** Implementation-ready PRD for the appointment/booking feature. **Reuses** the existing Punched domain and API conventions — see `feature.md` §1–2 for the authoritative entity/route mapping. Supersedes the role- and route-inaccurate claims in the earlier draft.
>
> **Three actors** (existing roles, no new ones): `Customer` (books), `Business` (owner/manager), `Staff` (delivers the service). Roles match `Domain/Entities/UserRole.cs` and `punched-pwd/types/index.ts:20`.

---

## 1. Goal

Let a Customer self-schedule a multi-item appointment at a Business (which runs a Punched loyalty program), see it on their dashboard, and let the Business/Staff confirm/complete/no-show it — using the **already-migrated** `appointments`, `services`, `staff_services`, `staff_shifts`, and `appointment_status_history` tables, which have no API yet.

## 2. Domain vocabulary (existing terms — do not rename)

| Need | Existing entity/table | Docs-via |
|---|---|---|
| A scheduled service session | `Appointment` → `appointments` | `scheduled_at`, `staff_user_id`, `customer_id`, `status`(default `booked`) + new `end_at` |
| Audit of every status change | `AppointmentStatusHistory` → `appointment_status_history` | `appointment_id, status, changed_at, changed_by_user_id, note` |
| A service the business sells | `ServiceCatalogItem` → `services` | `name, duration_minutes, price, is_active` |
| Which staff can perform a service | `StaffServiceAssignment` → `staff_services` | `staff_user_id, service_catalog_item_id, business_id` |
| A staff member's working / off window | `StaffShift` → `staff_shifts` | `date, start_hour, end_hour, is_working` |
| Customer identity | `User` (Role=Customer) | `userId` claim |
| Owner identity | `User` (Role=Business) | `userId` claim; tenant via `Business.OwnerId` |
| Staff identity | `User` (Role=Staff) | `userId` claim; tenant via `User.StaffBusinessId` |

> `StaffShift` is per-`DateOnly` with **integer** `start_hour`/`end_hour` (0–23) and an `is_working` flag. There is **no** recurring-weekly/`DayOfWeek` schedule. Time-off or closed days = a `StaffShift` row with `is_working=false` (or no row at all) ([StaffShift.cs], [StaffShiftConfiguration.cs]). ## 3. User stories

### As a Customer
- **Browse.** From `/dashboard/explore` [public], I can view a Business and its published services (`GET /v1/businesses/{businessId}/services`).
- **Check availability.** I can see real-time available slots before booking (`GET /v1/businesses/{businessId}/availability?serviceIds=&staffId=&startDate=&endDate=`).
- **Book (single or multi-service).** I pick one or more services + a slot; the system creates one `Appointment` spanning `Σ duration_minutes` and records which `ServiceCatalogItem`s it includes ([`AppointmentResource`]). My identity is taken from the JWT (`userId`); the `businessId` I picked is validated server-side.
- **View / manage.** `GET /v1/appointments` shows my upcoming/past appointments; I can cancel (before a cutoff) or reschedule (re-checks availability) my own. `GET /v1/appointments/{id}` is ownership-enforced.
- **Status visibility.** I see `booked`→`confirmed`→`completed`/`cancelled`/`no_show`.

### As a Business owner
- **Calendar.** `GET /v1/businesses/me/appointments` gives the full calendar (filter staff/customer/service/status/date; paged).
- **Book on behalf.** `POST /v1/businesses/me/appointments` books for a named customer.
- **Drive lifecycle.** `…/{id}/confirm` | `complete` | `no-show` | `cancel` | `reschedule`.
- **Catalog.** Manage services via `/v1/services/me` (+`/{id}`, `HttpPatch`, `HttpDelete` soft). Mirrors the existing `/v1/programs/me` CRUD pattern ([LoyaltyProgramController.cs:14]).

### As a Staff member
- **My calendar.** `GET /v1/businesses/staff/appointments` shows appointments where I'm the assigned staff, scoped to my business (resolved from `User.StaffBusinessId`).
- **Deliver.** `…/{id}/confirm` | `complete` | `no-show` on my own appointments.

## 4. Booking flow (single-page progressive modal)

Reuses the existing dashboard shell + Tailwind tokens + RHF/Zod. No new design system. Flow stages (wizard steps), all client-side until the final mutation:

1. **Service selection** — `ServiceList` from `GET /v1/services/{businessId}` (cached ~5 min; `cachedFetch`). Multi-select allowed (cart held in a Zustand `useBookingStore`).
2. **Staff selection** — `StaffGrid` from `GET /v1/businesses/me/staff` filtered to staff assigned to **all** selected services (`StaffServiceAssignment`). Optional ("any available").
3. **Slot picker** — `GET /v1/businesses/{businessId}/availability?serviceIds=…&staffId=…&startDate=&endDate=` (cached ~15–30 s; `appointments:availability:{businessId}:{…}` key). Renders an `AppointmentCalendar` day-view; picking a slot sets `scheduledAt`/`endAt`.
4. **Review & confirm** — summary sheet (`AppointmentModal`); `POST /v1/appointments` (Customer) or `POST /v1/businesses/me/appointments` (owner on behalf). On success → `invalidateCache("appointments")` + navigate to detail (`/[id]`).

Cancellation/reschedule reuse the same modal with a reduced step set and re-validate availability server-side for reschedule.

## 5. Data model mapping (what gets written)

On `POST /v1/appointments` (customer) / `POST /v1/businesses/me/appointments` (owner):
- `Appointment` row: `business_id` (from JWT owner/staff; or validated request for customer), `customer_id` (= caller for customer; from body for owner/staff, validated `Role=Customer`), `staff_user_id?` (required for multi-service, or any-assigned if omitted), `scheduled_at`, `end_at` (= `scheduled_at + Σ durations`), `status='booked'`, `created_at=now()`.
- For each selected service: one `AppointmentResource` row snapshotting `service_catalog_item_id` + `name` + `duration_minutes` + `price` + `sort_order`.
- One `AppointmentStatusHistory` row: `('booked', now(), caller, 'created')`.
- All inside one transaction ([LoyaltyService] pattern) — partial writes are not possible. ## 6. API contract (summary — full table in `backend.md` §7)

- Base `/v1`, Bearer JWT (axios interceptor auto-attaches; cookie mirror for middleware — `punched-pwd/lib/api/client.ts:12,73`).
- Public (no auth): `GET /v1/businesses`, `GET /v1/businesses/{businessId}`, `GET /v1/businesses/{businessId}/services`, `GET /v1/businesses/{businessId}/availability`.
- Customer `[Authorize(Roles="Customer")]`: `GET/POST /v1/appointments`, `GET /v1/appointments/{id}`, `POST …/{id}/reschedule`, `POST …/{id}/cancel`.
- Owner `[Authorize(Roles="Business")]`: `GET/POST /v1/businesses/me/appointments…`, lifecycle actions.
- Staff `[Authorize(Roles="Staff")]`: `GET /v1/businesses/staff/appointments…`, confirm/complete/no-show.
- Service catalog `[Authorize(Roles="Business")]` `/v1/services/me…`; public browse `GET /v1/services/{businessId}` ([AllowAnonymous]).

## 7. Multi-tenancy guarantees

- `businessId` is **never** a JWT claim; it is resolved per request from the `userId`:
  - Owner → `Business.OwnerId == userId`; Staff → `User.StaffBusinessId`.
  - Customer → `businessId` supplied by the client **and validated** (active business). `customerId` in create requests is **forced to the caller** (never trusted).
- Every query in `AppointmentService` is prefixed with `businessId` (owner/staff) or scoped to `customerId == caller` (customer). Cross-business access returns `FORBIDDEN` (403) ([BusinessService.cs:564-567] pattern).

## 8. Availability rules

- Derived **real-time** from `StaffShift`(s) for the date (`GET /v1/businesses/{businessId}/availability`).
- A staff is eligible for a multi-service cart only if `StaffServiceAssignment` rows link them to **every** requested `ServiceCatalogItem`.
- A slot `[start, start+Σduration)` is offered iff, for one eligible staff, a working window `[StartHour, EndHour)` (or no `IsWorking=false` block) fully contains it and it does **not** overlap an existing `Appointment` (`[ScheduledAt, EndAt)`).
- Hours are UTC hour-ints (`StaffShift.start_hour`/`end_hour`); UI converts to the visitor's local time for display only (correct business-local time needs a `Business.TimeZoneId` — deferred).

## 9. Double-booking protection

- No PostgreSQL exclusion constraint (codebase uses FK + check constraints only — `feature.md` §9.7).
- `CreateAppointmentAsync` / `RescheduleAsync` run in a transaction and perform an explicit overlap check (`[ScheduledAt, EndAt)` vs `[start, start+duration)`) for `(businessId, staffUserId, date)`; on conflict → `OVERBOOKING`/`SLOT_UNAVAILABLE` → HTTP **409**.

## 10. Status lifecycle

`booked` (initial) → `confirmed` (Business/Staff) → `completed` (Business/Staff, after `end_at`) | `no_show` (Business/Staff). `cancelled` by Customer (before cutoff) or Business/Staff. Each transition appends `AppointmentStatusHistory` (`changed_by_user_id`, `note`) and updates `Appointment.Status` in the same transaction. `COMPLETED`/`NO_SHOW`/`CANCELLED` are terminal; re-transitioning them → `INVALID_STATUS_TRANSITION` (409).

## 11. Validation rules

- Cart ≠ empty; all `serviceIds` belong to the `businessId` and are `IsActive=true` (else `SERVICE_NOT_FOUND`, 404).
- If `staffUserId` supplied → belongs to business + assigned to all selected services (else `STAFF_NOT_FOUND`, 404).
- `scheduledAt` must be inside a working window, not blocked, and not overlap an existing appointment (else `SLOT_UNAVAILABLE`/`OVERBOOKING`, 409).
- `endAt = scheduledAt + Σ durations` (server-computed; client `endAt` ignored).
- Customer `cancel` only before a configurable cutoff (owner setting — MVP: business default 24 h, stored as a constant; `Business` has no column yet → constant, deferred to `Business` column). `reschedule` re-runs the full availability + overlap check.

## 12. MVP vs. future scope

**MVP (this PRD):** browse + availability + multi-service book + own reschedule/cancel + owner calendar + owner/staff confirm/complete/no-show + service-catalog CRUD.
**Deferred:** payments, SMS/email confirmations, calendar sync (Google/Outlook), waitlists + over-booking, recurring templates, business-timezone field, idempotency keys, GraphQL/webhooks. (All re-extend the same tables later — see `backend.md` §15.)

## 13. Acceptance criteria

- AC1: A customer can filter services, pick multiple, see live slots, and book; exactly one `Appointment` + N `AppointmentResource` + one history row are created (transactional).
- AC2: Booking the same slot concurrently → exactly one succeeds, the other gets HTTP 409 `OVERBOOKING`.
- AC3: Customer `GET /v1/appointments/{id}` for another customer's appointment → 403 `FORBIDDEN`.
- AC4: Staff sees only their business's appointments and only transitions their own.
- AC5: Owner sees the full calendar with staff/customer/service/status/date filters + paging.
- AC6: `IsWorking=false` (or absent) staff shift → no slots offered for that staff/date.
- AC7: Service catalog CRUD persists to `services`; soft-delete sets `IsDeleted` and hides it from public browse + availability.
- AC8: All appointment times stored as UTC timestamptz; UI renders in browser local time.


