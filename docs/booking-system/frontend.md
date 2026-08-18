# Booking System — Frontend Specification

> **Goal:** Implementation spec for the booking UI that **reuses** the existing Punched Next.js 14 App Router stack. Aligns 1:1 with `feature.md` §3 and `backend.md`.
>
> **Stack (verified):** Next.js 14.2 App Router · TypeScript 5.5 · Tailwind 3.4 · Zustand 4.5 · React Hook Form 7.52 · Zod 3.23 · Axios 1.7 · lucide-react 0.400 (`punched-pwd/package.json`). `@tanstack/react-query` is installed but the **established** state/data pattern is `cachedFetch` + Zustand (react-query unused by the auth/data flow).
>
> **Routing base** (`punched-pwd/lib/api/client.ts:12`): `API_BASE_URL = http://localhost:5000/v1`; endpoints are `/v1/...`. Auth in `axios` interceptor (Bearer + 15 s timeout + auto refresh `punched-pwd/lib/api/client.ts:73-120`) and Next middleware cookie (`punched-pwd/middleware.ts`).
>
> **Corrected vs. earlier draft:** the route prefix is `/v1` (not `/api/v1`); data layer follows the existing `cachedFetch`+`apiClient`+`Zustand` convention (the installed `@tanstack/react-query` is not used by the current auth/data flow); customer features live at `/dashboard/<feature>` (there is **no** `/dashboard/customer/` segment — see route map §4); runtime role is `Customer`/`Business`/`Staff`/`Admin` (not "BusinessOwner"/"AccountOwner").

---

## 1. Reused patterns (do not touch)

- `lib/api/client.ts` — `apiClient` (axios), `setTokens`/`clearTokens`, cookie write for middleware.
- `lib/api/cache.ts` — `cachedFetch<T>(key, fetcher, ttlMs=15000)` (dedup in-flight + TTL) + `invalidateCache(prefix?)`.
- `store/authStore.ts` — Zustand (persist localStorage) `useAuthStore` with `user`/`isAuthenticated`/`isLoading`; `login(user, accessToken, refreshToken)`.
- `hooks/useAuth.ts` — `useAuth()` (register/login/logout/verifyEmail + `redirectByRole`).
- `hooks/useRoleGuard.ts` — `useRoleGuard(requiredRole: UserRole)` (redirects non-matching roles).
- `app/dashboard/layout.tsx` — role-gated shell; resolves header business via `businessesApi.getMine()` (Business) / `getStaffBusiness()` (Staff).
- `lib/api/businesses.ts` — `businessesApi` (reference pattern: `getMine` uses `cachedFetch("biz:me", …, 30_000)`; lists via `apiClient.get(...).then(r=>r.data)`).
- `lib/api/onboarding.ts` — `onboardingApi` (staff-invite pattern; `listStaffInvitations`).

## 2. Business-context resolution (frontend)

The JWT has **no `businessId`** (see `feature.md` §3), so the frontend resolves the active business from the API for each role:

- **Business** → `businessesApi.getMine()` → `GET /v1/businesses/me` → `Business{id,…}`. (Header label in `dashboard/layout.tsx:62-68`.)
- **Staff** → `businessesApi.getStaffBusiness()` → `GET /v1/businesses/staff/my-business` → `StaffBusinessResponse{businessId, businessName}` (`businesses.ts:79-82`). Staff must call this to learn their business before loading appointments.
- **Customer** → no tenant context; `businessId` is chosen while browsing `/dashboard/explore` and passed into the booking flow (`/dashboard/appointments/new?businessId=X`).

## 3. Route map (exact App Router paths)

> Earlier drafts used `/dashboard/customer/appointments`; that segment does not exist. Customer pages sit at the dashboard root (cf. existing `/dashboard/cards`, `/dashboard/explore`, `/dashboard/notifications`).

| Persona | Route | File (NEW) | Role guard |
|---|---|---|---|
| Customer | `/dashboard/appointments` | `app/dashboard/appointments/page.tsx` | `useRoleGuard("Customer")` |
| Customer | `/dashboard/appointments/[id]` | `app/dashboard/appointments/[id]/page.tsx` | `useRoleGuard("Customer")` |
| Customer | `/dashboard/appointments/new?businessId=` | `app/dashboard/appointments/new/page.tsx` (wizard) | `useRoleGuard("Customer")` |
| Owner | `/dashboard/business/appointments` | `app/dashboard/business/appointments/page.tsx` | `useRoleGuard("Business")` |
| Owner | `/dashboard/business/appointments/[id]` | `app/dashboard/business/appointments/[id]/page.tsx` | `useRoleGuard("Business")` |
| Staff | `/dashboard/staff/appointments` | `app/dashboard/staff/appointments/page.tsx` | `useRoleGuard("Staff")` |

These nest under the existing dashboard shell (`dashboard/layout.tsx`) and reuse its header/business-label logic. The owner/staff calendar pages reuse the existing `StaffMember`/`StaffShift` types (`types/index.ts`) for staff lists. ## 4. Types additions (`punched-pwd/types/index.ts`)

Add alongside existing `BusinessCustomer`/`StaffMember` types (camelCase matches the API convention):
```ts
export interface ServiceCatalogItem {
  id: string; businessId: string; name: string;
  durationMinutes: number; price: number; isActive: boolean; createdAt: string;
}
export interface AppointmentServiceSnapshot {
  serviceCatalogItemId: string; name: string;
  durationMinutes: number; price: number; sortOrder: number;
}
export type AppointmentStatus = "booked" | "confirmed" | "completed" | "no_show" | "cancelled";
export interface Appointment {
  id: string; businessId: string; customerId: string;
  staffUserId?: string | null; scheduledAt: string; endAt: string;
  status: AppointmentStatus; services: AppointmentServiceSnapshot[];
  createdAt: string; updatedAt?: string | null;
}
export interface AvailabilitySlot {
  startAtUtc: string; endAtUtc: string;
  staffUserId: string; staffName: string; serviceIds: string[];
}
export interface AppointmentFormData {
  serviceIds: string[];            // multi-select cart
  staffUserId?: string | null;     // optional "any available"
  scheduledAt: string;             // ISO string picked from slots
}
```
Mirrors backend DTOs exactly (`backend.md` §8). ## 5. API clients (NEW files; reuse `apiClient` + `cachedFetch`)

### `lib/api/appointments.ts`
```ts
import apiClient from "./client";
import { cachedFetch, invalidateCache } from "./cache";
import type { ApiResponse, Appointment, AvailabilitySlot } from "@/types";

export const appointmentsApi = {
  // Customer self-service
  getMine: (params?: { upcoming?: boolean; status?: string; from?: string; to?: string }) =>
    cachedFetch(`appointments:mine:${JSON.stringify(params ?? {})}`, () =>
      apiClient.get<ApiResponse<Appointment[]>>("/appointments", { params: params ?? undefined }).then(r => r.data),
      10_000),
  getById: (id: string) => apiClient.get<ApiResponse<Appointment>>(`/appointments/${id}`).then(r => r.data),
  create: (data: CreateAppointmentRequest) => apiClient.post<ApiResponse<Appointment>>("/appointments", data).then(r => r.data),
  reschedule: (id: string, data: RescheduleAppointmentRequest) =>
    apiClient.post<ApiResponse<Appointment>>(`/appointments/${id}/reschedule`, data).then(r => r.data),
  cancel: (id: string, data?: { note?: string }) =>
    apiClient.post<ApiResponse<Appointment>>(`/appointments/${id}/cancel`, data).then(r => r.data),

  // Owner calendar
  getBusinessCalendar: (params?: { staffId?: string; customerId?: string; serviceId?: string; status?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    cachedFetch(`appointments:calendar:${JSON.stringify(params ?? {})}`, () =>
      apiClient.get<ApiResponse<PaginatedResponse<Appointment>>>("/businesses/me/appointments", { params: params ?? undefined }).then(r => r.data),
      15_000),
  createOnBehalf: (data: CreateAppointmentOnBehalfRequest) =>
    apiClient.post<ApiResponse<Appointment>>("/businesses/me/appointments", data).then(r => r.data),
  changeStatus: (id: string, action: "confirm" | "complete" | "no-show" | "cancel", data?: { note?: string }) =>
    apiClient.post<ApiResponse<Appointment>>(`/businesses/me/appointments/${id}/${action}`, data).then(r => r.data),

  // Staff calendar
  getStaffCalendar: (params?: { from?: string; to?: string; status?: string }) =>
    cachedFetch(`appointments:staff:${JSON.stringify(params ?? {})}`, () =>
      apiClient.get<ApiResponse<Appointment[]>>("/businesses/staff/appointments", { params: params ?? undefined }).then(r => r.data),
      15_000),

  // Availability (public browse; schedule-grade TTL)
  getAvailability: (businessId: string, params: AvailabilityQuery) =>
    cachedFetch(`availability:${businessId}:${JSON.stringify(params)}`, () =>
      apiClient.get<ApiResponse<AvailabilitySlot[]>>(`/businesses/${businessId}/availability`, { params }).then(r => r.data),
      20_000),

  invalidateMine: () => invalidateCache("appointments:mine"),
};
```
TTLs mirror team guidance (reference ~5 min, schedules 10–30 s): availability 20 s, calendars 15 s, my-appointments 10 s. ### `lib/api/services.ts`
```ts
import apiClient from "./client";
import { cachedFetch } from "./cache";
import type { ApiResponse, ServiceCatalogItem } from "@/types";

export const servicesApi = {
  getByBusiness: (businessId: string) =>
    cachedFetch(`services:business:${businessId}`, () =>
      apiClient.get<ApiResponse<ServiceCatalogItem[]>>(`/services/${businessId}`).then(r => r.data),
      5 * 60_000),   // reference data
  getMine: () => cachedFetch("services:mine", () =>
    apiClient.get<ApiResponse<ServiceCatalogItem[]>>("/services/me").then(r => r.data), 30_000),
  create: (data: CreateServiceRequest) => apiClient.post<ApiResponse<ServiceCatalogItem>>("/services/me", data).then(r => r.data),
  update: (id: string, data: UpdateServiceRequest) => apiClient.patch<ApiResponse<ServiceCatalogItem>>(`/services/me/${id}`, data).then(r => r.data),
  remove: (id: string) => apiClient.delete<ApiResponse<MessageResponse>>(`/services/me/${id}`).then(r => r.data),
  invalidateMine: () => invalidateCache("services:mine"),
};
```

## 6. Booking state (NEW `store/bookingStore.ts`)

Zustand store (session-only, NOT persisted) holding the in-progress cart + wizard step:
```ts
interface BookingState {
  businessId: string | null;
  serviceIds: string[];
  staffUserId: string | null;
  selectedSlot: AvailabilitySlot | null;
  note: string | null;
  step: 1 | 2 | 3 | 4;   // services → staff → slot → review
}
export const useBookingStore = create<BookingState & {
  setBusiness: (id: string|null)=>void; setServices: (ids:string[])=>void;
  setStaff: (id:string|null)=>void; setSlot: (s:AvailabilitySlot)=>void; setNote:(n:string)=>void;
  setStep: (s:1|2|3|4)=>void; reset: ()=>void;
}>((set)=>({ /* ... */ }));
```
Rationale for session-only: a stale persisted cart on refresh could book at the wrong business (multi-tenant safety). Mirrors `authStore` Zustand style (`create<...>()(persist(...))` — but without `persist`).

## 7. Orchestrator hook (`hooks/useBooking.ts`)

Mirrors `useAuth` shape (loading + `error` + toast on `react-hot-toast`):
- `loadServices(businessId)` → `servicesApi.getByBusiness`; `loadStaff(businessId)` → `businessesApi.getMyStaff` (existing) then filter client-side to staff assigned to ALL selected services (or just fetch availability which already filters by assignment server-side — preferred: let the backend filter).
- `loadAvailability(businessId, { serviceIds, staffUserId, startDate, endDate })` → `appointmentsApi.getAvailability`.
- `submit(data)` → `appointmentsApi.create` (customer) / `createOnBehalf` (owner); on success → `invalidateCache("appointments")` + `invalidateCache("availability")` + `router.push(\`/dashboard/appointments/${id}\`)`; on `!success` → `invalidateCache`-aware toast (`react-hot-toast`, matching `useAuth`).
- `cancel(id)` / `reschedule(id, data)` → mutate + invalidate.

## 8. Validation schemas (`lib/validations/appointments.ts`)

RHF + Zod (same libs in `package.json`). Reuse the existing `lib/validations/auth.ts` file style:
- `createAppointmentSchema`: `businessId`(uuid), `serviceIds`(array.min(1)), `staffUserId`(uuid, optional), `scheduledAt`(ISO, refine ⇒ must be a member of the loaded slot set).
- `rescheduleSchema`: `scheduledAt`(ISO) + optional `serviceIds`/`staffUserId`.
- `serviceCatalogSchema`: `name`(1–120), `durationMinutes`(int, 1–1440), `price`(number≥0).
## 9. Components (NEW / MODIFY / REUSE)

| Component | Path | Status | Notes |
|---|---|---|---|
| `AppointmentModal` | `components/book/AppointmentModal.tsx` | **NEW** | Single-page progressive wizard (4 steps); reuses Tailwind tokens `--surface/--border/--text-primary/bg-brand/shadow-card/rounded-2xl` from existing staff pages. |
| `ServiceList` | `features/appointments/ServiceList.tsx` | **NEW** | Multi-select tiles from `servicesApi.getByBusiness`. |
| `StaffSelector` | `features/appointments/StaffSelector.tsx` | **NEW** | `StaffGrid` of business staff; server already filters assignment in availability. |
| `AppointmentCalendar` | `features/calendar/AppointmentCalendar.tsx` | **NEW** | Day-view slot picker; render availability slots + existing appointments. (No existing calendar/slot component exists in `components/`.) |
| My appointments list | `app/dashboard/appointments/page.tsx` | **NEW** | role-gated Customer. |
| Appointment detail | `app/dashboard/appointments/[id]/page.tsx` | **NEW** | status badge + cancel/reschedule CTA (ownership-gated). |
| Booking wizard | `app/dashboard/appointments/new/page.tsx` | **NEW** | reads `?businessId=` from `/dashboard/explore`. |
| Owner calendar | `app/dashboard/business/appointments/page.tsx` | **NEW** | `appointmentsApi.getBusinessCalendar`; status actions. |
| Staff calendar | `app/dashboard/staff/appointments/page.tsx` | **NEW** | `appointmentsApi.getStaffCalendar`; own deliver actions. |
| Service CRUD | `app/dashboard/business/profile/services/page.tsx` | **NEW** (under existing Profile shell) | `servicesApi.getMine`/create/update/remove. |
| `dashboard/layout.tsx` | — | **REUSE** | header business label already branches on `user.role` (lines 57-79). |
| `useRoleGuard`, `useAuth`, `authStore`, `cachedFetch`, `businessesApi` | — | **REUSE** | unchanged. |

## 10. Booking flow (UI)

1. Customer lands on `/dashboard/appointments/new?businessId=X` (from `/dashboard/explore` [Explore page, existing]).
2. Step 1 `ServiceList`: `GET /v1/services/{businessId}` (cached 5 min); multi-select → `useBookingStore.setServices`.
3. Step 2 `StaffSelector`: optional; `GET /v1/businesses/me/staff` (cached) or skip "any available".
4. Step 3 `AppointmentCalendar`: `GET /v1/businesses/{businessId}/availability` (cached 20 s) → pick slot → `setSlot`.
5. Step 4 Review: summary sheet; `POST /v1/appointments`; on success invalidate + push `/dashboard/appointments/[id]`.
Reschedule/cancel open the same modal pre-filled via `rescheduleSchema`/cancel action, re-fetching availability.

## 11. Role guards

- Customer pages: `useRoleGuard("Customer")` (redirects Staff/Business to their dashboards).
- Owner pages: `useRoleGuard("Business")`.
- Staff pages: `useRoleGuard("Staff")`.
- `dashboard/layout.tsx` already gates unauthenticated → `/login`; keep that, add per-page `useRoleGuard`. The layout already resolves the header business per role (`layout.tsx:57-79`) — no change.

## 12. Cache invalidation strategy

- After any appointment mutation (create/reschedule/cancel/status change): `invalidateCache("appointments:mine")`, `invalidateCache("appointments:calendar")`, `invalidateCache("appointments:staff")`, `invalidateCache("availability")`. (Mirrors `authStore.logout` calling `invalidateCache()` on logout.)
- After service-catalog mutation: `invalidateCache("services:mine")` + `invalidateCache("services:business:{id}")`.
- Availability cache keys include `serviceIds`/`staffUserId`/`startDate`/`endDate` so only affected windows bust.

## 13. Time handling

- Store/display contract: backend stores UTC timestamptz (`appointments.scheduled_at`/`end_at`). Frontend stores ISO strings (UTC). `AppointmentCalendar` renders slots in the **browser's local timezone** for display only (`new Date().toLocaleString()` / `Intl.DateTimeFormat`).
- **Known limitation:** `StaffShift.StartHour/EndHour` are UTC hour-ints; for a Nairobi business (+3) the owner enters shifts as if local but they are compared as a fixed UTC window. **Fix (future):** add `Business.TimeZoneId` and convert client-side — see `feature.md` §9.12 / `backend.md` §15. Do **not** invent per-component tz math; keep one documented assumption.

## 14. Testing (Jest + React Testing Library)

`punched-pwd` uses Jest + RTL. New tests for:
- `useBooking` / `useBookingStore`: cart add/remove multi-service; `endAt = scheduledAt + Σ durations`; wizard step transitions; guard on empty cart.
- `AppointmentCalendar`: renders returned `AvailabilitySlot[]` into local-time labels; selecting a slot calls `setSlot`; does not render `IsWorking=false` windows.
- `ServiceList`: multi-select; disables services not assigned to a selected staff (when staff chosen).
- Role guards: `useRoleGuard("Customer")` redirects a Staff user away from `/dashboard/appointments`.
- Mock `appointmentsApi`/`servicesApi` (the existing `businessesApi` mock style).

## 15. Out of scope (frontend)

Real-time SSE for the customer (existing `SseService` is stamp-only), push notifications, calendar-sync UI, SMS/email confirmation UI, waitlist UI. These reuse `SseService`/`INotificationsService` later but are deferred (see `backend.md` §15).

End of `frontend.md`.




