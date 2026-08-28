"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { modulesApi } from "@/lib/api/modules";
import { closeDependencies, moduleRegistry } from "@/registry/modules";
import type { CallerPlanInfo, MyModulesResponse } from "@/types";

// ═══════════════════════════════════════════════════════════════
//  useModules — the caller's effective module entitlements + permissions.
//
//  - hasModule(key): explicit entitlement + client-side dependency closure
//    for access semantics (nav only shows explicitly entitled modules).
//  - Admin bypasses module checks (platform-level).
//  - While isLoaded === false, callers must not render upgrade prompts.
//  - On fetch failure we FAIL OPEN (grant all): the backend filter is the
//    security boundary; the UI must not lock users out over a cache blip.
// ═══════════════════════════════════════════════════════════════

interface UseModulesResult {
  /** Explicitly entitled module ids (nav list). */
  modules: string[];
  /** Granted permission codes for the caller's role. */
  permissions: string[];
  /** Access check: entitlement + dependency closure. */
  hasModule: (moduleId: string) => boolean;
  /** Permission check: role-granted permission code. */
  hasPermission: (code: string) => boolean;
  isLoaded: boolean;
  plan: CallerPlanInfo | null;
  /** Force a refetch (also clears the cachedFetch entry). */
  reload: () => void;
}

export function useModules(): UseModulesResult {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const role = user?.role;

  const [data, setData] = useState<MyModulesResponse | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    modulesApi
      .getMyModules()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          // Fail open with an empty explicit set; access set still closes
          // dependencies, and Admin bypasses below.
          console.warn("[useModules] /me/modules returned no data — failing open.");
          setData({ entitlements: [], permissions: [], plan: null });
        }
        setIsLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[useModules] failed to load entitlements — failing open:", err);
        setData(null);
        setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const cleanup = load();
    return cleanup;
  }, [userId, load]);

  const isAdmin = role === "Admin";

  // Fail open: when the fetch itself failed (data === null but loaded),
  // treat every catalog module as entitled so the UI keeps working.
  const explicit = useMemo(() => {
    if (isAdmin) return moduleRegistry.map((m) => m.id);
    if (data) return data.entitlements;
    return isLoaded ? [] : moduleRegistry.map((m) => m.id);
  }, [data, isAdmin, isLoaded]);

  const accessSet = useMemo(() => closeDependencies(explicit), [explicit]);

  const permissions = useMemo(() => {
    if (isAdmin) {
      // Admin gets every catalog permission.
      return Array.from(
        new Set(moduleRegistry.flatMap((m) => m.requiredPermissions))
      );
    }
    return data?.permissions ?? [];
  }, [data, isAdmin]);

  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const hasModule = useCallback(
    (moduleId: string) => {
      if (isAdmin) return true;
      return accessSet.has(moduleId);
    },
    [accessSet, isAdmin]
  );

  const hasPermission = useCallback(
    (code: string) => {
      if (isAdmin) return true;
      return permissionSet.has(code);
    },
    [permissionSet, isAdmin]
  );

  const reload = useCallback(() => {
    setIsLoaded(false);
    load();
  }, [load]);

  return {
    modules: explicit,
    permissions,
    hasModule,
    hasPermission,
    isLoaded,
    plan: data?.plan ?? null,
    reload,
  };
}