using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Modules;
using PunchedApi.API.Filters;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Business controller - Analytics module endpoints (me/dashboard, me/analytics, me/insights, me/segments)
/// Split from BusinessController.cs (plugin module architecture, Phase 5).
/// Routes are identical to the pre-split controller; each action is gated on
/// its owning module via [RequireModule] (403 MODULE_DISABLED when
/// Modules:EnforcementEnabled=true and the business lacks the module).
/// </summary>
public partial class BusinessController
{
    /// <summary>
    /// Get business dashboard stats (active cards, stamps, redemptions).
    /// </summary>
    [RequireModule("analytics")]
    [HttpGet("me/dashboard")]
    [Authorize(Roles = "Business")]
    [OutputCache(PolicyName = "dashboard")]
    [ProducesResponseType(typeof(ApiResponse<BusinessDashboardResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboard()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetDashboardAsync(userId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get comprehensive business analytics (charts data).
    /// </summary>
    [RequireModule("analytics")]
    [HttpGet("me/analytics")]
    [Authorize(Roles = "Business")]
    [OutputCache(PolicyName = "analytics")]
    [ProducesResponseType(typeof(ApiResponse<BusinessAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAnalytics([FromQuery] string period = "30d")
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessAnalyticsAsync(userId.Value, period);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Period-over-period comparison. The business is always derived from the authenticated
    /// user's claims — no client-supplied BusinessId is accepted.
    /// Supports 1d/7d/30d/90d/365d and custom(?start=&amp;end=).
    /// </summary>
    [RequireModule("analytics")]
    [HttpGet("me/analytics/compare")]
    [Authorize(Roles = "Business")]
    [OutputCache(PolicyName = "analytics")]
    [ProducesResponseType(typeof(ApiResponse<BusinessAnalyticsComparisonResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAnalyticsComparison(
        [FromQuery] string period = "30d",
        [FromQuery] string? prev = null,
        [FromQuery] DateOnly? start = null,
        [FromQuery] DateOnly? end = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessAnalyticsComparisonAsync(userId.Value, period, prev, start, end);
        if (!result.Success && result.Error?.Code is "NOT_FOUND") return NotFound(result);
        if (!result.Success) return BadRequest(result);
        return Ok(result);
    }
    [RequireModule("analytics")]

    [HttpGet("me/insights")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<List<InsightResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBusinessInsights([FromQuery] bool includeDismissed = false)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessInsightsAsync(userId.Value, includeDismissed);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
    [RequireModule("analytics")]

    [HttpPost("me/insights/{insightId:guid}/dismiss")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> DismissBusinessInsight(Guid insightId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.DismissBusinessInsightAsync(userId.Value, userId.Value, insightId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
    [RequireModule("analytics")]

    [HttpGet("me/segments")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<List<CustomerSegmentResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomerSegments([FromQuery] string? segment = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessCustomerSegmentsAsync(userId.Value, segment);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
    [RequireModule("analytics")]

    [HttpGet("me/notifications/analytics")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<NotificationAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotificationAnalytics([FromQuery] int days = 30)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetNotificationAnalyticsAsync(userId.Value, days);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }
}
