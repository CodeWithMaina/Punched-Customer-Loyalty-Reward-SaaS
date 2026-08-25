"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useBooking } from "@/hooks/useBooking";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import type { AppointmentResponse, Business } from "@/types";
import { ArrowLeft, CalendarDays, CheckCircle2, User } from "lucide-react";

const HEADLINE = "'Plus Jakarta Sans', sans-serif";
const MONO = "'Space Mono', monospace";

import { STATUS_LABEL } from "@/lib/appointment-status";

export default function AppointmentDetailPage() {
  useRoleGuard("Customer");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justBooked = searchParams.get("booked") === "1";
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-5 pt-8 pb-24">
        <div className="h-6 w-32 bg-[var(--surface-raised)] animate-pulse mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-[var(--surface-raised)] border border-[var(--border)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-lg mx-auto pb-24 px-5 pt-8 text-center">
        <CalendarDays className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-[var(--text-secondary)]">Appointment not found.</p>
        <Link href="/dashboard/appointments" className="text-sm text-brand mt-3 inline-flex">
          ← Back to appointments
        </Link>
      </div>
    );
  }

  /* ── Transactional "Booking Confirmed" screen ── */
  if (justBooked) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-5 py-12">
        <div aria-hidden className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0">
          <span
            className="font-extrabold text-[30vw] whitespace-nowrap text-white opacity-[0.02]"
            style={{ fontFamily: HEADLINE }}
          >
            SUCCESS
          </span>
        </div>

        <main className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
          <CheckCircle2 className="h-20 w-20 text-accent mb-10" strokeWidth={1.25} aria-hidden />

          <h1
            className="text-[44px] leading-[48px] md:text-6xl md:leading-none font-extrabold tracking-tighter text-[var(--text-primary)] mb-8"
            style={{ fontFamily: HEADLINE }}
          >
            Booking<br />Confirmed
          </h1>

          <div className="relative w-full border border-[var(--border)] bg-[var(--surface)] p-8 mb-10 text-left">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
            <div className="flex flex-col gap-6">
              <div className="border-b border-[var(--border)] pb-4">
                <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-1">Reference</p>
                <p className="text-sm truncate" style={{ fontFamily: MONO }}>
                  #{appointment.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="border-b border-[var(--border)] pb-4">
                <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-1">Date &amp; Time</p>
                <p className="text-sm" style={{ fontFamily: MONO }}>
                  {formatDate(appointment.scheduledAt)} · {formatTime(appointment.scheduledAt)}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-1">Location</p>
                <p className="text-sm" style={{ fontFamily: MONO }}>
                  {business?.name ?? "Confirmed business"}
                  {business?.location ? (<><br />{business.location}</>) : null}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link
              href="/dashboard/appointments"
              className="flex-1 bg-[var(--text-primary)] text-[var(--background)] py-4 px-6 hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] transition-colors duration-300 uppercase tracking-widest text-xs text-center"
            >
              View Bookings
            </Link>
            {canReschedule && (
              <button
                onClick={handleReschedule}
                disabled={isMutating}
                className="flex-1 bg-transparent border border-[var(--text-primary)] text-[var(--text-primary)] py-4 px-6 hover:bg-[var(--text-primary)] hover:text-[var(--background)] transition-colors duration-300 uppercase tracking-widest text-xs disabled:opacity-40"
              >
                Reschedule
              </button>
            )}
          </div>

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={isMutating}
              className="mt-6 text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] underline underline-offset-4 hover:text-danger transition-colors disabled:opacity-40"
            >
              Cancel this booking
            </button>
          )}
        </main>
      </div>
    );
  }

  /* ── Standard detail view ── */
  return (
    <div className="max-w-2xl mx-auto pb-32 relative overflow-x-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-6 flex items-center justify-between gap-4">
        <Link
          href="/dashboard/appointments"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-brand transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-[10px] tracking-[0.15em] uppercase font-bold hidden sm:inline">Back</span>
        </Link>
        <span className="text-[10px] tracking-[0.15em] uppercase font-bold px-3 py-1 border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)]">
          {statusLabel}
        </span>
      </div>

      <h1
        className="px-5 text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-8"
        style={{ fontFamily: HEADLINE }}
      >
        {business?.name ?? "Appointment"}
      </h1>

      {/* Details list */}
      <div className="mx-5 border border-[var(--border)] bg-[var(--surface)] relative overflow-hidden">
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
        <ul>
          <li className="flex flex-col gap-1 py-4 px-5 border-b border-[var(--border)]">
            <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">When</span>
            <span className="text-sm text-[var(--text-primary)]" style={{ fontFamily: MONO }}>
              {formatDate(appointment.scheduledAt)} · {formatTime(appointment.scheduledAt)} – {formatTime(appointment.endAt)}
            </span>
          </li>
          {business?.location && (
            <li className="flex flex-col gap-1 py-4 px-5 border-b border-[var(--border)]">
              <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">Location</span>
              <span className="text-sm text-[var(--text-primary)]">{business.location}</span>
            </li>
          )}
          <li className="flex flex-col gap-2 py-4 px-5 border-b border-[var(--border)]">
            <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">Services</span>
            <div className="space-y-1.5">
              {appointment.services?.map((svc) => (
                <div key={svc.serviceCatalogItemId} className="flex justify-between gap-4 text-sm">
                  <span className="text-[var(--text-primary)]">{svc.name}</span>
                  <span className="text-[var(--text-tertiary)] flex-shrink-0" style={{ fontFamily: MONO }}>
                    {svc.durationMinutes} min{svc.price > 0 ? ` · KES ${svc.price}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </li>
          {appointment.staffUserId && (
            <li className="flex items-center gap-3 py-4 px-5 border-b border-[var(--border)]">
              <div className="h-8 w-8 border border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
              </div>
              <span className="text-sm text-[var(--text-secondary)]">Staff member assigned</span>
            </li>
          )}
          <li className="flex items-center justify-between gap-4 py-4 px-5">
            <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">Reference</span>
            <span className="text-sm truncate" style={{ fontFamily: MONO }}>
              #{appointment.id.slice(0, 8).toUpperCase()}
            </span>
          </li>
        </ul>
      </div>

      {/* Action buttons */}
      {(canCancel || canReschedule) && (
        <div className="fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-[var(--border)] p-4 safe-area-bottom z-40">
          <div className="max-w-2xl mx-auto flex gap-3">
            {canReschedule && (
              <button onClick={handleReschedule} disabled={isMutating}
                className="flex-1 border border-[var(--border)] bg-transparent hover:border-[var(--text-primary)] text-[var(--text-primary)] py-3.5 uppercase tracking-widest text-xs font-bold disabled:opacity-40 transition-colors">
                Reschedule
              </button>
            )}
            {canCancel && (
              <button onClick={handleCancel} disabled={isMutating}
                className="flex-1 border border-transparent bg-danger text-white py-3.5 uppercase tracking-widest text-xs font-bold disabled:opacity-50 transition-colors hover:bg-red-600">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
