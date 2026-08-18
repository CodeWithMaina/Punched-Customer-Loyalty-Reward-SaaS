"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CreditCard,
  Loader2,
} from "lucide-react";
import { onboardingApi } from "@/lib/api/onboarding";
import { InvitationAcceptForm } from "@/components/invitations/InvitationAcceptForm";
import type { StaffInvitationValidationResponse } from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Staff Invitation Accept Page
//  Route: /invitations/accept?token=...
//  Public — validates the token, then lets the invitee create their
//  staff account. Success authenticates them and routes to staff.
// ═══════════════════════════════════════════════════════════════

function InvitationAcceptInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "ready" | "invalid">(
    "loading"
  );
  const [validation, setValidation] =
    useState<StaffInvitationValidationResponse | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setMessage("This invitation link is missing its access token.");
      return;
    }

    let active = true;

    onboardingApi
      .validateInvitation(token)
      .then((res) => {
        if (!active) return;
        if (res.success && res.data) {
          if (res.data.valid) {
            setValidation(res.data);
            setStatus("ready");
          } else {
            setStatus("invalid");
            setMessage(
              res.data.errorMessage || "This invitation is no longer valid."
            );
          }
        } else {
          setStatus("invalid");
          setMessage(res.error?.message || "This invitation is no longer valid.");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("invalid");
          setMessage("Unable to reach the server. Please try again shortly.");
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Brand header */}
      <div className="bg-brand pt-14 pb-10 px-5 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white rounded-full" />
          <div className="absolute top-8 -left-8 w-32 h-32 bg-white rounded-full" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display tracking-tight">
            PUNCHED
          </h1>
          <p className="text-xs text-white/60 mt-1 font-medium">
            You&apos;re joining a team
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-5">
        <div className="w-full max-w-md mx-auto bg-[var(--surface)] rounded-3xl shadow-elevated p-6 sm:p-8 animate-fade-in">
          {status === "loading" && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand" />
              <p className="text-sm text-[var(--text-tertiary)]">
                Checking your invitation...
              </p>
            </div>
          )}

          {status === "invalid" && (
            <div className="py-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                Invitation unavailable
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {message}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-4">
                If this was sent to you, contact the business owner for a fresh
                invitation link.
              </p>
            </div>
          )}

          {status === "ready" && validation && (
            <InvitationAcceptForm
              token={token}
              businessName={validation.businessName || "this business"}
              invitedEmail={validation.email}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvitationAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand" />
            <p className="text-sm text-[var(--text-tertiary)]">Loading...</p>
          </div>
        </div>
      }
    >
      <InvitationAcceptInner />
    </Suspense>
  );
}