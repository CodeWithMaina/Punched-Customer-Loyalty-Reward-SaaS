import apiClient from "./client";
import type { ApiResponse, User, UpdateProfileRequest } from "@/types";

export const usersApi = {
  getProfile: () =>
    apiClient.get<ApiResponse<User>>("/users/profile").then((r) => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.patch<ApiResponse<User>>("/users/profile", data).then((r) => r.data),
};
