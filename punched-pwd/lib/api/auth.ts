import apiClient from "./client";
import type {
  ApiResponse,
  AuthResponse,
  MessageResponse,
  TokenResponse,
  User,
  RegisterRequest,
  VerifyEmailRequest,
  LoginRequest,
  RequestEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Auth API Service
//  Wraps all authentication endpoints from 04_API_ENDPOINTS.md
// ═══════════════════════════════════════════════════════════════

export const authApi = {
  /**
   * POST /auth/register
   * Register a new user with email, password, and full name.
   */
  register: async (
    data: RegisterRequest
  ): Promise<ApiResponse<MessageResponse>> => {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      "/auth/register",
      data
    );
    return response.data;
  },

  /**
   * POST /auth/verify-email
   * Verify email with 6-digit code.
   */
  verifyEmail: async (
    data: VerifyEmailRequest
  ): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/verify-email",
      data
    );
    return response.data;
  },

  /**
   * POST /auth/login
   * Login with email and password.
   */
  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      data
    );
    return response.data;
  },

  /**
   * POST /auth/refresh-token
   * Rotate refresh token.
   */
  refreshToken: async (
    refreshToken: string
  ): Promise<ApiResponse<TokenResponse>> => {
    const response = await apiClient.post<ApiResponse<TokenResponse>>(
      "/auth/refresh-token",
      { refreshToken }
    );
    return response.data;
  },

  /**
   * POST /auth/logout
   * Revoke all refresh tokens.
   */
  logout: async (): Promise<ApiResponse<MessageResponse>> => {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      "/auth/logout"
    );
    return response.data;
  },

  /**
   * POST /auth/request-email
   * Request a new verification code.
   */
  requestVerificationCode: async (
    data: RequestEmailRequest
  ): Promise<ApiResponse<MessageResponse>> => {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      "/auth/request-email",
      data
    );
    return response.data;
  },

  /**
   * GET /users/profile
   * Get authenticated user's profile.
   */
  getProfile: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>("/users/profile");
    return response.data;
  },

  /**
   * POST /auth/forgot-password
   * Request a password reset code.
   */
  forgotPassword: async (
    data: ForgotPasswordRequest
  ): Promise<ApiResponse<MessageResponse>> => {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      "/auth/forgot-password",
      data
    );
    return response.data;
  },

  /**
   * POST /auth/reset-password
   * Reset password using the verification code.
   */
  resetPassword: async (
    data: ResetPasswordRequest
  ): Promise<ApiResponse<MessageResponse>> => {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      "/auth/reset-password",
      data
    );
    return response.data;
  },

  /**
   * POST /auth/change-password
   * Change password for authenticated user.
   */
  changePassword: async (
    data: ChangePasswordRequest
  ): Promise<ApiResponse<MessageResponse>> => {
    const response = await apiClient.post<ApiResponse<MessageResponse>>(
      "/auth/change-password",
      data
    );
    return response.data;
  },
};
