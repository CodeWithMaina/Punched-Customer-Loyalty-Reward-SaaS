using Microsoft.EntityFrameworkCore;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Infrastructure.Services;

public class ConsoleEmailService : IEmailService
{
    private readonly ILogger<ConsoleEmailService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public ConsoleEmailService(ILogger<ConsoleEmailService> logger, IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    public Task<bool> SendVerificationCodeAsync(string email, string code)
    {
        _logger.LogInformation("📧 VERIFICATION CODE for {Email}: {Code}", email, code);
        _ = PersistAsync(email, null, "email", "verification_code", "sent", null);
        return Task.FromResult(true);
    }

    public Task<bool> SendPasswordResetCodeAsync(string email, string code)
    {
        _logger.LogInformation("🔑 PASSWORD RESET CODE for {Email}: {Code}", email, code);
        _ = PersistAsync(email, null, "email", "password_reset_code", "sent", null);
        return Task.FromResult(true);
    }

    public Task<bool> SendWelcomeAsync(string email, string name)
    {
        _logger.LogInformation("👋 WELCOME EMAIL for {Email} ({Name})", email, name);
        _ = PersistAsync(email, null, "email", "welcome", "sent", null);
        return Task.FromResult(true);
    }

    public Task<bool> SendStampNotificationAsync(string email, string businessName, int stampNumber, int stampsRequired)
    {
        _logger.LogInformation("✅ STAMP #{StampNumber}/{StampsRequired} at {Business} for {Email}",
            stampNumber, stampsRequired, businessName, email);
        _ = PersistAsync(email, businessName, "email", "stamp_notification", "sent", null);
        return Task.FromResult(true);
    }

    public Task<bool> SendRewardReadyAsync(string email, string businessName, string rewardDescription)
    {
        _logger.LogInformation("🎉 REWARD READY at {Business} for {Email}: {Reward}",
            businessName, email, rewardDescription);
        _ = PersistAsync(email, businessName, "email", "reward_ready", "sent", null);
        return Task.FromResult(true);
    }

    private async Task PersistAsync(string email, string? businessName, string channel, string templateType, string status, string? error)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var user = await db.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Email == email);

            if (user == null)
                return;

            Guid? businessId = null;
            if (!string.IsNullOrWhiteSpace(businessName))
            {
                businessId = await db.Businesses
                    .IgnoreQueryFilters()
                    .Where(b => b.Name == businessName)
                    .Select(b => (Guid?)b.Id)
                    .FirstOrDefaultAsync();
            }

            db.NotificationLogs.Add(new NotificationLog
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                BusinessId = businessId,
                Channel = channel,
                TemplateType = templateType,
                Status = status,
                SentAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                Error = error
            });

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist notification log for {Email}", email);
        }
    }
}
