import { TrendingUp } from "lucide-react";
import type { ModuleManifest } from "../types";

export const analyticsModule: ModuleManifest = {
  id: "analytics",
  name: "Analytics",
  description: "Business analytics",
  icon: TrendingUp,
  version: "1.0.0",
  roles: ["Business"],
  nav: [
    { label: "Analytics", href: "/dashboard/business/analytics", icon: TrendingUp, scope: "Business", exact: false },
  ],
  requiredPermissions: ["analytics.view"],
  dependencies: [],
  routes: ["/dashboard/business/analytics"],
};
