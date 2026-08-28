import apiClient from "./client";
import { cachedFetch, invalidateCache } from "./cache";
import type {
  ApiResponse,
  BusinessModulesResponse,
  MessageResponse,
  MyModulesResponse,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Module entitlements API (GET /v1/me/modules)
//  Powers navigation + module gating. Long TTL — entitlements change
//  rarely; call invalidateCache("modules:") after any module/plan
//  change (Phase 8 subscription/override mutations).
// ═══════════════════════════════════════════════════════════════

/** Bust every modules:* cache entry after an entitlement mutation. */
function invalidateModuleCaches(): void {
  invalidateCache("modules:");
}

export const modulesApi = {
  getMyModules: () =>
    cachedFetch(
      "modules:me",
      () =>
        apiClient
          .get<ApiResponse<MyModulesResponse>>("/me/modules")
          .then((r) => r.data),
      60_000
    ),

  // ── Owner module management ───────────────────────────────

  /** GET /v1/businesses/me/modules — full per-module detail for the owner. */
  getMyBusinessModules: () =>
    cachedFetch(
      "modules:business:me",
      () =>
        apiClient
          .get<ApiResponse<BusinessModulesResponse>>("/businesses/me/modules")
          .then((r) => r.data),
      60_000
    ),

  /** PUT /v1/businesses/me/modules/{moduleKey} — owner override toggle. */
  setModuleOverride: (moduleKey: string, enabled: boolean) =>
    apiClient
      .put<ApiResponse<MessageResponse>>(
        `/businesses/me/modules/${moduleKey}`,
        { enabled }
      )
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateModuleCaches();
        return result;
      }),

  /** DELETE /v1/businesses/me/modules/{moduleKey} — remove the override. */
  removeModuleOverride: (moduleKey: string) =>
    apiClient
      .delete<ApiResponse<MessageResponse>>(
        `/businesses/me/modules/${moduleKey}`
      )
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateModuleCaches();
        return result;
      }),

  // ── Admin module management ───────────────────────────────

  /** GET /v1/admin/businesses/{businessId}/modules. */
  getBusinessModules: (businessId: string) =>
    apiClient
      .get<ApiResponse<BusinessModulesResponse>>(
        `/admin/businesses/${businessId}/modules`
      )
      .then((r) => r.data),

  /** PUT /v1/admin/businesses/{businessId}/modules/{moduleKey} — force toggle. */
  setBusinessModuleOverride: (
    businessId: string,
    moduleKey: string,
    enabled: boolean,
    reason?: string
  ) =>
    apiClient
      .put<ApiResponse<MessageResponse>>(
        `/admin/businesses/${businessId}/modules/${moduleKey}`,
        { enabled, reason: reason || null }
      )
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateModuleCaches();
        return result;
      }),

  /** DELETE /v1/admin/businesses/{businessId}/modules/{moduleKey}. */
  removeBusinessModuleOverride: (businessId: string, moduleKey: string) =>
    apiClient
      .delete<ApiResponse<MessageResponse>>(
        `/admin/businesses/${businessId}/modules/${moduleKey}`
      )
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateModuleCaches();
        return result;
      }),
};
