"use client";

import { useMemo } from "react";
import { useModules } from "@/hooks/useModules";
import { findModule } from "@/registry/modules";
import { shellProfiles } from "@/registry/shells";
import type { NavItem, ShellScope } from "@/registry/types";

// ═══════════════════════════════════════════════════════════════
//  useModuleNav — registry-driven navigation for a shell scope.
//
//  shellProfiles[scope].moduleOrder → manifests → keep nav items with a
//  matching scope IF the user has the module AND the role intersects the
//  manifest's requiredPermissions → prepend coreRoutes.
//
//  While entitlements are loading, the FULL nav is returned (previous
//  state) — never flash a collapsed nav or upgrade prompt on first paint.
// ═══════════════════════════════════════════════════════════════

export function useModuleNav(scope: ShellScope): NavItem[] {
  const { hasModule, hasPermission, isLoaded } = useModules();

  return useMemo(() => {
    const profile = shellProfiles[scope];
    const items: NavItem[] = [...profile.coreRoutes];

    for (const moduleId of profile.moduleOrder) {
      const manifest = findModule(moduleId);
      if (!manifest) continue;

      // Role × module: the shell must be in the manifest's roles...
      if (!manifest.roles.includes(scope)) continue;

      // ...AND the user must hold at least one of the module's permissions
      // (empty requiredPermissions = open). Entitlement ≠ permission.
      const permitted =
        manifest.requiredPermissions.length === 0 ||
        manifest.requiredPermissions.some((code) => hasPermission(code));
      if (!permitted) continue;

      // Entitlement check (Admin bypasses inside hasModule). While loading,
      // keep the item so the nav doesn't collapse on first paint.
      if (isLoaded && !hasModule(moduleId)) continue;

      for (const item of manifest.nav) {
        if (item.scope !== scope) continue;
        items.push(item);
      }
    }

    return items;
  }, [scope, hasModule, hasPermission, isLoaded]);
}