using System.Text.Json.Serialization;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Application.DTOs;

// ═══════════════════════════════════════════════════════════════
//  STAMPING ECOSYSTEM DTOs (adjust / resolve / lookup / fulfil)
// ═══════════════════════════════════════════════════════════════

/// <summary>POST /v1/stamps/adjust request body.</summary>
public class StampAdjustmentRequest
{
    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    /// <summary>Positive or negative stamp delta. Must not be zero.</summary>
    [JsonPropertyName("delta")]
    public int Delta { get; set; }

    [JsonPropertyName("reason")]
    public StampAdjustmentReason Reason { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

/// <summary>POST /v1/stamps/adjust response.</summary>
public class StampAdjustmentResponse
{
    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("totalStampsBefore")]
    public int TotalStampsBefore { get; set; }

    [JsonPropertyName("totalStampsAfter")]
    public int TotalStampsAfter { get; set; }

    [JsonPropertyName("delta")]
    public int Delta { get; set; }

    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("stampsRequired")]
    public int StampsRequired { get; set; }

    [JsonPropertyName("rewardReady")]
    public bool RewardReady { get; set; }

    [JsonPropertyName("adjustedAt")]
    public DateTime AdjustedAt { get; set; }
}

/// <summary>POST /v1/stamps/resolve response — pre-commit QR preview. Never mutates state.</summary>
public class ResolveQrResponse
{
    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    [JsonPropertyName("customerFirstName")]
    public string CustomerFirstName { get; set; } = string.Empty;

    [JsonPropertyName("customerLastName")]
    public string CustomerLastName { get; set; } = string.Empty;

    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("totalStamps")]
    public int TotalStamps { get; set; }

    [JsonPropertyName("stampsRequired")]
    public int StampsRequired { get; set; }

    [JsonPropertyName("stampsRemaining")]
    public int StampsRemaining { get; set; }

    [JsonPropertyName("rewardReady")]
    public bool RewardReady { get; set; }

    [JsonPropertyName("programName")]
    public string ProgramName { get; set; } = string.Empty;

    [JsonPropertyName("rewardValue")]
    public decimal RewardValue { get; set; }

    [JsonPropertyName("maxStampsPerVisit")]
    public int MaxStampsPerVisit { get; set; } = 1;

    [JsonPropertyName("expiresAt")]
    public DateTime ExpiresAt { get; set; }
}

/// <summary>POST /v1/stamps/lookup request body.</summary>
public class ManualLookupRequest
{
    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }
}

/// <summary>POST /v1/stamps/lookup response — masked customer + one-time manual token.</summary>
public class ManualLookupResponse
{
    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }

    /// <summary>Masked display name, e.g. "J*** D***".</summary>
    [JsonPropertyName("maskedName")]
    public string MaskedName { get; set; } = string.Empty;

    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("cardStatus")]
    public string CardStatus { get; set; } = "active";

    /// <summary>One-time manual token (120s lifespan) to pass to /v1/stamps/award.</summary>
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    [JsonPropertyName("tokenExpiresAt")]
    public DateTime TokenExpiresAt { get; set; }
}

/// <summary>POST /v1/cards/enroll-and-stamp request body.</summary>
public class EnrollAndStampRequest
{
    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }

    /// <summary>Number of stamps to award (1..program.MaxStampsPerVisit). Defaults to 1.</summary>
    [JsonPropertyName("stamps")]
    public int? Stamps { get; set; }
}

/// <summary>POST /v1/redemptions/fulfill request body.</summary>
public class FulfillRedemptionRequest
{
    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    /// <summary>The 6-char fulfilment code presented by the customer.</summary>
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("businessId")]
    public Guid BusinessId { get; set; }
}

/// <summary>POST /v1/redemptions/fulfill response.</summary>
public class FulfillRedemptionResponse
{
    [JsonPropertyName("redemptionId")]
    public Guid RedemptionId { get; set; }

    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("customerName")]
    public string CustomerName { get; set; } = string.Empty;

    [JsonPropertyName("rewardDescription")]
    public string RewardDescription { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "fulfilled";

    [JsonPropertyName("fulfilledAt")]
    public DateTime FulfilledAt { get; set; }
}

/// <summary>POST /v1/redemptions/{id}/cancel request body.</summary>
public class CancelRedemptionRequest
{
    [JsonPropertyName("note")]
    public string? Note { get; set; }
}

/// <summary>POST /v1/redemptions/{id}/cancel response.</summary>
public class CancelRedemptionResponse
{
    [JsonPropertyName("redemptionId")]
    public Guid RedemptionId { get; set; }

    [JsonPropertyName("cardId")]
    public Guid CardId { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = "cancelled";

    [JsonPropertyName("stampsRestored")]
    public int StampsRestored { get; set; }

    [JsonPropertyName("totalStampsAfter")]
    public int TotalStampsAfter { get; set; }

    [JsonPropertyName("cancelledAt")]
    public DateTime CancelledAt { get; set; }

    [JsonPropertyName("note")]
    public string? Note { get; set; }
}
