const KES = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });
const NUM_DEC = new Intl.NumberFormat("en-KE", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

/** 12345 -> "KSh 12,345" */
export function formatKes(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "KSh 0";
  return KES.format(value);
}

/** 1234 -> "1,234" */
export function formatNumber(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "0";
  return NUM.format(value);
}

/** 12.34 -> "12.3" */
export function formatDecimal(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "0.0";
  return NUM_DEC.format(value);
}

/** 98.76 -> "98.8%" */
export function formatPercent(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return "0%";
  return `${NUM_DEC.format(value)}%`;
}

/** changePct + trend -> "▲ 12.3%" | "▼ 5.0%" | "—" */
export function formatTrend(
  changePct: number | null | undefined,
  trend: "up" | "down" | "flat"
): string {
  if (changePct == null || !isFinite(changePct) || trend === "flat") return "—";
  const dir = trend === "up" ? "▲" : "▼";
  return `${dir} ${NUM_DEC.format(Math.abs(changePct))}%`;
}

/** 0 -> "12 AM", 13 -> "1 PM", 23 -> "11 PM" */
export function formatHour(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${ampm}`;
}

/** trend string -> tailwind color class for the trend icon/text */
export function trendColor(trend: "up" | "down" | "flat"): string {
  if (trend === "up") return "text-green-500";
  if (trend === "down") return "text-red-400";
  return "text-[var(--text-tertiary)]";
}

/** priority -> tailwind color class */
export function priorityColor(priority: string): string {
  if (priority === "high") return "text-rose-500";
  if (priority === "medium") return "text-amber-500";
  return "text-sky-500";
}
