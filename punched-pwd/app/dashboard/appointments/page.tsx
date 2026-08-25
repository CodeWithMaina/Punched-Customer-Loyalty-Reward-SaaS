"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { appointmentsApi } from "@/lib/api/appointments";
import type { AppointmentResponse } from "@/types";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight } from "lucide-react";

const STATUS_ICON: Record<string, JSX.Element> = {
  draft: <Clock className="h-4 w-4 text-brand" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
  confirmed: <CheckCircle className="h-4 w-4 text-blue-500" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  cancelled: <XCircle className="h-4 w-4 text-red-500" />,
  no_show: <AlertCircle className="h-4 w-4 text-orange-500" />,
};

import { STATUS_LABEL } from "@/lib/appointment-status";

function AppointmentCard({ appointment }: { appointment: AppointmentResponse }) {
  const status = appointment.status;
  const Icon = STATUS_ICON[status] ?? <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />;
  const label = STATUS_LABEL[status] ?? status;
  const serviceName = appointment.services?.[0]?.name ?? "Appointment";
  const extra = (appointment.services?.length ?? 0) > 1 ? appointment.services!.length - 1 : 0;

  return (
    <Link href={`/dashboard/appointments/${appointment.id}`}
      className="block bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 hover:bg-[var(--surface-raised)] transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">{Icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {serviceName}{extra > 0 && <span className="text-xs text-[var(--text-tertiary)]"> +{extra} more</span>}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {new Date(appointment.scheduledAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
            {" "}•{" "}
            {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          status === "confirmed" || status === "completed"
            ? "bg-green-100 text-green-800"
            : status === "cancelled" || status === "no_show"
            ? "bg-red-100 text-red-800"
            : "bg-brand-surface text-brand"
        }`}>{label}</span>
      </div>
    </Link>
  );
}

export default function MyAppointmentsPage() {
  useRoleGuard("Customer");
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    appointmentsApi
      .getMyAppointments()
      .then((res) => { if (res.success && res.data) setAppointments(res.data); })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = appointments.filter(a =>
    new Date(a.scheduledAt) > now && a.status !== "cancelled" && a.status !== "no_show");
  const past = appointments.filter(a =>
    new Date(a.scheduledAt) <= now || a.status === "completed" || a.status === "cancelled" || a.status === "no_show");

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">My Appointments</h1>
        <Link href="/dashboard/explore" className="text-xs font-semibold text-brand bg-brand-surface px-3 py-1.5 rounded-full">Book new</Link>
      </div>

      {loading ? (
        <div className="px-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-[var(--surface-raised)] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">You have no appointments yet.</p>
          <Link href="/dashboard/explore" className="inline-flex items-center gap-2 text-sm font-semibold text-brand mt-3">
            Browse businesses to book <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">Upcoming</p>
              <div className="space-y-3">{upcoming.map(a => <AppointmentCard key={a.id} appointment={a} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">Past</p>
              <div className="space-y-3">{past.map(a => <AppointmentCard key={a.id} appointment={a} />)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}