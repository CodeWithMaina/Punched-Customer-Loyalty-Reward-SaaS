"use client";

import { useMemo } from "react";
import { dayKey } from "../_utils/appointment-utils";

export function WeekDateStrip({
  selectedDate,
  onChange,
  weekStart,
  dayCounts,
}: {
  selectedDate: string;
  onChange: (date: string) => void;
  /** Monday of the displayed week. */
  weekStart: Date;
  /** Appointment count per day key. */
  dayCounts: Record<string, number>;
}) {
  const todayKey = dayKey(new Date().toISOString());

  const dates = useMemo(() => {
    const result: { key: string; weekday: string; day: number; isToday: boolean }[] = [];

    for (let index = 0; index < 7; index++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      const key = dayKey(date.toISOString());

      result.push({
        key,
        weekday: date.toLocaleDateString([], { weekday: "short" }),
        day: date.getDate(),
        isToday: key === todayKey,
      });
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, todayKey]);

  return (
    <div className="mb-4 grid grid-cols-7 gap-1 sm:gap-2">
      {dates.map((date) => {
        const active = date.key === selectedDate;
        const count = dayCounts[date.key] ?? 0;

        return (
          <button
            key={date.key}
            onClick={() => onChange(date.key)}
            aria-current={active ? "date" : undefined}
            aria-label={`${date.weekday} ${date.day}${count > 0 ? `, ${count} appointments` : ""}`}
            className={`relative flex min-w-0 flex-col items-center rounded-[var(--radius-md)] border px-1 py-2 transition-colors ${
              active
                ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                : count > 0
                  ? "border-[var(--brand)]/40 bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--brand)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--brand)]"
            }`}
          >
            <span className="text-[10px] font-semibold uppercase">
              {date.isToday && !active ? "•" : date.weekday.slice(0, 3)}
            </span>

            <span className="mt-1 text-base font-bold sm:text-lg">{date.day}</span>

            {count > 0 && (
              <span
                className={`mt-0.5 rounded-full px-1.5 text-[10px] font-semibold ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-[var(--brand-light)] text-[var(--brand-text)]"
                }`}
              >
                {count}
              </span>
            )}

            {date.isToday && !active && (
              <span aria-hidden className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}