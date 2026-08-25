"use client";

import { Pagination } from "@/components/ui/Pagination";

/**
 * Staff roster pager — delegates to the shared Pagination component.
 */
export function StaffPagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      total={total}
      noun="staff"
      onChange={onChange}
    />
  );
}
