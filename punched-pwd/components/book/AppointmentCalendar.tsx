"use client";

import { useEffect, useState, useMemo } from "react";
import { appointmentsApi } from "@/lib/api/appointments";
import { useBookingStore } from "@/store/bookingStore";
import type { AvailabilitySlotResponse } from "@/types";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface AppointmentCalendarProps {
  businessId: string;
  serviceIds: string[];
  staffUserId: string | null;
  className?: string;
}

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
      <div className={`space-y-3 ${className}`}>
        <div className="h-12 bg-[var(--surface-raised)] rounded-xl animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 bg-[var(--surface-raised)] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-[var(--text-secondary)] py-6 text-center">
        {error}
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }}
          className="p-1 rounded-lg hover:bg-[var(--surface-raised)] transition-colors flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <div className="flex gap-1.5 overflow-x-auto py-1">
          {dateRange.map((date) => {
            const d = new Date(date);
            const isSelected = date === selectedDate;
            const isToday =
              date === new Date().toISOString().slice(0, 10);
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-brand text-white"
                    : isToday
                      ? "bg-[var(--surface-raised)] text-[var(--text-primary)]"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                } flex-shrink-0`}
              >
                <span>{d.toLocaleDateString([], { weekday: "short" })}</span>
                <span>{d.getDate()}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().slice(0, 10));
          }}
          className="p-1 rounded-lg hover:bg-[var(--surface-raised)] transition-colors flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      </div>

      {daySlots.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)] py-8 text-center">
          No available slots for this day.
        </p>
      ) : (
        <div className="space-y-2">
          {daySlots.map((s, i) => {
            const isSelected = slot?.startAtUtc === s.startAtUtc;
            return (
              <button
                key={i}
                onClick={() => setSlot(s)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-brand bg-brand-surface ring-1 ring-brand/20"
                    : "border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]"
                }`}
              >
                <div className="h-9 w-9 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-brand" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatTime(s.startAtUtc)} - {formatTime(s.endAtUtc)}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    with {s.staffName}
                  </p>
                </div>
                {isSelected && (
                  <div className="h-2 w-2 rounded-full bg-brand flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
