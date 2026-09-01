using System.Text.Json.Serialization;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  SERVICE CATALOG — DTOs
// ═══════════════════════════════════════════════════════════════

/// <summary>
/// A service offered by a business (public/owner views).
/// </summary>
public class ServiceCatalogItemResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("durationMinutes")]
    public int DurationMinutes { get; set; }

    [JsonPropertyName("price")]
    public decimal Price { get; set; }

    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// A staff member eligible to perform a set of services (public booking view).
/// </summary>
public class EligibleStaffResponse
{
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [JsonPropertyName("fullName")]
    public string FullName { get; set; } = string.Empty;

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }
}

/// <summary>
/// Creates a new catalog service.
/// </summary>
public class CreateServiceRequest
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("durationMinutes")]
    public int DurationMinutes { get; set; }

    [JsonPropertyName("price")]
    public decimal Price { get; set; }
}

/// <summary>
/// Partially updates a catalog service. Only provided fields are applied.
/// </summary>
public class UpdateServiceRequest
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("durationMinutes")]
    public int? DurationMinutes { get; set; }

    [JsonPropertyName("price")]
    public decimal? Price { get; set; }

    [JsonPropertyName("isActive")]
    public bool? IsActive { get; set; }
}
