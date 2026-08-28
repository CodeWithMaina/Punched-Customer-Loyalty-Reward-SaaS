import { Users } from "lucide-react";
import type { ModuleManifest } from "../types";

export const customersModule: ModuleManifest = {
  id: "customers",
  name: "Customers",
  description: "Customer management and profiles",
  icon: Users,
  version: "1.0.0",
  roles: ["Business", "Staff"],
  nav: [
    { label: "Customers", href: "/dashboard/business/customers", icon: Users, scope: "Business", exact: false },
  ],
  requiredPermissions: ["customers.view", "customers.manage"],
  dependencies: [],
  routes: ["/dashboard/business/customers"],
};
