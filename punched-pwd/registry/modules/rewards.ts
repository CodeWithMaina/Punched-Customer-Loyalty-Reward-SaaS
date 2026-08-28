import { Award } from "lucide-react";
import type { ModuleManifest } from "../types";

export const rewardsModule: ModuleManifest = {
  id: "rewards",
  name: "Rewards",
  description: "Reward catalog and redemptions",
  icon: Award,
  version: "1.0.0",
  roles: ["Business", "Customer"],
  nav: [
    { label: "Rewards", href: "/dashboard/cards", icon: Award, scope: "Customer", exact: false },
  ],
  requiredPermissions: ["rewards.view", "rewards.manage"],
  dependencies: ["loyalty", "stamps"],
  routes: ["/dashboard/cards"],
};
