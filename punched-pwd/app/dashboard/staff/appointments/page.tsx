"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import type { AppointmentResponse, StaffBusinessResponse } from "@/types";
import { Clock, Loader2 } from "lucide-react";

import { STATUS_LABEL } from "@/lib/appointment-status";

export default function StaffAppointmentsPage() {
  useRoleGuard("Staff");
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [business, setBusiness] = useState<StaffBusinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      appointmentsApi.getStaffAppointments(),
      businessesApi.getStaffBusiness(),
    ])
      .then(([apptRes, bizRes]) => {
        if (apptRes.success && apptRes.data) setAppointments(apptRes.data);
        if (bizRes.success && bizRes.data) setBusiness(bizRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, action: "confirm" | "complete" | "no-show") => {
    setActionLoading(id);
    const res = await appointmentsApi.staffAction(id, action);
    if (res.success) load();
    setActionLoading(null);
  };

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => new Date(a.scheduledAt) >= now && !["cancelled", "no_show"].includes(a.status)
  );
  const past = appointments.filter(
    (a) => new Date(a.scheduledAt) < now || ["completed", "cancelled", "no_show"].includes(a.status)
  );

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <div className="px-5 pt-5 pb-4">
          <div className="h-6 w-36 bg-[var(--surface-raised)] rounded animate-pulse" />
        </div>
        <div className="px-5 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-[var(--surface-raised)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          {business?.businessName ?? "My Appointments"}
        </h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">{appointments.length} appointments</p>
      </div>

      <div className="px-5 space-y-6">
        {upcoming.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">Upcoming</p>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <StaffAppointmentCard key={a.id} a={a} onAction={handleAction} actionLoading={actionLoading} />
              ))}
            </div>
          </div>
        )}
        {past.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">Past</p>
            <div className="space-y-3">
              {past.map((a) => (
                <div key={a.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
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
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-brand-surface text-brand flex-shrink-0">
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
      <div className="flex items-center gap-3 mb-3">
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
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-brand-surface text-brand inline-block mt-1">
            {STATUS_LABEL[a.status] ?? a.status}
          </span>
        </div>
      </div>

      {(a.status === "pending" || a.status === "draft") && (
        <div className="flex gap-2">
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
        </div>
      )}
      {a.status === "confirmed" && (
        <button
          onClick={() => onAction(a.id, "complete")}
          disabled={actionLoading === a.id}
          className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-2.5 rounded-xl text-xs disabled:opacity-50"
        >
          {actionLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Mark Complete"}
        </button>
      )}
    </div>
  );
}