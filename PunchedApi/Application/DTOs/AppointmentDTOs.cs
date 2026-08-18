using System.Text.Json.Serialization;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  BOOKING — REQUESTS
// ═══════════════════════════════════════════════════════════════

/// <summary>
/// Queries staff availability within a date range for one or more services.
/// </summary>
public class AvailabilityQueryRequest
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("serviceIds")]
    public Guid[] ServiceIds { get; set; } = [];

    [JsonPropertyName("staffUserId")]
    public Guid? StaffUserId { get; set; }

    [JsonPropertyName("startDate")]
    public DateOnly StartDate { get; set; }

    [JsonPropertyName("endDate")]
    public DateOnly EndDate { get; set; }
}

/// <summary>
/// Customer self-service booking. The caller's customerId is always forced server-side.
/// </summary>
public class CreateAppointmentRequest
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("serviceIds")]
    public Guid[] ServiceIds { get; set; } = [];

    [JsonPropertyName("staffUserId")]
    public Guid? StaffUserId { get; set; }

    [JsonPropertyName("scheduledAt")]
    public DateTime ScheduledAt { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

/// <summary>
/// Business/Staff booking on behalf of a customer. customerId is required.
/// </summary>
public class CreateAppointmentOnBehalfRequest
{
    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("serviceIds")]
    public Guid[] ServiceIds { get; set; } = [];

    [JsonPropertyName("staffUserId")]
    public Guid? StaffUserId { get; set; }

    [JsonPropertyName("scheduledAt")]
    public DateTime ScheduledAt { get; set; }

    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

/// <summary>
/// Reschedules an existing appointment. serviceIds/staffUserId are optional; when
/// provided they replace the previously booked configuration.
/// </summary>
public class RescheduleAppointmentRequest
{
    [JsonPropertyName("scheduledAt")]
    public DateTime ScheduledAt { get; set; }

    [JsonPropertyName("serviceIds")]
    public Guid[]? ServiceIds { get; set; }

    [JsonPropertyName("staffUserId")]
    public Guid? StaffUserId { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

/// <summary>
/// Cancels an existing appointment.
/// </summary>
public class CancelAppointmentRequest
{
    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

// ═══════════════════════════════════════════════════════════════
//  BOOKING — AVAILABILITY
// ═══════════════════════════════════════════════════════════════

/// <summary>
/// A single bookable slot produced by the availability engine.
/// </summary>
public class AvailabilitySlotResponse
{
    [JsonPropertyName("startAtUtc")]
    public DateTime StartAtUtc { get; set; }

    [JsonPropertyName("endAtUtc")]
    public DateTime EndAtUtc { get; set; }

    [JsonPropertyName("staffUserId")]
    public Guid StaffUserId { get; set; }

    [JsonPropertyName("staffName")]
    public string StaffName { get; set; } = string.Empty;

    [JsonPropertyName("serviceIds")]
    public Guid[] ServiceIds { get; set; } = [];
}

// ═══════════════════════════════════════════════════════════════
//  BOOKING — RESPONSES
// ═══════════════════════════════════════════════════════════════

/// <summary>
/// Full appointment view. updatedAt is derived from the most recent
/// AppointmentStatusHistory.ChangedAt (fallback: CreatedAt).
/// </summary>
public class AppointmentResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("staffUserId")]
    public Guid? StaffUserId { get; set; }

    [JsonPropertyName("scheduledAt")]
    public DateTime ScheduledAt { get; set; }

    [JsonPropertyName("endAt")]
    public DateTime EndAt { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("services")]
    public List<AppointmentServiceSnapshot> Services { get; set; } = new();

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Immutable snapshot of a service at booking time.
/// </summary>
public class AppointmentServiceSnapshot
{
    [JsonPropertyName("serviceCatalogItemId")]
    public Guid ServiceCatalogItemId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("durationMinutes")]
    public int DurationMinutes { get; set; }

    [JsonPropertyName("price")]
    public decimal Price { get; set; }

    [JsonPropertyName("sortOrder")]
    public int SortOrder { get; set; }
}

/// <summary>
/// Lightweight calendar item used by calendar views.
/// </summary>
public class AppointmentCalendarItemResponse
{
    [JsonPropertyName("id")]
    public Guid Id { get; set; }

    [JsonPropertyName("staffUserId")]
    public Guid? StaffUserId { get; set; }

    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("startAt")]
    public DateTime StartAt { get; set; }

    [JsonPropertyName("endAt")]
    public DateTime EndAt { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("services")]
    public List<AppointmentServiceSnapshot> Services { get; set; } = new();
}
