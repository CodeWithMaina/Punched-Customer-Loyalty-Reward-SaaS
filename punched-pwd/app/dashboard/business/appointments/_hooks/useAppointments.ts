"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import { servicesApi } from "@/lib/api/services";
import { SERVER_STATUSES } from "../_utils/appointment-utils";
import type {
  AppointmentResponse,
  BusinessCustomer,
  ServiceCatalogItemResponse,
  StaffMember,
} from "@/types";

type Params = {
  weekRange: { start: Date; end: Date };
  statusFilter: string;
  staffFilter: string;
  customerFilter: string;
  serviceFilter: string;
};

/**
 * Owns all data fetching for the page: the week-scoped appointment
 * query (server-filtered by the active filters the API supports)
 * plus stable reference data (customers / staff / services).
 */
export function useAppointments({
  weekRange,
  statusFilter,
  staffFilter,
  customerFilter,
  serviceFilter,
}: Params) {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [customers, setCustomers] = useState<BusinessCustomer[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceCatalogItemResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Appointments: DB-filtered by week range + active filters (never client-dumped). */
  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    appointmentsApi
      .getBusinessAppointments({
        from: weekRange.start.toISOString(),
        to: weekRange.end.toISOString(),
        ...(SERVER_STATUSES.has(statusFilter)
          ? { status: statusFilter }
          : {}),
        ...(staffFilter !== "all" ? { staffId: staffFilter } : {}),
        ...(customerFilter !== "all" ? { customerId: customerFilter } : {}),
        ...(serviceFilter !== "all" ? { serviceId: serviceFilter } : {}),
        pageSize: 200,
      })
      .then((apptRes) => {
        if (apptRes?.success && apptRes.data) {
          setAppointments(apptRes.data.items ?? []);
        }
      })
      .catch(() => {
        setError("We couldn't load your appointments.");
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekRange, statusFilter, staffFilter, customerFilter, serviceFilter]);

  /** Reference data (customers/staff/services) is stable — fetch once. */
  useEffect(() => {
    Promise.all([
      businessesApi.getMyCustomers({ pageSize: 500 }).catch(() => null),
      businessesApi.getMyStaff({}).catch(() => null),
      servicesApi.getMyServices().catch(() => null),
    ]).then(([custRes, staffRes, svcRes]) => {
      if (custRes?.success && custRes.data) {
        setCustomers(custRes.data.items ?? []);
      }
      if (staffRes?.success && staffRes.data) {
        setStaff(staffRes.data.items ?? []);
      }
      if (svcRes?.success && svcRes.data) {
        setServices(svcRes.data.filter((service) => service.isActive));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const customerMap = useMemo(() => {
    const map = new Map<string, BusinessCustomer>();

    customers.forEach((customer) => {
      map.set(customer.userId, customer);
    });

    return map;
  }, [customers]);

  const staffMap = useMemo(() => {
    const map = new Map<string, StaffMember>();

    staff.forEach((member) => {
      map.set(member.userId, member);
    });

    return map;
  }, [staff]);

  const counts = useMemo(() => {
    const now = new Date();
    const today = dayKey(now.toISOString());

    const todayAppointments = appointments.filter(
      (appointment) => dayKey(appointment.scheduledAt) === today
    );

    const upcoming = appointments.filter(
      (appointment) =>
        new Date(appointment.scheduledAt) >= now &&
        !["cancelled", "no_show", "completed"].includes(appointment.status)
    );

    const pending = appointments.filter((appointment) =>
      ["pending", "draft"].includes(appointment.status)
    );

    const completed = appointments.filter(
      (appointment) => appointment.status === "completed"
    );

    return {
      today: todayAppointments.length,
      upcoming: upcoming.length,
      pending: pending.length,
      completed: completed.length,
    };
  }, [appointments]);

  return {
    appointments,
    customers,
    staff,
    services,
    loading,
    error,
    reload: load,
    customerMap,
    staffMap,
    counts,
  };
}

function dayKey(iso: string) {
  const date = new Date(iso);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}