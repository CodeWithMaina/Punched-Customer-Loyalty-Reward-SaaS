import { Store } from "lucide-react";
import type { ModuleManifest } from "../types";

export const serviceCatalogModule: ModuleManifest = {
  id: "serviceCatalog",
  name: "Service Catalog",
  description: "Bookable services the business offers",
  icon: Store,
  version: "1.0.0",
  roles: ["Business", "Customer"],
  nav: [],
  requiredPermissions: ["serviceCatalog.view", "serviceCatalog.manage"],
  dependencies: [],
  routes: [],
};
