using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Service owning all booking/appointment logic. Caller identity + role are always
/// passed in and never trusted from request DTOs; businessId is derived server-side
/// whenever the caller's tenant can be resolved locally.
/// </summary>
public interface IAppointmentService
{
    /// <summary>Computes bookable slots for a business across a date range.</summary>
    Task<ApiResponse<List<AvailabilitySlotResponse>>> GetAvailableSlotsAsync(Guid userId, string role, Guid businessId, AvailabilityQueryRequest request);

    /// <summary>Customer self-service booking. CustomerId is forced to the caller.</summary>
    Task<ApiResponse<AppointmentResponse>> CreateAppointmentAsync(Guid callerUserId, string role, CreateAppointmentRequest request);

    /// <summary>Business/Staff booking on behalf of a customer.</summary>
    Task<ApiResponse<AppointmentResponse>> CreateAppointmentOnBehalfAsync(Guid callerUserId, string role, CreateAppointmentOnBehalfRequest request);

    /// <summary>Reschedules an existing appointment inside a transactional overlap guard.</summary>
    Task<ApiResponse<AppointmentResponse>> RescheduleAsync(Guid callerUserId, string role, Guid appointmentId, RescheduleAppointmentRequest request);

    /// <summary>Cancels an existing appointment.</summary>
    Task<ApiResponse<AppointmentResponse>> CancelAsync(Guid callerUserId, string role, Guid appointmentId, CancelAppointmentRequest request);

    /// <summary>Transitions a booked appointment to confirmed.</summary>
    Task<ApiResponse<AppointmentResponse>> ConfirmAsync(Guid callerUserId, string role, Guid appointmentId);

    /// <summary>Transitions a confirmed appointment to completed.</summary>
    Task<ApiResponse<AppointmentResponse>> CompleteAsync(Guid callerUserId, string role, Guid appointmentId);

    /// <summary>Transitions a confirmed appointment to no_show.</summary>
    Task<ApiResponse<AppointmentResponse>> MarkNoShowAsync(Guid callerUserId, string role, Guid appointmentId);

    /// <summary>Lists a customer's own appointments.</summary>
    Task<ApiResponse<List<AppointmentResponse>>> GetCustomerAppointmentsAsync(Guid customerId);

    /// <summary>Gets a single appointment, asserting caller tenant ownership.</summary>
    Task<ApiResponse<AppointmentResponse>> GetAppointmentAsync(Guid callerUserId, string role, Guid appointmentId);

    /// <summary>Paged business appointment list with filters.</summary>
    Task<ApiResponse<PaginatedResponse<AppointmentResponse>>> GetBusinessAppointmentsAsync(Guid ownerUserId, string? status, DateTime? from, DateTime? to, Guid? staffUserId, Guid? customerId, Guid? serviceId, int page, int pageSize);

    /// <summary>Lists a staff member's own appointments.</summary>
    Task<ApiResponse<List<AppointmentResponse>>> GetStaffAppointmentsAsync(Guid staffUserId, string? status, DateTime? from, DateTime? to);
}