# Prompt: Implement Phase 6 & Phase 7 (Booking System — Frontend)

Run this prompt against the repo root `C:\Users\PeterMainaChege\Downloads\LearningProjects\Punched-Customer-Loyalty-Reward-SaaS`. Ground every action in `docs/booking-system/` — `frontend.md` is the **authoritative spec** (routes/types/TTLs/testing); `implementation-plan.md` is the phase checklist; `stack-and-guidelines.md` is the conventions source of truth. The agent is autonomous: build → test → commit per step; stop with a `// BLOCKED:` note only on a hard blocker.

> **Naming precedent:** this repo keeps frontend code under `punched-pwd/` (Next.js 14 App Router, `app/` pages + `lib/` + `store/` + `hooks/` + `types/`), imports via `@/`, types in `types/index.ts`. Where `implementation-plan.md` sketch names drift from `frontend.md`/`backend.md`, **the spec wins**; the plan is a checklist.

## Verified preconditions (DO NOT re-derive — these are true now)

- **Phase 1–5 are committed and green.** `git log` tip is `test(booking): Phase 5 …`; `dotnet build PunchedApi/PunchedApi.csproj` is `0 Error(s)`; `dotnet test --filter "FullyQualified~Appointment"` and `--filter "FullyQualified~ServiceCatalog"` pass. Backend API contracts (routes, DTOs, error codes) are frozen by Phase 4/5.
- **Frontend stack (`punched-pwd/package.json`)** — Next.js 14.2 App Router, TypeScript 5.5, React 18.3, Tailwind 3.4, `tailwind-merge` + `clsx`, zustand 4.5, `react-hook-form` 7.52, `zod` 3.23, `@hookform/resolvers` 3.9, `axios` 1.7, `lucide-react` 0.400, `react-hot-toast` 2.4. `tsconfig.json` maps `@/` → `punched-pwd`. Scripts present: `dev`, `build`, `start`, `lint` (`next lint`).
- **`@/lib/api/client.ts`** — `apiClient` (axios, `baseURL = http://localhost:5000/v1`, 15 s timeout), `setTokens`/`clearTokens`/`getAccessToken`; Bearer interceptor + queued 401 auto-refresh. **Reuse it, do not reconfigure axios.**
- **`@/lib/api/cache.ts`** — `cachedFetch<T>(key, fetcher, ttlMs=15000)` (in-flight dedupe + TTL) and `invalidateCache(keyOrPrefix?)` (exact match OR prefix). This is the **established** data pattern.
- **`@/lib/api/businesses.ts`** — `businessesApi` is the reference module shape; owner reads use `cachedFetch("biz:me", () => apiClient.get<ApiResponse<…>>(...).then(r => r.data), ttl)`; mutations use `apiClient.get/post(...).then(r => r.data)`.
- **`@/store/authStore.ts`** — Zustand with `persist(["auth"], …)` (localStorage); exposes `user`, `isAuthenticated`, `isLoading`, `login(user, tokens)`, `logout()`, etc.
- **`@/hooks/useAuth.ts`** — mirror shape: `useState` `isLoading`/`error`; unwraps `result.error?.message` from `AxiosError`; `toast.success`/`toast.error` (`react-hot-toast`); `router.push(...)`. `redirectByRole(role)` → `/dashboard/admin|business|staff|dashboard`.
- **`@/hooks/useRoleGuard.ts`** — `useRoleGuard(requiredRole)` redirects non-matching roles.
- **`@/app/dashboard/layout.tsx`** — role-gated shell; header business resolved per role (Business → `businessesApi.getMine()`, Staff → `businessesApi.getStaffBusiness()`). **Do not change the layout.**
- **`@/types`** — `UserRole = "Customer" | "Business" | "Staff" | "Admin"`, `ApiResponse<T> { success, data, error: { code, message } }`, `Business`, `StaffMember`, `PaginatedResponse<T>`, `MessageResponse`. **No appointment/service-catalog types exist yet — add them here.**

> ⚠️ **Precondition to verify at start (Step 6.0):** `punched-pwd/package.json` currently has **no `test` script and no Jest/RTL devDependencies**. `frontend.md` §14 assumes Jest + RTL exist. If absent, **first** add the test toolchain (`npm install -D jest @types/jest tsx jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest`, add `jest.config.js`, `jest.setup.ts` registering `@testing-library/jest-dom` + a `react-hot-toast` mock, and `"test": "jest"` script) **before** writing tests. Do **not** adopt `@tanstack/react-query` (installed, unused by the auth/data flow).
## Backend contracts this phase consumes (authoritative)

Route prefix is **`/v1`** (axios base already set). All wrapped in `ApiResponse<T>`; failures carry `error.code` per `backend.md` §9: `NOT_FOUND`/`SERVICE_NOT_FOUND`/`STAFF_NOT_FOUND`/`CUSTOMER_NOT_FOUND` → 404, `FORBIDDEN` → 403, `OVERBOOKING`/`SLOT_UNAVAILABLE`/`INVALID_STATUS_TRANSITION` → 409, else 400.

| Method | Route | Returns | Auth |
|---|---|---|---|
| GET | `/businesses/{businessId:guid}/availability` ?serviceIds=`Guid[]`&staffId=`Guid?`&startDate=`DateOnly`&endDate=`DateOnly` | `AvailabilitySlotResponse[]` | Anonymous |
| GET | `/services/{businessId:guid}` | `ServiceCatalogItemResponse[]` (active only) | Anonymous |
| GET | `/services/me` | `ServiceCatalogItemResponse[]` (owner, incl. inactive) | Business |
| GET | `/services/me/{id:guid}` | `ServiceCatalogItemResponse` | Business |
| POST | `/services/me` `CreateServiceRequest{name,durationMinutes,price}` | `ServiceCatalogItemResponse` | Business |
| PATCH | `/services/me/{id:guid}` `UpdateServiceRequest{name?,durationMinutes?,price?,isActive?}` | `ServiceCatalogItemResponse` | Business |
| DELETE | `/services/me/{id:guid}` | `ApiResponse<bool>` (soft delete) | Business |
| GET | `/appointments` | `AppointmentResponse[]` (customer's own) | Customer |
| GET | `/appointments/{id:guid}` | `AppointmentResponse` | Customer (own) |
| POST | `/appointments` `CreateAppointmentRequest{businessId,serviceIds,staffUserId?,scheduledAt,note?}` | `AppointmentResponse` | Customer |
| POST | `/appointments/{id:guid}/reschedule` `RescheduleAppointmentRequest{scheduledAt,serviceIds?,staffUserId?,note?}` | `AppointmentResponse` | Customer (own) |
| POST | `/appointments/{id:guid}/cancel` `CancelAppointmentRequest{note?}` | `AppointmentResponse` | Customer (own) |
| GET | `/businesses/me/appointments`?staffId&customerId&serviceId&status&from&to&page&pageSize | `PaginatedResponse<AppointmentResponse>` | Business |
| GET | `/businesses/me/appointments/{id:guid}` | `AppointmentResponse` | Business |
| POST | `/businesses/me/appointments` `CreateAppointmentOnBehalfRequest{…,customerId}` | `AppointmentResponse` | Business |
| POST | `/businesses/me/appointments/{id:guid}/{reschedule\|cancel\|confirm\|complete\|no-show}` | `AppointmentResponse` | Business |
| GET | `/businesses/staff/appointments`?status&from&to | `AppointmentResponse[]` | Staff |
| GET | `/businesses/staff/appointments/{id:guid}` | `AppointmentResponse` | Staff |
| POST | `/businesses/staff/appointments/{id:guid}/{confirm\|complete\|no-show}` | `AppointmentResponse` | Staff |

> Staff/Customer resolve tenant from the call; the JWT has **no `businessId`** (frontend.md §2): Business → `businessesApi.getMine()`; Staff → `businessesApi.getStaffBusiness()`; Customer → `businessId` carried from the explore page (no `/dashboard/customer/` segment).
## Step 6 — Frontend types + API clients (frontend.md §4, §5)

### Step 6.0 — Test toolchain (only if absent per precondition)
`punched-pwd/package.json` currently has **no `test` script, no Jest deps, no `jest.config.js`, no `jest.setup.ts`**. Add them **first** (Jest + RTL for this Next/TS stack):
- `npm install -D jest @types/jest tsx jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest`
- `jest.config.js` → `preset: "ts-jest"`, `testEnvironment: "jsdom"`, `moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" }`, `setupFilesAfterEach: ["<rootDir>/jest.setup.ts"]`, `testPathIgnorePatterns: ["/node_modules/", "/.next/"]`.
- `jest.setup.ts` → `import "@testing-library/jest-dom"` + `jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn(), loading: jest.fn(), custom: jest.fn() } }))`.
- `package.json` scripts → `"test": "jest"`.
- Verify `npx tsc --noEmit` + `npm run lint` + `npm run build` still pass. **Do not adopt `@tanstack/react-query`** (installed, unused by the auth/data flow).

### Step 6.1 — Types (`punched-pwd/types/index.ts`)
Append a `// Booking` section. Mirror `backend.md`/`AppointmentDTOs.cs` exactly; camelCase; dates are ISO-UTC strings:
- `ServiceCatalogItemResponse { id, businessId, name, durationMinutes, price, isActive, createdAt }` (all `id`/`businessId` are `string`/GUID strings)
- `CreateServiceRequest { name: string, durationMinutes: number, price: number }`
- `UpdateServiceRequest { name?, durationMinutes?, price?, isActive? }`
- `AvailabilitySlotResponse { startAtUtc: string, endAtUtc: string, staffUserId: string, staffName: string, serviceIds: string[] }`
- `AppointmentServiceSnapshot { serviceCatalogItemId: string, name: string, durationMinutes: number, price: number, sortOrder: number }`
- `AppointmentStatus = "draft" | "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show"` (lowercase enum strings per `backend.md`)
- `AppointmentResponse { id, businessId, customerId, staffUserId?, scheduledAt, endAt, status: AppointmentStatus, services: AppointmentServiceSnapshot[], createdAt, updatedAt }`
- `CreateAppointmentRequest { businessId: string, serviceIds: string[], staffUserId?: string, scheduledAt: string, note?: string }`
- `RescheduleAppointmentRequest { scheduledAt: string, serviceIds?: string[], staffUserId?: string, note?: string }`
- `CancelAppointmentRequest { note?: string }`
- `AppointmentFormData { businessId: string, serviceIds: string[], staffUserId?: string, scheduledAt: string | null, note?: string }` (wizard form model — session-only)
- `CreateAppointmentOnBehalfRequest { serviceIds: string[], staffUserId?: string, scheduledAt: string, note?: string, customerId: string }` (Business role)
- If `PaginatedResponse<T>` is missing, add `{ items: T[], totalCount: number, page: number, pageSize: number }`.
### Step 6.2 — API client modules (`punched-pwd/lib/api/`) — mirror `businessesApi`
**`appointments.ts`** → `export const appointmentsApi = { … }`:
- `getMyAppointments` → `cachedFetch("appointments:mine", () => apiClient.get<ApiResponse<AppointmentResponse[]>>("/appointments").then((r) => r.data), 15_000)`
- `getAppointment(id)` → `apiClient.get<ApiResponse<AppointmentResponse>>("/appointments/" + id).then((r) => r.data)`
- `create(data)` → `apiClient.post<ApiResponse<AppointmentResponse>>("/appointments", data).then((r) => r.data)` then invalidate `"appointments:mine"`, `"appointments:calendar"`, `"availability"`
- `reschedule(id, data)`, `cancel(id, data)` → `apiClient.post<ApiResponse<AppointmentResponse>>("/appointments/" + id + "/reschedule" | "/cancel", data).then((r) => r.data)` + same invalidations
- `getBusinessAppointments(params)` → `cachedFetch("appointments:calendar:" + JSON.stringify(params ?? {}), () => apiClient.get<ApiResponse<PaginatedResponse<AppointmentResponse>>>("/businesses/me/appointments", { params }).then((r) => r.data), 15_000)`
- `getBusinessAppointment(id)` → `apiClient.get<ApiResponse<AppointmentResponse>>("/businesses/me/appointments/" + id).then((r) => r.data)`
- `createForCustomer(data: CreateAppointmentOnBehalfRequest)` → POST `/businesses/me/appointments` + invalidate
- `businessAction(id, action, data?)` → POST `/businesses/me/appointments/${id}/${action}` for `reschedule|cancel|confirm|complete|no-show` + invalidate
- `getStaffAppointments(params)` → `cachedFetch("appointments:staff:" + JSON.stringify(params ?? {}), () => apiClient.get<ApiResponse<AppointmentResponse[]>>("/businesses/staff/appointments", { params }).then((r) => r.data), 15_000)`
- `getStaffAppointment(id)` → `apiClient.get<ApiResponse<AppointmentResponse>>("/businesses/staff/appointments/" + id).then((r) => r.data)`
- `staffAction(id, action)` → POST `/businesses/staff/appointments/${id}/${confirm|complete|no-show}` + invalidate
- `getAvailability(businessId, params)` → `cachedFetch("availability:" + businessId + ":" + JSON.stringify(params), () => apiClient.get<ApiResponse<AvailabilitySlotResponse[]>>("/businesses/" + businessId + "/availability", { params }).then((r) => r.data), 20_000)`

**`services.ts`** → `export const servicesApi = { … }`:
- `getPublic(businessId)` → `cachedFetch("services:business:" + businessId, () => apiClient.get<ApiResponse<ServiceCatalogItemResponse[]>>("/services/" + businessId).then((r) => r.data), 300_000)`
- `getMyServices()` → `cachedFetch("services:mine", () => apiClient.get<ApiResponse<ServiceCatalogItemResponse[]>>("/services/me").then((r) => r.data), 15_000)`
- `getService(id)` → `apiClient.get<ApiResponse<ServiceCatalogItemResponse>>("/services/me/" + id).then((r) => r.data)`
- `create(data)` → POST `/services/me` + `invalidateCache("services:mine")`
- `update(id, data)` → PATCH `/services/me/${id}` + invalidate `"services:mine"`
- `remove(id)` → DELETE `/services/me/${id}` + invalidate `"services:mine"`
## Step 7 — Store + hook + validation (frontend.md §6, §7, §8)

### Step 7.1 — `punched-pwd/store/bookingStore.ts` (Zustand, session-only)
`import { create } from "zustand";` (import types from `@/types`). **No `persist` middleware** — cart must not survive reload (stack rule #9). Mirror the existing store style:
- `interface BookingState { businessId: string | null; serviceIds: string[]; selectedStaffId: string | null; slot: { startAtUtc: string; endAtUtc: string } | null; note: string; }`
- `interface BookingActions { setBusiness; setServices; toggleService; clearServices; setStaff; setSlot; removeSlot; setNote; reset; }`
- Computed `endAt` = `slot.startAtUtc + Σ(service durations)` — derive by fetching selected catalog items' `durationMinutes` via `servicesApi.getPublic(businessId)` (lazy within consumer); enforce `endAt = scheduledAt + Σ durations` in tests by stubbing `servicesApi`.
- `create<BookingState & BookingActions>((set) => ({ businessId: null, serviceIds: [], selectedStaffId: null, slot: null, note: "", setBusiness: (id) => set({ businessId: id }), setServices: (ids) => set({ serviceIds: ids }), toggleService: (id) => set((s) => ({ serviceIds: s.serviceIds.includes(id) ? s.serviceIds.filter((x) => x !== id) : [...s.serviceIds, id] })), clearServices: () => set({ serviceIds: [] }), setStaff: (id) => set({ selectedStaffId: id }), setSlot: (slot) => set({ slot }), removeSlot: () => set({ slot: null }), setNote: (note) => set({ note: note.slice(0, 500) }), reset: () => set({ businessId: null, serviceIds: [], selectedStaffId: null, slot: null, note: "" }) }))`
- Export `useBookingStore`.
### Step 7.2 — `punched-pwd/hooks/useBooking.ts` (mirrors `useAuth`)
`"use client"`; `import { useState, useCallback } from "react"; import { useRouter } from "next/navigation"; import { AxiosError } from "axios"; import toast from "react-hot-toast"; import { appointmentsApi } from "@/lib/api/appointments"; import { invalidateCache } from "@/lib/api/cache"; import type { ApiResponse, CreateAppointmentRequest, RescheduleAppointmentRequest, CancelAppointmentRequest } from "@/types";`
- State `isLoading`, `error` (`useState`).
- `getErrorMessage` helper (same as `useAuth`: `AxiosError` → `data.error?.message`).
- `createAppointment(data)` → `setIsLoading(true)`; `try { const result = await appointmentsApi.create(data); if (result.success) { toast.success("Appointment booked."); invalidateCache("appointments:mine"); invalidateCache("appointments:calendar"); invalidateCache("availability"); router.push("/dashboard/appointments/" + result.data!.id); } else { toast.error(result.error?.message || "Could not book."); setError(...); } } finally { setIsLoading(false); }`
- `rescheduleAppointment(id, data)`, `cancelAppointment(id, data)` → invalidate the same groups; on cancel `router.push("/dashboard/appointments")`.
- Return `{ createAppointment, rescheduleAppointment, cancelAppointment, isLoading, error }`.

### Step 7.3 — Validation (`punched-pwd/lib/validations/appointments.ts`)
`import { z } from "zod";`
- `createAppointmentSchema = z.object({ businessId: z.string().uuid(), serviceIds: z.array(z.string().uuid()).min(1, "Select at least one service"), staffUserId: z.string().uuid().optional(), scheduledAt: z.coerce.date({ invalid_type_error: "Pick a valid time" }).min(() => new Date(), "Time must be in the future"), note: z.string().max(500).optional() })`
- `rescheduleSchema = z.object({ scheduledAt: z.coerce.date().min(() => new Date(), "Time must be in the future"), serviceIds: z.array(z.string().uuid()).optional(), staffUserId: z.string().uuid().optional(), note: z.string().max(500).optional() })`
- `cancelSchema = z.object({ note: z.string().max(500).optional() })`
- `export type CreateAppointmentForm = z.infer<typeof createAppointmentSchema>;` (+ `RescheduleAppointmentForm`, `CancelAppointmentForm`).

## Acceptance — Phase 6 & 7
- [ ] `types/index.ts` has booking types matching backend DTOs (camelCase, ISO-UTC, lowercase statuses).
- [ ] `lib/api/appointments.ts` + `lib/api/services.ts` export the documented `*Api` objects using `apiClient` + `cachedFetch` + `invalidateCache`; cache keys + TTLs match `frontend.md` §12.
- [ ] `store/bookingStore.ts` is Zustand **session-only** (no `persist`), with `endAt = slot.startAtUtc + Σ durations`.
- [ ] `hooks/useBooking.ts` mirrors `useAuth` (loading/error/toast) and invalidates the four cache groups on mutation (§12).
- [ ] `lib/validations/appointments.ts` has `createAppointmentSchema`/`rescheduleSchema`/`cancelSchema` with future-date + min-services rules; `@hookform/resolvers` types exported.
- [ ] Test toolchain added iff absent; `npx tsc --noEmit` + `npm run lint` + `npm run build` all green.

## Run per step (mirrors Phase 4/5 discipline)
- Step 6.0: `npm install -D …` then `npx tsc --noEmit && npm run lint && npm run build`.
- Step 6.1: after types, `npx tsc --noEmit`.
- Step 6.2: after api modules, `npx tsc --noEmit`.
- Step 7.1: after store, `npx tsc --noEmit`.
- Step 7.2: after hook, `npx tsc --noEmit`.
- Step 7.3: after schemas, `npx tsc --noEmit && npm test`.

## End-to-end verification (end of Phase 7)
- [ ] `npx tsc --noEmit` green.
- [ ] `npm run build` green (Next.js App Router builds).
- [ ] `npm test` green for `useBookingStore` cart math + `endAt` derivation + schema validation (store/schema unit tests) once toolchain is in place.
- [ ] Flip Phase 6 (`6.1`, `6.2`) and Phase 7 (`7.1`, `7.2`, `7.3`) checkboxes to `[x]` in `implementation-plan.md`; commit: `feat(booking): Phase 6/7 frontend types, api clients, booking store, hook, validation`.

> Phase 8 (components + pages: `ServiceList`/`StaffSelector`/`AppointmentCalendar` wizard + list/detail routes) and Phase 9 (Jest/RTL component tests) are a **separate** prompt. **Do not** create `app/dashboard/appointments/...` pages, UI components, or component-level tests here — only types, API clients, the booking store, the booking hook, and validation schemas.

End of `phase-6-7-prompt.md`.





