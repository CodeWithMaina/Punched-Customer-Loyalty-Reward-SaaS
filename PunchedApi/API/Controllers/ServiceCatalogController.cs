using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Interfaces;

namespace PunchedApi.API.Controllers;

/// <summary>
/// Service catalog controller — owner CRUD + public per-business active list.
/// Base route: /v1/services
/// Owner endpoints are [Authorize(Roles = "Business")]; the public list is [AllowAnonymous].
/// </summary>
[ApiController]
[Route("v1/services")]
[Produces("application/json")]
public class ServiceCatalogController : ControllerBase
{
    private readonly IServiceCatalogService _catalogService;

    public ServiceCatalogController(IServiceCatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    /// <summary>Owner: list all of the owner's business services (including inactive).</summary>
    [HttpGet("me")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<List<ServiceCatalogItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyServices()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _catalogService.GetMyServicesAsync(userId.Value);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: get a single service belonging to the owner's business.</summary>
    [HttpGet("me/{id:guid}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<ServiceCatalogItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetService(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _catalogService.GetServiceAsync(userId.Value, id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: create a new active service for the owner's business.</summary>
    [HttpPost("me")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<ServiceCatalogItemResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CreateService([FromBody] CreateServiceRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _catalogService.CreateServiceAsync(userId.Value, request);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: partially update a service belonging to the owner's business.</summary>
    [HttpPatch("me/{id:guid}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<ServiceCatalogItemResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateService(Guid id, [FromBody] UpdateServiceRequest request)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _catalogService.UpdateServiceAsync(userId.Value, id, request);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Owner: soft-delete a service by deactivating it.</summary>
    [HttpDelete("me/{id:guid}")]
    [Authorize(Roles = "Business")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteService(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var result = await _catalogService.DeleteServiceAsync(userId.Value, id);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>Public: list a business's active services.</summary>
    [HttpGet("{businessId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<ServiceCatalogItemResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetServicesForBusiness(Guid businessId)
    {
        var result = await _catalogService.GetServicesForBusinessAsync(businessId);
        return result.Success ? Ok(result) : MapFailure(result);
    }

    /// <summary>
    /// Maps an ApiResponse failure to the HTTP status dictated by backend.md §9.
    /// Success always returns 200 (Ok) via the callers.
    /// </summary>
    private IActionResult MapFailure<T>(ApiResponse<T> result)
        => result.Error?.Code switch
        {
            "NOT_FOUND" or "SERVICE_NOT_FOUND" or "STAFF_NOT_FOUND" or "CUSTOMER_NOT_FOUND" => NotFound(result),
            "FORBIDDEN" => StatusCode(StatusCodes.Status403Forbidden, result),
            "OVERBOOKING" or "SLOT_UNAVAILABLE" or "INVALID_STATUS_TRANSITION" => Conflict(result),
            _ => BadRequest(result)   // STAFF_NOT_AVAILABLE, VALIDATION_ERROR, BUSINESS_NOT_FOUND, fallback
        };

    private Guid? GetUserId()
    {
        var claim = User.FindFirst("userId")?.Value;
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
