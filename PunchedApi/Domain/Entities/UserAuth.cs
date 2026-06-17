using System.ComponentModel.DataAnnotations;

namespace PunchedApi.Domain.Entities;

/// <summary>
/// Stores authentication credentials for a user.
/// Contains email, password hash, and verification/lockout status.
/// Linked 1:1 with User via email.
/// </summary>
public class UserAuth : BaseEntity
{
    /// <summary>
    /// Unique email address used for login. Stored as lowercase.
    /// </summary>
    [Required]
    [MaxLength(255)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// BCrypt password hash. Never store plaintext passwords.
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Whether the user's email has been verified via OTP code.
    /// </summary>
    [Required]
    public bool IsVerified { get; set; } = false;

    /// <summary>
    /// Number of consecutive failed login attempts (0-5).
    /// Reset to 0 on successful login.
    /// </summary>
    [Required]
    public short FailedLoginAttempts { get; set; } = 0;

    /// <summary>
    /// If set, the account is locked until this UTC timestamp.
    /// Null means the account is not locked.
    /// </summary>
    public DateTime? LockedUntil { get; set; }

    /// <summary>
    /// Last successful login timestamp.
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Verification code for email verification (hashed).
    /// Null after verification is complete.
    /// </summary>
    [MaxLength(255)]
    public string? VerificationCode { get; set; }

    /// <summary>
    /// Expiry time for the verification code.
    /// </summary>
    public DateTime? VerificationCodeExpiresAt { get; set; }

    /// <summary>
    /// Number of failed verification code attempts.
    /// </summary>
    public short VerificationCodeAttempts { get; set; } = 0;

    // ── Navigation ──────────────────────────────────────────
    /// <summary>
    /// 1:1 relationship with User profile.
    /// </summary>
    public virtual User? Profile { get; set; }

    /// <summary>
    /// Refresh tokens issued to this user.
    /// </summary>
    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
