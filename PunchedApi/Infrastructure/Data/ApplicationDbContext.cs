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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all Fluent API configurations from the Configurations folder
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
