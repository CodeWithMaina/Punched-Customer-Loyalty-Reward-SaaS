"use client";

import { RequireModule } from "@/components/modules/RequireModule";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, CalendarPlus, ChevronRight, Clock, Gift, Mail,
  Phone, RotateCcw, Stamp, Target, Trophy, Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { appointmentsApi } from "@/lib/api/appointments";
import { servicesApi } from "@/lib/api/services";
import { stampsApi } from "@/lib/api/stamps";
import { useAppointmentActions } from "../../appointments/_hooks/useAppointmentActions";
import { BookAppointmentSheet } from "../../appointments/_components/BookAppointmentSheet";
import { CANCELLABLE_STATUSES } from "@/lib/appointment-status";
import { stampAdjustmentSchema } from "@/lib/validations/stamping";
import type {
  AnalyticsPeriod, BusinessCustomer, CustomerActivityItem,
  CustomerPeriodStatsResponse, AppointmentResponse,
  ServiceCatalogItemResponse, StaffMember,
} from "@/types";
import {
  Avatar, Badge, IconButton, Modal, Pagination, Skeleton, StatusBadge, Tabs,
} from "@/components/ui";
import { ErrorState } from "@/components/ui/States";
import { RewardProgress } from "../_components/CustomerCard";

const ACTIVITY_PAGE_SIZE = 5;

const PERIODS = [
  { value: "today" as AnalyticsPeriod, label: "Today" },
  { value: "7d" as AnalyticsPeriod, label: "7 days" },
  { value: "30d" as AnalyticsPeriod, label: "30 days" },
  { value: "all" as AnalyticsPeriod, label: "All time" },
];

function formatDate(value?: string): string {
  if (!value) return "No visits yet";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

/* Definition row — icon + label left, semibold value right. */
function DetailRow({
  icon, label, value, last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${
        !last ? "border-b border-[var(--border-light)]" : ""
      }`}
    >
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        {icon}

        <span className="text-xs font-medium">{label}</span>
      </div>

      <span className="max-w-[55%] truncate text-right text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

function CustomerDetailPageContent() {
  useRoleGuard("Business");
  const router = useRouter();
  const { customerId } = useParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<BusinessCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [periodStats, setPeriodStats] = useState<CustomerPeriodStatsResponse | null>(null);
  const [isPeriodLoading, setIsPeriodLoading] = useState(false);

  const [activity, setActivity] = useState<CustomerActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [delta, setDelta] = useState(0);
  const [adjReason, setAdjReason] = useState("ManualCorrection");
  const [adjNote, setAdjNote] = useState("");
  const [confirmingAdjust, setConfirmingAdjust] = useState(false);
  const [savingAdjust, setSavingAdjust] = useState(false);

  // ── Appointments (customer-contextual) ────────────────────────────
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [isAppointmentsLoading, setIsAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingData, setBookingData] = useState<{
    services: ServiceCatalogItemResponse[];
    staff: StaffMember[];
  } | null>(null);
  const [isBookingDataLoading, setIsBookingDataLoading] = useState(false);

  const loadAppointments = useCallback(() => {
    let cancelled = false;
    setIsAppointmentsLoading(true);
    setAppointmentsError(false);
    appointmentsApi
      .getBusinessAppointments({ customerId, page: 1, pageSize: 5 })
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) setAppointments(res.data.items);
        else setAppointmentsError(true);
      })
      .catch(() => !cancelled && setAppointmentsError(true))
      .finally(() => !cancelled && setIsAppointmentsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => loadAppointments(), [loadAppointments]);

  const { actionLoading, handleCancel, bookForCustomer } =
    useAppointmentActions({
      reload: loadAppointments,
      onCompleted: () => setBookingOpen(false),
    });

  /** Lazily load services + staff the first time booking is opened. */
  const openBooking = () => {
    setBookingOpen(true);
    if (bookingData || isBookingDataLoading) return;
    setIsBookingDataLoading(true);
    Promise.all([
      servicesApi.getMyServices().catch(() => null),
      businessesApi.getMyStaff({}).catch(() => null),
    ]).then(([svcRes, staffRes]) => {
      setBookingData({
        services: svcRes?.success && svcRes.data ? svcRes.data : [],
        staff: staffRes?.success && staffRes.data ? staffRes.data.items : [],
      });
      setIsBookingDataLoading(false);
    });
  };

  const applyAdjustment = async () => {
    const parsed = stampAdjustmentSchema.safeParse({ cardId: customer?.cardId, delta, reason: adjReason, note: adjNote.trim() || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid adjustment");
      return;
    }
    setSavingAdjust(true);
    try {
      const res = await stampsApi.adjust({ cardId: customer!.cardId, delta, reason: adjReason as never, note: adjNote.trim() || undefined });
      if (res.success) {
        toast.success(`Adjusted by ${delta > 0 ? "+" : ""}${delta} — new total ${res.data?.totalStampsAfter ?? customer!.totalStamps + delta}`);
        setConfirmingAdjust(false);
        setDelta(0);
        setAdjNote("");
        setCustomer((prev) => prev ? { ...prev, totalStamps: res.data?.totalStampsAfter ?? prev.totalStamps + delta } : prev);
      } else {
        toast.error(res.error?.code === "ADJUSTMENT_BELOW_ZERO" ? "Adjustment would make total stamps negative." : (res.error?.message ?? "Adjustment failed."));
      }
    } catch {
      toast.error("Network error while adjusting stamps.");
    } finally {
      setSavingAdjust(false);
    }
  };


  // Initial load: profile + default period stats.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      businessesApi.getSingleCustomer(customerId),
      businessesApi.getCustomerPeriodStats(customerId, "7d").catch(() => null),
    ])
      .then(([custRes, statsRes]) => {
        if (cancelled) return;
        if (custRes.success && custRes.data) setCustomer(custRes.data);
        else setNotFound(true);
        if (statsRes?.success && statsRes.data) setPeriodStats(statsRes.data);
      })
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  // Period switching reuses the same endpoint.
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;
    setIsPeriodLoading(true);
    businessesApi
      .getCustomerPeriodStats(customerId, period)
      .then((res) => {
        if (!cancelled && res.success && res.data) setPeriodStats(res.data);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setIsPeriodLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period, isLoading, customerId]);

  // Paginated stamp/redemption history.
  const loadActivity = useCallback(
    (page: number) => {
      let cancelled = false;
      setIsActivityLoading(true);
      businessesApi
        .getCustomerActivity(customerId, { page, pageSize: ACTIVITY_PAGE_SIZE })
        .then((res) => {
          if (!cancelled && res.success && res.data) {
            setActivity(res.data.items);
            setActivityTotalPages(Math.max(1, res.data.totalPages));
            setActivityTotal(res.data.total);
          }
        })
        .catch(() => undefined)
        .finally(() => !cancelled && setIsActivityLoading(false));
      return () => {
        cancelled = true;
      };
    },
    [customerId]
  );

  useEffect(() => {
    loadActivity(activityPage);
  }, [activityPage, loadActivity]);

  /* Derived values */
  const stampsRequired = customer?.stampsRequired ?? 0;
  const rewardReady = stampsRequired > 0 && (customer?.totalStamps ?? 0) >= stampsRequired;
  const stampsLeft = stampsRequired > 0 ? Math.max(stampsRequired - (customer?.totalStamps ?? 0), 0) : 0;

  const loyaltyTier =
    (customer?.lifetimeStamps ?? 0) >= 80
      ? "VIP"
      : (customer?.lifetimeStamps ?? 0) >= 35
        ? "Regular"
        : (customer?.lifetimeStamps ?? 0) > 0
          ? "Growing"
          : "New";

  if (isLoading || !customer) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        {/* Header skeleton */}
        <div className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4 sm:px-6">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-5 w-36 rounded" />
          </div>
        </div>

        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
          <Skeleton className="h-32 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-28 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-44 rounded-[var(--radius-lg)]" />
          <Skeleton className="h-52 rounded-[var(--radius-lg)]" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
        <ErrorState
          title="Customer not found"
          message="This customer is not enrolled in your loyalty program."
        />

        <Link
          href="/dashboard/business/customers?view=roster"
          className="text-sm font-semibold text-brand hover:underline"
        >
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-16 text-[var(--text-primary)]">
      {/* ── Detail header (back · title) ────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
          <IconButton label="Go back" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </IconButton>

          <h1 className="truncate text-lg font-bold tracking-tight">Customer details</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* ── Identity block ─────────────────────────────────────────── */}
        <section className="rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-5 ring-1 ring-[var(--border-light)]">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <Avatar name={customer.fullName} src={customer.avatarUrl} size="lg" />

            <div className="min-w-0 flex-1">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold sm:text-lg">{customer.fullName}</h2>

                  <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                    Member since {formatDate(customer.enrolledAt)}
                  </p>
                </div>

                {/* Status badges: semantic tier + reward state */}
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={loyaltyTier === "VIP" ? "brand" : "neutral"} dot>
                    {loyaltyTier}
                  </Badge>

                  {rewardReady && (
                    <Badge variant="warning" dot>
                      Ready to redeem
                    </Badge>
                  )}
                </div>
              </div>

              {/* Contact rows — tappable where a value exists */}
              <div className="mt-3 flex flex-col items-center gap-1 text-xs text-[var(--text-secondary)] sm:items-start">
                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="inline-flex items-center gap-1.5 truncate hover:text-brand hover:underline"
                  >
                    <Mail className="h-3 w-3 shrink-0" />
                    {customer.email}
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    No email on file
                  </span>
                )}

                {customer.phoneNumber && (
                  <a
                    href={`tel:${customer.phoneNumber}`}
                    className="inline-flex items-center gap-1.5 truncate hover:text-brand hover:underline"
                  >
                    <Phone className="h-3 w-3 shrink-0" />
                    {customer.phoneNumber}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Reward progress ────────────────────────────────────────── */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold sm:text-base">Reward progress</h3>

            {stampsRequired > 0 && (
              <span className="text-xs font-medium tabular-nums text-[var(--text-secondary)]">
                {customer.totalStamps} / {stampsRequired}
              </span>
            )}
          </div>

          <RewardProgress value={customer.totalStamps} goal={customer.stampsRequired} />

          {rewardReady ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs font-semibold text-[var(--accent-text)]">
              <Trophy className="h-3.5 w-3.5" />
              Reward ready — customer can redeem now
            </p>
          ) : stampsRequired > 0 ? (
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                {stampsLeft}
              </span>{" "}
              more stamp{stampsLeft !== 1 ? "s" : ""} until the next reward
            </p>
          ) : null}
        </section>

        {/* ── Performance (period tabs + stats) ──────────────────────── */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold sm:text-base">Performance</h3>

            {isPeriodLoading && (
              <span className="text-xs text-[var(--text-tertiary)]" role="status" aria-live="polite">
                Updating…
              </span>
            )}
          </div>

          <Tabs
            items={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            value={period}
            onChange={setPeriod}
            label="Stats period"
            className="mb-4 flex w-full"
            idPrefix="cust-period"
          />

          {/* Period stat tiles — 2 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                icon: <Stamp className="h-4 w-4" />,
                label: "Stamps",
                value: periodStats?.stampsInPeriod ?? 0,
              },
              {
                icon: <Gift className="h-4 w-4" />,
                label: "Visits",
                value: periodStats?.visitsInPeriod ?? 0,
              },
              {
                icon: <Users className="h-4 w-4" />,
                label: "Lifetime stamps",
                value: customer.lifetimeStamps,
              },
              {
                icon: <Target className="h-4 w-4" />,
                label: "Total stamps",
                value: customer.totalStamps,
              },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                className={`rounded-[var(--radius-md)] border border-[var(--border-light)] bg-[var(--background)] p-4 transition-opacity ${
                  isPeriodLoading ? "opacity-60" : "opacity-100"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-light)] text-brand">
                  {icon}
                </span>

                <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">{label}</p>

                <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">
                  {value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Details (definition list) ──────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-bold sm:text-base">Details</h3>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={customer.email} />

            {customer.phoneNumber && (
              <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={customer.phoneNumber} />
            )}

            <DetailRow
              icon={<Calendar className="h-4 w-4" />}
              label="Enrolled"
              value={formatDate(customer.enrolledAt)}
            />

            <DetailRow
              icon={<Clock className="h-4 w-4" />}
              label="Last visit"
              value={formatDate(customer.lastStampAt)}
            />

            <DetailRow
              icon={<RotateCcw className="h-4 w-4" />}
              label="Rewards claimed"
              value={`${customer.totalRedemptions} time${customer.totalRedemptions !== 1 ? "s" : ""}`}
              last
            />
          </div>
        </section>

        {/* ── Appointments (customer-contextual) ─────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold sm:text-base">Appointments</h3>

            <button
              onClick={openBooking}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-brand px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand-surface"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Book appointment
            </button>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            {isAppointmentsLoading && appointments.length === 0 ? (
              <div className="space-y-px p-3" aria-busy="true">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 border-b border-[var(--border-light)] py-2 last:border-b-0"
                  >
                    <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />

                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-40 rounded" />
                      <Skeleton className="h-2 w-24 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : appointmentsError ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm font-semibold">
                  Could not load appointments
                </p>

                <button
                  onClick={loadAppointments}
                  className="mt-2 text-xs font-semibold text-brand hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : appointments.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Calendar
                  className="mx-auto h-6 w-6 text-[var(--text-muted)]"
                  aria-hidden
                />

                <p className="mt-2 text-sm font-semibold">No appointments yet</p>

                <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--text-secondary)]">
                  Book one for{" "}
                  {customer.fullName.split(" ")[0]} without leaving this page.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-light)]">
                {appointments.map((appt) => {
                  const cancellable = CANCELLABLE_STATUSES.includes(appt.status);

                  return (
                    <li
                      key={appt.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Link
                        href={`/dashboard/business/appointments/${appt.id}`}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-sm font-medium">
                          {appt.services?.[0]?.name ?? "Appointment"}
                          {(appt.services?.length ?? 0) > 1
                            ? ` +${appt.services!.length - 1}`
                            : ""}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                          {new Date(appt.scheduledAt).toLocaleString("en-KE", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </Link>

                      <StatusBadge status={appt.status} />

                      {cancellable && (
                        <button
                          onClick={() => handleCancel(appt.id)}
                          disabled={actionLoading === appt.id}
                          className="rounded-[var(--radius-md)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                        >
                          {actionLoading === appt.id ? "…" : "Cancel"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/dashboard/business/appointments"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            Manage in calendar
            <ChevronRight className="h-3 w-3" />
          </Link>
        </section>

        {/* ── Adjust stamps (Business only) ──────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-bold sm:text-base">Adjust stamps</h3>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-4 text-xs text-[var(--text-secondary)]">
              Current total: <span className="font-bold text-[var(--text-primary)]">{customer.totalStamps}</span> stamps.
              Applying a change immediately updates the balance (lifetime stamps are untouched).
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setDelta((d) => d - 1)}
                className="h-11 w-11 border border-[var(--border)] text-lg font-bold text-[var(--text-primary)] hover:bg-[var(--brand-light)]"
                aria-label="Remove one stamp"
              >
                −
              </button>
              <button
                onClick={() => setDelta((d) => d + 1)}
                className="h-11 w-11 border border-[var(--border)] text-lg font-bold text-[var(--text-primary)] hover:bg-[var(--brand-light)]"
                aria-label="Add one stamp"
              >
                +
              </button>
              <span className="flex h-11 items-center px-4 border border-[var(--border)] font-mono text-sm tabular-nums text-[var(--text-primary)]">
                {delta > 0 ? `+${delta}` : delta}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                className="h-11 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)]"
              >
                <option value="VoidMistake">Void a mistake</option>
                <option value="ManualCorrection">Manual correction</option>
                <option value="Goodwill">Goodwill</option>
                <option value="SystemFix">System fix</option>
              </select>

              <input
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
                placeholder="Note (optional)"
                maxLength={500}
                className="h-11 flex-1 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => delta !== 0 && setConfirmingAdjust(true)}
                disabled={delta === 0 || savingAdjust}
                className="rounded-[var(--radius-md)] bg-[var(--text-primary)] px-4 py-2.5 text-sm font-bold text-[var(--background)] disabled:opacity-50"
              >
                {savingAdjust ? "Saving…" : "Apply adjustment"}
              </button>
            </div>

            {confirmingAdjust && (
              <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] p-4">
                <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  Confirm adjustment
                </p>
                <p className="mb-4 text-xs text-[var(--text-secondary)]">
                  Before: <span className="tab-nums">{customer.totalStamps}</span> → After:{" "}
                  <span className="font-bold tabular-nums">{Math.max(0, customer.totalStamps + delta)}</span> stamps
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={applyAdjustment}
                    disabled={savingAdjust}
                    className="rounded-[var(--radius-md)] bg-[var(--text-primary)] px-4 py-2 text-sm font-bold text-[var(--background)] disabled:opacity-50"
                  >
                    {savingAdjust ? "Saving…" : "Confirm"}
                  </button>
                  <button
                    onClick={() => { setConfirmingAdjust(false); setDelta(0); }}
                    className="rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Recent activity ────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold sm:text-base">Recent activity</h3>

            <span className="text-xs tabular-nums text-[var(--text-tertiary)]" aria-live="polite">
              {activityTotal} event{activityTotal !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            {isActivityLoading && activity.length === 0 ? (
              <div className="space-y-px p-3" aria-busy="true">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 border-b border-[var(--border-light)] py-2 last:border-b-0">
                    <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />

                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-40 rounded" />
                      <Skeleton className="h-2 w-24 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Stamp className="mx-auto h-6 w-6 text-[var(--text-muted)]" aria-hidden />

                <p className="mt-2 text-sm font-semibold">No activity yet</p>

                <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--text-secondary)]">
                  Stamps and rewards will appear here after their first visit.
                </p>
              </div>
            ) : (
              <>
                <ul
                  className={`divide-y divide-[var(--border-light)] transition-opacity ${
                    isActivityLoading ? "opacity-40" : "opacity-100"
                  }`}
                >
                  {activity.map((item) => (
                    <li key={`${item.activityType}-${item.activityId}`} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${
                          item.activityType === "stamp"
                            ? "bg-brand-surface text-brand"
                            : "bg-[var(--success-light)] text-[var(--success-text)]"
                        }`}
                        aria-hidden
                      >
                        {item.activityType === "stamp" ? (
                          <Stamp className="h-4 w-4" />
                        ) : (
                          <Gift className="h-4 w-4" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.activityType === "stamp"
                            ? `Stamp #${item.stampNumber ?? "—"} collected`
                            : `Reward redeemed${item.rewardValue != null ? ` · KES ${item.rewardValue}` : ""}`}
                        </p>

                        <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                          {timeAgo(item.timestamp)}
                          {item.staffName ? ` · by ${item.staffName}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {activityTotalPages > 1 && (
                  <div className="border-t border-[var(--border-light)]">
                    <Pagination
                      page={activityPage}
                      totalPages={activityTotalPages}
                      total={activityTotal}
                      noun="event"
                      onChange={setActivityPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Profile timeline ───────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-bold sm:text-base">Timeline</h3>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
            <DetailRow icon={<Calendar className="h-4 w-4" />} label="Enrolled" value={formatDate(customer.enrolledAt)} />

            <DetailRow icon={<Clock className="h-4 w-4" />} label="Last visit" value={formatDate(customer.lastStampAt)} />

            <DetailRow
              icon={<RotateCcw className="h-4 w-4" />}
              label="Redemption rate"
              value={`${customer.lifetimeStamps > 0 ? Math.round((customer.totalRedemptions / customer.lifetimeStamps) * 100) : 0}%`}
              last
            />
          </div>
        </section>
      </main>

      {/* Back to roster — quiet tertiary action at the end of the page */}
      <div className="mx-auto mt-6 max-w-3xl px-4 pb-6 sm:px-6">
        <Link
          href="/dashboard/business/customers?view=roster"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          Back to all customers
        </Link>
      </div>

      {/* Customer-contextual booking sheet */}
      {bookingOpen &&
        (bookingData ? (
          <BookAppointmentSheet
            customers={[]}
            services={bookingData.services}
            staff={bookingData.staff}
            lockedCustomer={{
              id: customerId,
              name: customer?.fullName ?? "Customer",
            }}
            onClose={() => setBookingOpen(false)}
            onBook={(book) => bookForCustomer(book)}
          />
        ) : (
          <Modal open onClose={() => setBookingOpen(false)} title="Book appointment">
            <div className="space-y-3 py-2" aria-busy="true">
              <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />

              <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />

              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </div>
          </Modal>
        ))}
    </div>
  );
}

export default function CustomerDetailPage() {
  return (
    <RequireModule module="customers">
      <CustomerDetailPageContent />
    </RequireModule>
  );
}
