import apiClient from "./client";
import type { ApiResponse, QrTokenResponse, GenerateQrRequest } from "@/types";

export const qrApi = {
  generate: (data: GenerateQrRequest) =>
    apiClient
      .post<ApiResponse<QrTokenResponse>>("/qr/generate", data)
      .then((r) => r.data),
};
