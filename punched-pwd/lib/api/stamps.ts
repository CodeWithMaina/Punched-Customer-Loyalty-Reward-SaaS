import apiClient from "./client";
import type {
  ApiResponse,
  AwardStampRequest,
  StampAwardedResponse,
  ResolveQrResponse,
  ManualLookupRequest,
  ManualLookupResponse,
  StampAdjustmentRequest,
  StampAdjustmentResponse,
  EnrollAndStampRequest,
} from "@/types";

/** Axios config that carries an idempotency key on retryable award calls. */
export interface IdempotentConfig {
  idempotencyKey?: string;
}

const withIdempotency = (key?: string) =>
  key ? { headers: { "Idempotency-Key": key } } : undefined;

export const stampsApi = {
  award: (data: AwardStampRequest, config?: IdempotentConfig) =>
    apiClient
      .post<ApiResponse<StampAwardedResponse>>("/stamps/award", data, withIdempotency(config?.idempotencyKey))
      .then((r) => r.data),

  /** POST /stamps/resolve — preview a QR token without consuming it. */
  resolve: (data: AwardStampRequest) =>
    apiClient
      .post<ApiResponse<ResolveQrResponse>>("/stamps/resolve", data)
      .then((r) => r.data),

  /** POST /stamps/adjust — Business-only manual stamp correction. */
  adjust: (data: StampAdjustmentRequest) =>
    apiClient
      .post<ApiResponse<StampAdjustmentResponse>>("/stamps/adjust", data)
      .then((r) => r.data),

  /** POST /stamps/lookup — phone fallback issuing a one-time manual token. */
  lookup: (data: ManualLookupRequest) =>
    apiClient
      .post<ApiResponse<ManualLookupResponse>>("/stamps/lookup", data)
      .then((r) => r.data),

  /** POST /cards/enroll-and-stamp — enroll then award in one call. */
  enrollAndStamp: (data: EnrollAndStampRequest, config?: IdempotentConfig) =>
    apiClient
      .post<ApiResponse<StampAwardedResponse>>("/cards/enroll-and-stamp", data, withIdempotency(config?.idempotencyKey))
      .then((r) => r.data),
};
