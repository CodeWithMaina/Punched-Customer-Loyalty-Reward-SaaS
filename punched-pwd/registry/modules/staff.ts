import { UserCheck } from "lucide-react";
import type { ModuleManifest } from "../types";

export const staffModule: ModuleManifest = {
  id: "staff",
  name: "Staff",
  description: "Staff management, shifts and invitations",
  icon: UserCheck,
  version: "1.0.0",
  roles: ["Business", "Staff"],
  nav: [
    { label: "Staff", href: "/dashboard/business/staff", icon: UserCheck, scope: "Business", exact: false },
  ],
  requiredPermissions: ["staff.view", "staff.manage"],
  dependencies: [],
  routes: ["/dashboard/business/staff"],
};
