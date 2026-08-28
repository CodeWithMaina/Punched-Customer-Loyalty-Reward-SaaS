import type { ModuleManifest } from "./types";
import { customersModule } from "./modules/customers";
import { staffModule } from "./modules/staff";
import { settingsModule } from "./modules/settings";
import { appointmentsModule } from "./modules/appointments";
import { stampsModule } from "./modules/stamps";
import { notificationsModule } from "./modules/notifications";
import { serviceCatalogModule } from "./modules/serviceCatalog";
import { loyaltyModule } from "./modules/loyalty";
import { rewardsModule } from "./modules/rewards";
import { analyticsModule } from "./modules/analytics";
import { programsModule } from "./modules/programs";
import { referralModule } from "./modules/referral";

// ═══════════════════════════════════════════════════════════════
//  Module registry — aggregates every module manifest.
//  `id` values MUST match the backend module catalog keys exactly.
// ═══════════════════════════════════════════════════════════════

export const moduleRegistry: ModuleManifest[] = [
  customersModule,
  staffModule,
  settingsModule,
  appointmentsModule,
  stampsModule,
  notificationsModule,
  serviceCatalogModule,
  loyaltyModule,
  rewardsModule,
  analyticsModule,
  programsModule,
  referralModule,
];

export function findModule(id: string): ModuleManifest | undefined {
  return moduleRegistry.find((m) => m.id === id);
}

/**
 * Transitive dependency closure of the given module ids (mirrors the backend
 * ModuleCatalog.CloseDependencies). Used for access semantics — nav still
 * only shows explicitly entitled modules.
 */
export function closeDependencies(moduleIds: string[] | Set<string>): Set<string> {
  const closed = new Set<string>();
  const queue = Array.from(moduleIds);

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (closed.has(id)) continue;
    closed.add(id);

    const manifest = findModule(id);
    if (manifest) queue.push(...manifest.dependencies);
  }

  return closed;
}