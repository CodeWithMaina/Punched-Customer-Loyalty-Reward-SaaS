import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { ApiResponse, TokenResponse } from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Centralized Axios API Client
//  - Base URL from environment
//  - Automatic token attachment
//  - Automatic 401 token refresh
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/v1";

/** Axios instance with base configuration */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// ── Token helpers (localStorage) ────────────────────────────

const TOKEN_KEY = "punched_access_token";
const REFRESH_TOKEN_KEY = "punched_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  // Write a short-lived cookie so Next.js middleware can check auth
  // SameSite=Strict prevents CSRF; HttpOnly=false is required (JS must read it)
  try {
    const exp = parseTokenExpiry(accessToken);
    const expires = exp ? new Date(exp * 1000).toUTCString() : "";
    document.cookie = `access_token=${encodeURIComponent(accessToken)}; path=/; SameSite=Strict${expires ? `; expires=${expires}` : ""}`;
  } catch {
    document.cookie = `access_token=${encodeURIComponent(accessToken)}; path=/; SameSite=Strict`;
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  // Expire the cookie
  document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict";
}

function parseTokenExpiry(token: string): number | null {
  try {
    const b64 = token.split(".")[1];
    const payload = JSON.parse(atob(b64.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

// ── Request interceptor: attach Bearer token ────────────────

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-refresh on 401 ──────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh for 401 errors with a refresh token available
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<ApiResponse<TokenResponse>>(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken }
        );

        if (response.data.success && response.data.data) {
          const { accessToken, refreshToken: newRefreshToken } =
            response.data.data;
          setTokens(accessToken, newRefreshToken);
          processQueue(null, accessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return apiClient(originalRequest);
        } else {
          processQueue(new Error("Token refresh failed"));
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError);
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// ═══════════════════════════════════════════════════════════════
//  MODULE_DISABLED error surfacing (Step 4.2)
//  The backend returns 403 MODULE_DISABLED (via [RequireModule]) when a
//  business lacks a module. The page-level <RequireModule> guard already
//  shows <UpgradePrompt/> on direct navigation; this helper lets any
//  fetch/action toast surface upgrade messaging instead of a terse error
//  when a locked-module endpoint is hit through the API client.
// ═══════════════════════════════════════════════════════════════

/** True when the error is an axios 403 whose envelope carries MODULE_DISABLED. */
export function isModuleDisabledError(error: unknown): boolean {
  const code =
    (error as { response?: { data?: { error?: { code?: string } } } })
      ?.response?.data?.error?.code;
  return code === "MODULE_DISABLED";
}

/** Upgrade messaging surfaced in error toasts for locked modules. */
export const MODULE_DISABLED_MESSAGE =
  "This feature isn't part of your current plan. Upgrade to unlock it.";

/**
 * Extracts a toast-friendly message from any error. Special-cases
 * MODULE_DISABLED (403) so the frontend surfaces upgrade guidance instead
 * of the raw backend "module is not enabled" string. Falls back to the
 * axios/fallback message otherwise.
 */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (isModuleDisabledError(error)) return MODULE_DISABLED_MESSAGE;

  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } })
      .response;
    const message = response?.data?.error?.message;
    if (message) return message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
