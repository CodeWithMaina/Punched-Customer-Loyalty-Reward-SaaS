import { Zap } from "lucide-react";
import type { ModuleManifest } from "../types";

export const programsModule: ModuleManifest = {
  id: "programs",
  name: "Programs",
  description: "Custom program builder",
  icon: Zap,
  version: "1.0.0",
  roles: ["Business"],
  nav: [
    { label: "Programs", href: "/dashboard/business/profile/programs", icon: Zap, scope: "Business", exact: false },
  ],
  requiredPermissions: ["programs.view", "programs.manage"],
  dependencies: ["loyalty"],
  routes: [],
};
