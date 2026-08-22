"use client";

import { useEffect, useState, useMemo } from "react";
import { appointmentsApi } from "@/lib/api/appointments";
import { useBookingStore } from "@/store/bookingStore";
import type { AvailabilitySlotResponse } from "@/types";
import { Sunrise, Sun, Moon } from "lucide-react";

interface AppointmentCalendarProps {
  businessId: string;
  serviceIds: string[];
  staffUserId: string | null;
  className?: string;
}

/**
 * Date scroller + grouped time-slot grid for the booking wizard.
 * Fetches availability server-side for the selected day; slots are bucketed
 * into Morning / Afternoon / Evening for the brutalist time grid.
 */
export function AppointmentCalendar({
  businessId,
  serviceIds,
  staffUserId,
  className = "",
}: AppointmentCalendarProps) {
  const { slot, setSlot } = useBookingStore();
  const [slots, setSlots] = useState<AvailabilitySlotResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const dateRange = useMemo(() => {
    const dates: string[] = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }, []);

  useEffect(() => {
    if (!serviceIds.length) return;
    setLoading(true);
    setError(null);
    appointmentsApi
      .getAvailability(businessId, {
        serviceIds,
        staffId: staffUserId ?? undefined,
        startDate: selectedDate,
        endDate: selectedDate,
      })
      .then((res) => {
        if (res.success && res.data) setSlots(res.data);
        else setError(res.error?.message ?? "No slots available");
      })
      .catch(() => setError("Could not load availability."))
      .finally(() => setLoading(false));
  }, [businessId, serviceIds, staffUserId, selectedDate]);

  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    return slots.filter((s) => {
      const slotDate = new Date(s.startAtUtc).toISOString().slice(0, 10);
      return slotDate === selectedDate;
    });
  }, [slots, selectedDate]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-20 border border-[var(--border)] bg-[var(--surface-raised)] animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 border border-[var(--border)] bg-[var(--surface-raised)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p
        className="font-mono text-sm text-[var(--text-secondary)] py-6 text-center"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        {error}
      </p>
    );
  }

  // Group slots into day-part buckets for the time grid
  const groups: { label: string; icon: typeof Sunrise; items: AvailabilitySlotResponse[] }[] = [
    { label: "Morning", icon: Sunrise, items: [] },
    { label: "Afternoon", icon: Sun, items: [] },
    { label: "Evening", icon: Moon, items: [] },
  ];
  for (const s of daySlots) {
    const h = new Date(s.startAtUtc).getHours();
    if (h < 12) groups[0].items.push(s);
    else if (h < 17) groups[1].items.push(s);
    else groups[2].items.push(s);
  }

  return (
    <div className={className}>
      {/* Date scroller */}
      <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-3">
        Select Date
      </p>
      <div
        className="flex overflow-x-auto gap-2 pb-2 -mx-5 px-5"
        style={{ scrollbarWidth: "none" }}
        role="group"
        aria-label="Select date"
      >
        {dateRange.map((date) => {
          const d = new Date(date);
          const isSelected = date === selectedDate;
          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              aria-pressed={isSelected}
              className={`flex-shrink-0 w-16 h-20 flex flex-col items-center justify-center gap-1 border transition-colors ${
                isSelected
                  ? "border-[var(--text-primary)] bg-[var(--text-primary)]"
                  : "border-[var(--border)] hover:border-[var(--text-primary)]"
              }`}
            >
              <span
                className={`text-[10px] tracking-[0.15em] uppercase font-bold ${isSelected ? "text-[var(--background)]" : "text-[var(--text-tertiary)]"}`}
              >
                {d.toLocaleDateString([], { weekday: "short" })}
              </span>
              <span
                className={`text-xl font-bold ${isSelected ? "text-[var(--background)]" : "text-[var(--text-primary)]"}`}
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-4 mt-8">
        Select Time
      </p>

      {daySlots.length === 0 ? (
        <p
          className="font-mono text-sm text-[var(--text-tertiary)] py-8 text-center"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          No available slots for this day.
        </p>
      ) : (
        <div className="space-y-7">
          {groups.map(({ label, icon: Icon, items }) =>
            items.length === 0 ? null : (
              <div key={label}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={1.5} />
                  <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">
                    {label}
                  </span>
                </div>
                <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 gap-3">
                  {items.map((s, i) => {
                    const isSelected = slot?.startAtUtc === s.startAtUtc;
                    return (
                      <button
                        key={`${s.startAtUtc}-${i}`}
                        onClick={() => setSlot(s)}
                        aria-pressed={isSelected}
                        className={`py-3 font-mono text-sm text-center border transition-colors ${
                          isSelected
                            ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--background)] font-bold"
                            : "border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--text-primary)]"
                        }`}
                        style={{ fontFamily: "'Space Mono', monospace" }}
                      >
                        {formatTime(s.startAtUtc)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}