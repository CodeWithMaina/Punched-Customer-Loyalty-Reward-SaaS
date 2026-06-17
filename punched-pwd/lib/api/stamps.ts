import apiClient from "./client";
import type { ApiResponse, AwardStampRequest, StampAwardedResponse } from "@/types";

export const stampsApi = {
  award: (data: AwardStampRequest) =>
    apiClient
      .post<ApiResponse<StampAwardedResponse>>("/stamps/award", data)
      .then((r) => r.data),
};
