import { Gift } from "lucide-react";
import type { ModuleManifest } from "../types";

export const referralModule: ModuleManifest = {
  id: "referral",
  name: "Referrals",
  description: "Customer referral program",
  icon: Gift,
  version: "1.0.0",
  roles: ["Business", "Customer"],
  nav: [],
  requiredPermissions: ["referral.view", "referral.manage"],
  dependencies: ["loyalty", "stamps"],
  routes: ["/dashboard/business/referral", "/dashboard/profile/referral"],
};
