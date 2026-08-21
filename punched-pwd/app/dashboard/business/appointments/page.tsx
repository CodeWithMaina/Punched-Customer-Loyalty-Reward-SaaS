"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { appointmentsApi } from "@/lib/api/appointments";
import type { AppointmentResponse } from "@/types";
import { Clock, ChevronRight, Calendar } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending: "Pending", confirmed: "Confirmed",
  in_progress: "In Progress", completed: "Completed",
  cancelled: "Cancelled", no_show: "No Show",
};

export default function BusinessAppointmentsPage() {
  useRoleGuard("Business");
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    appointmentsApi
      .getBusinessAppointments({ pageSize: 50 })
      .then((res) => {
        if (res.success && res.data) {
          setAppointments(res.data.items ?? []);
          setTotal(res.data.totalCount ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <div className="px-5 pt-5 pb-4">
          <div className="h-6 w-40 bg-[var(--surface-raised)] rounded animate-pulse" />
        </div>
        <div className="px-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-[var(--surface-raised)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Appointments</h1>
        <span className="text-xs text-[var(--text-tertiary)]">{total} total</span>
      </div>

      <div className="px-5 space-y-3">
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No appointments found.</p>
          </div>
        ) : (
          appointments.map((a) => (
            <Link key={a.id} href={`/dashboard/business/appointments/${a.id}`}
              className="block bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 hover:bg-[var(--surface-raised)] transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {a.services?.[0]?.name ?? "Appointment"}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {new Date(a.scheduledAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}{" "}
                    {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-brand-surface text-brand">
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}