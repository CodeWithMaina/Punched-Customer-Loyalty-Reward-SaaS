import apiClient from "./client";
import { cachedFetch } from "./cache";
import type {
  ApiResponse,
  AnalyticsPeriod,
  Business,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  BusinessCustomer,
  BusinessDashboardResponse,
  BusinessAnalyticsResponse,
  CustomerPeriodStatsResponse,
  MessageResponse,
  StaffBusinessResponse,
  StaffAnalyticsResponse,
  StaffMember,
  StaffMemberAnalyticsResponse,
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

  getMyCustomers: (search?: string) =>
    cachedFetch(`biz:customers:${search ?? ""}`, () =>
      apiClient
        .get<ApiResponse<BusinessCustomer[]>>("/businesses/me/customers", {
          params: search ? { search } : undefined,
        })
        .then((r) => r.data),
      20_000
    ),

  getSingleCustomer: (customerId: string) =>
    apiClient
      .get<ApiResponse<BusinessCustomer>>(`/businesses/me/customers/${customerId}`)
      .then((r) => r.data),

  getDashboard: () =>
    cachedFetch("biz:dashboard", () =>
      apiClient
        .get<ApiResponse<BusinessDashboardResponse>>("/businesses/me/dashboard")
        .then((r) => r.data),
      15_000
    ),

  linkStaff: (staffUserId: string) =>
    apiClient
      .post<ApiResponse<MessageResponse>>(`/businesses/me/staff/${staffUserId}`)
      .then((r) => r.data),

  getStaffBusiness: () =>
    apiClient
      .get<ApiResponse<StaffBusinessResponse>>("/businesses/staff/my-business")
      .then((r) => r.data),

  getMyStaff: (params?: { search?: string; sort?: string }) =>
    apiClient
      .get<ApiResponse<StaffMember[]>>("/businesses/me/staff", {
        params: params ?? undefined,
      })
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
};
