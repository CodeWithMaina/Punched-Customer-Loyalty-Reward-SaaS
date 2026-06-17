using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Admin controller — platform-wide management and analytics.
/// All endpoints require Admin role.
/// Base route: /v1/admin
/// </summary>
[ApiController]
[Route("v1/admin")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(IAdminService adminService, ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    // ── Dashboard ───────────────────────────────────────────

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(ApiResponse<AdminDashboardResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboard()
    {
        var result = await _adminService.GetDashboardAsync();
        return Ok(result);
    }

    // ── Growth / Trends ─────────────────────────────────────

    [HttpGet("growth")]
    [ProducesResponseType(typeof(ApiResponse<AdminGrowthResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGrowth([FromQuery] string period = "30d")
    {
        var result = await _adminService.GetGrowthDataAsync(period);
        return Ok(result);
    }

    // ── Business Analytics ──────────────────────────────────

    [HttpGet("analytics/businesses")]
    [ProducesResponseType(typeof(ApiResponse<AdminBusinessAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBusinessAnalytics()
    {
        var result = await _adminService.GetBusinessAnalyticsAsync();
        return Ok(result);
    }

    // ── Customer Analytics ──────────────────────────────────

    [HttpGet("analytics/customers")]
    [ProducesResponseType(typeof(ApiResponse<AdminCustomerAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCustomerAnalytics()
    {
        var result = await _adminService.GetCustomerAnalyticsAsync();
        return Ok(result);
    }

    // ── Staff Analytics ─────────────────────────────────────

    [HttpGet("analytics/staff")]
    [ProducesResponseType(typeof(ApiResponse<AdminStaffAnalyticsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStaffAnalytics()
    {
        var result = await _adminService.GetStaffAnalyticsAsync();
        return Ok(result);
    }

    // ── Smart Insights ──────────────────────────────────────

    [HttpGet("insights")]
    [ProducesResponseType(typeof(ApiResponse<AdminInsightsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInsights()
    {
        var result = await _adminService.GetInsightsAsync();
        return Ok(result);
    }

    // ── User Management ─────────────────────────────────────

    [HttpGet("users")]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<AdminUserResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListUsers(
        [FromQuery] string? role,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(page, 1);
        var result = await _adminService.GetUsersAsync(role, search, page, pageSize);
        return Ok(result);
    }

    [HttpGet("users/{userId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AdminUserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUser(Guid userId)
    {
        var result = await _adminService.GetUserByIdAsync(userId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpPatch("users/{userId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AdminUserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateUser(Guid userId, [FromBody] AdminUpdateUserRequest request)
    {
        var result = await _adminService.UpdateUserAsync(userId, request);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpDelete("users/{userId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        var result = await _adminService.DeleteUserAsync(userId);
        if (!result.Success)
        {
            return result.Error?.Code == "FORBIDDEN" ? StatusCode(403, result) : NotFound(result);
        }
        return Ok(result);
    }

    // ── Business Management ─────────────────────────────────

    [HttpGet("businesses")]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<AdminBusinessSummary>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListBusinesses(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(page, 1);
        var result = await _adminService.GetBusinessesAsync(category, search, page, pageSize);
        return Ok(result);
    }

    [HttpGet("businesses/{businessId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AdminBusinessSummary>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBusiness(Guid businessId)
    {
        var result = await _adminService.GetBusinessDetailAsync(businessId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    [HttpDelete("businesses/{businessId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<MessageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBusiness(Guid businessId)
    {
        var result = await _adminService.DeleteBusinessAsync(businessId);
        if (!result.Success) return NotFound(result);
        return Ok(result);
    }

    // ── Redemptions ─────────────────────────────────────────

    [HttpGet("redemptions")]
    [ProducesResponseType(typeof(ApiResponse<PaginatedResponse<RedemptionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListRedemptions(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(page, 1);
        var result = await _adminService.GetRedemptionsAsync(search, page, pageSize);
        return Ok(result);
    }
}
