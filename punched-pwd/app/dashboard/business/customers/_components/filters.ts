import type { ParsedUrlQuery } from "querystring";

/** Customer list filter/sort/paging state, mirrored to the URL. */
export interface CustomerListFilters {
  status?: "active" | "ready";
  enrolledFrom?: string;
  enrolledTo?: string;
}

export interface CustomerListState extends CustomerListFilters {
  search: string;
  sortBy: "recent" | "stamps" | "name";
  sortDirection: "asc" | "desc";
  page: number;
  /** Server-side page size (backend clamps to 1..100). */
  pageSize: number;
}

export const CUSTOMER_PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_CUSTOMER_PAGE_SIZE = 25;

export const DEFAULT_CUSTOMER_LIST_STATE: CustomerListState = {
  search: "",
  sortBy: "recent",
  sortDirection: "desc",
  page: 1,
  pageSize: DEFAULT_CUSTOMER_PAGE_SIZE,
};

/** Parse customer list state from URL query params (shareable/refresh-safe). */
export function parseCustomerListState(query: ParsedUrlQuery): CustomerListState {
  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";
  const sortBy = str(query.sortBy) as CustomerListState["sortBy"];
  const status = str(query.status);
  return {
    search: str(query.search),
    status:
      status === "active" || status === "ready"
        ? (status as CustomerListFilters["status"])
        : undefined,
    enrolledFrom: str(query.enrolledFrom) || undefined,
    enrolledTo: str(query.enrolledTo) || undefined,
    sortBy: ["recent", "stamps", "name"].includes(sortBy) ? sortBy : "recent",
    sortDirection: str(query.sortDirection) === "asc" ? "asc" : "desc",
    page: Math.max(1, Number.parseInt(str(query.page), 10) || 1),
    pageSize: CUSTOMER_PAGE_SIZES.includes(
      Number.parseInt(str(query.pageSize), 10) as (typeof CUSTOMER_PAGE_SIZES)[number],
    )
      ? Number.parseInt(str(query.pageSize), 10)
      : DEFAULT_CUSTOMER_PAGE_SIZE,
  };
}

/** Serialize state to a query-string object; omits defaults to keep URLs clean. */
export function customerListStateToParams(state: CustomerListState): Record<string, string> {
  const params: Record<string, string> = {};
  if (state.search.trim()) params.search = state.search.trim();
  if (state.status) params.status = state.status;
  if (state.enrolledFrom) params.enrolledFrom = state.enrolledFrom;
  if (state.enrolledTo) params.enrolledTo = state.enrolledTo;
  if (state.sortBy !== "recent") params.sortBy = state.sortBy;
  if (state.sortDirection !== "desc") params.sortDirection = state.sortDirection;
  if (state.page > 1) params.page = String(state.page);
  if (state.pageSize !== DEFAULT_CUSTOMER_PAGE_SIZE)
    params.pageSize = String(state.pageSize);
  return params;
}

/** Human label for the current sort key. */
export function sortLabel(state: CustomerListState): string {
  switch (state.sortBy) {
    case "stamps":
      return state.sortDirection === "desc" ? "Top stamps" : "Fewest stamps";
    case "name":
      return state.sortDirection === "desc" ? "Z → A" : "A → Z";
    default:
      return state.sortDirection === "desc" ? "Most recent" : "Oldest first";
  }
}

export function cycleSort(
  state: CustomerListState,
  key: CustomerListState["sortBy"]
): CustomerListState {
  // Clicking the active column toggles direction; clicking another resets.
  if (state.sortBy === key) {
    return { ...state, sortDirection: state.sortDirection === "asc" ? "desc" : "asc", page: 1 };
  }
  const defaultDir: "asc" | "desc" =
    key === "stamps" || key === "recent" ? "desc" : "asc";
  return { ...state, sortBy: key, sortDirection: defaultDir, page: 1 };
}