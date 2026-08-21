"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useBooking } from "@/hooks/useBooking";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import type { AppointmentResponse, Business } from "@/types";
import { Calendar, User } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending: "Pending", confirmed: "Confirmed",
  in_progress: "In Progress", completed: "Completed",
  cancelled: "Cancelled", no_show: "No Show",
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

export default function AppointmentDetailPage() {
  useRoleGuard("Customer");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const appointmentId = params.id;
  const [appointment, setAppointment] = useState<AppointmentResponse | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const { cancelAppointment, isLoading: isMutating } = useBooking();

  useEffect(() => {
    appointmentsApi
      .getAppointment(appointmentId)
      .then((res) => {
        if (res.success && res.data) {
          setAppointment(res.data);
          businessesApi.getById(res.data.businessId).then((bizRes) => {
            if (bizRes.success && bizRes.data) setBusiness(bizRes.data);
          });
        }
      })
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      cancelAppointment(appointmentId);
    }
  };

  const handleReschedule = () => {
    router.push(`/dashboard/appointments/new?businessId=${appointment?.businessId}&reschedule=${appointmentId}`);
  };

  const status = appointment?.status ?? "draft";
  const statusLabel = STATUS_LABEL[status] ?? status;
  const canCancel = appointment && (status === "pending" || status === "draft" || status === "confirmed");
  const canReschedule = appointment && (status === "pending" || status === "draft" || status === "confirmed");

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <div className="px-5 pt-5 pb-4">
          <div className="h-6 w-32 bg-[var(--surface-raised)] rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-[var(--surface-raised)] rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-lg mx-auto pb-24 px-5 pt-8 text-center">
        <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">Appointment not found.</p>
        <Link href="/dashboard/appointments" className="text-sm text-brand mt-3 inline-flex">
          ← Back to appointments
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-5 pt-5 pb-4 flex items-center justify-between">
        <Link href="/dashboard/appointments" className="text-sm text-[var(--text-secondary)]">← Back</Link>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          STATUS_COLOR[status] ?? "bg-[var(--surface-raised)] text-[var(--text-tertiary)]"
        }`}>{statusLabel}</span>
      </div>

      <div className="px-5 space-y-4">
        {/* Business info */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
            {business?.logoUrl ? (
              <img src={business.logoUrl} alt={business.name} className="h-full w-full object-cover rounded-xl" />
            ) : (<Calendar className="h-5 w-5 text-brand" />)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{business?.name ?? appointment.businessId}</p>
            {business?.location && (
              <p className="text-xs text-[var(--text-tertiary)] truncate">{business.location}</p>
            )}
          </div>
        </div>

        {/* Date & time */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
          <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">When</p>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {new Date(appointment.scheduledAt).toLocaleDateString([], {
              weekday: "long", month: "long", day: "numeric", year: "numeric"
            })}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {" "} –{" "}
            {new Date(appointment.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {/* Services */}
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

        {/* Staff */}
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

        {/* Note */}
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
          <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">Note</p>
          <p className="text-sm text-[var(--text-secondary)]">Appointment ID: {appointment.id}</p>
        </div>
      </div>

      {/* Action buttons */}
      {(canCancel || canReschedule) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-[var(--border-light)] p-4 safe-area-bottom">
          <div className="max-w-lg mx-auto flex gap-3">
            {canReschedule && (
              <button onClick={handleReschedule} disabled={isMutating}
                className="flex-1 border border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] font-semibold py-3.5 rounded-2xl text-sm">Reschedule</button>
            )}
            {canCancel && (
              <button onClick={handleCancel} disabled={isMutating}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50">Cancel</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}