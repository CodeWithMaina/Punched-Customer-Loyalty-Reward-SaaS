import type {
  AppointmentResponse,
  BusinessCustomer,
  StaffMember,
} from "@/types";
import { STATUS_LABEL, SERVER_STATUSES } from "@/lib/appointment-status";

// Re-exported for feature-local consumers.
export { STATUS_LABEL, SERVER_STATUSES };

/* ═══════════════════════════════════════════════════════════════
   Shared appointment helpers and CSV export.
   Status vocabulary lives in lib/appointment-status.ts.
   ═══════════════════════════════════════════════════════════════ */

export const START_HOUR = 7;
export const END_HOUR = 22;
export const MINUTES_PER_HOUR = 60;
export const PX_PER_MINUTE = 1.15;

export function customerName(
  map: Map<string, BusinessCustomer>,
  appointment: AppointmentResponse,
  fallback = "Guest"
) {
  return map.get(appointment.customerId)?.fullName ?? fallback;
}

export function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fullDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function dayKey(iso: string) {
  const date = new Date(iso);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════════════════════════
   WEEK EXPORT (CSV)
   Exports the already-filtered, week-scoped result set. The heavy
   filtering happens in the DB; this only serialises what the user
   sees on screen (bounded by pageSize).
   ═══════════════════════════════════════════════════════════════ */

export function exportWeekCsv(
  rows: AppointmentResponse[],
  customerMap: Map<string, BusinessCustomer>,
  staffMap: Map<string, StaffMember>
) {
  const esc = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const header = [
    "Date",
    "Start",
    "End",
    "Customer",
    "Services",
    "Staff",
    "Status",
    "Price (KES)",
  ];

  const lines = rows.map((appointment) => {
    const start = new Date(appointment.scheduledAt);
    const end = appointment.endAt ? new Date(appointment.endAt) : start;

    return [
      start.toLocaleDateString(),
      hhmm(appointment.scheduledAt),
      end > start ? hhmm(appointment.endAt as string) : hhmm(appointment.scheduledAt),
      customerMap.get(appointment.customerId)?.fullName ?? "Guest",
      appointment.services?.map((service) => service.name).join("; ") ?? "",
      appointment.staffUserId
        ? staffMap.get(appointment.staffUserId)?.fullName ?? ""
        : "",
      STATUS_LABEL[appointment.status] ?? appointment.status,
      String(getPrice(appointment)),
    ]
      .map(esc)
      .join(",");
  });

  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `appointments-${dayKey(rows[0]?.scheduledAt ?? new Date().toISOString())}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getPrice(appointment: AppointmentResponse): number {
  const candidate = appointment as AppointmentResponse & {
    price?: number;
    totalPrice?: number;
    totalAmount?: number;
    amount?: number;
  };

  if (typeof candidate.totalPrice === "number") return candidate.totalPrice;
  if (typeof candidate.totalAmount === "number") return candidate.totalAmount;
  if (typeof candidate.price === "number") return candidate.price;
  if (typeof candidate.amount === "number") return candidate.amount;

  return (
    appointment.services?.reduce(
      (total, service) => {
        const item = service as typeof service & {
          price?: number;
          amount?: number;
        };

        return (
          total +
          (typeof item.price === "number"
            ? item.price
            : typeof item.amount === "number"
              ? item.amount
              : 0)
        );
      },
      0
    ) ?? 0
  );
}

export function formatPrice(price: number) {
  if (!price) return "—";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(price);
}

export function getDuration(appointment: AppointmentResponse) {
  const fromApi =
    (new Date(appointment.endAt).getTime() -
      new Date(appointment.scheduledAt).getTime()) /
    60000;

  return Math.round(fromApi) || appointment.services?.[0]?.durationMinutes || 45;
}

export function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}
