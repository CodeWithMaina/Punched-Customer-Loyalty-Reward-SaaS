"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import { invalidateCache } from "@/lib/api/cache";
import type { AppointmentResponse, StaffBusinessResponse } from "@/types";
import { Calendar, CalendarDays, ChevronRight, Loader2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export default function StaffDashboardPage() {
  useRoleGuard("Staff");

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [business, setBusiness] = useState<StaffBusinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      appointmentsApi.getStaffAppointments({ pageSize: 5 }).catch(() => null),
      businessesApi.getStaffBusiness().catch(() => null),
    ]).then(([apptRes, bizRes]) => {
      if (apptRes?.success && apptRes.data) setAppointments(apptRes.data);
      if (bizRes?.success && bizRes.data) setBusiness(bizRes.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (
    id: string,
    action: "confirm" | "complete" | "no-show"
  ) => {
    setActionLoading(id);
    const res = await appointmentsApi.staffAction(id, action);
    if (res.success) {
      // Cache discipline (frontend.md §12): bust the four appointment
      // cache groups before re-fetching.
      invalidateCache("appointments:mine");
      invalidateCache("appointments:calendar");
      invalidateCache("appointments:staff");
      invalidateCache("availability");
      load();
    }
    setActionLoading(null);
  };

  const now = new Date();
  const upcoming = appointments.filter(
    (a) =>
      new Date(a.scheduledAt) >= now &&
      !["cancelled", "no_show"].includes(a.status)
  );

  return (
    <div className="max-w-lg mx-auto pb-24 px-4 pt-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {business?.businessName ?? "My Dashboard"}
          </h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
            {upcoming.length} upcoming appointment{upcoming.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/dashboard/staff/appointments"
          className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover transition-colors"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
      ) : !business ? (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-8 text-center space-y-2">
          <CalendarDays className="h-10 w-10 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">
            You are not linked to a business yet.
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Ask your business owner to invite you as staff.
          </p>
        </div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] p-8 text-center space-y-2">
          <Calendar className="h-10 w-10 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">
            No upcoming appointments assigned to you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((a) => (
            <StaffAppointmentCard
              key={a.id}
              a={a}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StaffAppointmentCard({
  a,
  onAction,
  actionLoading,
}: {
  a: AppointmentResponse;
  onAction: (id: string, action: "confirm" | "complete" | "no-show") => void;
  actionLoading: string | null;
}) {
  return (
    <Link
      href="/dashboard/staff/appointments"
      className="block bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
          <Calendar className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {a.services?.[0]?.name ?? "Appointment"}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {new Date(a.scheduledAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}{" "}
            {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-brand-surface text-brand inline-block mt-1">
            {STATUS_LABEL[a.status] ?? a.status}
          </span>
        </div>
      </div>

      <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
        {(a.status === "pending" || a.status === "draft") && (
          <>
            <button
              onClick={() => onAction(a.id, "confirm")}
              disabled={actionLoading === a.id}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl text-xs disabled:opacity-50"
            >
              {actionLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Confirm"}
            </button>
            <button
              onClick={() => onAction(a.id, "no-show")}
              disabled={actionLoading === a.id}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl text-xs disabled:opacity-50"
            >
              {actionLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "No-Show"}
            </button>
          </>
        )}
        {a.status === "confirmed" && (
          <button
            onClick={() => onAction(a.id, "complete")}
            disabled={actionLoading === a.id}
            className="flex-1 bg-brand hover:bg-brand-hover text-white font-semibold py-2.5 rounded-xl text-xs disabled:opacity-50"
          >
            {actionLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Mark Complete"}
          </button>
        )}
      </div>
    </Link>
  );
}

