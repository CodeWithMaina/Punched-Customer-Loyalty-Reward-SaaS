using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Infrastructure.Data.Seeding;

public sealed class AdminBootstrapper : IAdminBootstrapper
{
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<AdminBootstrapper> _logger;

    public AdminBootstrapper(ApplicationDbContext dbContext, ILogger<AdminBootstrapper> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task EnsureDefaultAdminAsync(CancellationToken cancellationToken = default)
    {
        if (await _dbContext.UserAuths.AnyAsync(u => u.Email == "admin@gmail.com", cancellationToken))
        {
            return;
        }

        var adminId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        _dbContext.UserAuths.Add(new UserAuth
        {
            Id = adminId,
            Email = "admin@gmail.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("@Admin1234", 12),
            IsVerified = true,
            CreatedAt = now,
        });

        _dbContext.Users.Add(new User
        {
            Id = adminId,
            Email = "admin@gmail.com",
            FullName = "Admin Main",
            PhoneNumber = "+2547000000123",
            AvatarUrl = "https://www.freepik.com/free-photos-vectors/people-profile",
            DateOfBirth = new DateOnly(1994, 1, 15),
            Gender = "Male",
            Role = UserRole.Admin,
            CreatedAt = now,
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Default admin user seeded: admin@gmail.com");
    }
}
