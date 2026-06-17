using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Infrastructure.Services;

public class ConsoleEmailService : IEmailService
{
    private readonly ILogger<ConsoleEmailService> _logger;

    public ConsoleEmailService(ILogger<ConsoleEmailService> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendVerificationCodeAsync(string email, string code)
    {
        _logger.LogInformation("📧 VERIFICATION CODE for {Email}: {Code}", email, code);
        return Task.FromResult(true);
    }

    public Task<bool> SendPasswordResetCodeAsync(string email, string code)
    {
        _logger.LogInformation("🔑 PASSWORD RESET CODE for {Email}: {Code}", email, code);
        return Task.FromResult(true);
    }

    public Task<bool> SendWelcomeAsync(string email, string name)
    {
        _logger.LogInformation("👋 WELCOME EMAIL for {Email} ({Name})", email, name);
        return Task.FromResult(true);
    }

    public Task<bool> SendStampNotificationAsync(string email, string businessName, int stampNumber, int stampsRequired)
    {
        _logger.LogInformation("✅ STAMP #{StampNumber}/{StampsRequired} at {Business} for {Email}",
            stampNumber, stampsRequired, businessName, email);
        return Task.FromResult(true);
    }

    public Task<bool> SendRewardReadyAsync(string email, string businessName, string rewardDescription)
    {
        _logger.LogInformation("🎉 REWARD READY at {Business} for {Email}: {Reward}",
            businessName, email, rewardDescription);
        return Task.FromResult(true);
    }
}
