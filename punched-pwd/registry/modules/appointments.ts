import { CalendarDays } from "lucide-react";
import type { ModuleManifest } from "../types";

export const appointmentsModule: ModuleManifest = {
  id: "appointments",
  name: "Appointments",
  description: "Book, manage and track appointments.",
  icon: CalendarDays,
  version: "1.0.0",
  roles: ["Business", "Staff", "Customer"],
  nav: [
    { label: "Appointments", href: "/dashboard/business/appointments", icon: CalendarDays, scope: "Business", exact: false },
    { label: "Appointments", href: "/dashboard/staff/appointments", icon: CalendarDays, scope: "Staff", exact: false },
    { label: "Appointments", href: "/dashboard/appointments", icon: CalendarDays, scope: "Customer", exact: false },
  ],
  requiredPermissions: [
    "appointments.view",
    "appointments.manage",
    "appointments.create",
  ],
  dependencies: ["customers", "staff"],
  routes: [
    "/dashboard/business/appointments",
    "/dashboard/staff/appointments",
    "/dashboard/appointments",
  ],
};
