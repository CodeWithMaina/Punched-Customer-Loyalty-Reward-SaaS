"use client";

import { useEffect, useState } from "react";
import { businessesApi } from "@/lib/api/businesses";
import type { StaffMember } from "@/types";
import { User, Users } from "lucide-react";

interface StaffSelectorProps {
  businessId: string;
  selectedStaffId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}

/**
 * Staff selector for the booking wizard. Lists all staff for the business
 * and lets the customer pick a specific staff member or "Any available".
 * Staff availability filtering is done server-side via the availability
 * endpoint (frontend.md §5).
 */
export function StaffSelector({
  businessId,
  selectedStaffId,
  onSelect,
  className = "",
}: StaffSelectorProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    businessesApi
      .getMyStaff()
      .then((res) => {
        if (res.success && res.data) setStaff(res.data);
        else setError(res.error?.message ?? "Could not load staff.");
      })
      .catch(() => setError("Could not load staff."))
      .finally(() => setLoading(false));
  }, [businessId]);

  if (loading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-[var(--surface-raised)] rounded-2xl border border-[var(--border-light)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
        {error}
      </p>
    );
  }

  if (staff.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Any available option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
          selectedStaffId === null
            ? "border-brand bg-brand-surface ring-1 ring-brand/20"
            : "border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]"
        }`}
      >
        <div className="h-9 w-9 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-brand" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Any available
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            We&apos;ll find the next available staff member
          </p>
        </div>
      </button>

      {/* Individual staff */}
      {staff.map((s) => (
        <button
          key={s.userId}
          type="button"
          onClick={() => onSelect(s.userId)}
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            selectedStaffId === s.userId
              ? "border-brand bg-brand-surface ring-1 ring-brand/20"
              : "border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]"
          }`}
        >
          <div className="h-9 w-9 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center overflow-hidden flex-shrink-0">
            {s.avatarUrl ? (
              <img
                src={s.avatarUrl}
                alt={s.fullName}
                className="h-full w-full object-cover rounded-xl"
              />
            ) : (
              <User className="h-5 w-5 text-[var(--text-tertiary)]" />
            )}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {s.fullName}
            </p>
            <p className="text-xs text-[var(--text-tertiary)] truncate">
              {s.stampsIssued} stamps issued
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}