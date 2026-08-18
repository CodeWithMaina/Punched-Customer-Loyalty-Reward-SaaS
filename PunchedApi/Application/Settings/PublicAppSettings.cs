namespace PunchedApi.Application.Settings;

/// <summary>
/// Public-facing application settings used to build absolute callback/acceptance URLs
/// (e.g. staff invitation links). Configure via the "PublicApp" section / env vars.
/// </summary>
public class PublicAppSettings
{
    public const string SectionName = "PublicApp";

    /// <summary>
    /// Base URL of the web frontend (e.g. https://punched.app or http://localhost:3000).
    /// Used to build invitation acceptance links.
    /// </summary>
    public string BaseUrl { get; set; } = "http://localhost:3000";

    /// <summary>
    /// How many days a newly created staff invitation remains valid.
    /// </summary>
    public int InvitationExpiryDays { get; set; } = 7;
}