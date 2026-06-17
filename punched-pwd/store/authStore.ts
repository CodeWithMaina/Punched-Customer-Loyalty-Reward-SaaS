import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";
import { setTokens, clearTokens } from "@/lib/api/client";
import { invalidateCache } from "@/lib/api/cache";

// ═══════════════════════════════════════════════════════════════
//  Auth Store (Zustand with localStorage persistence)
//  Manages user session, tokens, and authentication state.
// ═══════════════════════════════════════════════════════════════

interface AuthState {
  /** Current authenticated user or null */
  user: User | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether auth state is being loaded/checked */
  isLoading: boolean;
  /** Email stored during registration → verification flow */
  pendingVerificationEmail: string | null;

  // ── Actions ───────────────────────────────────────────────
  /** Set authenticated user and tokens */
  login: (user: User, accessToken: string, refreshToken: string) => void;
  /** Clear authentication state */
  logout: () => void;
  /** Update the user profile */
  setUser: (user: User) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Store email for verification flow */
  setPendingVerificationEmail: (email: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      pendingVerificationEmail: null,

      login: (user, accessToken, refreshToken) => {
        setTokens(accessToken, refreshToken);
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          pendingVerificationEmail: null,
        });
      },

      logout: () => {
        clearTokens();
        invalidateCache();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          pendingVerificationEmail: null,
        });
      },

      setUser: (user) => set({ user }),

      setLoading: (isLoading) => set({ isLoading }),

      setPendingVerificationEmail: (email) =>
        set({ pendingVerificationEmail: email }),
    }),
    {
      name: "punched-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        pendingVerificationEmail: state.pendingVerificationEmail,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // If the store says authenticated but both tokens are gone
        // (e.g. user manually cleared localStorage), force a logout.
        const hasToken =
          typeof window !== "undefined" &&
          (localStorage.getItem("punched_access_token") ||
            localStorage.getItem("punched_refresh_token"));

        if (state.isAuthenticated && !hasToken) {
          state.logout();
        } else {
          state.setLoading(false);
        }
      },
    }
  )
);
