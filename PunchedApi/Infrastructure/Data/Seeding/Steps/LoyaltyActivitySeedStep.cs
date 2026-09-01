using Microsoft.EntityFrameworkCore;
using PunchedApi.Application.Settings;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class LoyaltyActivitySeedStep : ISeedStep
{
    public string Name => "LoyaltyActivity";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var cardsCreated = 0;
        var stampsCreated = 0;
        var qrCreated = 0;
        var redemptionsCreated = 0;

        foreach (var businessDef in context.Scenario.Businesses)
        {
            var business = context.BusinessesByKey[businessDef.Key];
            var program = context.ActiveProgramsByBusiness[business.Id];

            var stampAwarders = new List<Guid> { context.UsersByKey[businessDef.OwnerUserKey].Id };
            stampAwarders.AddRange(businessDef.StaffUserKeys.Select(k => context.UsersByKey[k].Id));

            for (var i = 0; i < businessDef.CustomerUserKeys.Length; i++)
            {
                var customer = context.UsersByKey[businessDef.CustomerUserKeys[i]];

                var card = await context.Db.LoyaltyCards
                    .FirstOrDefaultAsync(c => c.CustomerId == customer.Id && c.BusinessId == business.Id, cancellationToken);

                var enrolledAt = business.CreatedAt.AddDays(3 + (i * 2));
                var baseLifetime = businessDef.IsFocusBusiness ? 18 + (i % 14) : 6 + (i % 7);
                var rewardHold = i % 5 == 0 ? 1 : 0;
                var completedCycles = Math.Max(0, (baseLifetime / program.StampsRequired) - rewardHold);
                var totalStamps = rewardHold == 1
                    ? program.StampsRequired
                    : baseLifetime - (completedCycles * program.StampsRequired);
                var lifetimeStamps = (completedCycles * program.StampsRequired) + totalStamps;
                var lastStampAt = enrolledAt.AddDays(Math.Max(1, lifetimeStamps) * (businessDef.IsFocusBusiness ? 3 : 6));

                if (card == null)
                {
                    card = new Domain.Entities.LoyaltyCard
                    {
                        Id = DeterministicSeed.GuidFor("card", $"{businessDef.Key}:{customer.Id}"),
                        CreatedAt = enrolledAt,
                    };
                    context.Db.LoyaltyCards.Add(card);
                    cardsCreated++;
                }

                card.CustomerId = customer.Id;
                card.BusinessId = business.Id;
                card.ProgramId = program.Id;
                card.EnrolledAt = enrolledAt;
                card.TotalStamps = totalStamps;
                card.LifetimeStamps = lifetimeStamps;
                card.TotalRedemptions = completedCycles;
                card.LastStampAt = lifetimeStamps > 0 ? lastStampAt : null;
                card.RewardExpiresAt = rewardHold == 1
                    ? lastStampAt.AddHours(program.RewardExpirationHours)
                    : null;

                for (var stampNo = 1; stampNo <= lifetimeStamps; stampNo++)
                {
                    var stampedAt = enrolledAt.AddDays(stampNo * (businessDef.IsFocusBusiness ? 3 : 6));
                    var qrId = DeterministicSeed.GuidFor("qr", $"{card.Id}:{stampNo}");

                    var qr = await context.Db.QrTokens.FirstOrDefaultAsync(q => q.Id == qrId, cancellationToken);
                    if (qr == null)
                    {
                        qr = new Domain.Entities.QrToken
                        {
                            Id = qrId,
                            CreatedAt = stampedAt.AddSeconds(-15),
                        };
                        context.Db.QrTokens.Add(qr);
                        qrCreated++;
                    }

                    qr.CustomerId = customer.Id;
                    qr.BusinessId = business.Id;
                    qr.TokenHash = DeterministicSeed.TokenFor("qr", $"{card.Id}:{stampNo}");
                    qr.ExpiresAt = stampedAt.AddSeconds(45);
                    qr.IsUsed = true;

                    var stamp = await context.Db.Stamps.FirstOrDefaultAsync(s => s.QrTokenId == qrId, cancellationToken);
                    if (stamp == null)
                    {
                        stamp = new Domain.Entities.Stamp
                        {
                            Id = DeterministicSeed.GuidFor("stamp", $"{card.Id}:{stampNo}"),
                            CreatedAt = stampedAt,
                        };
                        context.Db.Stamps.Add(stamp);
                        stampsCreated++;
                    }

                    stamp.CardId = card.Id;
                    stamp.StampNumber = (short)stampNo;
                    stamp.StampedAt = stampedAt;
                    stamp.QrTokenId = qrId;
                    stamp.AwardedByUserId = stampAwarders[stampNo % stampAwarders.Count];
                }

                for (var redemptionNo = 1; redemptionNo <= completedCycles; redemptionNo++)
                {
                    var redemptionId = DeterministicSeed.GuidFor("redemption", $"{card.Id}:{redemptionNo}");
                    var redeemedAt = enrolledAt.AddDays((redemptionNo * program.StampsRequired * (businessDef.IsFocusBusiness ? 3 : 6)) + 1);

                    var redemption = await context.Db.Redemptions.FirstOrDefaultAsync(r => r.Id == redemptionId, cancellationToken);
                    if (redemption == null)
                    {
                        redemption = new Domain.Entities.Redemption
                        {
                            Id = redemptionId,
                            CreatedAt = redeemedAt,
                        };
                        context.Db.Redemptions.Add(redemption);
                        redemptionsCreated++;
                    }

                    redemption.CardId = card.Id;
                    redemption.BusinessId = business.Id;
                    redemption.RewardValue = program.RewardValue;
                    redemption.Status = RedemptionStatus.Fulfilled;
                    redemption.PayoutStatus = "completed";
                    redemption.RedeemedAt = redeemedAt;
                    redemption.PaidAt = redeemedAt.AddMinutes(15);
                    redemption.MpesaRef = $"MPESA-{businessDef.Key.ToUpperInvariant()}-{redemptionNo:D4}";
                }
            }
        }

        await context.Db.SaveChangesAsync(cancellationToken);

        if (context.Report.Mode == SeedExecutionMode.AppendData)
        {
            var appendStats = await AppendAdditionalActivityAsync(context, cancellationToken);
            stampsCreated += appendStats.Stamps;
            qrCreated += appendStats.QrTokens;
            redemptionsCreated += appendStats.Redemptions;
        }

        context.Report.Counts["LoyaltyCardsCreated"] = cardsCreated;
        context.Report.Counts["QrTokensCreated"] = qrCreated;
        context.Report.Counts["StampsCreated"] = stampsCreated;
        context.Report.Counts["RedemptionsCreated"] = redemptionsCreated;
    }

    private static async Task<(int Stamps, int QrTokens, int Redemptions)> AppendAdditionalActivityAsync(
        SeedExecutionContext context,
        CancellationToken cancellationToken)
    {
        var cards = await context.Db.LoyaltyCards
            .Include(c => c.Program)
            .Where(c => context.BusinessesByKey.Values.Select(b => b.Id).Contains(c.BusinessId))
            .OrderBy(c => c.LastStampAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        var createdStamps = 0;
        var createdQr = 0;
        var createdRedemptions = 0;
        var nonce = DateTime.UtcNow.ToString("yyyyMMddHHmmss");

        foreach (var card in cards)
        {
            var extraStamps = context.Random.NextInt(1, 4);
            var lastAt = card.LastStampAt ?? card.EnrolledAt;

            for (var i = 0; i < extraStamps; i++)
            {
                var stampAt = lastAt.AddDays(i + 1);
                var qr = new Domain.Entities.QrToken
                {
                    Id = Guid.NewGuid(),
                    CustomerId = card.CustomerId,
                    BusinessId = card.BusinessId,
                    TokenHash = DeterministicSeed.TokenFor("append-qr", $"{card.Id}:{nonce}:{i}"),
                    ExpiresAt = stampAt.AddSeconds(45),
                    IsUsed = true,
                    CreatedAt = stampAt.AddSeconds(-20),
                };
                context.Db.QrTokens.Add(qr);
                createdQr++;

                card.TotalStamps++;
                card.LifetimeStamps++;
                card.LastStampAt = stampAt;

                var stamp = new Domain.Entities.Stamp
                {
                    Id = Guid.NewGuid(),
                    CardId = card.Id,
                    StampNumber = (short)card.LifetimeStamps,
                    StampedAt = stampAt,
                    QrTokenId = qr.Id,
                    AwardedByUserId = null,
                    CreatedAt = stampAt,
                };
                context.Db.Stamps.Add(stamp);
                createdStamps++;
            }

            if (card.TotalStamps >= card.Program.StampsRequired)
            {
                var redemption = new Domain.Entities.Redemption
                {
                    Id = Guid.NewGuid(),
                    CardId = card.Id,
                    BusinessId = card.BusinessId,
                    RewardValue = card.Program.RewardValue,
                    Status = RedemptionStatus.Fulfilled,
                    PayoutStatus = "completed",
                    RedeemedAt = card.LastStampAt ?? DateTime.UtcNow,
                    PaidAt = card.LastStampAt?.AddMinutes(10),
                    MpesaRef = $"APPEND-{nonce}-{context.Random.NextInt(1000, 9999)}",
                    CreatedAt = card.LastStampAt ?? DateTime.UtcNow,
                };
                context.Db.Redemptions.Add(redemption);
                createdRedemptions++;

                card.TotalStamps = 0;
                card.TotalRedemptions++;
            }
        }

        await context.Db.SaveChangesAsync(cancellationToken);
        return (createdStamps, createdQr, createdRedemptions);
    }
}
