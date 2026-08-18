# Agent Rules (Booking System Implementation)

These are hard constraints for the autonomous agent executing this feature.

## 1. Working discipline
- **Stay in `docs/booking-system/`** for spec + these meta docs. Implementation lives in `PunchedApi/**` (backend) and `punched-pwd/**` (frontend).
- **One concept per edit.** Each `editor` call changes one file at a coherent boundary (one class, one method, one page). Prefer many small edits over one large edit.
- **Read before edit.** Never edit a file you haven't fully read (especially `Program.cs`, `*Controller.cs`, existing DTOs, `ApplicationDbContext`, `Middleware.cs`).
- **Reuse signatures.** When extending an existing `*Api`, service interface, or store, match the existing method-naming and return-type conventions exactly.

## 2. Correctness gates (every step)
- **Backend:** `dotnet build PunchApi` compiles; `dotnet test --filter "FullyQualified~Appointment"` passes.
- **Frontend:** `npm run lint` clean; `npm run build` succeeds (or `next lint` + typecheck `tsc --noEmit`).
- **Data integrity:** every `AppointmentController` mutation maps to a single `UnitOfWork` scope; no raw `DbContext.SaveChanges` outside a service.
- **Auth:** no mutation endpoint accepts `businessId` as an identity source — it is derived from the authenticated user.

## 3. Test discipline
- Run tests locally before declaring a step done; never leave a failing test in the tree.
- Backend tests: seed a fresh in-memory Sqlite database per test (existing fixture pattern), assert business rules (overlap → 409, EndAt math, status-history insertion, multi-tenant scoping).
- Frontend tests: mock `*Api` modules (same style as existing `businessesApi` mock), assert cart math + guard redirects.

## 4. Git / change hygiene
- Branch from `main`, one branch per phase (`booking/backend-services`, `booking/frontend-wizard`, etc.).
- Commit messages: `<area>: <verb> <what>  (#<tracker-step>)` e.g. `feat(appointment): add overlap check with 409 (#3)`.
- Do not commit `node_modules`/bin/obj. `.gitignore` already excludes them.

## 5. Conflict resolution (agent)
- If a doc contradicts the repo (e.g. "recurring weekly shifts", ".NET 9", `/api/v1`, "BusinessOwner"): **believe the repo**, record the correction in that doc's conflict table, and continue.
- When in doubt about an ownership/security rule, default to the **most restrictive** interpretation (fail closed).

## 6. Stop conditions
- **Stop and ask** if: the scaffold the feature depends on is missing (no existing `AppointmentController` to extend, no `ApplicationDbContext` entry), a hard platform rule conflicts with the spec, or a step's acceptance criteria cannot be met without changing an existing, stable file outside the feature boundary.
- **Always complete** the `implementation-plan.md` checklist before declaring the feature done.

End of `agent-rules.md`.
