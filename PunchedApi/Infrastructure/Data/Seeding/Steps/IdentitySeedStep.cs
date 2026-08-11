using Microsoft.EntityFrameworkCore;

namespace PunchedApi.Infrastructure.Data.Seeding.Steps;

public sealed class IdentitySeedStep : ISeedStep
{
    public string Name => "Identity";

    public async Task ExecuteAsync(SeedExecutionContext context, CancellationToken cancellationToken)
    {
        var definitions = context.Scenario.Users;
        var emails = definitions.Select(d => d.Email.Trim().ToLowerInvariant()).Distinct().ToList();

        var authByEmail = await context.Db.UserAuths
            .Where(a => emails.Contains(a.Email))
            .ToDictionaryAsync(a => a.Email, cancellationToken);

        var usersByEmail = await context.Db.Users
            .Where(u => emails.Contains(u.Email))
            .ToDictionaryAsync(u => u.Email, cancellationToken);

        var authCreated = 0;
        var usersCreated = 0;

        foreach (var def in definitions)
        {
            var email = def.Email.Trim().ToLowerInvariant();

            if (!authByEmail.TryGetValue(email, out var auth))
            {
                auth = new Domain.Entities.UserAuth
                {
                    Id = DeterministicSeed.GuidFor("user-auth", def.Key),
                    Email = email,
                    PasswordHash = DeterministicSeed.HashPassword(def.Password),
                    IsVerified = def.IsVerified,
                    FailedLoginAttempts = 0,
                    VerificationCodeAttempts = 0,
                    VerificationCode = null,
                    VerificationCodeExpiresAt = null,
                    LastLoginAt = def.CreatedAt.AddDays(10),
                    CreatedAt = def.CreatedAt,
                };
                context.Db.UserAuths.Add(auth);
                authByEmail[email] = auth;
                authCreated++;
            }
            else
            {
                auth.IsVerified = def.IsVerified;
                auth.VerificationCode = null;
                auth.VerificationCodeExpiresAt = null;
                auth.VerificationCodeAttempts = 0;
                auth.FailedLoginAttempts = 0;
                auth.LockedUntil = null;
                if (auth.LastLoginAt == null)
                {
                    auth.LastLoginAt = def.CreatedAt.AddDays(10);
                }
            }

            if (!usersByEmail.TryGetValue(email, out var user))
            {
                user = new Domain.Entities.User
                {
                    Id = DeterministicSeed.GuidFor("user", def.Key),
                    Email = email,
                    FullName = def.FullName,
                    PhoneNumber = def.PhoneNumber,
                    AvatarUrl = def.AvatarUrl,
                    DateOfBirth = def.DateOfBirth,
                    Gender = def.Gender,
                    Role = def.Role,
                    CreatedAt = def.CreatedAt,
                };
                context.Db.Users.Add(user);
                usersByEmail[email] = user;
                usersCreated++;
            }
            else
            {
                user.FullName = def.FullName;
                user.PhoneNumber = def.PhoneNumber;
                user.AvatarUrl = def.AvatarUrl;
                user.DateOfBirth = def.DateOfBirth;
                user.Gender = def.Gender;
                user.Role = def.Role;
            }

            context.UsersByKey[def.Key] = user;
        }

        await context.Db.SaveChangesAsync(cancellationToken);

        context.Report.Counts["UserAuthCreated"] = authCreated;
        context.Report.Counts["UsersCreated"] = usersCreated;
    }
}
