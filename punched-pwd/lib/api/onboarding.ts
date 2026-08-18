import apiClient from "./client";
import type {
  ApiResponse,
  AcceptStaffInvitationRequest,
  AuthResponse,
  CreateStaffInvitationRequest,
  MessageResponse,
  RegisterBusinessRequest,
  RegisterBusinessResponse,
  StaffInvitation,
  StaffInvitationValidationResponse,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Onboarding API — business registration + staff invitations
//  Contract documented in handoff §3 (Staff Invitation Onboarding).
// ═══════════════════════════════════════════════════════════════

export const onboardingApi = {
  /**
   * POST /auth/register-business
   * Atomically creates a Business-role owner account + Business, then emails a
   * verification code. The owner completes registration via /verify-email.
   */
  registerBusiness: (data: RegisterBusinessRequest) =>
    apiClient
      .post<ApiResponse<RegisterBusinessResponse>>("/auth/register-business", data)
      .then((r) => r.data),

  /**
   * GET /invitations/{token} (public)
   * Validates a staff invitation token and returns safe info for the accept page.
   * Always returns 200 with valid=false + error code for unusable tokens.
   */
  validateInvitation: (token: string) =>
    apiClient
      .get<ApiResponse<StaffInvitationValidationResponse>>(`/invitations/${token}`)
      .then((r) => r.data),

  /**
   * POST /invitations/{token}/accept (public)
   * Accepts a valid invitation: creates the staff account, links them to the
   * business, and returns authentication tokens.
   */
  acceptInvitation: (token: string, data: AcceptStaffInvitationRequest) =>
    apiClient
      .post<ApiResponse<AuthResponse>>(`/invitations/${token}/accept`, data)
      .then((r) => r.data),

  // ── Business-owned invitation management (requires a Business token) ──

  /** GET /businesses/me/staff/invitations */
  listStaffInvitations: () =>
    apiClient
      .get<ApiResponse<StaffInvitation[]>>("/businesses/me/staff/invitations")
      .then((r) => r.data),

  /** POST /businesses/me/staff/invitations */
  createStaffInvitation: (data: CreateStaffInvitationRequest) =>
    apiClient
      .post<ApiResponse<StaffInvitation>>("/businesses/me/staff/invitations", data)
      .then((r) => r.data),

  /** POST /businesses/me/staff/invitations/{id}/resend */
  resendStaffInvitation: (invitationId: string) =>
    apiClient
      .post<ApiResponse<StaffInvitation>>(
        `/businesses/me/staff/invitations/${invitationId}/resend`
      )
      .then((r) => r.data),

  /** POST /businesses/me/staff/invitations/{id}/revoke */
  revokeStaffInvitation: (invitationId: string) =>
    apiClient
      .post<ApiResponse<MessageResponse>>(
        `/businesses/me/staff/invitations/${invitationId}/revoke`
      )
      .then((r) => r.data),
};