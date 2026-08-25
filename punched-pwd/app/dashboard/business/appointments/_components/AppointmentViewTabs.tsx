"use client";

import { CalendarDays, List } from "lucide-react";
import { Tabs } from "@/components/ui";

export type AppointmentsView = "calendar" | "list";

const VIEWS = [
  { value: "calendar" as const, label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { value: "list" as const, label: "Appointments", icon: <List className="h-4 w-4" /> },
];

/**
 * Accessible tab switcher between the calendar and list views.
 * Delegates semantics + keyboard support to the shared Tabs.
 */
export function AppointmentViewTabs({
  view,
  onChange,
}: {
  view: AppointmentsView;
  onChange: (view: AppointmentsView) => void;
}) {
  return (
    <Tabs
      items={VIEWS}
      value={view}
      onChange={onChange}
      label="Appointments view"
      className="mb-6 flex w-full sm:w-auto"
      idPrefix="appointments"
    />
  );
}