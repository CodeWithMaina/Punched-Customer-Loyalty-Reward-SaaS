import apiClient from "./client";
import { cachedFetch } from "./cache";
import type {
  ApiResponse,
  LoyaltyCard,
  LoyaltyProgram,
  EnrollCardRequest,
  UpsertLoyaltyProgramRequest,
  CreateLoyaltyProgramRequest,
  UpdateLoyaltyProgramRequest,
} from "@/types";

export const loyaltyApi = {
  // Customer: enroll in a business loyalty program
  enroll: (data: EnrollCardRequest) =>
    apiClient.post<ApiResponse<LoyaltyCard>>("/cards/enroll", data).then((r) => r.data),

  // Customer: get all my cards
  getMyCards: () =>
    cachedFetch("loyalty:cards", () =>
      apiClient.get<ApiResponse<LoyaltyCard[]>>("/cards").then((r) => r.data),
      15_000
    ),

  // Customer: get one card by id
  getCard: (cardId: string) =>
    apiClient.get<ApiResponse<LoyaltyCard>>(`/cards/${cardId}`).then((r) => r.data),

  // Get a business's loyalty program (public, legacy)
  getProgram: (businessId: string) =>
    apiClient.get<ApiResponse<LoyaltyProgram>>(`/cards/program/${businessId}`).then((r) => r.data),

  // Business: list all loyalty programs
  listPrograms: () =>
    cachedFetch("loyalty:programs", () =>
      apiClient.get<ApiResponse<LoyaltyProgram[]>>("/programs/me").then((r) => r.data),
      20_000
    ),

  // Business: create a new loyalty program
  createProgram: (data: CreateLoyaltyProgramRequest) =>
    apiClient.post<ApiResponse<LoyaltyProgram>>("/programs/me", data).then((r) => r.data),

  // Business: update a specific loyalty program
  updateProgram: (id: string, data: UpdateLoyaltyProgramRequest) =>
    apiClient.patch<ApiResponse<LoyaltyProgram>>(`/programs/me/${id}`, data).then((r) => r.data),

  // Business: delete a specific loyalty program
  deleteProgram: (id: string) =>
    apiClient.delete<ApiResponse<boolean>>(`/programs/me/${id}`).then((r) => r.data),

  // Business: legacy upsert (kept for backward-compatibility)
  upsertProgram: (data: UpsertLoyaltyProgramRequest) =>
    apiClient.put<ApiResponse<LoyaltyProgram>>("/programs/me", data).then((r) => r.data),
};
