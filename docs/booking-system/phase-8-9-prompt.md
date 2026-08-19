# Prompt: Implement Phase 8 & Phase 9 (Booking System — Components, Pages & Frontend Tests)

Run this prompt against the repo root `C:\Users\PeterMainaChege\Downloads\LearningProjects\Punched-Customer-Loyalty-Reward-SaaS`. Ground every action in `docs/booking-system/` — `frontend.md` is the **authoritative spec** (routes/components/testing); `implementation-plan.md` is the phase checklist; `stack-and-guidelines.md` is the conventions source of truth. The agent is autonomous: build → test → commit per step; stop with a `// BLOCKED:` note only on a hard blocker.

> **Naming precedent:** this repo keeps frontend code under `punched-pwd/` (Next.js 14 App Router `app/` pages + `components/` + `features/` + `lib/` + `store/` + `hooks/` + `types/`), imports via `@/`, types in `types/index.ts`. Where `implementation-plan.md` sketch names drift from `frontend.md`/`backend.md` or from the **already-committed** Phase 6/7 API/type names, **the committed Phase 6/7 names win** — they are the frozen contract. The plan is a checklist, not a contract.

## Verified preconditions (DO NOT re-derive — these are true now)

- **Phase 1–7 are committed and green.** `git log` tip is `feat(booking): Phase 6/7 frontend types, api clients, booking store, hook, validation` (`d760a4da`). Backend API contracts (routes/DTOs/error codes) are frozen by Phase 4/5.
- **Frontend stack (`punched-pwd/package.json`)** — Next.js 14.2 App Router, TypeScript 5.5, React 18.3, Tailwind 3.4, `tailwind-merge`+`clsx`, zustand 4.5, `react-hook-form` 7.52, `zod` 3.23, `@hookform/resolvers` 3.9, axios 1.7, `lucide-react` 0.400, `react-hot-toast` 2.4. Scripts: `dev`, `build`, `start`, `lint` (`next lint`), `test` (`jest`). **Jest + RTL toolchain is present** (`jest.config.js`, `jest.setup.ts` with the `react-hot-toast` mock, `@testing-library/*` devDeps) — do not reinstall.
- **Committed Phase 6/7 artifacts you MUST reuse (exact names):**
  - `types/index.ts` → `// Booking` section: `ServiceCatalogItemResponse`, `AvailabilitySlotResponse` `{ startAtUtc, endAtUtc, staffUserId, staffName, serviceIds }` (no `isWorking` — the availability API never returns non-working windows; they are filtered server-side), `AppointmentResponse`, `AppointmentServiceSnapshot`, `AppointmentStatus` (“draft|pending|confirmed|in_progress|completed|cancelled|no_show”), `CreateAppointmentRequest`, `CreateAppointmentOnBehalfRequest`, `RescheduleAppointmentRequest`, `CancelAppointmentRequest`, `AppointmentFormData`. Existing: `PaginatedResponse<T>` `{ items, totalCount, page, pageSize }`, `StaffMember`, `StaffBusinessResponse { businessId, businessName }`, `ApiResponse<T>`.
  - `lib/api/appointments.ts` → `appointmentsApi`: `getMyAppointments(params?)`, `getAppointment(id)`, `create(data)`, `reschedule(id,data)`, `cancel(id,data?)`, `getBusinessAppointments(params?): Promise<ApiResponse<PaginatedResponse<AppointmentResponse>>>`, `getBusinessAppointment(id)`, `createForCustomer(data)`, `businessAction(id, action, data?)` for `reschedule|cancel|confirm|complete|no-show`, `getStaffAppointments(params?): Promise<ApiResponse<AppointmentResponse[]>>`, `getStaffAppointment(id)`, `staffAction(id, action)` for `confirm|complete|no-show`, `getAvailability(businessId, params)`.
  - `lib/api/services.ts` → `servicesApi`: `getPublic(businessId)`, `getMyServices()`, `getService(id)`, `create(data)`, `update(id,data)`, `remove(id)`.
  - `lib/api/businesses.ts` → `businessesApi.getMyStaff()` (→ `ApiResponse<StaffMember[]>`), `businessesApi.getStaffBusiness()` (→ `ApiResponse<StaffBusinessResponse>`).
  - `store/bookingStore.ts` → `useBookingStore` (session-only): `businessId`, `serviceIds`, `selectedStaffId`, `slot`, `note` + `setBusiness/setServices/toggleService/clearServices/setStaff/setSlot/removeSlot/setNote/reset`.
  - `hooks/useBooking.ts` → `useBooking()` returns `{ createAppointment, rescheduleAppointment, cancelAppointment, isLoading, error }` (toast + cache invalidation + navigation already wired).
  - `lib/validations/appointments.ts` → `createAppointmentSchema`, `rescheduleSchema`, `cancelSchema` (+ `zodResolver` from `@hookform/resolvers/zod`).
  - `hooks/useRoleGuard.ts` → `useRoleGuard(requiredRole)`.
- **Reusable UI primitives:** `components/ui/{Button,Card,Input,FilterSheet}.tsx` (`CardHeader/CardTitle/CardContent/CardFooter`), `components/business/DashboardPrimitives.tsx` (`SectionTitle`, `MetricCard`, `KpiPill`, `PeriodTabs`, `MomentumRing`). **`features/` does not exist yet — create it.** Design tokens: `bg-[var(--surface)]`, `border-[var(--border-light)]`, `text-[var(--text-primary|secondary|tertiary)]`, `bg-brand`, `bg-brand-surface`, `rounded-2xl`, `shadow-card`.
- **`app/dashboard/layout.tsx`** already gates unauthenticated → `/login` and resolves the header business per role. **Do not change the layout.**

### Known pre-existing repo issue (do NOT fix unrelated files, but keep new files clean)
`npm run lint` and `npm run build` currently fail on **pre-existing** ESLint errors in unrelated committed files (`app/page.tsx`, `app/dashboard/staff/scan/page.tsx`, `components/ui/Card.tsx`, etc. — see the Phase 6/7 summary). Those are out of scope. **Your new files must add ZERO new lint errors** — in JSX, escape apostrophes as `&apos;` (rule `react/no-unescaped-entities`), avoid `@typescript-eslint/no-explicit-any` and `no-unused-vars`, avoid `no-empty-object-type`. Validate your new files with `npx tsc --noEmit` and lint the specific paths you touched.

## Route map & components (authoritative — `frontend.md` §3, §9)

| Persona | Route | File (NEW) | Role guard |
|---|---|---|---|
| Customer | `/dashboard/appointments` | `app/dashboard/appointments/page.tsx` | `useRoleGuard("Customer")` |
| Customer | `/dashboard/appointments/[id]` | `app/dashboard/appointments/[id]/page.tsx` | `useRoleGuard("Customer")` |
| Customer | `/dashboard/appointments/new?businessId=` | `app/dashboard/appointments/new/page.tsx` (wizard) | `useRoleGuard("Customer")` |
| Owner | `/dashboard/business/appointments` | `app/dashboard/business/appointments/page.tsx` | `useRoleGuard("Business")` |
| Owner | `/dashboard/business/appointments/[id]` | `app/dashboard/business/appointments/[id]/page.tsx` | `useRoleGuard("Business")` |
| Staff | `/dashboard/staff/appointments` | `app/dashboard/staff/appointments/page.tsx` | `useRoleGuard("Staff")` |
| Owner | service CRUD | `app/dashboard/business/profile/services/page.tsx` (NEW under the existing Profile shell) | `useRoleGuard("Business")` |

| Component | Path (NEW) | Purpose |
|---|---|---|
| `ServiceList` | `features/appointments/ServiceList.tsx` | Multi-select tiles from `servicesApi.getPublic(businessId)`; disables services the selected staff cannot serve |
| `StaffSelector` | `features/appointments/StaffSelector.tsx` | Optional staff picker (“Any available” default) from `businessesApi.getMyStaff()` |
| `AppointmentCalendar` | `features/calendar/AppointmentCalendar.tsx` | Day-view slot picker from `appointmentsApi.getAvailability(...)`; renders slots in browser-local time |
| `AppointmentModal` | `components/book/AppointmentModal.tsx` | Single progressive wizard (4 steps) driving `useBookingStore`; reused for book/reschedule/cancel |

---

## Phase 8 — Components + pages (`implementation-plan.md` §8; `frontend.md` §9 §10 §11)

### Step 8.0 — baseline
Confirm the working tree is clean from Phase 6/7 (`git log` tip `d760a4da`); `git status --short` shows only the known pre-existing residue (`globals.css`, `.eslintrc.json`, `lint-report.txt`) — do not commit those.

### Step 8.1 — Components (`features/` NEW; `components/book/AppointmentModal.tsx` NEW)

**`features/appointments/ServiceList.tsx`** (`"use client"`)
- Props: `businessId: string`. Load services via `servicesApi.getPublic(businessId)` (cached 300 s → `ApiResponse<ServiceCatalogItemResponse[]>`).
- Render a tile per service (name, `durationMinutes` min, `price` KES). Multi-select toggles `useBookingStore.toggleService(id)`; selected state reflects `useBookingStore.serviceIds`.
- **Staff-assignment disabling (§14):** accept optional `unavailableServiceIds?: string[]`. When a staff is selected, the wizard computes the service ids present in the loaded availability slots for that staff and passes the complement; `ServiceList` renders those tiles `disabled` (visible, not clickable). No staff chosen → nothing disabled (the server enforces assignment at booking).
- Use `Button`/`Card`-style tiles + Tailwind tokens; `Loader2` while loading; empty state when `data` is empty.

**`features/appointments/StaffSelector.tsx`** (`"use client"`)
- Props: `businessId: string` (informational — `getMyStaff()` is self-scoped), `onSelect?: (id: string | null) => void`.
- Loads `businessesApi.getMyStaff()` → `ApiResponse<StaffMember[]>`; renders “Any available” default + staff grid (avatar + name). Selecting calls `useBookingStore.setStaff(id | null)`.
- The server filters availability by staff assignment (frontend.md §2/§10), so no client-side assignment filtering here.

**`features/calendar/AppointmentCalendar.tsx`** (`"use client"`)
- Props: `businessId: string`, `serviceIds: string[]`, `staffUserId?: string | null`, `startDate`/`endDate` (`DateOnly` strings, `YYYY-MM-DD`).
- Loads `appointmentsApi.getAvailability(businessId, { serviceIds, staffId: staffUserId ?? undefined, startDate, endDate })` (cached 20 s).
- Render each returned `AvailabilitySlotResponse` as a selectable tile. **Time handling (§13):** display **browser-local** time only (`new Date(slot.startAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })`); store the ISO-UTC `startAtUtc` unchanged. Label with `staffName`.
- Selecting a slot calls `useBookingStore.setSlot(slot)`; a selected indicator reflects the store’s `slot`.
- The API already excludes `IsWorking=false` windows, so render exactly the returned slots; empty array → “No availability” empty state.

**`components/book/AppointmentModal.tsx`** (`"use client"`) — the booking wizard
- Single progressive wizard, **4 steps** per §10:
  1. **Services** → `ServiceList`
  2. **Staff** → `StaffSelector` (skip = “Any available”)
  3. **Time** → `AppointmentCalendar`; guard on empty cart — block advancing when `serviceIds` is empty
  4. **Review** → summary (services + durations + `endAt = slot.startAtUtc + Σ(durationMinutes)` derived via `servicesApi.getPublic` + staff + note) with a confirm button.
- Mode prop `mode?: "book" | "reschedule" | "cancel"` + pre-fill for reschedule/cancel (§10: reopen pre-filled via `rescheduleSchema`/cancel action, re-fetching availability).
- Confirm: `useBooking.createAppointment(data)` / `rescheduleAppointment(id, data)` / `cancelAppointment(id, data)` — `useBooking` already toasts + invalidates + navigates.
- Note field (max 500) via `setNote`; `<textarea>` styled like `Input`.
- Use `Button`/`Card` tokens + `lucide-react` icons consistent with the app.

### Step 8.2 — Pages

**Customer list `app/dashboard/appointments/page.tsx`** (`"use client"`, `useRoleGuard("Customer")`)
- Load `appointmentsApi.getMyAppointments()`; render a list of cards (scheduled time in local time, services joined, status badge, staff name). Each row is a `Link` to `/dashboard/appointments/[id]`. A prominent “Book appointment” button → `/dashboard/appointments/new?businessId=…` (allow business selection, consistent with `/dashboard/explore`). Loading + empty + error states like the customers page.

**Customer detail `app/dashboard/appointments/[id]/page.tsx`** (`"use client"`, `useRoleGuard("Customer")`)
- `useParams()` → id; `appointmentsApi.getAppointment(id)`; render status badge + services summary + `endAt` + note; **Cancel** (and **Reschedule** when past / not completed) CTAs that open `AppointmentModal` in the matching mode. Ownership is enforced server-side (`FORBIDDEN`); surface `error.code` for 404 vs 403.

**Customer booking wizard `app/dashboard/appointments/new/page.tsx`** (`"use client"`, `useRoleGuard("Customer")`)
- `useSearchParams()` → `businessId` (linked from `/dashboard/explore`); `useBookingStore.setBusiness(businessId)` on mount; render `AppointmentModal` in `"book"` mode. If `businessId` is missing, show a prompt to pick a business (link to `/dashboard/explore`).

**Owner calendar `app/dashboard/business/appointments/page.tsx`** (`"use client"`, `useRoleGuard("Business")`)
- Load `appointmentsApi.getBusinessAppointments(params?)` (paged; filter `status`/`from`/`to`/optional `staffId`). Render list/day grouping with status badges; actions `confirm`/`complete`/`no-show`/`cancel`/`reschedule` via `appointmentsApi.businessAction(id, action, data?)` then re-fetch (or invalidate the four groups). “Book on behalf” CTA → `appointmentsApi.createForCustomer({ businessId, serviceIds, scheduledAt, customerId, note? })` (customer picker = `businessesApi.getMyCustomers()`).

**Owner detail `app/dashboard/business/appointments/[id]/page.tsx`** (`"use client"`, `useRoleGuard("Business")`)
- `appointmentsApi.getBusinessAppointment(id)`; render full detail + the same lifecycle actions as the owner calendar.

**Staff calendar `app/dashboard/staff/appointments/page.tsx`** (`"use client"`, `useRoleGuard("Staff")`)
- Resolve tenant: `businessesApi.getStaffBusiness()` → `StaffBusinessResponse` (frontend.md §2; JWT has no `businessId`). Load `appointmentsApi.getStaffAppointments(params?)`. Render assigned appointments with status badges; deliver actions `confirm`/`complete`/`no-show` via `appointmentsApi.staffAction(id, action)` + invalidate.

**Service CRUD `app/dashboard/business/profile/services/page.tsx`** (`"use client"`, `useRoleGuard("Business")`)
- Under the existing Profile shell (match neighbors in `app/dashboard/business/profile/…`). Load `servicesApi.getMyServices()`; list with active/inactive toggle; create/edit via `servicesApi.create` / `servicesApi.update`; soft-delete (deactivate) via `servicesApi.remove`. After each mutation `invalidateCache("services:mine")` (+ `invalidateCache("services:business:{id}")`) and re-fetch. Form: `name` 1–120, `durationMinutes` int 1–1440, `price ≥ 0` — add a `serviceCatalogSchema` to `lib/validations/appointments.ts` if absent (mirrors frontend.md §8).

### Step 8.3 — Role guards + cache invalidation on every page
- Each page calls its `useRoleGuard(...)` from the map above (Admin is already allowed through by `useRoleGuard`).
- Every mutation must invalidate the four groups (§12): `invalidateCache("appointments:mine")`, `invalidateCache("appointments:calendar")`, `invalidateCache("appointments:staff")`, `invalidateCache("availability")`. `useBooking` already does this for customer book/reschedule/cancel; owner/staff actions and service CRUD must invalidate explicitly on the page.

---

## Phase 9 — Frontend tests (`implementation-plan.md` §9; `frontend.md` §14; Jest + RTL)

> Toolchain is ready. Mock `appointmentsApi`/`servicesApi`/`businessesApi` with the existing mock style (`jest.mock("@/lib/api/…", () => ({ …Api: { …: jest.fn() } }))`). Use `@testing-library/react` (`render`, `screen`, `fireEvent`) for components. `react-hot-toast` is already mocked globally in `jest.setup.ts`.

### Step 9.1 — store + wizard-step unit tests (extend the Phase 6/7 suites)
- Cart add/remove multi-service (already covered — keep green).
- `endAt = scheduledAt + Σ durations` (already covered via stubbed `servicesApi.getPublic` — keep green).
- **Wizard step transitions + empty-cart guard:** if you add a `setStep`/`page` helper on `useBookingStore` (or a small local step-state in `AppointmentModal`), assert Step 3/4 cannot be reached with an empty `serviceIds`, and that picking a slot populates `slot` and enables the review step.

### Step 9.2 — Component tests (NEW)
- `features/calendar/__tests__/AppointmentCalendar.test.tsx`: mock `appointmentsApi.getAvailability` to resolve slots; `render` → assert **browser-local-time labels** appear (e.g. the `toLocaleTimeString` fragment), selecting a slot calls `useBookingStore.setSlot` with that slot; assert only the returned slots render (no phantom `IsWorking=false` windows). Empty array → “No availability”.
- `features/appointments/__tests__/ServiceList.test.tsx`: multi-select toggles `useBookingStore`; when `unavailableServiceIds` is provided, those tiles render `disabled` and are not toggleable.

### Step 9.3 — Role-guard redirect integration
- Seed `useAuthStore` with a `Staff` user, mock `useRouter`, render a component guarded by `useRoleGuard("Customer")`, and assert `router.replace` is called with `/dashboard` (Customer only — not `/dashboard/appointments`).

**Run:** `npm test` — all suites green (existing Phase 6/7 + new Phase 9).

---

## Acceptance — Phase 8 & 9
- [ ] All 7 routes from the map exist, are role-guarded, and render loading/empty/error states.
- [ ] `ServiceList`, `StaffSelector`, `AppointmentCalendar`, `AppointmentModal` exist at the specified paths and drive `useBookingStore` (never `persist`).
- [ ] Booking flow matches §10: services → staff (optional) → time → review; `endAt = slot.startAtUtc + Σ durationMinutes`; on success navigate to `/dashboard/appointments/[id]`.
- [ ] Owner/staff lifecycle actions (`confirm|complete|no-show|cancel|reschedule`) and on-behalf booking work; every mutation invalidates the four cache groups (§12).
- [ ] Service CRUD page works; service mutations invalidate `services:mine` (+ `services:business:{id}`).
- [ ] Time handling: ISO-UTC stored, browser-local displayed (§13).
- [ ] New files add zero new ESLint errors (`react/no-unescaped-entities`, `no-explicit-any`, `no-unused-vars`, `no-empty-object-type`).
- [ ] `npm test` green (store + calendar + service-list + role-guard suites).
- [ ] `implementation-plan.md` Phase 8 (`8.1`, `8.2`, `8.3`) and Phase 9 (`9.1`, `9.2`, `9.3`) checkboxes flipped to `[x]`.

## Run per step (mirrors prior phases)
- Step 8.1: after each component, `npx tsc --noEmit`.
- Step 8.2: after each page, `npx tsc --noEmit`.
- Step 8.3: `npx tsc --noEmit` + lint new paths.
- Step 9.1–9.3: `npm test` after each suite.

## End-to-end verification (end of Phase 9)
- [ ] `npx tsc --noEmit` green.
- [ ] `npm test` green.
- [ ] `next build` — keep **your** new files free of errors; the build may still stop on the **pre-existing** unrelated lint errors (see the Phase 6/7 summary) — if so, note it, do not edit unrelated files, and proceed.
- [ ] Flip Phase 8 (`8.1`–`8.3`) and Phase 9 (`9.1`–`9.3`) checkboxes to `[x]` in `implementation-plan.md`; commit: `feat(booking): Phase 8/9 booking UI components, pages, tests`.

> Phase 10 (final backend + frontend verification) is a **separate** prompt. Do not create backend files here. Commit only Phase 8/9 frontend files + the plan doc update; leave the pre-existing `globals.css`/`.eslintrc.json`/`lint-report.txt` residue uncommitted.

End of `phase-8-9-prompt.md`.


