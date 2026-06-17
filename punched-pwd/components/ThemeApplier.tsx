"use client";

import { useEffect } from "react";
import { applyStoredTheme } from "@/store/themeStore";

/**
 * Hydrates the theme from localStorage on first client render.
 * Place this inside the root layout <body>.
 */
export function ThemeApplier() {
  useEffect(() => {
    applyStoredTheme();
  }, []);
  return null;
}
