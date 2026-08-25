"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import { invalidateCache } from "@/lib/api/cache";

const invalidateCalendar = () => invalidateCache("appointments:calendar");

/**
 * Appointment mutations (cancel / status actions / booking on behalf
 * of a customer). `reload` re-fetches the week after a successful
 * mutation; `onCompleted` lets the page close the detail drawer.
 */
export function useAppointmentActions({
  reload,
  onCompleted,
}: {
  reload: () => void;
  onCompleted?: () => void;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!globalThis.confirm("Cancel this appointment?")) return;

    setActionLoading(id);

    const response = await appointmentsApi.businessAction(id, "cancel");

    if (response.success) {
      toast.success("Appointment cancelled.");
      invalidateCalendar();
      reload();
    } else {
      toast.error(
        response.error?.message || "Could not cancel the appointment."
      );
    }

    setActionLoading(null);
  };

  const handleAction = async (
    id: string,
    action: "complete" | "no-show" | "confirm" | "cancel"
  ) => {
    setActionLoading(id);

    const response = await appointmentsApi.businessAction(id, action);

    if (response.success) {
      toast.success(`Appointment ${action.replace("-", " ")}.`);
      invalidateCalendar();
      onCompleted?.();
      reload();
    } else {
      toast.error(response.error?.message || "Action failed.");
    }

    setActionLoading(null);
  };

  const bookForCustomer = async (book: {
    customerId: string;
    serviceId: string;
    staffUserId?: string;
    scheduledAt: string;
  }) => {
    const businessResponse = await businessesApi.getMine().catch(() => null);

    const businessId =
      businessResponse?.success && businessResponse.data
        ? businessResponse.data.id
        : undefined;

    if (!businessId) {
      toast.error("Business profile unavailable.");
      return;
    }

    const response = await appointmentsApi
      .createForCustomer({
        businessId,
        serviceIds: [book.serviceId],
        staffUserId: book.staffUserId || undefined,
        scheduledAt: book.scheduledAt,
        customerId: book.customerId,
      })
      .catch(() => null);

    if (response?.success) {
      toast.success("Appointment booked.");
      invalidateCalendar();
      onCompleted?.();
      reload();
      return true;
    }

    toast.error(response?.error?.message || "Could not book appointment.");
    return false;
  };

  return { actionLoading, handleCancel, handleAction, bookForCustomer };
}