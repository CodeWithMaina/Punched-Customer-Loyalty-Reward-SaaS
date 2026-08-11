using Microsoft.EntityFrameworkCore;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class ReferralSeedStep : ISeedStep
{
    public string Name => "Referrals";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var linksCreated = 0;
        var referralsCreated = 0;

        foreach (var businessDef in context.Scenario.Businesses)
        {
            var business = context.BusinessesByKey[businessDef.Key];
            var referrers = businessDef.CustomerUserKeys.Take(3).ToArray();
            var refereePool = businessDef.CustomerUserKeys.Skip(3).ToArray();

            for (var i = 0; i < referrers.Length; i++)
            {
                var referrer = context.UsersByKey[referrers[i]];
                var referees = refereePool.Skip(i * 2).Take(2).ToArray();
                var link = await context.Db.ReferralLinks.FirstOrDefaultAsync(
                    rl => rl.ReferrerId == referrer.Id && rl.BusinessId == business.Id,
                    cancellationToken);

                if (link == null)
                {
                    link = new Domain.Entities.ReferralLink
                    {
                        Id = DeterministicSeed.GuidFor("referral-link", $"{businessDef.Key}:{referrer.Id}"),
                        CreatedAt = business.CreatedAt.AddDays(30 + i),
                    };
                    context.Db.ReferralLinks.Add(link);
                    linksCreated++;
                }

                link.ReferrerId = referrer.Id;
                link.BusinessId = business.Id;
                link.Code = DeterministicSeed.TokenFor("ref-code", $"{businessDef.Key}:{i}").Substring(0, 8).ToUpperInvariant();
                link.IsActive = true;

                var successful = 0;

                for (var j = 0; j < referees.Length; j++)
                {
                    var referee = context.UsersByKey[referees[j]];
                    if (referee.Id == referrer.Id)
                    {
                        continue;
                    }

                    var referral = await context.Db.Referrals.FirstOrDefaultAsync(
                        r => r.RefereeId == referee.Id && r.BusinessId == business.Id,
                        cancellationToken);

                    if (referral == null)
                    {
                        referral = new Domain.Entities.Referral
                        {
                            Id = DeterministicSeed.GuidFor("referral", $"{businessDef.Key}:{referrer.Id}:{referee.Id}"),
                            CreatedAt = business.CreatedAt.AddDays(35 + j),
                        };
                        context.Db.Referrals.Add(referral);
                        referralsCreated++;
                    }

                    var status = j switch
                    {
                        0 => Domain.Entities.ReferralStatus.Rewarded,
                        1 => Domain.Entities.ReferralStatus.Qualified,
                        2 => Domain.Entities.ReferralStatus.Activated,
                        3 => Domain.Entities.ReferralStatus.Pending,
                        _ => Domain.Entities.ReferralStatus.Expired,
                    };

                    referral.ReferralLinkId = link.Id;
                    referral.ReferrerId = referrer.Id;
                    referral.RefereeId = referee.Id;
                    referral.BusinessId = business.Id;
                    referral.Status = status;
                    referral.ActivatedAt = status is Domain.Entities.ReferralStatus.Activated or Domain.Entities.ReferralStatus.Qualified or Domain.Entities.ReferralStatus.Rewarded
                        ? referral.CreatedAt.AddDays(1)
                        : null;
                    referral.QualifiedAt = status is Domain.Entities.ReferralStatus.Qualified or Domain.Entities.ReferralStatus.Rewarded
                        ? referral.CreatedAt.AddDays(6)
                        : null;
                    referral.RewardedAt = status == Domain.Entities.ReferralStatus.Rewarded
                        ? referral.CreatedAt.AddDays(8)
                        : null;
                    referral.ExpiresAt = status == Domain.Entities.ReferralStatus.Expired
                        ? referral.CreatedAt.AddDays(-1)
                        : referral.CreatedAt.AddDays(40);

                    if (status is Domain.Entities.ReferralStatus.Qualified or Domain.Entities.ReferralStatus.Rewarded)
                    {
                        successful++;
                    }
                }

                link.SuccessfulReferrals = successful;
            }
        }

        await context.Db.SaveChangesAsync(cancellationToken);
        context.Report.Counts["ReferralLinksCreated"] = linksCreated;
        context.Report.Counts["ReferralsCreated"] = referralsCreated;
    }
}
