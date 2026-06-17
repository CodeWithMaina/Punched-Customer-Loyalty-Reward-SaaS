"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { referralsApi } from "@/lib/api/referrals";
import { Gift, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ResolveReferralResponse } from "@/types";

export default function ReferralDeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const code = params.code as string;

  const [status, setStatus] = useState<"loading" | "resolved" | "error">("loading");
  const [result, setResult] = useState<ResolveReferralResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Save referral code and redirect to register
      sessionStorage.setItem("punched_referral_code", code);
      router.replace(`/register?ref=${encodeURIComponent(code)}`);
      return;
    }

    resolveReferral();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  async function resolveReferral() {
    try {
      const res = await referralsApi.resolveCode({ code });
      if (res.success && res.data) {
        setResult(res.data);
        setStatus("resolved");
      } else {
        setErrorMessage(res.error?.message || "Invalid referral code.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-raised)] px-5">
        <Loader2 className="h-8 w-8 text-brand animate-spin mb-4" />
        <p className="text-sm text-[var(--text-secondary)]">Processing referral...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-raised)] px-5">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-8 text-center max-w-sm w-full">
          <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-[var(--text-primary)] mb-2">Referral Invalid</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push("/dashboard/explore")}
            className="w-full bg-brand text-white rounded-xl py-3 font-semibold text-sm hover:bg-brand-hover transition-colors"
          >
            Browse Businesses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--surface-raised)] px-5">
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-8 text-center max-w-sm w-full">
        <div className="h-14 w-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="text-lg font-bold text-[var(--text-primary)] mb-2">Referral Accepted!</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-1">
          <span className="font-semibold text-[var(--text-secondary)]">{result?.referrerName}</span> referred you to
        </p>
        <p className="text-base font-bold text-[var(--text-primary)] mb-4">{result?.businessName}</p>

        {result?.enrolled && (
          <div className="bg-green-50 rounded-xl px-4 py-3 mb-6">
            <div className="flex items-center gap-2 justify-center">
              <Gift className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-700">Auto-enrolled in loyalty program!</p>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push(`/dashboard/explore/${result?.businessId}`)}
          className="w-full bg-brand text-white rounded-xl py-3 font-semibold text-sm hover:bg-brand-hover transition-colors mb-3"
        >
          View Business
        </button>
        <button
          onClick={() => router.push("/dashboard/cards")}
          className="w-full bg-[var(--border-light)] text-[var(--text-secondary)] rounded-xl py-3 font-semibold text-sm hover:bg-[var(--border)] transition-colors"
        >
          Go to My Cards
        </button>
      </div>
    </div>
  );
}
