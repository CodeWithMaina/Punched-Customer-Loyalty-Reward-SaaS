"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Calendar state for the appointments page:
 * displayed week (offset from current), the selected day,
 * and week navigation. The week range drives the DB query.
 */
export function useAppointmentCalendar() {
  const [selectedDate, setSelectedDate] = useState(
    () => null as string | null
  );
  /** 0 = current week, -1 = previous, +1 = next … */
  const [weekOffset, setWeekOffset] = useState(0);

  /** Monday 00:00 of the displayed week (+ exclusive end) — drives DB query range. */
  const weekRange = useMemo(() => {
    const base = new Date();
    const dow = (base.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(base);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(base.getDate() - dow + weekOffset * 7);
    const end = new Date(monday);
    end.setDate(monday.getDate() + 7);
    return { start: monday, end };
  }, [weekOffset]);

  /** Selected day key — defaults to today until the user picks another day. */
  const activeSelectedDate =
    selectedDate ?? dayKeyLocal(new Date().toISOString());

  const shiftWeek = useCallback(
    (delta: number) => {
      const target = new Date(weekRange.start);
      target.setDate(target.getDate() + delta * 7);
      setWeekOffset((w) => w + delta);
      setSelectedDate(dayKeyLocal(target.toISOString()));
    },
    [weekRange]
  );

  const goCurrentWeek = useCallback(() => {
    setWeekOffset(0);
    setSelectedDate(dayKeyLocal(new Date().toISOString()));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(dayKeyLocal(new Date().toISOString()));
  }, []);

  const shiftDay = useCallback((delta: number) => {
    const base = new Date(`${activeSelectedDate}T12:00:00`);
    base.setDate(base.getDate() + delta);
    setSelectedDate(dayKeyLocal(base.toISOString()));
  }, [activeSelectedDate]);

  return {
    weekRange,
    weekOffset,
    selectedDate: activeSelectedDate,
    setSelectedDate,
    shiftWeek,
    goCurrentWeek,
    goToToday,
    shiftDay,
  };
}

function dayKeyLocal(iso: string) {
  const date = new Date(iso);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}