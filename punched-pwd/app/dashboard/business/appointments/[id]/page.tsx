"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import type { AppointmentResponse, Business } from "@/types";
import { Calendar, Loader2, User } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending: "Pending", confirmed: "Confirmed", completed: "Completed",
  in_progress: "In Progress", cancelled: "Cancelled", no_show: "No Show",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-[var(--surface-raised)] text-[var(--text-tertiary)]",
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
};

export default function BusinessAppointmentDetailPage() {
  useRoleGuard("Business");
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [appointment, setAppointment] = useState<AppointmentResponse | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    appointmentsApi.getBusinessAppointment(id)
      .then((res) => {
        if (res.success && res.data) {
          setAppointment(res.data);
          businessesApi.getMine().then((bizRes) => {
            if (bizRes.success && bizRes.data) setBusiness(bizRes.data);
          });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAction = async (action: "confirm" | "complete" | "no-show" | "cancel") => {
    setActionLoading(action);
    const res = await appointmentsApi.businessAction(id, action);
    if (res.success) load();
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <div className="px-5 pt-5 pb-4">
          <div className="h-6 w-32 bg-[var(--surface-raised)] rounded animate-pulse" />
        </div>
        <div className="px-5 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-[var(--surface-raised)] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-lg mx-auto pb-24 px-5 pt-8 text-center">
        <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Appointment not found.</p>
        <Link href="/dashboard/business/appointments" className="text-sm text-brand mt-3 inline-flex">
          ← Back to appointments
        </Link>
      </div>
    );
  }

  const statusLabel = STATUS_LABEL[appointment.status] ?? appointment.status;
  const statusColor = STATUS_COLOR[appointment.status] ?? "bg-[var(--surface-raised)] text-[var(--text-tertiary)]";

  const actionRelevant =
    appointment.status === "pending" ||
    appointment.status === "draft" ||
    appointment.status === "confirmed" ||
    appointment.status === "in_progress";

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <Link href="/dashboard/business/appointments" className="text-sm text-[var(--text-secondary)]">← Back</Link>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="px-5 mb-4">
        <p className="text-xl font-bold text-[var(--text-primary)]">{appointment.services?.[0]?.name ?? "Appointment"}</p>
        {business?.name && <p className="text-sm text-[var(--text-tertiary)] mt-0.5">{business.name}</p>}
      </div>

      <div className="px-5 space-y-4">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
          <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">When</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {new Date(appointment.scheduledAt).toLocaleDateString([], {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {" "}–{" "}
            {new Date(appointment.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
          <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Services</p>
          <div className="space-y-2">
            {appointment.services?.map((svc) => (
              <div key={svc.serviceCatalogItemId} className="flex justify-between">
                <span className="text-sm text-[var(--text-primary)]">{svc.name}</span>
                <span className="text-sm text-[var(--text-tertiary)]">
                  {svc.durationMinutes} min{svc.price > 0 ? ` • KES ${svc.price}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {appointment.staffUserId && (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Staff</p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[var(--surface-raised)] flex items-center justify-center">
                <User className="h-4 w-4 text-[var(--text-tertiary)]" />
              </div>
              <span className="text-sm text-[var(--text-secondary)]">Staff member assigned</span>
            </div>
          </div>
        )}

        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
          <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Details</p>
          <p className="text-xs text-[var(--text-tertiary)]">Appointment ID: {appointment.id}</p>
        </div>
      </div>

      {actionRelevant && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-[var(--border-light)] p-4 safe-area-bottom">
          <div className="max-w-lg mx-auto flex gap-3">
            {(appointment.status === "pending" || appointment.status === "draft") && (
              <button
                onClick={() => handleAction("confirm")}
                disabled={actionLoading !== null}
                className="flex-1 bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50"
              >
                {actionLoading === "confirm" ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Confirm"}
              </button>
            )}
            {(appointment.status === "pending" || appointment.status === "draft" || appointment.status === "confirmed") && (
              <button
                onClick={() => handleAction("complete")}
                disabled={actionLoading !== null}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50"
              >
                {actionLoading === "complete" ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Complete"}
              </button>
            )}
            {(appointment.status === "pending" || appointment.status === "confirmed") && (
              <button
                onClick={() => handleAction("no-show")}
                disabled={actionLoading !== null}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50"
              >
                {actionLoading === "no-show" ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "No-Show"}
              </button>
            )}
            <button
              onClick={() => handleAction("cancel")}
              disabled={actionLoading !== null}
              className="flex-1 border border-red-200 bg-red-50 text-red-600 font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50"
            >
              {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Cancel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}