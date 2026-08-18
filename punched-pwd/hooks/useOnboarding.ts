"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { onboardingApi } from "@/lib/api/onboarding";
import { useAuthStore } from "@/store/authStore";
import type {
  AcceptStaffInvitationRequest,
  ApiResponse,
  RegisterBusinessRequest,
} from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Onboarding Hook
//  Business-owner registration + staff-invitation acceptance with
//  loading state, error handling, toasts, and navigation.
// ═══════════════════════════════════════════════════════════════

export function useOnboarding() {
  const router = useRouter();
  const { login: storeLogin } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof AxiosError && err.response?.data) {
      const data = err.response.data as ApiResponse<unknown>;
      return data.error?.message || fallback;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  };

  /** Register a business owner + their business atomically. */
  const registerBusiness = useCallback(
    async (data: RegisterBusinessRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await onboardingApi.registerBusiness(data);

        if (result.success) {
          toast.success(
            "Business account created! Check your email for the verification code."
          );
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
        } else {
          const msg = result.error?.message || "Registration failed.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getErrorMessage(err, "Registration failed.");
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  /** Accept a staff invitation: creates staff account and signs the user in. */
  const acceptInvitation = useCallback(
    async (token: string, data: AcceptStaffInvitationRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await onboardingApi.acceptInvitation(token, data);

        if (result.success && result.data) {
          storeLogin(
            result.data.user,
            result.data.accessToken,
            result.data.refreshToken
          );
          toast.success("Welcome aboard! Your staff account is ready.");
          router.replace(
            result.data.user.role === "Staff"
              ? "/dashboard/staff"
              : "/dashboard"
          );
        } else {
          const msg = result.error?.message || "Unable to accept the invitation.";
          setError(msg);
          toast.error(msg);
        }
      } catch (err) {
        const msg = getErrorMessage(err, "Unable to accept the invitation.");
        setError(msg);
        toast.error(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [router, storeLogin]
  );

  return {
    registerBusiness,
    acceptInvitation,
    isLoading,
    error,
  };
}