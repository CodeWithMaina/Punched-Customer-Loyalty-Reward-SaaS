# Skill — Booking System Autonomous Implementation

## 1. Competency target
The agent must be able to deliver a **shippable, tested booking feature** that:
- Matches the existing `feature.md`/`backend.md`/`frontend.md` specs **verbatim** where they agree with the repo, and **aligns to the repo** where they conflict (recorded in the conflict tables).
- Leaves the existing .NET 8 / Next.js 14 codebase **clean** (`dotnet build` + `npm run build` green) and **tested** (`dotnet test` + frontend Jest green).
- Respects multi-tenancy, role authorization, and the fail-closed ownership rules in `architecture.md` §5.

## 2. Prerequisites (must be true before the agent starts)
- [ ] `PunchedApi` builds (`dotnet build`).
- [ ] `punched-pwd` builds (`npm run build`).
- [ ] A `feature.md` conflict table exists and is reconciled with the repo.
- [ ] The `appointments`/`services`/`staff_services`/`staff_shifts`/`appointment_status_history` tables are scaffolded in `ApplicationDbContext`.
- [ ] `JwtTokenService` and `UserId` extraction pattern are understood.

## 3. Deliverables (acceptance-bound)
A deliverable is complete only when **all** of these hold:
- D1. New/changed backend files compile and `dotnet test` is green.
- D2. New/changed frontend files lint + build clean (`next lint`, `tsc --noEmit`/`next build`).
- D3. At least one backend test per business rule (overlap→409, EndAt=scheduledAt+Σdurations, multi-tenant scope, status-history write).
- D4. At least one frontend test per user-facing rule (cart math via `useBookingStore`, availability render, role-guard redirect).
- D5. Cache invalidation wired on all mutations (create/reschedule/cancel/status).
- D6. No new package added that isn't already in `PunchedApi.csproj` / `package.json`.
- D7. Each step committed with a `step #` marker; `implementation-plan.md` fully checked.

## 4. Quality bar
- **Consistency:** new EF configs implement `IEntityTypeConfiguration`; new DTOs get a `CreateValidator<T>`; new API routes follow `v1/{controller}` + `[Authorize(Roles=...)]`.
- **Traceability:** every public method documented with a one-line summary; every test method named `<Unit>_When<Scenario>_<Expected>`.
- **Security:** no endpoint accepts `businessId` as identity; staff can only act on their own business; business owner can act on behalf of their business.
- **No drift:** if a doc (e.g. an earlier `frontend.md` chunk) asserts a fact that contradicts the repo, the repo wins and the doc is corrected.

## 5. Definition of Done (the agent may declare success only when all are true)
- [ ] `dotnet build` + `dotnet test` green for backend.
- [ ] `npm run lint` + `npm run build` green for frontend.
- [ ] `implementation-plan.md` 100% checked.
- [ ] `agent-rules.md`/`agent.md`/`skill.md` remain accurate (updated if any convention changed).
- [ ] No `// BLOCKED:` notes remain.

End of `skill.md`.
