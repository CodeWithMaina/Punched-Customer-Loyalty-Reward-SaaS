namespace PunchedApi.Domain.Interfaces;

public interface IEmailService
{
    Task<bool> SendVerificationCodeAsync(string email, string code);
    Task<bool> SendPasswordResetCodeAsync(string email, string code);
    Task<bool> SendWelcomeAsync(string email, string name);
    Task<bool> SendStampNotificationAsync(string email, string businessName, int stampNumber, int stampsRequired);
    Task<bool> SendRewardReadyAsync(string email, string businessName, string rewardDescription);
}
