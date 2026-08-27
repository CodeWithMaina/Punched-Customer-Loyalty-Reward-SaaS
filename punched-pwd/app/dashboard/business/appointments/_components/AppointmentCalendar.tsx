"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { AppointmentResponse, BusinessCustomer, StaffMember } from "@/types";
import {
  END_HOUR,
  MINUTES_PER_HOUR,
  PX_PER_MINUTE,
  START_HOUR,
  customerName,
  dayKey,
  fullDate,
  getDuration,
  hhmm,
} from "../_utils/appointment-utils";
import { StatusBadge } from "@/components/ui";
import { WeekDateStrip } from "./WeekDateStrip";

/**
 * The "Calendar" view: filters trigger, week strip and the
 * hour-grid schedule for the selected day.
 */
export function AppointmentCalendar({
  appointments,
  customerMap,
  staffMap,
  selectedDate,
  selectedId,
  onSelect,
  weekStart,
  weekDayCounts,
  weekOffset,
  onShiftWeek,
  onCurrentWeek,
  onSelectDate,
  onOpenFilters,
}: {
  appointments: AppointmentResponse[];
  customerMap: Map<string, BusinessCustomer>;
  staffMap: Map<string, StaffMember>;
  selectedDate: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Monday of the displayed week. */
  weekStart: Date;
  weekDayCounts: Record<string, number>;
  weekOffset: number;
  onShiftWeek: (delta: number) => void;
  onCurrentWeek: () => void;
  onSelectDate: (date: string) => void;
  /** Opens the right-side filter drawer. */
  onOpenFilters: () => void;
}) {
  return (
    <section id="appointments-panel-calendar" role="tabpanel" aria-labelledby="appointments-tab-calendar">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold sm:text-lg">Your schedule</h2>

            <span className="rounded-full bg-[var(--brand-light)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-text)]">
              {appointments.length}
            </span>
          </div>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Focused on current time and upcoming appointments
          </p>
        </div>

        {/* Filters — opens the right-side drawer */}
        <button
          onClick={onOpenFilters}
          aria-haspopup="dialog"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold hover:border-[var(--brand)]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {/* Week navigation */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button onClick={() => onShiftWeek(-1)} aria-label="Previous week" className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)]">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={onCurrentWeek}
          aria-label="Go to current week"
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold hover:border-[var(--brand)]"
        >
          {weekOffset === 0 ? "This week" : "Back to this week"}

          <span className="hidden text-[var(--text-tertiary)] sm:inline">
            ·{" "}
            {weekStart.toLocaleDateString([], { month: "short", day: "numeric" })}{" "}
            –{" "}
            {new Date(weekStart.getTime() + 6 * 86_400_000).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            })}
          </span>
        </button>

        <button onClick={() => onShiftWeek(1)} aria-label="Next week" className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand)]">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week strip */}
      <WeekDateStrip
        selectedDate={selectedDate}
        onChange={onSelectDate}
        weekStart={weekStart}
        dayCounts={weekDayCounts}
      />

      {/* Day grid */}
      <ScheduleCalendar
        appointments={appointments}
        customerMap={customerMap}
        staffMap={staffMap}
        selectedDate={selectedDate}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCHEDULE CALENDAR (hour grid)
   ═══════════════════════════════════════════════════════════════ */

function ScheduleCalendar({
  appointments,
  customerMap,
  staffMap,
  selectedDate,
  selectedId,
  onSelect,
}: {
  appointments: AppointmentResponse[];
  customerMap: Map<string, BusinessCustomer>;
  staffMap: Map<string, StaffMember>;
  selectedDate: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const dayAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) => dayKey(appointment.scheduledAt) === selectedDate
      ),
    [appointments, selectedDate]
  );

  const hours = Array.from(
    { length: END_HOUR - START_HOUR + 1 },
    (_, index) => START_HOUR + index
  );

  const dayHeight = (END_HOUR - START_HOUR) * MINUTES_PER_HOUR * PX_PER_MINUTE;

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
      {/* Calendar header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold">
            {fullDate(new Date(`${selectedDate}T12:00:00`).toISOString())}
          </p>

          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {dayAppointments.length} appointment
            {dayAppointments.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          Current time
        </div>
      </div>

      {/* Scrollable calendar */}
      <div className="max-h-[720px] overflow-auto">
        <div className="relative" style={{ height: dayHeight }}>
          {/* Grid */}
          <div className="absolute inset-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-[var(--border-light)]"
                style={{
                  top: `${(hour - START_HOUR) * MINUTES_PER_HOUR * PX_PER_MINUTE}px`,
                }}
              >
                <span className="absolute left-3 top-[-9px] bg-[var(--surface)] px-1.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                  {new Date(2000, 0, 1, hour).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>

          {/* Vertical axis */}
          <div className="absolute bottom-0 left-0 top-0 w-12 border-r border-[var(--border)] sm:w-16" />

          {/* Appointment area */}
          <div className="absolute bottom-0 left-12 right-0 top-0 sm:left-16">
            {dayAppointments.map((appointment) => {
              const start = new Date(appointment.scheduledAt);

              const minutes =
                start.getHours() * 60 + start.getMinutes() - START_HOUR * 60;

              const top = Math.max(minutes, 0) * PX_PER_MINUTE;

              const height = Math.max(getDuration(appointment) * PX_PER_MINUTE, 58);

              const customer = customerName(customerMap, appointment, "Guest");

              const staffName = appointment.staffUserId
                ? staffMap.get(appointment.staffUserId)?.fullName ?? "Assigned"
                : "Unassigned";

              const selected = selectedId === appointment.id;

              return (
                <button
                  key={appointment.id}
                  onClick={() => onSelect(appointment.id)}
                  aria-label={`${customer}, ${appointment.services?.[0]?.name ?? "Appointment"}, ${hhmm(appointment.scheduledAt)}`}
                  className={`absolute left-2 right-2 overflow-hidden rounded-[var(--radius-md)] border p-2.5 text-left transition-colors sm:left-3 sm:right-4 sm:p-3 ${
                    selected
                      ? "border-[var(--brand)] bg-[var(--brand-surface)] ring-2 ring-[var(--brand-ring)]"
                      : "border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--brand)]"
                  }`}
                  style={{ top, height }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {appointment.services?.[0]?.name ?? "Appointment"}
                      </p>

                      <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                        {customer}
                      </p>
                    </div>

                    <StatusBadge status={appointment.status} />
                  </div>

                  {height >= 85 && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
                      <span>
                        {hhmm(appointment.scheduledAt)} · {getDuration(appointment)}m
                      </span>

                      <span>{staffName}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Current time */}
          <CurrentTimeIndicator selectedDate={selectedDate} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CURRENT TIME INDICATOR
   ═══════════════════════════════════════════════════════════════ */

function CurrentTimeIndicator({ selectedDate }: { selectedDate: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  if (dayKey(now.toISOString()) !== selectedDate) {
    return null;
  }

  const minutes = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;

  const totalMinutes = (END_HOUR - START_HOUR) * MINUTES_PER_HOUR;

  if (minutes < 0 || minutes > totalMinutes) {
    return null;
  }

  const top = minutes * PX_PER_MINUTE;

  return (
    <div className="pointer-events-none absolute left-0 right-0 z-20" style={{ top }}>
      <div className="flex items-center">
        <div className="w-12 sm:w-16">
          <span className="ml-1 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-bold text-white sm:ml-2">
            {hhmm(now.toISOString())}
          </span>
        </div>

        <div className="relative flex-1">
          <div className="h-[2px] bg-[var(--accent)]" />
          <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}