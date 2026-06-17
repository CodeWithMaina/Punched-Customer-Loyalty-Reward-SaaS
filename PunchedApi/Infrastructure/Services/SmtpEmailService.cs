using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using PunchedApi.Application.Settings;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.Infrastructure.Services;

public class SmtpEmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IOptions<EmailSettings> settings, ILogger<SmtpEmailService> logger)
    {
        _settings = settings.Value;
        _logger = logger;
    }

    public Task<bool> SendVerificationCodeAsync(string email, string code)
        => SendAsync(email, "Your Punched verification code", $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
              <h2 style="color:#1a1a1a">Verify your email</h2>
              <p style="color:#444;font-size:15px">Use the code below to verify your Punched account. It expires in 10 minutes.</p>
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a1a;padding:24px 0;text-align:center">{code}</div>
              <p style="color:#888;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
            </div>
            """);

    public Task<bool> SendPasswordResetCodeAsync(string email, string code)
        => SendAsync(email, "Reset your Punched password", $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
              <h2 style="color:#1a1a1a">Reset your password</h2>
              <p style="color:#444;font-size:15px">You requested a password reset for your Punched account. Use the code below — it expires in 10 minutes.</p>
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1a1a1a;padding:24px 0;text-align:center">{code}</div>
              <p style="color:#888;font-size:13px">If you didn't request this, someone may have entered your email by mistake. You can safely ignore this email.</p>
            </div>
            """);

    public Task<bool> SendWelcomeAsync(string email, string name)
        => SendAsync(email, "Welcome to Punched! 🎉", $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
              <h2 style="color:#1a1a1a">Welcome aboard, {name}!</h2>
              <p style="color:#444;font-size:15px">Your Punched account is verified and ready to go.</p>
              <p style="color:#444;font-size:15px">Start collecting stamps at your favourite local businesses and earn rewards — it's that simple.</p>
              <div style="padding:20px 0">
                <a href="https://punched.app" style="background:#10b981;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">Open Punched</a>
              </div>
              <p style="color:#888;font-size:13px">See you around! — The Punched Team</p>
            </div>
            """);

    public Task<bool> SendStampNotificationAsync(string email, string businessName, int stampNumber, int stampsRequired)
    {
        var remaining = stampsRequired - stampNumber;
        return SendAsync(email, $"You got a stamp at {businessName}! ✅", $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
              <h2 style="color:#1a1a1a">Stamp #{stampNumber} collected!</h2>
              <p style="color:#444;font-size:15px">You just earned a stamp at <strong>{businessName}</strong>.</p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
                <span style="font-size:28px;font-weight:bold;color:#16a34a">{stampNumber} / {stampsRequired}</span>
                <p style="color:#15803d;font-size:13px;margin:4px 0 0">{(remaining > 0 ? $"{remaining} more to go!" : "Reward unlocked!")}</p>
              </div>
              <p style="color:#888;font-size:13px">Keep collecting — you're getting closer to your next reward!</p>
            </div>
            """);
    }

    public Task<bool> SendRewardReadyAsync(string email, string businessName, string rewardDescription)
        => SendAsync(email, $"🎉 Reward ready at {businessName}!", $"""
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px">
              <h2 style="color:#1a1a1a">You've earned a reward! 🎉</h2>
              <p style="color:#444;font-size:15px">Congratulations! You've collected enough stamps at <strong>{businessName}</strong>.</p>
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
                <span style="font-size:20px;font-weight:bold;color:#d97706">{rewardDescription}</span>
              </div>
              <p style="color:#444;font-size:15px">Open Punched to claim your reward before it expires.</p>
              <div style="padding:16px 0">
                <a href="https://punched.app" style="background:#d97706;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">Claim Reward</a>
              </div>
              <p style="color:#888;font-size:13px">Thanks for being a loyal customer!</p>
            </div>
            """);

    private async Task<bool> SendAsync(string email, string subject, string htmlBody)
    {
        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromAddress));
            message.To.Add(MailboxAddress.Parse(email));
            message.Subject = subject;
            message.Body = new TextPart("html") { Text = htmlBody };

            using var client = new SmtpClient();

            // Auto-detect TLS strategy based on port
            var secureOption = _settings.Port == 465
                ? SecureSocketOptions.SslOnConnect
                : SecureSocketOptions.StartTls;

            await client.ConnectAsync(_settings.Host, _settings.Port, secureOption);
            await client.AuthenticateAsync(_settings.Username, _settings.Password);
            await client.SendAsync(message);
            await client.DisconnectAsync(quit: true);

            _logger.LogInformation("Email sent to {Email}: {Subject}", email, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}: {Subject}", email, subject);
            return false;
        }
    }
}
