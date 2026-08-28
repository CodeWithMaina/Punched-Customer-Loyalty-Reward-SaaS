import { CreditCard } from "lucide-react";
import type { ModuleManifest } from "../types";

export const loyaltyModule: ModuleManifest = {
  id: "loyalty",
  name: "Loyalty Programs",
  description: "Loyalty program management",
  icon: CreditCard,
  version: "1.0.0",
  roles: ["Business", "Customer"],
  nav: [],
  requiredPermissions: ["loyalty.view", "loyalty.manage"],
  dependencies: ["customers", "stamps"],
  routes: [],
};
