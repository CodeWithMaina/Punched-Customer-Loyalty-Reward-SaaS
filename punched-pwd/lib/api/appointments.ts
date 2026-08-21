import apiClient from "./client";
import { cachedFetch, invalidateCache } from "./cache";
import type {
  ApiResponse,
  AppointmentResponse,
  AvailabilitySlotResponse,
  CancelAppointmentRequest,
  CreateAppointmentOnBehalfRequest,
  CreateAppointmentRequest,
  PaginatedResponse,
  RescheduleAppointmentRequest,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Appointment + availability API client (mirrors businessesApi).
//  Cache keys/TTLs per frontend.md §12; mutations invalidate the
//  appointment/availability cache groups.
// ═══════════════════════════════════════════════════════════════

/** After any appointment mutation, bust the affected cache groups (§12). */
function invalidateBookingCaches(): void {
  invalidateCache("appointments:mine");
  invalidateCache("appointments:calendar");
  invalidateCache("appointments:staff");
  invalidateCache("availability");
}

export type BusinessAppointmentsQuery = {
  staffId?: string;
  customerId?: string;
  serviceId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type StaffAppointmentsQuery = {
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type AvailabilityQuery = {
  serviceIds?: string[];
  staffId?: string;
  startDate?: string;
  endDate?: string;
};

export type BusinessAppointmentAction =
  | "reschedule"
  | "cancel"
  | "confirm"
  | "complete"
  | "no-show";

export type StaffAppointmentAction = "confirm" | "complete" | "no-show";

export const appointmentsApi = {
  // ── Customer self-service ────────────────────────────────────
  getMyAppointments: (
    params?: { upcoming?: boolean; status?: string; from?: string; to?: string }
  ) =>
    cachedFetch(
      "appointments:mine:" + JSON.stringify(params ?? {}),
      () =>
        apiClient
          .get<ApiResponse<AppointmentResponse[]>>("/appointments", {
            params: params ?? undefined,
          })
          .then((r) => r.data),
      15_000
    ),

  getAppointment: (id: string) =>
    apiClient
      .get<ApiResponse<AppointmentResponse>>("/appointments/" + id)
      .then((r) => r.data),

  create: (data: CreateAppointmentRequest) =>
    apiClient
      .post<ApiResponse<AppointmentResponse>>("/appointments", data)
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateBookingCaches();
        return result;
      }),

  reschedule: (id: string, data: RescheduleAppointmentRequest) =>
    apiClient
      .post<ApiResponse<AppointmentResponse>>(`/appointments/${id}/reschedule`, data)
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateBookingCaches();
        return result;
      }),

  cancel: (id: string, data?: CancelAppointmentRequest) =>
    apiClient
      .post<ApiResponse<AppointmentResponse>>(`/appointments/${id}/cancel`, data)
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateBookingCaches();
        return result;
      }),

  // ── Owner calendar ───────────────────────────────────────────
  getBusinessAppointments: (params?: BusinessAppointmentsQuery) =>
    cachedFetch(
      "appointments:calendar:" + JSON.stringify(params ?? {}),
      () =>
        apiClient
          .get<ApiResponse<PaginatedResponse<AppointmentResponse>>>(
            "/businesses/me/appointments",
            { params: params ?? undefined }
          )
          .then((r) => r.data),
      15_000
    ),

  getBusinessAppointment: (id: string) =>
    apiClient
      .get<ApiResponse<AppointmentResponse>>("/businesses/me/appointments/" + id)
      .then((r) => r.data),

  createForCustomer: (data: CreateAppointmentOnBehalfRequest) =>
    apiClient
      .post<ApiResponse<AppointmentResponse>>("/businesses/me/appointments", data)
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateBookingCaches();
        return result;
      }),

  businessAction: (
    id: string,
    action: BusinessAppointmentAction,
    data?: { scheduledAt?: string; serviceIds?: string[]; staffUserId?: string; note?: string }
  ) =>
    apiClient
      .post<ApiResponse<AppointmentResponse>>(
        `/businesses/me/appointments/${id}/${action}`,
        data ?? {}
      )
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateBookingCaches();
        return result;
      }),

  // ── Staff calendar ───────────────────────────────────────────
  getStaffAppointments: (params?: StaffAppointmentsQuery) =>
    cachedFetch(
      "appointments:staff:" + JSON.stringify(params ?? {}),
      () =>
        apiClient
          .get<ApiResponse<AppointmentResponse[]>>("/businesses/staff/appointments", {
            params: params ?? undefined,
          })
          .then((r) => r.data),
      15_000
    ),

  getStaffAppointment: (id: string) =>
    apiClient
      .get<ApiResponse<AppointmentResponse>>("/businesses/staff/appointments/" + id)
      .then((r) => r.data),

  staffAction: (id: string, action: StaffAppointmentAction) =>
    apiClient
      .post<ApiResponse<AppointmentResponse>>(
        `/businesses/staff/appointments/${id}/${action}`
      )
      .then((r) => r.data)
      .then((result) => {
        if (result.success) invalidateBookingCaches();
        return result;
      }),

  // ── Availability (anonymous read) ────────────────────────────
  getAvailability: (businessId: string, params: AvailabilityQuery) =>
    cachedFetch(
      "availability:" + businessId + ":" + JSON.stringify(params),
      () =>
        apiClient
          .get<ApiResponse<AvailabilitySlotResponse[]>>(
            `/businesses/${businessId}/availability`,
            { params }
          )
          .then((r) => r.data),
      20_000
    ),
};
