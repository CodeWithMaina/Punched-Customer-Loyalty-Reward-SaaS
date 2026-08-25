"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { appointmentsApi } from "@/lib/api/appointments";
import { businessesApi } from "@/lib/api/businesses";
import { invalidateCache } from "@/lib/api/cache";
import toast from "react-hot-toast";
import type {
  AppointmentResponse,
  BusinessCustomer,
} from "@/types";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Mail,
  RefreshCw,
  Terminal,
  User,
  X,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Business Appointment detail — "System Diagnostic" Ops view.
//
//  Visual: supplied Obsidian diagnostic mock-up. Functionality
//  preserved verbatim from the prior implementation:
//   • useRoleGuard("Business") + ownership-gated fetch
//     (appointmentsApi.getBusinessAppointment)
//   • lifecycle via appointmentsApi.businessAction — now including
//     reschedule through the SYS_RESCHEDULE bottom sheet
//   • loading / not-found states + toast feedback
// ═══════════════════════════════════════════════════════════════

import { STATUS_LABEL } from "@/lib/appointment-status";

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const START_HOUR = 9;
const END_HOUR = 20;

export default function BusinessAppointmentDetailPage() {
  useRoleGuard("Business");
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [appointment, setAppointment] = useState<AppointmentResponse | null>(null);
  const [customer, setCustomer] = useState<BusinessCustomer | null>(null);
  const [staffName, setStaffName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      appointmentsApi.getBusinessAppointment(id).catch(() => null),
      businessesApi.getMyCustomers({ pageSize: 500 }).catch(() => null),
      businessesApi.getMyStaff({}).catch(() => null),
    ])
      .then(([apptRes, custRes, staffRes]) => {
        if (apptRes?.success && apptRes.data) {
          const appt = apptRes.data;
          setAppointment(appt);
          if (custRes?.success && custRes.data) {
            setCustomer(custRes.data.items.find((c) => c.userId === appt.customerId) ?? null);
          }
          if (staffRes?.success && staffRes.data && appt.staffUserId) {
            setStaffName(staffRes.data.items.find((s) => s.userId === appt.staffUserId)?.fullName ?? null);
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAction = async (action: "confirm" | "complete" | "no-show" | "cancel") => {
    if (action === "cancel" && !globalThis.confirm("Abort this operation? This cannot be undone.")) return;
    setActionLoading(action);
    const res = await appointmentsApi.businessAction(id, action);
    if (res.success) {
      toast.success(
        action === "cancel" ? "Operation aborted." : `Appointment ${action}ed.`
      );
      invalidateCache("appointments:calendar");
      load();
    } else {
      toast.error(res.error?.message || "Action failed.");
    }
    setActionLoading(null);
  };

  const handleReschedule = async (scheduledAt: string) => {
    setActionLoading("reschedule");
    const res = await appointmentsApi.businessAction(id, "reschedule", { scheduledAt });
    setActionLoading(null);
    if (res.success) {
      toast.success("Appointment rescheduled.");
      invalidateCache("appointments:calendar");
      setSheetOpen(false);
      load();
    } else {
      toast.error(res.error?.message || "Could not reschedule.");
    }
  };

  const status = appointment?.status ?? "draft";
  const canConfirm = status === "pending" || status === "draft";
  const canComplete = canConfirm || status === "confirmed";
  const canReschedule = canConfirm || status === "confirmed";
  const canCancel = canConfirm || status === "confirmed";
  const total = appointment?.services?.reduce((sum, s) => sum + s.price, 0) ?? 0;
  const duration =
    appointment && appointment.endAt
      ? Math.round((new Date(appointment.endAt).getTime() - new Date(appointment.scheduledAt).getTime()) / 60000)
      : appointment?.services?.[0]?.durationMinutes ?? 0;

  if (loading) {
    return (
      <div data-theme="obsidian" className="min-h-screen bg-[var(--surface-container-lowest)] text-[var(--on-surface)] ops-body">
        <div className="pt-24 px-[var(--margin-mobile)] space-y-4">
          <div className="h-8 w-48 mx-auto bg-[var(--surface-container)] animate-pulse" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 border border-[var(--border-low-viz)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div data-theme="obsidian" className="min-h-screen bg-[var(--surface-container-lowest)] text-[var(--on-surface)] ops-body">
        <div className="pt-24 px-5 text-center">
          <CalendarDays className="h-10 w-10 text-[var(--text-dim)] mx-auto mb-3" />
          <p className="ops-body-sm text-[var(--text-dim)]">Target record not found.</p>
          <Link
            href="/dashboard/business/appointments"
            className="mt-4 inline-block border border-[var(--on-surface)] text-[var(--on-surface)] ops-label-caps px-5 py-2"
          >
            Return to schedule
          </Link>
        </div>
      </div>
    );
  }

  const svc = appointment.services?.[0];

  return (
    <div data-theme="obsidian" className="min-h-screen bg-[var(--surface-container-lowest)] text-[var(--on-surface)] ops-body pb-32">
      {/* Diagnostic header */}
      <header className="sticky top-0 z-40 h-12 bg-[var(--surface-container-lowest)] border-b border-[var(--border-low-viz)] flex justify-between items-center px-[var(--margin-mobile)]">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="text-[var(--on-surface)] p-1 hover:bg-[var(--on-surface)] hover:text-[var(--surface-container-lowest)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="ops-label-caps text-[9px] tracking-widest uppercase text-[var(--text-dim)]">System Diagnostic</span>
          <span className="ops-body-sm text-[11px] uppercase tracking-tighter text-[var(--on-surface)]">v.2.4 // Active</span>
        </div>
        <span className="w-6" />
      </header>

      <main className="px-[var(--margin-mobile)] pt-8 flex flex-col gap-6 max-w-xl mx-auto">
        {/* Status badge */}
        <div className="flex justify-center mt-2">
          <div className="bg-[var(--surface)] border border-[var(--border-low-viz)] px-4 py-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="ops-label-caps tracking-widest">{`STATUS: ${(STATUS_LABEL[status] ?? status).toUpperCase()}`}</span>
          </div>
        </div>

        {/* Subject card */}
        <section className="border border-[var(--border-low-viz)] p-6 relative bg-[var(--surface-container-lowest)] mt-2">
          <span className="absolute top-0 right-0 p-2 ops-body-sm text-[10px] text-[var(--text-dim)]">
            ID: TGT-{appointment.id.slice(0, 3).toUpperCase()}
          </span>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 overflow-hidden border border-[var(--border-low-viz)] grayscale shrink-0">
              {customer?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customer.avatarUrl} alt={customer.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--surface-container)]">
                  <User className="h-8 w-8 text-[var(--text-dim)]" />
                </div>
              )}
            </div>
            <div className="pt-2 min-w-0">
              <p className="ops-label-caps text-[9px] text-[var(--text-dim)] mb-1 tracking-widest">SUBJECT</p>
              <h2 className="ops-body-lg uppercase font-bold tracking-tight truncate">
                {customer?.fullName ?? "Guest"}
              </h2>
              <p className="ops-body-sm text-xs text-[var(--text-dim)] mt-1 uppercase border border-[var(--border-low-viz)] inline-block px-2 py-0.5">
                                Tier {Math.min(Math.floor((customer?.lifetimeStamps ?? 0) / 10) + 1, 5)}{" "}
                {"// "}
                {(customer?.totalStamps ?? 0) > 0 ? "Loyal" : "New"}
              </p>
            </div>
          </div>

          {(customer?.phoneNumber || customer?.email) && (
            <div className="flex gap-4 border-t border-[var(--border-low-viz)] pt-4 mt-6">
              {customer?.phoneNumber && (
                <a
                  href={`tel:${customer.phoneNumber}`}
                  className="flex-1 border border-[var(--border-low-viz)] py-3 flex items-center justify-center gap-2 hover:bg-[var(--on-surface)] hover:text-black"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span className="ops-label-caps">EXEC // CALL</span>
                </a>
              )}
              {customer?.email && (
                <a
                  href={`mailto:${customer.email}`}
                  className="flex-1 border border-[var(--border-low-viz)] py-3 flex items-center justify-center gap-2 hover:bg-[var(--on-surface)] hover:text-black"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="ops-label-caps">EXEC // EMAIL</span>
                </a>
              )}
            </div>
          )}
        </section>

        {/* Operation specs */}
        <section className="border border-[var(--border-low-viz)] bg-[var(--surface-container-lowest)]">
          <div className="p-4 border-b border-[var(--border-low-viz)]">
            <p className="ops-label-caps text-[9px] text-[var(--text-dim)] tracking-widest">OP_TYPE</p>
            <p className="ops-body-lg uppercase font-bold tracking-tight">
              {svc?.name ?? "Appointment"}
              {(appointment.services?.length ?? 0) > 1 && (
                <span className="text-[var(--text-dim)] text-xs">
                  {" "}+{appointment.services!.length - 1} more
                </span>
              )}
            </p>
          </div>
          <div className="p-4 border-b border-[var(--border-low-viz)] flex justify-between items-center gap-4">
            <div>
              <p className="ops-label-caps text-[9px] text-[var(--text-dim)] tracking-widest">T_WINDOW</p>
              <p className="ops-body-lg uppercase font-bold tracking-tight">
                                {new Date(appointment.scheduledAt).toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
                {"// "}
                {hhmm(appointment.scheduledAt)}
              </p>
            </div>
            <div className="text-right border-l border-[var(--border-low-viz)] pl-4">
              <p className="ops-label-caps text-[9px] text-[var(--text-dim)] tracking-widest">DUR</p>
              <p className="ops-body-lg uppercase font-bold tracking-tight">{duration}m</p>
            </div>
          </div>
          <div className="p-4 flex justify-between items-center gap-4">
            <div>
              <p className="ops-label-caps text-[9px] text-[var(--text-dim)] tracking-widest">OP_LEAD</p>
              <p className="ops-body-lg uppercase font-bold tracking-tight">{staffName ?? "Unassigned"}</p>
            </div>
            <div className="text-right border-l border-[var(--border-low-viz)] pl-4">
              <p className="ops-label-caps text-[9px] text-[var(--text-dim)] tracking-widest">COST</p>
              <p className="ops-body-lg uppercase font-bold tracking-tight">KES {total.toLocaleString()}</p>
            </div>
          </div>
        </section>

        {/* Action stack */}
        <div className="flex flex-col gap-4 mt-4">
          {canConfirm && (
            <button
              onClick={() => handleAction("confirm")}
              disabled={actionLoading !== null}
              className="w-full bg-[var(--on-surface)] text-[var(--surface-container-lowest)] ops-label-caps py-4 border border-[var(--on-surface)] disabled:opacity-50 tracking-widest uppercase flex items-center justify-center gap-2"
            >
              {actionLoading === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : "CMD: CONFIRM"}
            </button>
          )}
          {canReschedule && (
            <button
              onClick={() => setSheetOpen(true)}
              disabled={actionLoading !== null}
              className="w-full bg-[var(--on-surface)] text-[var(--surface-container-lowest)] ops-label-caps py-4 border border-[var(--on-surface)] hover:bg-transparent hover:text-[var(--on-surface)] disabled:opacity-50 tracking-widest uppercase flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> CMD: RESCHEDULE
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => handleAction("complete")}
              disabled={actionLoading !== null}
              className="w-full bg-transparent ops-label-caps py-4 border border-[var(--border-low-viz)] hover:bg-[var(--on-surface)] hover:text-[var(--surface-container-lowest)] disabled:opacity-50 tracking-widest uppercase"
            >
              {actionLoading === "complete" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "CMD: MARK COMPLETED"}
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => handleAction("cancel")}
              disabled={actionLoading !== null}
              className="w-full bg-transparent text-[var(--accent-punch)] ops-label-caps py-4 border border-[var(--accent-punch)] hover:bg-[var(--accent-punch)] hover:text-white disabled:opacity-50 tracking-widest uppercase mt-2"
            >
              {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "CMD: ABORT OP (CANCEL)"}
            </button>
          )}
          {!canCancel && !canComplete && (
            <p className="ops-body-sm text-[var(--text-dim)] text-center">
              No lifecycle actions available for a {STATUS_LABEL[status]?.toLowerCase()} appointment.
            </p>
          )}
        </div>
      </main>

      {sheetOpen && (
        <RescheduleSheet
          current={appointment.scheduledAt}
          loading={actionLoading === "reschedule"}
          onClose={() => setSheetOpen(false)}
          onConfirm={handleReschedule}
        />
      )}
    </div>
  );
}

/** SYS_RESCHEDULE bottom sheet — pick a target date + time node. */
function RescheduleSheet({
  current,
  loading,
  onClose,
  onConfirm,
}: {
  current: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: (scheduledAt: string) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState<string | null>(null);

  const nodes: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    nodes.push(`${String(h).padStart(2, "0")}:00`);
    nodes.push(`${String(h).padStart(2, "0")}:30`);
  }

  const valid = Boolean(date && time);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Reschedule appointment"
    >
      <div className="bg-[var(--surface-container-lowest)] border-t border-[var(--border-low-viz)] px-[var(--margin-mobile)] pt-8 pb-6 flex flex-col gap-6 w-full max-h-[80vh] overflow-y-auto mx-auto max-w-xl">
        <div className="flex justify-between items-center border-b border-[var(--border-low-viz)] pb-4">
          <div>
            <h3 className="ops-body-lg font-bold tracking-tight uppercase">SYS_RESCHEDULE</h3>
            <span className="ops-label-caps text-[10px] text-[var(--text-dim)] tracking-widest">INPUT REQUIRED</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[var(--text-dim)] border border-[var(--border-low-viz)] p-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="ops-label-caps text-[10px] text-[var(--text-dim)] tracking-widest">CURRENT_VECTOR</p>
          <div className="border border-[var(--border-low-viz)] p-4 flex justify-between opacity-50 bg-[var(--surface)]">
            <span className="ops-body-lg uppercase font-bold">
              {new Date(current).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
            <span className="ops-body-lg uppercase font-bold">{hhmm(current)}</span>
          </div>
        </div>

        <label className="flex flex-col gap-2 mt-2">
          <span className="ops-label-caps text-[10px] text-[var(--text-dim)] tracking-widest">TARGET_DATE</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-[var(--surface)] border border-[var(--border-low-viz)] p-4 ops-body-lg uppercase font-bold text-[var(--on-surface)]"
          />
        </label>

        <div className="flex flex-col gap-2 mt-2">
          <p className="ops-label-caps text-[10px] text-[var(--text-dim)] tracking-widest">AVAILABLE_NODES</p>
          <div className="grid grid-cols-3 gap-2">
            {nodes.map((n) => (
              <button
                key={n}
                onClick={() => setTime(n)}
                className={`border p-3 ops-body-sm uppercase font-bold ${
                  time === n
                    ? "border-white bg-white text-black"
                    : "border-[var(--border-low-viz)] hover:border-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!valid || loading}
          onClick={() => {
            if (!valid) return;
            // Compose a local datetime and convert to ISO (UTC).
            const iso = new Date(`${date}T${time}:00`).toISOString();
            onConfirm(iso);
          }}
          className="w-full bg-white text-black ops-label-caps py-4 mt-auto border border-white hover:bg-transparent hover:text-white disabled:opacity-40 tracking-widest uppercase"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "EXEC: CONFIRM"}
        </button>
      </div>
    </div>
  );
}