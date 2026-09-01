using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data;

/// <summary>
/// Entity Framework Core DbContext for the Punched platform.
/// Configures all 8 core entities + RefreshToken with Fluent API.
/// Uses PostgreSQL (Neon) as the database provider.
/// </summary>
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    // ── DbSets ──────────────────────────────────────────────
    public DbSet<UserAuth> UserAuths => Set<UserAuth>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Business> Businesses => Set<Business>();
    public DbSet<LoyaltyProgram> LoyaltyPrograms => Set<LoyaltyProgram>();
    public DbSet<LoyaltyCard> LoyaltyCards => Set<LoyaltyCard>();
    public DbSet<QrToken> QrTokens => Set<QrToken>();
    public DbSet<Stamp> Stamps => Set<Stamp>();
    public DbSet<Redemption> Redemptions => Set<Redemption>();
    public DbSet<ReferralProgram> ReferralPrograms => Set<ReferralProgram>();
    public DbSet<ReferralLink> ReferralLinks => Set<ReferralLink>();
    public DbSet<Referral> Referrals => Set<Referral>();
    public DbSet<BusinessDailyAnalytics> BusinessDailyAnalytics => Set<BusinessDailyAnalytics>();
    public DbSet<StaffDailyAnalytics> StaffDailyAnalytics => Set<StaffDailyAnalytics>();
    public DbSet<StaffShift> StaffShifts => Set<StaffShift>();
    public DbSet<NotificationLog> NotificationLogs => Set<NotificationLog>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ApiEventLog> ApiEventLogs => Set<ApiEventLog>();
    public DbSet<LoyaltyProgramHistory> LoyaltyProgramHistory => Set<LoyaltyProgramHistory>();
    public DbSet<CustomerSegment> CustomerSegments => Set<CustomerSegment>();
    public DbSet<Insight> Insights => Set<Insight>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentStatusHistory> AppointmentStatusHistory => Set<AppointmentStatusHistory>();
    public DbSet<AppointmentResource> AppointmentResources => Set<AppointmentResource>();
    public DbSet<ServiceCatalogItem> ServiceCatalogItems => Set<ServiceCatalogItem>();
    public DbSet<StaffServiceAssignment> StaffServiceAssignments => Set<StaffServiceAssignment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<StaffInvitation> StaffInvitations => Set<StaffInvitation>();
    public DbSet<Module> Modules => Set<Module>();
    public DbSet<SubscriptionPlan> SubscriptionPlans => Set<SubscriptionPlan>();
    public DbSet<PlanModule> PlanModules => Set<PlanModule>();
    public DbSet<BusinessSubscription> BusinessSubscriptions => Set<BusinessSubscription>();
    public DbSet<BusinessModule> BusinessModules => Set<BusinessModule>();
    public DbSet<StampAdjustment> StampAdjustments => Set<StampAdjustment>();
    public DbSet<IdempotencyKey> IdempotencyKeys => Set<IdempotencyKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all Fluent API configurations from the Configurations folder
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Global filters ensure soft-deleted records are excluded from normal app flows.
        modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
        modelBuilder.Entity<Business>().HasQueryFilter(b => !b.IsDeleted);
    }
}
