// ═══════════════════════════════════════════════════════════════
//  Appointment status vocabulary — SINGLE SOURCE OF TRUTH.
//  Previously duplicated in 6 files; import from here instead.
// ═══════════════════════════════════════════════════════════════

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

/** Statuses the API accepts as a direct DB query param. */
export const SERVER_STATUSES = new Set([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

/** Statuses from which the business can still cancel. */
export const CANCELLABLE_STATUSES = ["pending", "draft", "confirmed"];

/** Statuses that represent a finished lifecycle. */
export const TERMINAL_STATUSES = ["completed", "cancelled", "no_show"];