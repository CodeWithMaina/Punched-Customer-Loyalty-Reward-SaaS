# Prompt: Phase 10 — Verify Phase 8/9 + Wire Appointments Into the Dashboards

Run this prompt against the repo root `C:\Users\PeterMainaChege\Downloads\LearningProjects\Punched-Customer-Loyalty-Reward-SaaS`. Ground every action in `docs/booking-system/` — `frontend.md` is the authoritative spec for routes/components/state; `implementation-plan.md` is the phase checklist; `stack-and-guidelines.md` is the conventions source of truth. The agent is autonomous: build → test → commit per step; stop with a `// BLOCKED:` note only on a hard blocker.

## Purpose

Close out the booking feature:

1. **Phase 10 verification** — prove the committed Phase 8/9 UI (appointment pages + `components/book/*`) compiles, lints cleanly on the files we touch, and passes the frontend unit tests.
2. **Dashboard integration** — the appointment pages exist but are **not reachable** from any dashboard navigation, and the dashboards show no appointment/home signals. Wire appointments into the customer, business, and staff dashboards.

> **Repository truth (verified at prompt-write time, do NOT re-derive):**
> - HEAD on `main`. Committed Phase 8/9 history: `8a82b512` `feat(booking): appointment pages + booking wizard components` (10 files: the 6 appointment pages + `components/book/{ServiceList,StaffSelector,AppointmentCalendar,index}.tsx`). Backend booking stack + `store/bookingStore.ts` + `lib/api/appointments.ts` + `hooks/useBooking.ts` + validations already committed earlier (`9d3f7b2c` merge, `0c369102`).
> - The **frozen `AppointmentStatus`** type is `draft | pending | confirmed | in_progress | completed | cancelled | no_show` — there is **no `booked`**. Any page comparing/displaying statuses must use these.
> - **Working tree residue that must stay uncommitted:** `PunchedApi/appsettings.json` carries a local DB-credentials edit (username `punched`). This is environment config, **not** part of the feature. Do not commit it; do not revert it unless instructed.
> - Loyalty/analytics docs still say "appointments not implemented" (`docs/analytics/*`). Those are out of scope for this prompt (loyalty-only MVP). **Do not edit them.**

## Phase 10A — Verification gate (do first)

Run each and fix **only what is broken in the booking feature files**, then capture a short checklist in `docs/booking-system/implementation-plan.md` Phase 10.

- [ ] 10.1 Frontend typecheck: `cd punched-pwd && npx tsc --noEmit` — must be clean.
- [ ] 10.2 Frontend lint on the files you own: `npx next lint --file ...` for every file under `app/dashboard/{appointments,business/appointments,staff/appointments}` and `components/book`. **Zero new errors** — allowed: the codebase-wide `<img>` *warning* (`@next/next/no-img-element`). Fix any `react/no-unescaped-entities` (use `&apos;`), `@typescript-eslint/no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps`.
- [ ] 10.3 Frontend tests: `npm test` — all suites green (Phase 6/7 + Phase 9).
- [ ] 10.4 `npm run build` — **expect** it to still stop on the pre-existing unrelated ESLint errors in committed files (`app/page.tsx`, `components/ui/Card.tsx`, etc.). If so, note it, do **not** edit unrelated files, and proceed (the acceptance bar is "your new/touched booking files are error-free").
- [ ] 10.5 Backend compilation sanity (read-only, do not change backend code here): `dotnet build PunchedApi` — confirm the booked-appointment backend still builds. (Phase 4/5 backend tests are already green; you are not adding backend files.)

If any booking file fails 10.1–10.3, fix it, re-run, and commit the fix with message `fix(booking): phase 10 verification fixes`.

## Phase 10B — Wire appointments into the dashboards

### Step 1 — Navigation (frontend.md §3)

Edit `app/dashboard/layout.tsx` (do NOT change the auth guard or the header business resolution):

- **customerNav** (Customer): add after `Explore`/near `Rewards`:
  `{ href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays, exact: false }`
- **businessNav** (Business): add after `Staff`:
  `{ href: "/dashboard/business/appointments", label: "Appointments", icon: CalendarDays, exact: false }`
- **staffSideNav** / **staffBottomNav** (Staff): add after `Activity`:
  `{ href: "/dashboard/staff/appointments", label: "Appointments", icon: CalendarDays, exact: false }`
- Import `CalendarDays` from `lucide-react` (or reuse an already-imported icon). Keep the arrays' existing shape (`href`, `label`, `icon`, `exact`).

**Acceptance:** `npm test` still green; `npx tsc --noEmit` clean; nav objects added for all three roles; no unrelated layout behavior changed.

### Step 2 — Customer dashboard entry point (`app/dashboard/page.tsx`)

Add an **Upcoming Appointments** affordance so the home screen isn't a dead end:
- `appointmentsApi.getMyAppointments()` → render the next upcoming appointment card(s) (status `pending|confirmed` and scheduled in the future), each linking to `/dashboard/appointments/[id]`.
- If none: show a compact "Book an appointment" CTA → `/dashboard/appointments/new` (the wizard already redirects to `/dashboard/explore` when `businessId` is missing — keep that flow).
### Step 3 — Business dashboard (`app/dashboard/business/page.tsx`)

Add a **Today's / Upcoming appointments** panel:
- `appointmentsApi.getBusinessAppointments({ pageSize: 5 })` → list recent/upcoming with a status badge (reuse the frozen status mapping — `draft|pending|confirmed|in_progress|completed|cancelled|no_show`).
- Each links to `/dashboard/business/appointments/[id]`; a header link to `/dashboard/business/appointments` ("View all").
- If the business has no services yet, surface a hint linking to the service CRUD page.

### Step 4 — Staff dashboard (`app/dashboard/staff/page.tsx`)

Add an **Assigned appointments** panel:
- Resolve tenant via `businessesApi.getStaffBusiness()` first (JWT has no `businessId` — frontend.md §2).
- `appointmentsApi.getStaffAppointments({ pageSize: 5 })` → upcoming list with the delivery actions staff may perform (`confirm` | `complete` | `no-show` via `appointmentsApi.staffAction(id, action)`), re-fetching after each action.
- Each links to `/dashboard/staff/appointments`. Handle the unlinked/no-tenant state gracefully.

### Step 5 — Role guards + state consistency

- Confirm every new/edited dashboard section sits under the existing per-role `useRoleGuard` already present on each dashboard page (do not re-add duplicate guards).
- **Cache discipline (frontend.md §12):** after any mutation you add here (staff confirm/complete/no-show), call `invalidateCache("appointments:mine")`, `invalidateCache("appointments:calendar")`, `invalidateCache("appointments:staff")`, `invalidateCache("availability")` before re-fetching. If you merely render (no mutations), rely on `cachedFetch` TTLs.

**Acceptance (Steps 2–5):** all three dashboards render appointment/home entries that deeply link into the Phase 8 pages; staff actions invalidate the four cache groups; zero new ESLint errors in the files you touch; `npx tsc --noEmit` clean; `npm test` green.

## Commit

Commit the Phase 10B dashboard/navigation changes (and any 10A fixes) as:
`feat(booking): wire appointments into customer/business/staff dashboards`

Do **not** commit `PunchedApi/appsettings.json`. Leave unrelated pre-existing lint-report/`.eslintrc.json`/`globals.css` residue uncommitted as in prior phases.

## Final report

Update `docs/booking-system/implementation-plan.md` Phase 10 checkboxes to `[x]` as each passes, and record the `next build` outcome (expected: pre-existing unrelated lint errors only). End with a summary: commits made, which nav/dashboard files changed, verification results, and any `// BLOCKED:` notes.

> **Out of scope:** backend changes, notification events, availability timezone math, loyalty analytics docs, PWA/SSE. Those are separate prompts.

End of `phase-10-verify-integrate-prompt.md`.