import type { ParsedUrlQuery } from "querystring";

/**
 * Staff list filter state.
 *
 * These values are intentionally kept independent from presentation so the
 * staff list UI can change without affecting URL/state behavior.
 */
export interface StaffListFilters {
  status?: "active" | "inactive";
  activity?: "today" | "week" | "idle";
  goalStatus?: "met" | "behind" | "none";
}

export interface StaffListState extends StaffListFilters {
  search: string;
  sortBy: "name" | "stamps" | "recent" | "goal" | "added";
  sortDirection: "asc" | "desc";
  page: number;
}

export const DEFAULT_STAFF_LIST_STATE: StaffListState = {
  search: "",
  sortBy: "name",
  sortDirection: "asc",
  page: 1,
};

const SORT_KEYS = [
  "name",
  "stamps",
  "recent",
  "goal",
  "added",
] as const;

type SortKey = (typeof SORT_KEYS)[number];

function queryString(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function isValidSortKey(value: string): value is SortKey {
  return SORT_KEYS.includes(value as SortKey);
}

/**
 * Parse staff list state from URL query params.
 *
 * Invalid values are discarded and replaced with safe defaults.
 * The resulting state is shareable and refresh-safe.
 */
export function parseStaffListState(
  query: ParsedUrlQuery
): StaffListState {
  const search = queryString(query.search);
  const status = queryString(query.status);
  const activity = queryString(query.activity);
  const goalStatus = queryString(query.goalStatus);
  const sortByParam = queryString(query.sortBy);
  const sortDirection = queryString(query.sortDirection);
  const pageParam = queryString(query.page);

  return {
    search,

    status:
      status === "active" || status === "inactive"
        ? status
        : undefined,

    activity:
      activity === "today" ||
      activity === "week" ||
      activity === "idle"
        ? activity
        : undefined,

    goalStatus:
      goalStatus === "met" ||
      goalStatus === "behind" ||
      goalStatus === "none"
        ? goalStatus
        : undefined,

    sortBy: isValidSortKey(sortByParam)
      ? sortByParam
      : "name",

    sortDirection:
      sortDirection === "desc" ? "desc" : "asc",

    page: Math.max(
      1,
      Number.parseInt(pageParam, 10) || 1
    ),
  };
}

/**
 * Serialize staff list state into clean URL parameters.
 *
 * Defaults are intentionally omitted to keep URLs short.
 */
export function staffListStateToParams(
  state: StaffListState
): Record<string, string> {
  const params: Record<string, string> = {};

  const search = state.search.trim();

  if (search) {
    params.search = search;
  }

  if (state.status) {
    params.status = state.status;
  }

  if (state.activity) {
    params.activity = state.activity;
  }

  if (state.goalStatus) {
    params.goalStatus = state.goalStatus;
  }

  if (state.sortBy !== "name") {
    params.sortBy = state.sortBy;
  }

  if (state.sortDirection !== "asc") {
    params.sortDirection = state.sortDirection;
  }

  if (state.page > 1) {
    params.page = String(state.page);
  }

  return params;
}

/**
 * Human-readable label for the active sort.
 */
export function sortLabel(
  state: StaffListState
): string {
  switch (state.sortBy) {
    case "stamps":
      return state.sortDirection === "desc"
        ? "Top stamps"
        : "Fewest stamps";

    case "recent":
      return "Recently active";

    case "goal":
      return state.sortDirection === "desc"
        ? "Best goal progress"
        : "Lowest goal progress";

    case "added":
      return "Newest added";

    default:
      return state.sortDirection === "desc"
        ? "Z → A"
        : "A → Z";
  }
}

/**
 * Change sorting.
 *
 * Clicking the current sort toggles its direction.
 * Selecting a new sort applies the most useful default direction.
 */
export function cycleSort(
  state: StaffListState,
  key: StaffListState["sortBy"]
): StaffListState {
  if (state.sortBy === key) {
    return {
      ...state,
      sortDirection:
        state.sortDirection === "asc"
          ? "desc"
          : "asc",
      page: 1,
    };
  }

  const defaultDirection: "asc" | "desc" =
    key === "name" ? "asc" : "desc";

  return {
    ...state,
    sortBy: key,
    sortDirection: defaultDirection,
    page: 1,
  };
}

/**
 * Returns the current calendar week.
 *
 * Monday → Sunday.
 *
 * `from` is inclusive.
 * `to` is exclusive.
 *
 * weekOffset:
 *   0  = current week
 *  -1  = previous week
 *   1  = next week
 */
export function getWeekRange(
  weekOffset = 0
): {
  from: Date;
  to: Date;
  label: string;
} {
  const now = new Date();

  const day = now.getUTCDay();

  const daysSinceMonday = (day + 6) % 7;

  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday
    )
  );

  const from = new Date(monday);

  from.setUTCDate(
    from.getUTCDate() + weekOffset * 7
  );

  const to = new Date(from);

  // Exclusive upper boundary.
  to.setUTCDate(to.getUTCDate() + 7);

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const sunday = new Date(to);

  sunday.setUTCSeconds(
    sunday.getUTCSeconds() - 1
  );

  return {
    from,
    to,
    label: `${formatDate(from)} → ${formatDate(sunday)}`,
  };
}