"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import type { UserRole } from "@/types";

/**
 * Guards a page to a specific role.
 * Redirects to /dashboard if wrong role, /login if unauthenticated.
 */
export function useRoleGuard(requiredRole: UserRole) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    // Admin can access any role's pages
    if (user?.role === "Admin") return;
    if (user?.role !== requiredRole) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router]);

  return { user, isLoading };
}
