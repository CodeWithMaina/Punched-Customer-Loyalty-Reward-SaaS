import { ScanLine } from "lucide-react";
import type { ModuleManifest } from "../types";

export const stampsModule: ModuleManifest = {
  id: "stamps",
  name: "Stamps",
  description: "Digital stamp cards and QR awarding.",
  icon: ScanLine,
  version: "1.0.0",
  roles: ["Business", "Staff", "Customer"],
  nav: [
    // Scan is deliberately kept as a floating center action on staff mobile.
    { label: "Scan", href: "/dashboard/staff/scan", icon: ScanLine, scope: "Staff", exact: false, hideInBottom: true },
  ],
  requiredPermissions: ["stamps.view", "stamps.award"],
  dependencies: ["customers"],
  routes: ["/dashboard/staff/scan", "/dashboard/business/scan"],
};
