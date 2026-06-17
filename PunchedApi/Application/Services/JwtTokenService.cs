using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.Services;

/// <summary>
/// JWT configuration settings from appsettings.json.
/// </summary>
public class JwtSettings
{
    public const string SectionName = "JwtSettings";

    /// <summary>Secret key for signing tokens (min 32 chars).</summary>
    public string Secret { get; set; } = string.Empty;

    /// <summary>Token issuer (e.g., "PunchedApi").</summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>Token audience (e.g., "PunchedApp").</summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>Access token expiry in minutes (default: 60).</summary>
    public int AccessTokenExpiryMinutes { get; set; } = 60;

    /// <summary>Refresh token expiry in days (default: 30).</summary>
    public int RefreshTokenExpiryDays { get; set; } = 30;
}

/// <summary>
/// Service for generating and validating JWT access and refresh tokens.
/// </summary>
public class JwtTokenService
{
    private readonly JwtSettings _settings;

    public JwtTokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    /// <summary>
    /// Generates a JWT access token for an authenticated user.
    /// Contains claims: sub (UserAuth.Id), email, name.
    /// </summary>
    /// <param name="userAuth">The authenticated UserAuth entity.</param>
    /// <param name="user">The User profile entity.</param>
    /// <returns>Signed JWT access token string.</returns>
    public string GenerateAccessToken(UserAuth userAuth, User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userAuth.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, userAuth.Email),
            new Claim(JwtRegisteredClaimNames.Name, user.FullName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim("userId", user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_settings.AccessTokenExpiryMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Generates a cryptographically secure refresh token.
    /// </summary>
    /// <returns>Base64-encoded random token string.</returns>
    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    /// <summary>
    /// Validates a JWT access token and extracts the ClaimsPrincipal.
    /// </summary>
    /// <param name="token">The JWT token string to validate.</param>
    /// <returns>ClaimsPrincipal if valid; null otherwise.</returns>
    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
            var handler = new JwtSecurityTokenHandler();

            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = _settings.Issuer,
                ValidateAudience = true,
                ValidAudience = _settings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);

            return principal;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the access token expiry duration in seconds.
    /// </summary>
    public int AccessTokenExpirySeconds => _settings.AccessTokenExpiryMinutes * 60;

    /// <summary>
    /// Gets the refresh token expiry as a DateTime.
    /// </summary>
    public DateTime RefreshTokenExpiry => DateTime.UtcNow.AddDays(_settings.RefreshTokenExpiryDays);
}
