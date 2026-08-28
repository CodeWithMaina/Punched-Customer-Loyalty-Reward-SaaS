import type { LucideIcon } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Module registry types (frontend manifests)
//  Manifest `id` MUST match the backend module key exactly
//  (ModuleSeedData = ModuleCatalog = manifest id, all lowercase).
// ═══════════════════════════════════════════════════════════════

export type ShellScope = "Customer" | "Business" | "Staff" | "Admin";

/** A single navigation entry generated into a shell. */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  scope: ShellScope;
  /** Exact-path matching (preserves the legacy nav's `exact` flag). */
  exact: boolean;
  /**
   * Staff mobile bottom bar keeps the floating Scan action instead of a
   * tab — items flagged hideInBottom are excluded from the bottom bar.
   */
  hideInBottom?: boolean;
}

/** A module's frontend manifest: identity + nav contribution + routes. */
export interface ModuleManifest {
  /** Matches the backend module key: "appointments" */
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  version: string;
  /** Which shells it can appear in (mirrors backend RequiredRoles). */
  roles: ShellScope[];
  /** Nav items generated into the shell, filtered by entitlement. */
  nav: NavItem[];
  /** e.g. ["appointments.view"] — mirrors backend PermissionMatrix codes. */
  requiredPermissions: string[];
  /** e.g. ["customers", "staff"] — mirrors backend ModuleCatalog deps. */
  dependencies: string[];
  /** Route prefixes matched for direct-nav blocking via <RequireModule>. */
  routes: string[];
}

/** Role → shell configuration: module order + always-present core routes. */
export interface ShellProfile {
  scope: ShellScope;
  /** Nav ordering of module ids. */
  moduleOrder: string[];
  /** Always-present items (Dashboard, Settings, etc.) — not entitlement-gated. */
  coreRoutes: NavItem[];
  /**
   * Optional floating bottom-bar actions for the shell (e.g. Staff's flanking
   * Activity/Appointments buttons around the center Scan FAB). Derived from the
   * registry so the legacy hardcoded arrays can be deleted.
   */
  floatingActions?: NavItem[];
}