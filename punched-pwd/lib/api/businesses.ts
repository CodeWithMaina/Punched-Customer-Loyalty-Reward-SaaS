import apiClient from "./client";
import { cachedFetch } from "./cache";
import type {
  ApiResponse,
  AnalyticsPeriod,
  Business,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessCustomer,
  PaginatedResponse,
  BusinessDashboardResponse,
  BusinessAnalyticsResponse,
  BusinessAnalyticsComparisonResponse,
  CustomerActivityFeedResponse,
  CustomerOverviewResponse,
  CustomerPeriodStatsResponse,
  MessageResponse,
  StaffBusinessResponse,
  StaffAnalyticsResponse,
  StaffActivityFeedResponse,
  StaffActivityQuery,
  StaffListResponse,
  StaffMember,
  StaffOverviewResponse,
  StaffMemberAnalyticsResponse,
  StampDto,
  NotificationDto,
} from "@/types";

export const businessesApi = {
  list: (params?: { category?: string; search?: string; page?: number; pageSize?: number }) =>
    apiClient
      .get<ApiResponse<Business[]>>("/businesses", { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Business>>(`/businesses/${id}`).then((r) => r.data),

  create: (data: CreateBusinessRequest) =>
    apiClient.post<ApiResponse<Business>>("/businesses", data).then((r) => r.data),

  getMine: () =>
    cachedFetch("biz:me", () =>
      apiClient.get<ApiResponse<Business>>("/businesses/me").then((r) => r.data),
      30_000
    ),

  updateMine: (data: UpdateBusinessRequest) =>
    apiClient.patch<ApiResponse<Business>>("/businesses/me", data).then((r) => r.data),

  getMyCustomers: (params?: {
    search?: string;
    status?: "active" | "ready";
    enrolledFrom?: string;
    enrolledTo?: string;
    sortBy?: "recent" | "stamps" | "name";
    sortDirection?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) =>
    cachedFetch(`biz:customers:${JSON.stringify(params ?? {})}`, () =>
      apiClient
        .get<ApiResponse<PaginatedResponse<BusinessCustomer>>>("/businesses/me/customers", {
          params,
        })
        .then((r) => r.data),
      20_000
    ),

  getSingleCustomer: (customerId: string) =>
    apiClient
      .get<ApiResponse<BusinessCustomer>>(`/businesses/me/customers/${customerId}`)
      .then((r) => r.data),

  getCustomerOverview: () =>
    apiClient
      .get<ApiResponse<CustomerOverviewResponse>>("/businesses/me/customers/overview")
      .then((r) => r.data),

  getCustomerActivity: (
    customerId: string,
    params?: { page?: number; pageSize?: number }
  ) =>
    apiClient
      .get<ApiResponse<CustomerActivityFeedResponse>>(
        `/businesses/me/customers/${customerId}/activity`,
        { params: params ?? undefined }
      )
      .then((r) => r.data),

  getDashboard: () =>
    cachedFetch("biz:dashboard", () =>
      apiClient
        .get<ApiResponse<BusinessDashboardResponse>>("/businesses/me/dashboard")
        .then((r) => r.data),
      15_000
    ),

  getStaffBusiness: () =>
    apiClient
      .get<ApiResponse<StaffBusinessResponse>>("/businesses/staff/my-business")
      .then((r) => r.data),

  getMyStaff: (params?: {
    search?: string;
    status?: "active" | "inactive";
    activity?: "today" | "week" | "idle";
    goalStatus?: "met" | "behind" | "none";
    sortBy?: "name" | "stamps" | "recent" | "goal" | "added";
    sortDirection?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) =>
    apiClient
      .get<ApiResponse<StaffListResponse>>("/businesses/me/staff", {
        params: params ?? undefined,
      })
      .then((r) => r.data),

  getStaffOverview: () =>
    apiClient
      .get<ApiResponse<StaffOverviewResponse>>("/businesses/me/staff/overview")
      .then((r) => r.data),

  setBusinessDailyGoal: (dailyGoal?: number) =>
    apiClient
      .put<ApiResponse<Business>>("/businesses/me/daily-goal", { dailyGoal })
      .then((r) => r.data),

  setStaffDailyGoal: (staffUserId: string, dailyGoal?: number) =>
    apiClient
      .put<ApiResponse<StaffMember>>(`/businesses/me/staff/${staffUserId}/daily-goal`, { dailyGoal })
      .then((r) => r.data),

  getStaffAnalytics: () =>
    cachedFetch("staff:analytics", () =>
      apiClient
        .get<ApiResponse<StaffAnalyticsResponse>>("/businesses/staff/analytics")
        .then((r) => r.data),
      15_000
    ),

  getStaffMemberAnalytics: (staffId: string, period: AnalyticsPeriod = "all") =>
    apiClient
      .get<ApiResponse<StaffMemberAnalyticsResponse>>(`/businesses/me/staff/${staffId}/analytics`, {
        params: { period },
      })
      .then((r) => r.data),

  getStaffMemberActivity: (staffId: string, params?: StaffActivityQuery) =>
    apiClient
      .get<ApiResponse<StaffActivityFeedResponse>>(`/businesses/me/staff/${staffId}/activity`, {
        params: params ?? undefined,
      })
      .then((r) => r.data),

  getMyStaffActivity: (params?: StaffActivityQuery) =>
    apiClient
      .get<ApiResponse<StaffActivityFeedResponse>>("/businesses/staff/activity", {
        params: params ?? undefined,
      })
      .then((r) => r.data),

  getRecentStamps: (businessId: string, staffUserId?: string, limit = 20) =>
    apiClient
      .get<ApiResponse<StampDto[]>>(`/businesses/${businessId}/activity/recent`, {
        params: { staffUserId: staffUserId ?? undefined, limit },
      })
      .then((r) => r.data),

  getMyNotifications: (unreadOnly = false) =>
    apiClient
      .get<ApiResponse<NotificationDto[]>>("/businesses/me/notifications", {
        params: { unreadOnly },
      })
      .then((r) => r.data),

  markNotificationsRead: (notificationId?: string) =>
    apiClient
      .post<ApiResponse<MessageResponse>>("/businesses/me/notifications/read", {
        notificationId: notificationId ?? null,
      })
      .then((r) => r.data),

  getCustomerPeriodStats: (customerId: string, period: AnalyticsPeriod = "7d") =>
    apiClient
      .get<ApiResponse<CustomerPeriodStatsResponse>>(`/businesses/me/customers/${customerId}/stats`, {
        params: { period },
      })
      .then((r) => r.data),

    getAnalytics: (period: string = "30d") =>
    cachedFetch(`biz:analytics:${period}`, () =>
      apiClient
        .get<ApiResponse<BusinessAnalyticsResponse>>("/businesses/me/analytics", {
          params: { period },
        })
        .then((r) => r.data),
      30_000
    ),

  getAnalyticsCompare: (period: string = "30d", prev: string | null = null) =>
    cachedFetch(`biz:analytics:compare:${period}:${prev ?? ""}`, () =>
      apiClient
        .get<ApiResponse<BusinessAnalyticsComparisonResponse>>(
          "/businesses/me/analytics/compare",
          { params: prev ? { period, prev } : { period } }
        )
        .then((r) => r.data),
      30_000
    ),
};

