"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import type {
  ApiResponse,
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Custom Auth Hook
//  Provides auth actions with loading states, error handling,
//  toast notifications, and navigation.
// ═══════════════════════════════════════════════════════════════

export function useAuth() {
  const router = useRouter();
  const { login: storeLogin, logout: storeLogout, setPendingVerificationEmail } =
    useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Extract error message from Axios error or API response */
  const getErrorMessage = (err: unknown): string => {
    if (err instanceof AxiosError && err.response?.data) {
      const data = err.response.data as ApiResponse<unknown>;
      return data.error?.message || "An unexpected error occurred.";
    }
    if (err instanceof Error) return err.message;
    return "An unexpected error occurred.";
  };

  /** Redirect to the correct dashboard based on role */
  const redirectByRole = (role: string) => {
    switch (role) {
      case "Admin":
        router.push("/dashboard/admin");
        break;
      case "Business":
        router.push("/dashboard/business");
        break;
      case "Staff":
        router.push("/dashboard/staff");
        break;
      default:
        router.push("/dashboard");
    }
  };

  /** Register a new user */
  const register = useCallback(
    async (data: RegisterRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await authApi.register(data);

        if (result.success) {
          setPendingVerificationEmail(data.email);
          toast.success("Registration successful! Check your email for the verification code.");
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        } else {
          const msg = result.error?.message || "Registration failed.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [router, setPendingVerificationEmail]
  );

  /** Verify email with 6-digit code */
  const verifyEmail = useCallback(
    async (data: VerifyEmailRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await authApi.verifyEmail(data);

        if (result.success && result.data) {
          storeLogin(
            result.data.user,
            result.data.accessToken,
            result.data.refreshToken
          );
          toast.success("Email verified successfully!");
          redirectByRole(result.data.user.role);
        } else {
          const msg = result.error?.message || "Verification failed.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [router, storeLogin]
  );

  /** Login with email and password */
  const login = useCallback(
    async (data: LoginRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await authApi.login(data);

        if (result.success && result.data) {
          storeLogin(
            result.data.user,
            result.data.accessToken,
            result.data.refreshToken
          );
          toast.success("Welcome back!");
          redirectByRole(result.data.user.role);
        } else {
          const msg = result.error?.message || "Login failed.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [router, storeLogin]
  );

  /** Logout */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors — clear tokens regardless
    } finally {
      storeLogout();
      toast.success("Logged out successfully.");
      router.push("/login");
    }
  }, [router, storeLogout]);

  /** Resend verification code */
  const resendVerificationCode = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const result = await authApi.requestVerificationCode({ email });
      if (result.success) {
        toast.success("Verification code sent!");
      } else {
        toast.error(result.error?.message || "Failed to send code.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    register,
    verifyEmail,
    login,
    logout,
    resendVerificationCode,
    isLoading,
    error,
    setError,
  };
}
