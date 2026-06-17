import apiClient from "./client";
import type {
  ApiResponse,
  AdminDashboardResponse,
  AdminGrowthResponse,
  AdminBusinessAnalyticsResponse,
  AdminCustomerAnalyticsResponse,
  AdminStaffAnalyticsResponse,
  AdminInsightsResponse,
  AdminUserResponse,
  AdminUpdateUserRequest,
  AdminBusinessSummary,
  PaginatedResponse,
  MessageResponse,
  RedemptionResponse,
} from "@/types";

export const adminApi = {
  // ── Dashboard ─────────────────────────────────────────
  getDashboard: () =>
    apiClient
      .get<ApiResponse<AdminDashboardResponse>>("/admin/dashboard")
      .then((r) => r.data),

  // ── Growth / Trends ───────────────────────────────────
  getGrowth: (period: string = "30d") =>
    apiClient
      .get<ApiResponse<AdminGrowthResponse>>("/admin/growth", { params: { period } })
      .then((r) => r.data),

  // ── Business Analytics ────────────────────────────────
  getBusinessAnalytics: () =>
    apiClient
      .get<ApiResponse<AdminBusinessAnalyticsResponse>>("/admin/analytics/businesses")
      .then((r) => r.data),

  // ── Customer Analytics ────────────────────────────────
  getCustomerAnalytics: () =>
    apiClient
      .get<ApiResponse<AdminCustomerAnalyticsResponse>>("/admin/analytics/customers")
      .then((r) => r.data),

  // ── Staff Analytics ───────────────────────────────────
  getStaffAnalytics: () =>
    apiClient
      .get<ApiResponse<AdminStaffAnalyticsResponse>>("/admin/analytics/staff")
      .then((r) => r.data),

  // ── Insights ──────────────────────────────────────────
  getInsights: () =>
    apiClient
      .get<ApiResponse<AdminInsightsResponse>>("/admin/insights")
      .then((r) => r.data),

  // ── User Management ───────────────────────────────────
  getUsers: (params?: { role?: string; search?: string; page?: number; pageSize?: number }) =>
    apiClient
      .get<ApiResponse<PaginatedResponse<AdminUserResponse>>>("/admin/users", { params })
      .then((r) => r.data),

  getUser: (userId: string) =>
    apiClient
      .get<ApiResponse<AdminUserResponse>>(`/admin/users/${userId}`)
      .then((r) => r.data),

  updateUser: (userId: string, data: AdminUpdateUserRequest) =>
    apiClient
      .patch<ApiResponse<AdminUserResponse>>(`/admin/users/${userId}`, data)
      .then((r) => r.data),

  deleteUser: (userId: string) =>
    apiClient
      .delete<ApiResponse<MessageResponse>>(`/admin/users/${userId}`)
      .then((r) => r.data),

  // ── Business Management ───────────────────────────────
  getBusinesses: (params?: { category?: string; search?: string; page?: number; pageSize?: number }) =>
    apiClient
      .get<ApiResponse<PaginatedResponse<AdminBusinessSummary>>>("/admin/businesses", { params })
      .then((r) => r.data),

  getBusiness: (businessId: string) =>
    apiClient
      .get<ApiResponse<AdminBusinessSummary>>(`/admin/businesses/${businessId}`)
      .then((r) => r.data),

  deleteBusiness: (businessId: string) =>
    apiClient
      .delete<ApiResponse<MessageResponse>>(`/admin/businesses/${businessId}`)
      .then((r) => r.data),

  // ── Redemptions ───────────────────────────────────────
  getRedemptions: (params?: { search?: string; page?: number; pageSize?: number }) =>
    apiClient
      .get<ApiResponse<PaginatedResponse<RedemptionResponse>>>("/admin/redemptions", { params })
      .then((r) => r.data),
};
