import apiClient from "./client";
import { cachedFetch, invalidateCache } from "./cache";
import type {
  ApiResponse,
  CreateServiceRequest,
  ServiceCatalogItemResponse,
  UpdateServiceRequest,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Service catalog API client (mirrors businessesApi).
//  Cache keys/TTLs per frontend.md §12.
// ═══════════════════════════════════════════════════════════════

export const servicesApi = {
  /** Public per-business list (active only). Long TTL — rarely changes. */
  getPublic: (businessId: string) =>
    cachedFetch(
      "services:business:" + businessId,
      () =>
        apiClient
          .get<ApiResponse<ServiceCatalogItemResponse[]>>("/services/" + businessId)
          .then((r) => r.data),
      300_000
    ),

  /** Owner list (includes inactive). */
  getMyServices: () =>
    cachedFetch(
      "services:mine",
      () =>
        apiClient
          .get<ApiResponse<ServiceCatalogItemResponse[]>>("/services/me")
          .then((r) => r.data),
      15_000
    ),

  getService: (id: string) =>
    apiClient
      .get<ApiResponse<ServiceCatalogItemResponse>>("/services/me/" + id)
      .then((r) => r.data),

  create: (data: CreateServiceRequest) =>
    apiClient
      .post<ApiResponse<ServiceCatalogItemResponse>>("/services/me", data)
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateCache("services:mine");
        return result;
      }),

  update: (id: string, data: UpdateServiceRequest) =>
    apiClient
      .patch<ApiResponse<ServiceCatalogItemResponse>>(`/services/me/${id}`, data)
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateCache("services:mine");
        return result;
      }),

  /** Soft delete (deactivates) a service. */
  remove: (id: string) =>
    apiClient
      .delete<ApiResponse<boolean>>(`/services/me/${id}`)
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateCache("services:mine");
        return result;
      }),
};
