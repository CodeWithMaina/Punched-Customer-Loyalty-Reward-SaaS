using System.Security.Cryptography;
using System.Text;

namespace PunchedApi.Infrastructure.Data.Seeding;

internal static class DeterministicSeed
{
    // Seeded for deterministic demo data across repeated runs.
    public static readonly DateTime AnchorUtc = new(2026, 8, 1, 12, 0, 0, DateTimeKind.Utc);

    // Static seed salt keeps identifiers stable.
    private const string Namespace = "punched-demo-seed-v1";

    // Fixed bcrypt salt for deterministic hashes in demo seed accounts.
    // NOTE: This is only used for seeded demo accounts.
    private const string BcryptSalt = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.";

    public static Guid GuidFor(string scope, string key)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{Namespace}:{scope}:{key}"));
        var guidBytes = new byte[16];
        Array.Copy(bytes, guidBytes, 16);

        // Set version and variant bits for a valid RFC-4122 GUID.
        guidBytes[7] = (byte)((guidBytes[7] & 0x0F) | 0x40);
        guidBytes[8] = (byte)((guidBytes[8] & 0x3F) | 0x80);
        return new Guid(guidBytes);
    }

    public static string TokenFor(string scope, string key)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{Namespace}:token:{scope}:{key}"));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string HashPassword(string plaintextPassword) => BCrypt.Net.BCrypt.HashPassword(plaintextPassword, BcryptSalt);
}
