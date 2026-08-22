"use client";

import { useEffect, useState } from "react";
import { businessesApi } from "@/lib/api/businesses";
import type { StaffMember } from "@/types";
import { User, Users, Check } from "lucide-react";

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
            className="h-16 bg-[var(--surface-raised)] border border-[var(--border)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="font-mono text-sm text-[var(--text-secondary)] py-4 text-center" style={{ fontFamily: "'Space Mono', monospace" }}>
        {error}
      </p>
    );
  }

  if (staff.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`} role="radiogroup" aria-label="Preferred staff">
      {/* Any available option */}
      <button
        type="button"
        role="radio"
        aria-checked={selectedStaffId === null}
        onClick={() => onSelect(null)}
        className={`relative w-full flex items-center gap-3 p-3 border text-left transition-all ${
          selectedStaffId === null
            ? "border-[var(--text-primary)] bg-[var(--surface-raised)]"
            : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
        }`}
      >
        <div className="h-10 w-10 border border-[var(--border)] bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-brand" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Any available
          </p>
          <p className="font-mono text-xs text-[var(--text-tertiary)] truncate" style={{ fontFamily: "'Space Mono', monospace" }}>
            We&apos;ll find the next available staff member
          </p>
        </div>
        {selectedStaffId === null && (
          <Check className="h-4 w-4 text-brand flex-shrink-0" />
        )}
      </button>

      {/* Individual staff */}
      {staff.map((s) => {
        const isSelected = selectedStaffId === s.userId;
        return (
          <button
            key={s.userId}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(s.userId)}
            className={`relative w-full flex items-center gap-3 p-3 border text-left transition-all ${
              isSelected
                ? "border-[var(--text-primary)] bg-[var(--surface-raised)]"
                : "border-[var(--border)] bg-[var(--background)] hover:border-[var(--text-secondary)]"
            }`}
          >
            <div className="h-10 w-10 border border-[var(--border)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {s.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.avatarUrl}
                  alt={s.fullName}
                  className="h-full w-full object-cover grayscale opacity-80"
                />
              ) : (
                <User className="h-5 w-5 text-[var(--text-tertiary)]" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {s.fullName}
              </p>
              <p className="font-mono text-xs text-[var(--text-tertiary)] truncate" style={{ fontFamily: "'Space Mono', monospace" }}>
                {s.stampsIssued} stamps issued
              </p>
            </div>
            {isSelected && <Check className="h-4 w-4 text-brand flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}