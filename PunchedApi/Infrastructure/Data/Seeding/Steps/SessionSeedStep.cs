using Microsoft.EntityFrameworkCore;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class SessionSeedStep : ISeedStep
{
    public string Name => "Sessions";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var authByEmail = await context.Db.UserAuths.ToDictionaryAsync(a => a.Email, cancellationToken);

        var sessionUsers = new[]
        {
            "owner-1", "owner-2", "staff-1-manager", "staff-2-manager", "customer-b1-01", "customer-b2-01"
        };

        var created = 0;

        foreach (var userKey in sessionUsers.Where(context.UsersByKey.ContainsKey))
        {
            var user = context.UsersByKey[userKey];
            if (!authByEmail.TryGetValue(user.Email, out var auth))
            {
                continue;
            }

            var activeId = DeterministicSeed.GuidFor("refresh", $"{userKey}:active");
            var active = await context.Db.RefreshTokens.FirstOrDefaultAsync(t => t.Id == activeId, cancellationToken);
            if (active == null)
            {
                active = new Domain.Entities.RefreshToken
                {
                    Id = activeId,
                    CreatedAt = DeterministicSeed.AnchorUtc.AddDays(-2),
                };
                context.Db.RefreshTokens.Add(active);
                created++;
            }

            active.UserAuthId = auth.Id;
            active.Token = DeterministicSeed.TokenFor("refresh", $"{userKey}:active");
            active.ExpiresAt = DeterministicSeed.AnchorUtc.AddDays(28);
            active.IsRevoked = false;
            active.RevokedAt = null;

            var revokedId = DeterministicSeed.GuidFor("refresh", $"{userKey}:revoked");
            var revoked = await context.Db.RefreshTokens.FirstOrDefaultAsync(t => t.Id == revokedId, cancellationToken);
            if (revoked == null)
            {
                revoked = new Domain.Entities.RefreshToken
                {
                    Id = revokedId,
                    CreatedAt = DeterministicSeed.AnchorUtc.AddDays(-20),
                };
                context.Db.RefreshTokens.Add(revoked);
                created++;
            }

            revoked.UserAuthId = auth.Id;
            revoked.Token = DeterministicSeed.TokenFor("refresh", $"{userKey}:revoked");
            revoked.ExpiresAt = DeterministicSeed.AnchorUtc.AddDays(-5);
            revoked.IsRevoked = true;
            revoked.RevokedAt = DeterministicSeed.AnchorUtc.AddDays(-10);
        }

        await context.Db.SaveChangesAsync(cancellationToken);
        context.Report.Counts["RefreshTokensCreated"] = created;
    }
}
