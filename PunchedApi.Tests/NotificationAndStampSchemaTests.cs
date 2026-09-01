using System.Reflection;
using PunchedApi.Domain.Entities;

namespace PunchedApi.Tests;

/// <summary>
/// Additional coverage for the activity-feed / notifications backlog:
/// verifies the notifications service contract (G), the Notification entity
/// schema, the Stamp QR-token + Source fields that the QR-scan-stamp design
/// doc (F) relies on, and the GetRecentStampsAsync method (A).
///
/// These complement ActivityFeedAndNotificationsTests with deeper contract
/// assertions for the newly added behavior.
/// </summary>
public class NotificationAndStampSchemaTests
{
    [Fact]
    public void INotificationsService_ExposesFullContract()
    {
        var iface = typeof(PunchedApi.Domain.Interfaces.INotificationsService);

        Assert.NotNull(iface.GetMethod("CreateGoalReachedAsync"));
        Assert.NotNull(iface.GetMethod("CreateRewardReadyAsync"));
        Assert.NotNull(iface.GetMethod("MarkReadAsync"));
        Assert.NotNull(iface.GetMethod("GetAsync"));
    }

    [Fact]
    public void Notification_Entity_HasRequiredSchema()
    {
        var t = typeof(Notification);

        Assert.NotNull(t.GetProperty("UserId"));
        Assert.NotNull(t.GetProperty("BusinessId"));
        Assert.NotNull(t.GetProperty("Type"));
        Assert.NotNull(t.GetProperty("StampsCount"));
        Assert.NotNull(t.GetProperty("IsRead"));
        Assert.NotNull(t.GetProperty("CreatedAt")); // inherited from BaseEntity

        Assert.Equal(typeof(Guid), t.GetProperty("UserId")!.PropertyType);
        Assert.Equal(typeof(Guid?), t.GetProperty("BusinessId")!.PropertyType);
        Assert.Equal(typeof(bool), t.GetProperty("IsRead")!.PropertyType);
        Assert.Equal(typeof(int), t.GetProperty("StampsCount")!.PropertyType);
    }

    [Fact]
    public void Stamp_Entity_HasQrTokenIdAndSource_ForQrScanDesign()
    {
        var t = typeof(Stamp);

        var qrProp = t.GetProperty("QrTokenId");
        Assert.NotNull(qrProp);
        Assert.Equal(typeof(Guid?), qrProp!.PropertyType);

        var sourceProp = t.GetProperty("Source");
        Assert.NotNull(sourceProp);
        Assert.Equal(typeof(string), Nullable.GetUnderlyingType(sourceProp!.PropertyType) ?? sourceProp.PropertyType);
    }

    [Fact]
    public void StampSource_ExposesScanAndEnrollmentConstants()
    {
        Assert.Equal("scan", StampSource.Scan);
        Assert.Equal("enrollment", StampSource.Enrollment);
        Assert.NotEqual(StampSource.Scan, StampSource.Enrollment);
    }

    [Fact]
    public void IStampService_GetRecentStampsAsync_HasBusinessScopedSignature()
    {
        var iface = typeof(PunchedApi.Domain.Interfaces.IStampService);
        var method = iface.GetMethod("GetRecentStampsAsync");

        Assert.NotNull(method);
        var parameterNames = method!.GetParameters().Select(p => p.Name).ToArray();
        Assert.Contains("businessId", parameterNames);
        Assert.Contains("staffUserId", parameterNames);
        Assert.Contains("limit", parameterNames);

                // Return type is Task<ApiResponse<List<StampDto>>>
        var returnType = method!.ReturnType;
        Assert.Equal("Task`1", returnType.Name);
        var apiResponseType = returnType.GetGenericArguments()[0];
        Assert.Equal("ApiResponse`1", apiResponseType.Name);
        Assert.Equal("List`1", apiResponseType.GetGenericArguments()[0].Name);
    }

    [Fact]
    public void StampAdjustment_Entity_ExposesSeededReasons()
    {
        var type = typeof(StampAdjustment);
        Assert.NotNull(type.GetProperty("CardId"));
        Assert.NotNull(type.GetProperty("AdjustedByUserId"));
        Assert.NotNull(type.GetProperty("AdjustedByRole"));
        Assert.NotNull(type.GetProperty("Delta"));
        Assert.NotNull(type.GetProperty("Reason"));
        Assert.NotNull(type.GetProperty("Note"));
        Assert.NotNull(type.GetProperty("RelatedStampId"));
        Assert.Equal(typeof(int), type.GetProperty("Delta")!.PropertyType);
    }

    [Fact]
    public void Redemption_StatusProperty_IsEnum()
    {
        var type = typeof(Redemption);
        var statusProp = type.GetProperty("Status");
        Assert.NotNull(statusProp);
        Assert.Equal(typeof(RedemptionStatus), statusProp!.PropertyType);
        Assert.NotNull(type.GetProperty("FulfilledByUserId"));
        Assert.NotNull(type.GetProperty("FulfilledAt"));
        Assert.NotNull(type.GetProperty("FulfilmentCodeHash"));
        Assert.NotNull(type.GetProperty("FailedAttempts"));
        Assert.NotNull(type.GetProperty("CodeLocked"));
        Assert.NotNull(type.GetProperty("PayoutStatus"));
    }

    [Fact]
    public void IdempotencyService_Contract_ExposesLookupAndStore()
    {
        var iface = typeof(PunchedApi.Domain.Interfaces.IIdempotencyService);
        Assert.NotNull(iface.GetMethod("TryGetAsync"));
        Assert.NotNull(iface.GetMethod("StoreAsync"));
    }
}
