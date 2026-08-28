import { User } from "lucide-react";
import type { ModuleManifest } from "../types";

export const settingsModule: ModuleManifest = {
  id: "settings",
  name: "Settings",
  description: "Business settings and profile",
  icon: User,
  version: "1.0.0",
  roles: ["Business", "Staff", "Customer"],
  nav: [
    { label: "Settings", href: "/dashboard/business/profile", icon: User, scope: "Business", exact: false },
    { label: "Profile", href: "/dashboard/profile", icon: User, scope: "Customer", exact: false },
    { label: "Profile", href: "/dashboard/profile", icon: User, scope: "Staff", exact: false },
  ],
  requiredPermissions: ["settings.view", "settings.manage"],
  dependencies: [],
  routes: [],
};
