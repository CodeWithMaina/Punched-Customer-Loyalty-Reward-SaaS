"use client";

import { useMemo } from "react";
import { shellProfiles } from "@/registry/shells";
import type { NavItem, ShellScope } from "@/registry/types";

// ═══════════════════════════════════════════════════════════════
//  useShellFloatingActions — registry-driven floating bottom-bar flanks.
//
//  Returns the shell's optional floatingActions (e.g. Staff's Activity +
//  Appointments buttons around the center Scan FAB). These are static, never
//  entitlement-gated (they're core shell chrome, like coreRoutes). An empty
//  array is returned for shells without floating actions.
// ═══════════════════════════════════════════════════════════════

export function useShellFloatingActions(scope: ShellScope): NavItem[] {
  return useMemo(() => shellProfiles[scope].floatingActions ?? [], [scope]);
}