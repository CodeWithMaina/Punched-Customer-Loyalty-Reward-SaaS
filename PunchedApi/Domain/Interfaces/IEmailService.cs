namespace PunchedApi.Domain.Interfaces;

public interface IEmailService
{
    Task<bool> SendVerificationCodeAsync(string email, string code);
    Task<bool> SendPasswordResetCodeAsync(string email, string code);
    Task<bool> SendWelcomeAsync(string email, string name);
    Task<bool> SendStampNotificationAsync(string email, string businessName, int stampNumber, int stampsRequired);
    Task<bool> SendRewardReadyAsync(string email, string businessName, string rewardDescription);

    /// <summary>
    /// Sends a staff onboarding invitation email with a secure acceptance link.
    /// </summary>
    /// <param name="email">The invited staff member's email.</param>
    /// <param name="businessName">The inviting business's name.</param>
    /// <param name="invitationUrl">Full absolute URL to the invitation acceptance page.</param>
    /// <param name="expiresAt">UTC expiry of the invitation.</param>
    Task<bool> SendStaffInvitationAsync(string email, string businessName, string invitationUrl, DateTime expiresAt);
}
