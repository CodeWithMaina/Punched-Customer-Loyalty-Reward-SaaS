using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using PunchedApi.Application.DTOs;
using PunchedApi.Application.Modules;
using PunchedApi.API.Filters;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Business controller - Customers module endpoints (me/customers*)
/// Split from BusinessController.cs (plugin module architecture, Phase 5).
/// Routes are identical to the pre-split controller; each action is gated on
/// its owning module via [RequireModule] (403 MODULE_DISABLED when
/// 403 MODULE_DISABLED (fail-closed: the business lacks the module).
/// </summary>
public partial class BusinessController
{
    /// <summary>
    /// Get all customers enrolled in the authenticated business's loyalty program.
    /// Results are scoped strictly to the business — no cross-tenant access.
    /// </summary>
    [RequireModule("customers")]
    [HttpGet("me/customers")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<BusinessCustomerResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyCustomers(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DateOnly? enrolledFrom,
        [FromQuery] DateOnly? enrolledTo,
        [FromQuery] string sortBy = "recent",
        [FromQuery] string sortDirection = "desc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (enrolledFrom.HasValue && enrolledTo.HasValue && enrolledTo < enrolledFrom)
            return BadRequest(ApiResponse<PaginatedResponse<BusinessCustomerResponse>>.Fail("INVALID_DATE_RANGE", "End date cannot precede start date."));

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await _businessService.GetBusinessCustomersAsync(
            userId.Value, search, status, enrolledFrom, enrolledTo, sortBy, sortDirection, page, pageSize);
        return Ok(result);
    }

    /// <summary>
    /// Get detailed profile of a single customer enrolled in this business.
    /// </summary>
    [RequireModule("customers")]
    [HttpGet("me/customers/{customerId:guid}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<BusinessCustomerResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSingleCustomer(Guid customerId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetSingleCustomerAsync(userId.Value, customerId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Customer management overview for the owner: summary counts, engagement
    /// snapshot (top customers / soon-to-reward / recently active).
    /// </summary>
    [RequireModule("customers")]
    [HttpGet("me/customers/overview")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<CustomerOverviewResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomerOverview()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetCustomerOverviewAsync(userId.Value);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Paginated stamp + redemption activity feed for a single customer.
    /// </summary>
    [RequireModule("customers")]
    [HttpGet("me/customers/{customerId:guid}/activity")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<CustomerActivityFeedResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCustomerActivity(
        Guid customerId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetCustomerActivityAsync(userId.Value, customerId, page, pageSize);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Get period-filtered stamp stats for a single customer (owner view).
    /// Supports period=today|7d|30d|all (default: 7d).
    /// </summary>
    [RequireModule("customers")]
    [HttpGet("me/customers/{customerId:guid}/stats")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<CustomerPeriodStatsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCustomerPeriodStats(Guid customerId, [FromQuery] string period = "7d")
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var validPeriods = new[] { "today", "7d", "30d", "all" };
        if (!validPeriods.Contains(period)) period = "7d";

        var result = await _businessService.GetCustomerPeriodStatsAsync(userId.Value, customerId, period);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    /// <summary>
    /// Export all customers enrolled in this business as a CSV file.
    /// Includes name, email, phone, date of birth, gender, stamps, and enrollment date.
    /// </summary>
    [RequireModule("customers")]
    [HttpGet("me/customers/export")]
    [Authorize(Roles = "Business")]
    [Produces("text/csv")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ExportCustomersCsv([FromQuery] string? search)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _businessService.GetBusinessCustomersAsync(
            userId.Value, search, null, null, null, "recent", "desc", 1, 100);
        if (!result.Success) return BadRequest(result);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Name,Email,Phone,DateOfBirth,Gender,TotalStamps,LifetimeStamps,TotalRedemptions,EnrolledAt,LastStampAt");

        static string Esc(string? v) =>
            string.IsNullOrEmpty(v) ? "" : v.Contains(',') || v.Contains('"') ? $"\"{v.Replace("\"", "\"\"")}\"" : v;

        void AppendPage(List<BusinessCustomerResponse> items)
        {
            foreach (var c in items)
            {
                sb.AppendLine(string.Join(",",
                    Esc(c.FullName),
                    Esc(c.Email),
                    Esc(c.PhoneNumber),
                    c.DateOfBirth?.ToString("yyyy-MM-dd") ?? "",
                    Esc(c.Gender),
                    c.TotalStamps,
                    c.LifetimeStamps,
                    c.TotalRedemptions,
                    c.EnrolledAt.ToString("yyyy-MM-dd"),
                    c.LastStampAt?.ToString("yyyy-MM-dd") ?? ""
                ));
            }
        }

        AppendPage(result.Data!.Items);

        // Export must include every matching customer, not just the first page.
        var totalCount = result.Data.TotalCount;
        const int ExportPageSize = 100;
        var totalPages = (int)Math.Ceiling(totalCount / (double)ExportPageSize);
        for (var page = 2; page <= totalPages; page++)
        {
            result = await _businessService.GetBusinessCustomersAsync(
                userId.Value, search, null, null, null, "recent", "desc", page, ExportPageSize);
            if (!result.Success || result.Data == null) break;
            AppendPage(result.Data.Items);
        }

        var bytes = System.Text.Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"customers_{DateTime.UtcNow:yyyyMMdd}.csv";
        return File(bytes, "text/csv", fileName);
    }
}
