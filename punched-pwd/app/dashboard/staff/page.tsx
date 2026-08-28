"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useModules } from "@/hooks/useModules";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import { invalidateCache } from "@/lib/api/cache";
import type { AppointmentResponse, StaffBusinessResponse } from "@/types";
import {
  Calendar,
  CalendarDays,
  ChevronRight,
  Loader2,
  QrCode,
  ScanLine,
} from "lucide-react";
import { UpgradeBadge } from "@/components/modules/UpgradePrompt";

import { STATUS_LABEL } from "@/lib/appointment-status";

export default function StaffDashboardPage() {
  useRoleGuard("Staff");

  const { hasModule, isLoaded } = useModules();
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
    <div className="max-w-lg lg:max-w-4xl mx-auto pb-24 px-4 pt-6 font-mono">
      {/* Command header */}
      <header className="flex items-end justify-between gap-4 pb-5 border-b border-[var(--border)] mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" aria-hidden="true" />
            Live Terminal
          </p>
          <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-[var(--text-primary)] uppercase leading-none truncate">
            {business?.businessName ?? "My Dashboard"}
          </h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            {upcoming.length} upcoming appointment{upcoming.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/dashboard/staff/appointments"
          className="flex-shrink-0 inline-flex items-center gap-1 border border-[var(--border)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-[var(--background)] transition-colors"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </header>

      {/* Quick actions — primary protocol buttons */}
      {!loading && business && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <Link
            href="/dashboard/staff/scan"
            className="group relative flex items-stretch bg-[var(--brand)] p-1 transition-all active:scale-[0.98]"
          >
            <span className="flex-grow flex flex-col items-start p-4 outline outline-1 outline-[var(--background)]/20">
              <ScanLine className="h-7 w-7 text-[var(--background)] mb-3" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-headline text-sm font-bold uppercase tracking-tight text-[var(--background)]">Scan for Stamp</span>
              <span className="text-[11px] opacity-70 text-[var(--background)]">Initialize loyalty protocol</span>
            </span>
            <span className="w-12 flex items-center justify-center border-l border-[var(--background)]/20">
              <ChevronRight className="h-4 w-4 text-[var(--background)] group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </span>
          </Link>
          <Link
            href="/dashboard/staff/appointments"
            className="group relative flex items-stretch bg-[var(--surface-container-high,var(--surface-raised))] border border-[var(--border)] p-1 transition-all active:scale-[0.98] hover:border-[var(--brand)]"
          >
            <span className="flex-grow flex flex-col items-start p-4 outline outline-1 outline-[var(--border)]">
              <QrCode className="h-7 w-7 text-[var(--brand)] mb-3" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-headline text-sm font-bold uppercase tracking-tight text-[var(--brand)]">Appointments</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">Manage assigned queue</span>
            </span>
            <span className="w-12 flex items-center justify-center border-l border-[var(--border)]">
              <ChevronRight className="h-4 w-4 text-[var(--brand)] group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </span>
          </Link>
        </section>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-none" />
          ))}
        </div>
      ) : !business ? (
        <div className="bg-[var(--surface-container-lowest,var(--surface))] border border-[var(--border)] relative overflow-hidden p-10 text-center space-y-2">
          <span aria-hidden="true" className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]" />
          <CalendarDays className="h-10 w-10 text-[var(--text-muted)] mx-auto" strokeWidth={1.5} />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            You are not linked to a business yet.
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            Ask your business owner to invite you as staff.
          </p>
        </div>
      ) : hasModule('appointments') ? (
        <>
          {/* Today's Log */}
          <section>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-3">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-[var(--brand)]" />Assigned Queue
              </h2>
              <span className="text-[10px] text-[var(--text-muted)]">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="bg-[var(--surface-container-lowest,var(--surface))] border border-[var(--border)] p-10 text-center space-y-2">
                <Calendar className="h-10 w-10 text-[var(--text-muted)] mx-auto" strokeWidth={1.5} />
                <p className="text-xs font-mono text-[var(--text-secondary)]">
                  No upcoming appointments assigned to you.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
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
          </section>
        </>
      ) : isLoaded ? (
        <div className="py-6">
          <UpgradeBadge module="appointments" />
        </div>
      ) : null}
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
  const isLive = a.status === "in_progress";

  return (
    <Link
      href="/dashboard/staff/appointments"
      className={`group relative flex items-center gap-4 p-4 border transition-all hover:border-[var(--brand)] ${
        isLive
          ? "border-[var(--accent)]/40 bg-[var(--accent-light)] overflow-hidden"
          : "border-[var(--border)] bg-[var(--surface-container-lowest,var(--surface))]"
      }`}
    >
      {isLive && (
        <span className="absolute top-0 right-0 px-2 py-0.5 bg-[var(--accent)] text-[8px] font-bold uppercase tracking-widest text-white">
          Live
        </span>
      )}
      {/* Status tick */}
      <span
        aria-hidden="true"
        className={`w-1 h-10 flex-shrink-0 ${isLive ? "bg-[var(--accent)]" : a.status === "cancelled" || a.status === "no_show" ? "bg-[var(--border)]" : "bg-[var(--brand)]"}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] truncate">
          {a.services?.[0]?.name ?? "Appointment"}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)] truncate flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(a.scheduledAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}{" "}
          ·{" "}
          {new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {" · "}
          {STATUS_LABEL[a.status] ?? a.status}
        </p>
      </div>

      {/* Inline actions */}
      <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.preventDefault()}>
        {(a.status === "pending" || a.status === "draft") && (
          <>
            <button
              onClick={() => onAction(a.id, "confirm")}
              disabled={actionLoading === a.id}
              aria-label="Confirm appointment"
              className="px-3 py-2 bg-[var(--success)] text-[var(--background)] text-[9px] font-bold uppercase tracking-widest rounded-none disabled:opacity-50 hover:opacity-80 transition-opacity"
            >
              {actionLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Confirm"}
            </button>
            <button
              onClick={() => onAction(a.id, "no-show")}
              disabled={actionLoading === a.id}
              aria-label="Mark as no-show"
              className="px-3 py-2 border border-[var(--accent)] text-[var(--accent-text,var(--accent))] text-[9px] font-bold uppercase tracking-widest rounded-none disabled:opacity-50 hover:bg-[var(--accent)] hover:text-white transition-colors"
            >
              No-Show
            </button>
          </>
        )}
        {a.status === "confirmed" && (
          <button
            onClick={() => onAction(a.id, "complete")}
            disabled={actionLoading === a.id}
            aria-label="Mark appointment complete"
            className="px-3 py-2 bg-[var(--brand)] text-[var(--background)] text-[9px] font-bold uppercase tracking-widest rounded-none disabled:opacity-50 hover:opacity-80 transition-opacity"
          >
            {actionLoading === a.id ? <Loader2 className="h-3 w-3 animate-spin inline" /> : "Complete"}
          </button>
        )}
      </div>
    </Link>
  );
}

