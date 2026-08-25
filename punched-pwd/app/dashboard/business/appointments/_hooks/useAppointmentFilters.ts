"use client";

import { useCallback, useMemo, useState } from "react";
import { dayKey, getPrice } from "../_utils/appointment-utils";
import type {
  AppointmentResponse,
  BusinessCustomer,
  StaffMember,
} from "@/types";

export type AppointmentFilterState = {
  query: string;
  statusFilter: string;
  serviceFilter: string;
  staffFilter: string;
  customerFilter: string;
  priceFilter: string;
  dateFilter: string;
};

const DEFAULT_FILTERS: AppointmentFilterState = {
  query: "",
  statusFilter: "all",
  serviceFilter: "all",
  staffFilter: "all",
  customerFilter: "all",
  priceFilter: "all",
  dateFilter: "upcoming",
};

/** Owns the raw filter state + reset behaviour. */
export function useAppointmentFilterState() {
  const [filters, setFilters] = useState<AppointmentFilterState>(DEFAULT_FILTERS);

  const setQuery = useCallback(
    (query: string) => setFilters((f) => ({ ...f, query })),
    []
  );

  const setFilter = useCallback(
    <K extends keyof AppointmentFilterState>(key: K, value: string) =>
      setFilters((f) => ({ ...f, [key]: value })),
    []
  );

  const clearAll = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  return { filters, setQuery, setFilter, clearAll };
}

/**
 * Pure client-side refinement pipeline over the week-scoped,
 * server-filtered result set. Logic preserved verbatim.
 */
export function useFilteredAppointments({
  appointments,
  filters,
  customerMap,
  staffMap,
}: {
  appointments: AppointmentResponse[];
  filters: AppointmentFilterState;
  customerMap: Map<string, BusinessCustomer>;
  staffMap: Map<string, StaffMember>;
}) {
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const q = filters.query.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        if (
          filters.statusFilter !== "all" &&
          appointment.status !== filters.statusFilter
        ) {
          return false;
        }

        if (
          filters.staffFilter !== "all" &&
          appointment.staffUserId !== filters.staffFilter
        ) {
          return false;
        }

        if (
          filters.customerFilter !== "all" &&
          appointment.customerId !== filters.customerFilter
        ) {
          return false;
        }

        const price = getPrice(appointment);

        if (filters.priceFilter === "free" && price > 0) return false;
        if (filters.priceFilter === "under-1000" && price >= 1000) return false;
        if (
          filters.priceFilter === "1000-5000" &&
          (price < 1000 || price > 5000)
        ) {
          return false;
        }
        if (filters.priceFilter === "over-5000" && price <= 5000) return false;

        if (filters.dateFilter === "today") {
          if (dayKey(appointment.scheduledAt) !== dayKey(now.toISOString())) {
            return false;
          }
        }

        if (filters.dateFilter === "upcoming") {
          if (new Date(appointment.scheduledAt) < now) return false;
        }

        if (filters.dateFilter === "past") {
          if (new Date(appointment.scheduledAt) >= now) return false;
        }

        if (q) {
          const customer =
            customerMap.get(appointment.customerId)?.fullName ?? "";

          const service =
            appointment.services?.map((item) => item.name).join(" ") ?? "";

          const staffName = appointment.staffUserId
            ? staffMap.get(appointment.staffUserId)?.fullName ?? ""
            : "";

          const searchable = `${customer} ${service} ${staffName}`.toLowerCase();

          if (!searchable.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime()
      );
  }, [
    appointments,
    filters.query,
    filters.statusFilter,
    filters.staffFilter,
    filters.customerFilter,
    filters.priceFilter,
    filters.dateFilter,
    customerMap,
    staffMap,
  ]);

  /** Appointments per day of the displayed week (strip badges). */
  const weekDayCounts = useMemo(() => {
    const map: Record<string, number> = {};
    filteredAppointments.forEach((appointment) => {
      const key = dayKey(appointment.scheduledAt);
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [filteredAppointments]);

  return { filteredAppointments, weekDayCounts };
}