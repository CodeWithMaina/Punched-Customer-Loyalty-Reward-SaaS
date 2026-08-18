using PunchedApi.Application.DTOs;

namespace PunchedApi.Domain.Interfaces;

/// <summary>
/// Staff invitation lifecycle service.
/// Staff can only be onboarded through a valid invitation — there is no public staff registration.
/// Every business-scoped operation derives the business from the authenticated user (tenant isolation),
/// never from a client-supplied business id.
/// </summary>
public interface IInvitationService
{
    /// <summary>
    /// Creates a pending staff invitation for an email owned by the given business owner,
    /// and emails the invitee a secure acceptance link.
    /// </summary>
    Task<ApiResponse<StaffInvitationResponse>> CreateStaffInvitationAsync(Guid businessOwnerId, CreateStaffInvitationRequest request);

    /// <summary>
    /// Lists all staff invitations for the caller's business (including accepted/revoked), oldest-first.
    /// </summary>
    Task<ApiResponse<List<StaffInvitationResponse>>> ListStaffInvitationsAsync(Guid businessOwnerId);

    /// <summary>
    /// Resends a pending invitation by rotating its token and refreshing its expiry.
    /// </summary>
    Task<ApiResponse<StaffInvitationResponse>> ResendStaffInvitationAsync(Guid businessOwnerId, Guid invitationId);

    /// <summary>
    /// Revokes a pending invitation.
    /// </summary>
    Task<ApiResponse<MessageResponse>> RevokeStaffInvitationAsync(Guid businessOwnerId, Guid invitationId);

    /// <summary>
    /// Publicly validates an invitation token and returns safe info for the acceptance page
    /// (business name, invited email, expiry). Returns valid=false with an error code when unusable.
    /// </summary>
    Task<ApiResponse<StaffInvitationValidationResponse>> ValidateStaffInvitationAsync(string token);

    /// <summary>
    /// Publicly accepts a valid invitation: verifies ownership, creates the staff account,
    /// links them to the invitation's business, marks the invitation accepted, and authenticates.
    /// </summary>
    Task<ApiResponse<AuthResponse>> AcceptStaffInvitationAsync(string token, AcceptStaffInvitationRequest request);
}