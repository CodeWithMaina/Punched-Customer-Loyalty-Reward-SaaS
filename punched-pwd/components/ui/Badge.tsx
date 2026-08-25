import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/appointment-status";

// ═══════════════════════════════════════════════════════════════
//  Badge — semantic pill for statuses, tags and counts.
//  Variants cover the app's token palette; unknown variants fall
//  back to neutral so domain data can never break the UI.
// ═══════════════════════════════════════════════════════════════

export type BadgeVariant =
  | "neutral"
  | "brand"
  | "info"
  | "success"
  | "warning"
  | "danger";

const variantStyles: Record<BadgeVariant, string> = {
  neutral:
    "bg-[var(--border-light)] text-[var(--text-secondary)] border-transparent",
  brand: "bg-brand-surface text-brand border-transparent",
  info: "bg-[var(--accent-light)] text-[var(--accent-text)] border-transparent",
  success:
    "bg-[var(--success-light)] text-[var(--success-text)] border-transparent",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  danger: "bg-red-50 text-red-600 border-transparent",
};

/** Maps appointment lifecycle statuses to badge variants. */
export const APPOINTMENT_STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: "neutral",
  pending: "info",
  confirmed: "brand",
  in_progress: "success",
  completed: "success",
  cancelled: "neutral",
  no_show: "neutral",
};

export function Badge({
  children,
  variant = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  /** Show a small leading status dot. */
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold",
        variantStyles[variant] ?? variantStyles.neutral,
        className
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-current opacity-80"
        />
      )}
      {children}
    </span>
  );
}

/**
 * StatusBadge — domain wrapper that renders an appointment status
 * as a Badge. Presentation lives here; the status vocabulary lives
 * in lib/appointment-status.ts (single source of truth).
 */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={APPOINTMENT_STATUS_VARIANT[status] ?? "neutral"}
      dot
    >
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}