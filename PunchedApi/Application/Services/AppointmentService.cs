using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PunchedApi.Application.Authorization;
using PunchedApi.Application.DTOs;
using PunchedApi.Domain.Entities;
using PunchedApi.Domain.Interfaces;
using PunchedApi.Infrastructure.Data;

namespace PunchedApi.Application.Services;

/// <summary>
/// Owns all appointment/booking logic: creation, on-behalf booking, reschedule, status
/// transitions, and role-scoped reads. Caller identity + role are always passed in; the
/// caller's tenant is resolved server-side and never trusted from request DTOs.
/// </summary>
public class AppointmentService : IAppointmentService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly AppointmentAvailabilityService _availability;
    private readonly IMapper _mapper;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(
        IUnitOfWork unitOfWork,
        ApplicationDbContext context,
        AppointmentAvailabilityService availability,
        IMapper mapper,
        IPermissionService permissionService,
        ILogger<AppointmentService> logger)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _availability = availability;
        _mapper = mapper;
        _permissionService = permissionService;
        _logger = logger;
    }

    /// <summary>
    /// Fine-grained permission gate (G6): staff members do NOT hold
    /// <c>appointments.manage</c> (PermissionMatrix), so staff creating,
    /// rescheduling or cancelling business appointments is forbidden.
    /// Distinct from MODULE_DISABLED — this is a permission failure, not an
    /// entitlement one. Confirm/complete/no-show transitions of a staff
    /// member's OWN appointments remain allowed (staff workflow, not
    /// business-appointment management).
    /// </summary>
    private ApiResponse<AppointmentResponse>? StaffManagePermissionGuard(string role) =>
        IsRole(role, "Staff") && !_permissionService.HasPermission("Staff", "appointments.manage")
            ? ApiResponse<AppointmentResponse>.Fail(
                "FORBIDDEN",
                "Staff members do not have permission to manage business appointments (appointments.manage required).")
            : null;

    // ═══════════════════════════════════════════════════════════
    //  AVAILABILITY
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<List<AvailabilitySlotResponse>>> GetAvailableSlotsAsync(
        Guid userId, string role, Guid businessId, AvailabilityQueryRequest request)
    {
        return await _availability.GetAvailableSlotsAsync(
            request.BusinessId, request.ServiceIds, request.StaffUserId, request.StartDate, request.EndDate);
    }

    // ═══════════════════════════════════════════════════════════
    //  CREATE
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<AppointmentResponse>> CreateAppointmentAsync(
        Guid callerUserId, string role, CreateAppointmentRequest request)
    {
        // Resolve the caller's tenant business id.
        Guid businessId;
        if (IsRole(role, "Business"))
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == callerUserId);
            if (business == null)
                return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "No business found for this account.");
            if (business.Id != request.BusinessId)
                return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "You are not authorized for this business.");
            businessId = business.Id;
        }
        else if (IsRole(role, "Staff"))
        {
            var manageGuard = StaffManagePermissionGuard(role);
            if (manageGuard != null) return manageGuard;

            var staffMember = await _unitOfWork.Users.FirstOrDefaultAsync(u => u.Id == callerUserId && u.StaffBusinessId == request.BusinessId);
            if (staffMember == null)
                return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "You are not authorized for this business.");
            businessId = request.BusinessId;
        }
        else
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.Id == request.BusinessId);
            if (business == null)
                return ApiResponse<AppointmentResponse>.Fail("BUSINESS_NOT_FOUND", "Business not found.");
            businessId = business.Id;
        }

        var (services, svcError, svcMsg) = await ValidateServicesAsync(businessId, request.ServiceIds);
        if (svcError != null)
            return ApiResponse<AppointmentResponse>.Fail(svcError, svcMsg!);

        var totalMinutes = services.Sum(s => s.DurationMinutes);

        var (staff, staffError, staffMsg) = await ResolveStaffAsync(businessId, request.StaffUserId, request.ServiceIds);
        if (staffError != null)
            return ApiResponse<AppointmentResponse>.Fail(staffError, staffMsg!);

        // CustomerId is always forced to the caller for self-service booking.
        var customerId = callerUserId;
        var scheduledAt = request.ScheduledAt;
        var endAt = scheduledAt.AddMinutes(totalMinutes);

        return await InsertAppointmentTransactionallyAsync(
            businessId, customerId, staff?.Id, scheduledAt, endAt, services, request.Note, callerUserId, Guid.Empty);
    }

    public async Task<ApiResponse<AppointmentResponse>> CreateAppointmentOnBehalfAsync(
        Guid callerUserId, string role, CreateAppointmentOnBehalfRequest request)
    {
        Guid businessId;
        if (IsRole(role, "Business"))
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == callerUserId);
            if (business == null)
                return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "No business found for this account.");
            if (business.Id != request.BusinessId)
                return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "You are not authorized for this business.");
            businessId = business.Id;
        }
        else if (IsRole(role, "Staff"))
        {
            var manageGuard = StaffManagePermissionGuard(role);
            if (manageGuard != null) return manageGuard;

            var staffMember = await _unitOfWork.Users.FirstOrDefaultAsync(u => u.Id == callerUserId && u.StaffBusinessId == request.BusinessId);
            if (staffMember == null)
                return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "You are not authorized for this business.");
            businessId = request.BusinessId;
        }
        else
        {
            return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "Only Business or Staff may book on behalf of a customer.");
        }

        var (services, svcError, svcMsg) = await ValidateServicesAsync(businessId, request.ServiceIds);
        if (svcError != null)
            return ApiResponse<AppointmentResponse>.Fail(svcError, svcMsg!);

        var totalMinutes = services.Sum(s => s.DurationMinutes);

        // Customer must be a Customer-role, non-deleted user (global filter excludes deleted).
        var customer = await _unitOfWork.Users.FirstOrDefaultAsync(u => u.Id == request.CustomerId && u.Role == UserRole.Customer);
        if (customer == null)
            return ApiResponse<AppointmentResponse>.Fail("CUSTOMER_NOT_FOUND", "Customer not found.");

        var (staff, staffError, staffMsg) = await ResolveStaffAsync(businessId, request.StaffUserId, request.ServiceIds);
        if (staffError != null)
            return ApiResponse<AppointmentResponse>.Fail(staffError, staffMsg!);

        var scheduledAt = request.ScheduledAt;
        var endAt = scheduledAt.AddMinutes(totalMinutes);

        return await InsertAppointmentTransactionallyAsync(
            businessId, request.CustomerId, staff?.Id, scheduledAt, endAt, services, request.Note, callerUserId, Guid.Empty);
    }

    // ═══════════════════════════════════════════════════════════
    //  RESCHEDULE
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<AppointmentResponse>> RescheduleAsync(
        Guid callerUserId, string role, Guid appointmentId, RescheduleAppointmentRequest request)
    {
        var appointment = await LoadAsync(appointmentId);
        if (appointment == null)
            return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "Appointment not found.");

        var ownershipError = await AssertOwnershipAsync(callerUserId, role, appointment);
        if (ownershipError != null)
            return ownershipError;

        var manageGuard = StaffManagePermissionGuard(role);
        if (manageGuard != null) return manageGuard;

        // Determine effective services (replace when provided, else keep current).
        Guid[] serviceIds;
        if (request.ServiceIds != null && request.ServiceIds.Length > 0)
            serviceIds = request.ServiceIds;
        else
            serviceIds = appointment.Resources.Select(r => r.ServiceCatalogItemId).ToArray();

        var (services, svcError, svcMsg) = await ValidateServicesAsync(appointment.BusinessId, serviceIds);
        if (svcError != null)
            return ApiResponse<AppointmentResponse>.Fail(svcError, svcMsg!);

        var totalMinutes = services.Sum(s => s.DurationMinutes);

        var effectiveStaffId = request.StaffUserId ?? appointment.StaffUserId;
        var (staff, staffError, staffMsg) = await ResolveStaffAsync(appointment.BusinessId, effectiveStaffId, serviceIds);
        if (staffError != null)
            return ApiResponse<AppointmentResponse>.Fail(staffError, staffMsg!);

        var scheduledAt = request.ScheduledAt;
        var endAt = scheduledAt.AddMinutes(totalMinutes);

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            if (effectiveStaffId.HasValue)
            {
                var overlaps = await _context.Appointments
                    .Where(a => a.BusinessId == appointment.BusinessId && a.StaffUserId == effectiveStaffId.Value
                        && a.ScheduledAt < endAt && a.EndAt > scheduledAt && a.Id != appointmentId)
                    .AnyAsync();
                if (overlaps)
                {
                    await transaction.RollbackAsync();
                    return ApiResponse<AppointmentResponse>.Fail("OVERBOOKING", "The requested slot is already booked.");
                }
            }

            appointment.ScheduledAt = scheduledAt;
            appointment.EndAt = endAt;
            appointment.StaffUserId = effectiveStaffId;

            if (request.ServiceIds != null && request.ServiceIds.Length > 0)
            {
                _context.AppointmentResources.RemoveRange(appointment.Resources);
                var sortOrder = 0;
                var newResources = new List<AppointmentResource>();
                foreach (var svc in services)
                {
                    newResources.Add(new AppointmentResource
                    {
                        Id = Guid.NewGuid(),
                        AppointmentId = appointment.Id,
                        ServiceCatalogItemId = svc.Id,
                        Name = svc.Name,
                        DurationMinutes = svc.DurationMinutes,
                        Price = svc.Price ?? 0,
                        SortOrder = sortOrder++,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Replace the collection reference wholesale (instead of mutating in place) and
                // add the snapshots explicitly so EF tracks them as Added rather than Modified.
                appointment.Resources = newResources;
                _context.AppointmentResources.AddRange(newResources);
            }

            _unitOfWork.Appointments.Update(appointment);
            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (Npgsql.PostgresException pg) when (pg.SqlState == "23501")
        {
            // appointments_no_staff_overlap exclusion constraint fired — the slot was
            // taken between the availability check and this save.
            await transaction.RollbackAsync();
            return ApiResponse<AppointmentResponse>.Fail("OVERBOOKING", "The requested slot is already booked.");
        }
        catch
        {
            await transaction.RollbackAsync();
            return ApiResponse<AppointmentResponse>.Fail("RESCHEDULE_FAILED", "Failed to reschedule appointment.");
        }

        var updated = await LoadAsync(appointmentId);
        return ApiResponse<AppointmentResponse>.Ok(await ToResponseAsync(updated!));
    }

    // ═══════════════════════════════════════════════════════════
    //  STATUS TRANSITIONS
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<AppointmentResponse>> CancelAsync(
        Guid callerUserId, string role, Guid appointmentId, CancelAppointmentRequest request)
    {
        var appointment = await LoadAsync(appointmentId);
        if (appointment == null)
            return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "Appointment not found.");

        var ownershipError = await AssertOwnershipAsync(callerUserId, role, appointment);
        if (ownershipError != null)
            return ownershipError;

        var manageGuard = StaffManagePermissionGuard(role);
        if (manageGuard != null) return manageGuard;

        return await TransitionAsync(appointment, "cancelled", callerUserId, request.Note, role, staffOrOwnerOnly: false);
    }

    public async Task<ApiResponse<AppointmentResponse>> ConfirmAsync(
        Guid callerUserId, string role, Guid appointmentId)
    {
        var appointment = await LoadAsync(appointmentId);
        if (appointment == null)
            return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "Appointment not found.");

        var ownershipError = await AssertOwnershipAsync(callerUserId, role, appointment);
        if (ownershipError != null)
            return ownershipError;

        return await TransitionAsync(appointment, "confirmed", callerUserId, null, role, staffOrOwnerOnly: true);
    }

    public async Task<ApiResponse<AppointmentResponse>> CompleteAsync(
        Guid callerUserId, string role, Guid appointmentId)
    {
        var appointment = await LoadAsync(appointmentId);
        if (appointment == null)
            return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "Appointment not found.");

        var ownershipError = await AssertOwnershipAsync(callerUserId, role, appointment);
        if (ownershipError != null)
            return ownershipError;

        return await TransitionAsync(appointment, "completed", callerUserId, null, role, staffOrOwnerOnly: true);
    }

    public async Task<ApiResponse<AppointmentResponse>> MarkNoShowAsync(
        Guid callerUserId, string role, Guid appointmentId)
    {
        var appointment = await LoadAsync(appointmentId);
        if (appointment == null)
            return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "Appointment not found.");

        var ownershipError = await AssertOwnershipAsync(callerUserId, role, appointment);
        if (ownershipError != null)
            return ownershipError;

        return await TransitionAsync(appointment, "no_show", callerUserId, null, role, staffOrOwnerOnly: true);
    }

    // ═══════════════════════════════════════════════════════════
    //  QUERIES
    // ═══════════════════════════════════════════════════════════

    public async Task<ApiResponse<List<AppointmentResponse>>> GetCustomerAppointmentsAsync(Guid customerId)
    {
        var appointments = await _context.Appointments
            .Include(a => a.Resources)
            .Where(a => a.CustomerId == customerId)
            .OrderByDescending(a => a.ScheduledAt)
            .ToListAsync();

        var latestChanges = await GetLatestStatusChangesAsync(appointments.Select(a => a.Id));

        var result = appointments
            .Select(a => MapResponse(a, latestChanges))
            .ToList();

        return ApiResponse<List<AppointmentResponse>>.Ok(result);
    }

    public async Task<ApiResponse<AppointmentResponse>> GetAppointmentAsync(
        Guid callerUserId, string role, Guid appointmentId)
    {
        var appointment = await LoadAsync(appointmentId);
        if (appointment == null)
            return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "Appointment not found.");

        var ownershipError = await AssertOwnershipAsync(callerUserId, role, appointment);
        if (ownershipError != null)
            return ownershipError;

        return ApiResponse<AppointmentResponse>.Ok(await ToResponseAsync(appointment));
    }

    public async Task<ApiResponse<PaginatedResponse<AppointmentResponse>>> GetBusinessAppointmentsAsync(
        Guid ownerUserId, string? status, DateTime? from, DateTime? to, Guid? staffUserId, Guid? customerId, Guid? serviceId, int page, int pageSize)
    {
        var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == ownerUserId);
        if (business == null)
            return ApiResponse<PaginatedResponse<AppointmentResponse>>.Fail("NOT_FOUND", "No business found for this account.");

        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 20 : (pageSize > 100 ? 100 : pageSize);

        var query = _context.Appointments
            .Include(a => a.Resources)
            .Where(a => a.BusinessId == business.Id);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status);
        if (from.HasValue)
            query = query.Where(a => a.ScheduledAt >= from.Value);
        if (to.HasValue)
            query = query.Where(a => a.ScheduledAt <= to.Value);
        if (staffUserId.HasValue)
            query = query.Where(a => a.StaffUserId == staffUserId.Value);
        if (customerId.HasValue)
            query = query.Where(a => a.CustomerId == customerId.Value);
        if (serviceId.HasValue)
            query = query.Where(a => a.Resources.Any(r => r.ServiceCatalogItemId == serviceId.Value));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.ScheduledAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var latestChanges = await GetLatestStatusChangesAsync(items.Select(a => a.Id));
        var responses = items.Select(a => MapResponse(a, latestChanges)).ToList();

        return ApiResponse<PaginatedResponse<AppointmentResponse>>.Ok(new PaginatedResponse<AppointmentResponse>
        {
            Items = responses,
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<List<AppointmentResponse>>> GetStaffAppointmentsAsync(
        Guid staffUserId, string? status, DateTime? from, DateTime? to)
    {
        var query = _context.Appointments
            .Include(a => a.Resources)
            .Where(a => a.StaffUserId == staffUserId);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status);
        if (from.HasValue)
            query = query.Where(a => a.ScheduledAt >= from.Value);
        if (to.HasValue)
            query = query.Where(a => a.ScheduledAt <= to.Value);

        var items = await query.OrderByDescending(a => a.ScheduledAt).ToListAsync();

        var latestChanges = await GetLatestStatusChangesAsync(items.Select(a => a.Id));
        var responses = items.Select(a => MapResponse(a, latestChanges)).ToList();

        return ApiResponse<List<AppointmentResponse>>.Ok(responses);
    }

    // ═══════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════

    private async Task<ApiResponse<AppointmentResponse>> InsertAppointmentTransactionallyAsync(
        Guid businessId, Guid customerId, Guid? staffUserId, DateTime scheduledAt, DateTime endAt,
        List<ServiceCatalogItem> services, string? note, Guid changedByUserId, Guid excludeId)
    {
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            if (staffUserId.HasValue)
            {
                var overlaps = await _context.Appointments
                    .Where(a => a.BusinessId == businessId && a.StaffUserId == staffUserId.Value
                        && a.ScheduledAt < endAt && a.EndAt > scheduledAt && a.Id != excludeId)
                    .AnyAsync();
                if (overlaps)
                {
                    await transaction.RollbackAsync();
                    return ApiResponse<AppointmentResponse>.Fail("OVERBOOKING", "The requested slot is already booked.");
                }
            }

            var appointment = new Appointment
            {
                Id = Guid.NewGuid(),
                BusinessId = businessId,
                CustomerId = customerId,
                StaffUserId = staffUserId,
                ScheduledAt = scheduledAt,
                EndAt = endAt,
                Status = "booked",
                CreatedAt = DateTime.UtcNow
            };

            var sortOrder = 0;
            foreach (var svc in services)
            {
                appointment.Resources.Add(new AppointmentResource
                {
                    Id = Guid.NewGuid(),
                    AppointmentId = appointment.Id,
                    ServiceCatalogItemId = svc.Id,
                    Name = svc.Name,
                    DurationMinutes = svc.DurationMinutes,
                    Price = svc.Price ?? 0,
                    SortOrder = sortOrder++,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _unitOfWork.Appointments.AddAsync(appointment);

            await _unitOfWork.AppointmentStatusHistory.AddAsync(new AppointmentStatusHistory
            {
                Id = Guid.NewGuid(),
                AppointmentId = appointment.Id,
                Status = "booked",
                ChangedAt = DateTime.UtcNow,
                ChangedByUserId = changedByUserId,
                Note = note,
                CreatedAt = DateTime.UtcNow
            });

            await _unitOfWork.SaveChangesAsync();
            await transaction.CommitAsync();

            var created = await LoadAsync(appointment.Id);
            return ApiResponse<AppointmentResponse>.Ok(await ToResponseAsync(created!));
        }
        catch (Npgsql.PostgresException pg) when (pg.SqlState == "23501")
        {
            // appointments_no_staff_overlap exclusion constraint fired — the slot was
            // taken between the availability check and this save.
            await transaction.RollbackAsync();
            return ApiResponse<AppointmentResponse>.Fail("OVERBOOKING", "The requested slot is already booked.");
        }
        catch
        {
            await transaction.RollbackAsync();
            return ApiResponse<AppointmentResponse>.Fail("BOOKING_FAILED", "Failed to create appointment.");
        }
    }

    private async Task<ApiResponse<AppointmentResponse>> TransitionAsync(
        Appointment appointment, string toStatus, Guid changedByUserId, string? note, string role, bool staffOrOwnerOnly)
    {
        var allowedFrom = GetAllowedFromStatus(toStatus);
        if (appointment.Status != allowedFrom)
            return ApiResponse<AppointmentResponse>.Fail(
                "INVALID_STATUS_TRANSITION",
                $"Cannot transition from '{appointment.Status}' to '{toStatus}'.");

        if (staffOrOwnerOnly && !IsRole(role, "Business") && !IsRole(role, "Staff"))
            return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "Only Business or Staff may perform this action.");

        appointment.Status = toStatus;
        _unitOfWork.Appointments.Update(appointment);

        await _unitOfWork.AppointmentStatusHistory.AddAsync(new AppointmentStatusHistory
        {
            Id = Guid.NewGuid(),
            AppointmentId = appointment.Id,
            Status = toStatus,
            ChangedAt = DateTime.UtcNow,
            ChangedByUserId = changedByUserId,
            Note = note,
            CreatedAt = DateTime.UtcNow
        });

        await _unitOfWork.SaveChangesAsync();

        return ApiResponse<AppointmentResponse>.Ok(await ToResponseAsync(appointment));
    }

    private static string GetAllowedFromStatus(string toStatus)
    {
        return toStatus switch
        {
            "confirmed" => "booked",
            "completed" => "confirmed",
            "cancelled" => "booked",
            "no_show" => "confirmed",
            _ => string.Empty
        };
    }

    private async Task<(List<ServiceCatalogItem> Services, string? ErrorCode, string? ErrorMessage)> ValidateServicesAsync(
        Guid businessId, Guid[] serviceIds)
    {
        if (serviceIds == null || serviceIds.Length == 0)
            return (new List<ServiceCatalogItem>(), "VALIDATION_ERROR", "At least one service is required.");

        var distinctRequested = serviceIds.Distinct().ToArray();
        var services = await _context.ServiceCatalogItems
            .Where(s => distinctRequested.Contains(s.Id) && s.BusinessId == businessId && s.IsActive)
            .ToListAsync();

        if (services.Count != distinctRequested.Length)
            return (services, "SERVICE_NOT_FOUND", "One or more services were not found in this business.");

        return (services, null, null);
    }

    private async Task<(User? Staff, string? ErrorCode, string? ErrorMessage)> ResolveStaffAsync(
        Guid businessId, Guid? staffUserId, Guid[] serviceIds)
    {
        if (!staffUserId.HasValue)
            return (null, null, null);

        var staff = await _context.Users.FirstOrDefaultAsync(u => u.Id == staffUserId.Value && u.StaffBusinessId == businessId);
        if (staff == null)
            return (null, "STAFF_NOT_FOUND", "Staff member not found in this business.");

        var distinctRequested = serviceIds.Distinct().ToArray();
        var assignedCount = await _context.StaffServiceAssignments
            .Where(a => a.StaffUserId == staff.Id && a.BusinessId == businessId && distinctRequested.Contains(a.ServiceCatalogItemId))
            .Select(a => a.ServiceCatalogItemId)
            .Distinct()
            .CountAsync();

        if (assignedCount != distinctRequested.Length)
            return (null, "STAFF_NOT_AVAILABLE", "Staff member is not available for all requested services.");

        return (staff, null, null);
    }

    private async Task<ApiResponse<AppointmentResponse>?> AssertOwnershipAsync(
        Guid callerUserId, string role, Appointment appointment)
    {
        if (IsRole(role, "Business"))
        {
            var business = await _unitOfWork.Businesses.FirstOrDefaultAsync(b => b.OwnerId == callerUserId);
            if (business == null)
                return ApiResponse<AppointmentResponse>.Fail("NOT_FOUND", "No business found for this account.");
            if (business.Id != appointment.BusinessId)
                return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "Not authorized to access this appointment.");
        }
        else if (IsRole(role, "Staff"))
        {
            if (appointment.StaffUserId != callerUserId)
                return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "Not authorized to access this appointment.");
        }
        else
        {
            if (appointment.CustomerId != callerUserId)
                return ApiResponse<AppointmentResponse>.Fail("FORBIDDEN", "Not authorized to access this appointment.");
        }

        return null;
    }

    private Task<Appointment?> LoadAsync(Guid id) =>
        _context.Appointments.Include(a => a.Resources).FirstOrDefaultAsync(a => a.Id == id);

    /// <summary>
    /// Maps an appointment to its response, deriving updatedAt from the most recent
    /// AppointmentStatusHistory.ChangedAt (fallback: CreatedAt).
    /// </summary>
    private async Task<AppointmentResponse> ToResponseAsync(Appointment appointment)
    {
        var response = _mapper.Map<AppointmentResponse>(appointment);

        var latest = await _context.AppointmentStatusHistory
            .Where(h => h.AppointmentId == appointment.Id)
            .OrderByDescending(h => h.ChangedAt)
            .Select(h => h.ChangedAt)
            .FirstOrDefaultAsync();

        response.UpdatedAt = latest != default ? latest : appointment.CreatedAt;
        return response;
    }

    /// <summary>
    /// Fetches the latest status-change timestamp for many appointments in a single
    /// grouped query. Used by list endpoints to avoid the per-row N+1 that
    /// ToResponseAsync would otherwise cause.
    /// </summary>
    private async Task<Dictionary<Guid, DateTime>> GetLatestStatusChangesAsync(IEnumerable<Guid> appointmentIds)
    {
        var ids = appointmentIds.ToList();
        if (ids.Count == 0)
            return new Dictionary<Guid, DateTime>();

        return await _context.AppointmentStatusHistory
            .Where(h => ids.Contains(h.AppointmentId))
            .GroupBy(h => h.AppointmentId)
            .Select(g => new { AppointmentId = g.Key, Latest = g.Max(h => h.ChangedAt) })
            .ToDictionaryAsync(x => x.AppointmentId, x => x.Latest);
    }

    /// <summary>
    /// Synchronous mapping using pre-fetched latest status changes (from
    /// <see cref="GetLatestStatusChangesAsync"/>). Falls back to CreatedAt when no
    /// history exists yet.
    /// </summary>
    private AppointmentResponse MapResponse(Appointment appointment, Dictionary<Guid, DateTime> latestChanges)
    {
        var response = _mapper.Map<AppointmentResponse>(appointment);
        response.UpdatedAt = latestChanges.TryGetValue(appointment.Id, out var latest) && latest != default
            ? latest
            : appointment.CreatedAt;
        return response;
    }

    private static bool IsRole(string value, string expected) =>
        string.Equals(value?.Trim(), expected, StringComparison.OrdinalIgnoreCase);
}
