"use client";

import type { ReactNode } from "react";
import { useModules } from "@/hooks/useModules";
import { UpgradePrompt } from "./UpgradePrompt";

// ═══════════════════════════════════════════════════════════════
//  RequireModule — page-level module guard (client-side UX gate).
//  The backend [RequireModule] filter remains the security boundary.
//  While entitlements are loading, render nothing — never flash an
//  upgrade prompt on first paint.
// ═══════════════════════════════════════════════════════════════

export function RequireModule({
  module,
  children,
}: {
  module: string;
  children: ReactNode;
}) {
  const { hasModule, isLoaded } = useModules();

  if (!isLoaded) return null;
  if (!hasModule(module)) return <UpgradePrompt module={module} />;

  return <>{children}</>;
}