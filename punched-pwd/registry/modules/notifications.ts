import { Bell } from "lucide-react";
import type { ModuleManifest } from "../types";

export const notificationsModule: ModuleManifest = {
  id: "notifications",
  name: "Notifications",
  description: "Push notifications",
  icon: Bell,
  version: "1.0.0",
  roles: ["Business", "Staff", "Customer"],
  nav: [],
  requiredPermissions: ["notifications.view", "notifications.manage"],
  dependencies: ["customers", "staff"],
  routes: ["/dashboard/notifications"],
};
