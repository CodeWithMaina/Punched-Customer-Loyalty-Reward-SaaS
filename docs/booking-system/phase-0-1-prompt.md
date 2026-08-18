# Prompt: Implement Phase 0 & Phase 1 (Booking System)

Run this prompt against the repo root `C:\Users\PeterMainaChege\Downloads\LearningProjects\Punched-Customer-Loyalty-Reward-SaaS`. Ground every action in `docs/booking-system/` (specs + `implementation-plan.md` + `stack-and-guidelines.md`). The agent is autonomous: build → test → commit per step; stop with a `// BLOCKED:` note only on a hard blocker.

## Verified preconditions (DO NOT re-derive — these are true now)
- **Backend:** .NET 8 (`net8.0`), Npgsql EF Core 8.0.11, FluentValidation 11, AutoMapper 12, **no MediatR**. Project: `PunchedApi/PunchedApi.csproj`.
- **Appointments scaffold ALREADY EXISTS.** `Domain/Entities/Appointment.cs` = `{ BusinessId, CustomerId, StaffUserId?, ScheduledAt, Status(="booked") }` — **`EndAt` does NOT exist.**
- `Infrastructure/Data/Configurations/AppointmentFoundationConfiguration.cs` configures `appointments`, `appointment_status_history`, `services`, `staff_services`, `staff_shifts` (check constraints on `start_hour`/`end_hour` 0–23). Seeding migration: `20260807190729_CompleteAnalyticsDataInfrastructure`.
- **Confirmed absent right now** (this is why Phase 1 is needed): no `end_at`, no `appointment_resources`.
- `Infrastructure/Data/ApplicationDbContext.cs` exposes explicit `DbSet<T>` for `Appointment`, `AppointmentStatusHistory`, `ServiceCatalogItem`, `StaffShift`, `StaffServiceAssignment`; calls `modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly)` — so new `IEntityTypeConfiguration<>` classes are auto-discovered.
- **Auth:** JWT has **no `businessId` claim**; identity key is `UserId`; roles are `Customer`/`Business`/`Staff`/`Admin`. (`JwtTokenService`, `punched-pwd/lib/api/client.ts`.)
- **Frontend:** Next 14.2 / TS 5.5 / Tailwind 3.4 + axios `apiClient` + `cachedFetch` + Zustand + RHF 7.52/Zod 3.23 + react-hot-toast. (`punched-pwd/package.json`).
- **Toolchain present in this env:** .NET SDK 8.0.424, npm 11.19.0, EF CLI 10.0.6 (compatible with the EF 8 NuGet packages) — builds/migrations are runnable here.

---
## Phase 0 — Scaffold & baseline  (`implementation-plan.md` §0)
- [ ] **0.1** Establish integration baseline & create feature branch `booking/phase-0-1`.
  - Integration base is normally `main`; if `git rev-parse --abbrev-ref HEAD` ≠ `main`, confirm the intended base first. Ensure a clean tree (`git status --short` → 0; stash/commit in-progress work — this env's tree is currently dirty on `chore/clean-repo-files`). Then: `git checkout <base> && git pull && git checkout -b booking/phase-0-1`
- [ ] **0.2** Baseline build green on current `main` (no code yet).
  - `dotnet build PunchedApi/PunchedApi.csproj`  → must succeed.
  - `npm run build --prefix punched-pwd`  → must succeed.
- [ ] **0.3** Confirm scaffold present (read-only).
  - Confirm files exist: `Domain/Entities/{Appointment,AppointmentStatusHistory,ServiceCatalogItem,StaffShift,StaffServiceAssignment}.cs`.
  - Confirm `Configurations/AppointmentFoundationConfiguration.cs` maps `appointments`/`services`/`staff_services`/`staff_shifts`.
  - Confirm `ApplicationDbContext` has `DbSet<Appointment>`, `DbSet<ServiceCatalogItem>`, `DbSet<StaffShift>`, `DbSet<StaffServiceAssignment>` and calls `ApplyConfigurationsFromAssembly`.
  - **Acceptance:** all confirmed; build green on main.

---
## Phase 1 — Backend domain deltas (`implementation-plan.md` §1; `backend.md` §4 §5 §6)
> This phase does NOT recreate existing entities. It **adds `EndAt` to `Appointment`** and **introduces the `AppointmentResource` snapshot join** (+ config + DbSet + migration). Table is empty → a NOT NULL `end_at` is safe.

### Step 1.1 — Edit `Domain/Entities/Appointment.cs`
Add `using System.Collections.Generic;` and, inside the class, insert after `ScheduledAt`:
```csharp
    [Required]
    public DateTime EndAt { get; set; }
```
and after `Status` add the navigation (forward-declared; used by the config in 1.2):
```csharp
    public ICollection<AppointmentResource> Resources { get; set; } = new List<AppointmentResource>();
```
- **Acceptance:** file still compiles alongside the rest (check in 1.6).

### Step 1.2 — Edit `Infrastructure/Data/Configurations/AppointmentFoundationConfiguration.cs`
In `AppointmentConfiguration.Configure`, after the `ScheduledAt` `.HasColumnName("scheduled_at")` line add:
```csharp
        builder.Property(x => x.EndAt).HasColumnName("end_at");
```
and after the two `HasIndex` lines add the navigation:
```csharp
        builder.HasMany(x => x.Resources)
            .WithOne()
            .HasForeignKey(r => r.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);
```
### Step 1.3 — Create `Domain/Entities/AppointmentResource.cs` (NEW)
```csharp
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Immutable snapshot of a service at the moment an appointment is booked,
/// so later catalog edits cannot change a confirmed appointment's duration/price.
/// </summary>
public class AppointmentResource : BaseEntity
{
    [Required] public Guid AppointmentId { get; set; }
    [Required] public Guid ServiceCatalogItemId { get; set; }
    [Required] [MaxLength(120)] public string Name { get; set; } = string.Empty;
    [Required] public int DurationMinutes { get; set; }
    [Required] public decimal Price { get; set; }
    public int SortOrder { get; set; } = 0;
}
```

### Step 1.4 — Create `Infrastructure/Data/Configurations/AppointmentResourceConfiguration.cs` (NEW)
```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Configurations;

public class AppointmentResourceConfiguration : IEntityTypeConfiguration<AppointmentResource>
{
    public void Configure(EntityTypeBuilder<AppointmentResource> builder)
    {
        builder.ToTable("appointment_resources");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.AppointmentId).HasColumnName("appointment_id");
        builder.Property(x => x.ServiceCatalogItemId).HasColumnName("service_catalog_item_id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(120);
        builder.Property(x => x.DurationMinutes).HasColumnName("duration_minutes");
        builder.Property(x => x.Price).HasColumnName("price").HasPrecision(10, 2);
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(x => x.AppointmentId);
        builder.HasIndex(x => x.ServiceCatalogItemId);

        builder.HasOne<Appointment>()
            .WithMany(a => a.Resources)
            .HasForeignKey(x => x.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### Step 1.5 — Register the new `DbSet` (`ApplicationDbContext.cs`)
Add right after the `AppointmentStatusHistory` DbSet (line 39):
```csharp
    public DbSet<AppointmentResource> AppointmentResources => Set<AppointmentResource>();
```
> `ApplyConfigurationsFromAssembly` (already called in `OnModelCreating`) auto-discovers `AppointmentResourceConfiguration` — **no** manual invocation needed.

### Step 1.6 — Migration + build verification
- `dotnet ef migrations add AddAppointmentEndAtAndAppointmentResources` (run from `PunchedApi/`).
- Inspect the generated migration: it must touch **only** `appointments` (`end_at`) and create `appointment_resources`. If EF tries to rename/drop anything else, abort — investigate.
- Apply to a local dev DB to validate shape: `dotnet ef database update` (then optionally roll back).
- **Acceptance build:** `dotnet build PunchedApi/PunchedApi.csproj` succeeds.

### Acceptance — Phase 1
- [ ] `Appointment.EndAt` (non-null) + `Resources` nav present.
- [ ] `AppointmentResource` entity + `AppointmentResourceConfiguration` → `appointment_resources` table with columns `id, appointment_id, service_catalog_item_id, name, duration_minutes, price, sort_order, created_at`.
- [ ] `ApplicationDbContext` exposes `DbSet<AppointmentResource>` and `ApplyConfigurationsFromAssembly` discovers the config.
- [ ] Migration adds `appointments.end_at` (NOT NULL, empty table → safe) + new `appointment_resources` table and **nothing else**.
- [ ] `dotnet build` green; `git status` shows only the 4 intended file changes (2 edits + 2 new) + the migration + Designer.

End of `phase-0-1-prompt.md`.

