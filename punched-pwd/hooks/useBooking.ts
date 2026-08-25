"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { appointmentsApi } from "@/lib/api/appointments";
import { invalidateCache } from "@/lib/api/cache";
import type {
  ApiResponse,
  CancelAppointmentRequest,
  CreateAppointmentRequest,
  RescheduleAppointmentRequest,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Booking orchestrator hook (mirrors useAuth's loading/error/toast
//  shape). Mutations bust the appointment/availability cache groups
//  (frontend.md §12) and navigate to the appointment detail.
// ═══════════════════════════════════════════════════════════════

export function useBooking() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Extract error message from Axios error or API response. */
  const getErrorMessage = (err: unknown): string => {
    if (err instanceof AxiosError && err.response?.data) {
      const data = err.response.data as ApiResponse<unknown>;
      return data.error?.message || "An unexpected error occurred.";
    }
    if (err instanceof Error) return err.message;
    return "An unexpected error occurred.";
  };

  /** Invalidate the appointment + availability cache groups after a mutation. */
  const invalidateBookingCaches = useCallback(() => {
    invalidateCache("appointments:mine");
    invalidateCache("appointments:calendar");
    invalidateCache("appointments:staff");
    invalidateCache("availability");
  }, []);

  /** Book an appointment for the customer; navigate to its detail page. */
  const createAppointment = useCallback(
    async (data: CreateAppointmentRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await appointmentsApi.create(data);
        if (result.success && result.data) {
          toast.success("Appointment booked.");
          invalidateBookingCaches();
          // `booked=1` renders the transactional "Booking Confirmed" screen
          router.push("/dashboard/appointments/" + result.data.id + "?booked=1");
        } else {
          const msg = result.error?.message || "Could not book.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [router, invalidateBookingCaches]
  );

  /** Reschedule an existing appointment. */
  const rescheduleAppointment = useCallback(
    async (id: string, data: RescheduleAppointmentRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await appointmentsApi.reschedule(id, data);
        if (result.success) {
          toast.success("Appointment rescheduled.");
          invalidateBookingCaches();
          router.push("/dashboard/appointments/" + id);
        } else {
          const msg = result.error?.message || "Could not reschedule.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [router, invalidateBookingCaches]
  );

  /** Cancel an existing appointment and return to the list. */
  const cancelAppointment = useCallback(
    async (id: string, data?: CancelAppointmentRequest) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await appointmentsApi.cancel(id, data);
        if (result.success) {
          toast.success("Appointment cancelled.");
          invalidateBookingCaches();
          router.push("/dashboard/appointments");
        } else {
          const msg = result.error?.message || "Could not cancel.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [router, invalidateBookingCaches]
  );

  return {
    createAppointment,
    rescheduleAppointment,
    cancelAppointment,
    isLoading,
    error,
  };
}