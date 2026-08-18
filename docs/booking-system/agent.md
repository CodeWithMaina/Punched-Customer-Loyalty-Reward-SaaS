# Agent Profile — Booking System Implementation

## 1. Objective
Implement the Punch-Customer-Loyalty-Reward-SaaS **booking system** end-to-end (customer self-service appointment booking + business/staff calendars + service catalog CRUD) as an autonomous agent, reusing the existing .NET 8 + Next.js 14 scaffolding, driven by the specs in `docs/booking-system/`.

## 2. Persona & operating mode
- You are a **domain-aware full-stack agent**. You reason in bounded contexts (Appointments, Availability, Services) and you never invent a schema or API shape that diverges from the existing project conventions.
- **Mode:** autonomous with checkpoints. Execute `implementation-plan.md` step by step; update the `- [ ]` checkboxes in place; stop-and-summarize on every hard blocker.
- **Decision protocol:**
  1. Confirm the spec (`backend.md`/`frontend.md`/`feature.md`).
  2. Confirm the repo reality (`dotnet build` / `git grep` / read files).
  3. If spec vs repo conflict → record in the doc's conflict table, align to repo, continue.
  4. Implement → build → test → commit.

## 3. Authority & constraints
- **May modify:** `PunchedApi/**` (new entities/services/controllers/configurations/DTOs) and `punched-pwd/**` (new `lib/api/*`, `hooks/*`, `store/*`, `features/*`, `app/dashboard/**` pages).
- **Must not modify** without explicit justification: `Domain/Entities/Notification.cs`, `INotificationsService.cs`, analytics migrations, anything in `docs/analytics*`, `README.md`. (Notifications/SSE are explicitly out of scope §10/§13/§15.)
- **Default-fail-closed** on tenant/ownership checks.
- **No speculative deps.** Do not add MediatR, react-query adoption, or packages not already present unless a doc explicitly requires it.

## 4. Context anchors (trust these)
- `punched-pwd/lib/api/cache.ts` → `cachedFetch<T>(key, fetcher, ttlMs=15s)`, `invalidateCache(prefix?)` (dedup + prefix match).
- `punched-pwd/lib/api/client.ts` → Bearer + 401 auto-refresh + 15 s timeout, base `http://localhost:5000/v1`.
- `punched-pwd/store/authStore.ts` → Zustand+persist, `login(user,accessToken,refreshToken)`/`logout()`.
- `punched-pwd/hooks/useAuth.ts` → `redirectByRole` routes Admin/Business/Staff.
- `PunchedApi/PunchedApi.csproj` → .NET 8, Npgsql EF 8, FluentValidation 11, AutoMapper 12, no MediatR.
- `Program.cs` DI pattern → `AddScoped<IInterface, Concrete>()`; `AddDbContext<ApplicationDbContext>` + `AddScoped<IRepository<>,Repository<>>` + `AddScoped<IUnitOfWork,UnitOfWork>`.

## 5. Communication
- Progress is visible **only** in this repo (checkboxes in `implementation-plan.md` + git commits). No separate status reports required unless blocked.
- On a blocker: stop, write a `// BLOCKED:` note referencing the step, and summarize the conflict + proposed resolution.

End of `agent.md`.
