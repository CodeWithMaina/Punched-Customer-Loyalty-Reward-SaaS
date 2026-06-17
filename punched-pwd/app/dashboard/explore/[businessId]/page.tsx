"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import { loyaltyApi } from "@/lib/api/loyalty";
import { referralsApi } from "@/lib/api/referrals";
import type { Business, LoyaltyCard } from "@/types";
import {
  ArrowLeft, MapPin, Store, Loader2, Gift, Users,
  Check, Share2, Phone, Mail, Stamp, ChevronRight, Star, Clock, Award,
} from "lucide-react";
import toast from "react-hot-toast";

export default function BusinessDetailPage() {
  useRoleGuard("Customer");
  const { businessId } = useParams<{ businessId: string }>();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [myCards, setMyCards] = useState<LoyaltyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    Promise.all([businessesApi.getById(businessId), loyaltyApi.getMyCards()])
      .then(([bizRes, cardsRes]) => {
        if (bizRes.success && bizRes.data) setBusiness(bizRes.data);
        if (cardsRes.success && cardsRes.data) setMyCards(cardsRes.data);
      })
      .finally(() => setIsLoading(false));
  }, [businessId]);

  const enrolledCard = myCards.find((c) => c.businessId === businessId) ?? null;

  async function handleEnroll() {
    setEnrollingId("default");
    try {
      const res = await loyaltyApi.enroll({ businessId });
      if (res.success && res.data) {
        setMyCards((prev) => [...prev.filter((c) => c.businessId !== businessId), res.data!]);
        toast.success("Enrolled in " + business?.name + "!");
      } else toast.error(res.error?.message ?? "Enrollment failed");
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setEnrollingId(null);
    }
  }

  async function handleReferFriend() {
    setIsGeneratingLink(true);
    try {
      const res = await referralsApi.generateLink({ businessId });
      if (res.success && res.data) {
        const url = "https://punched.app/refer/" + res.data.code;
        if (navigator.share) {
          await navigator.share({
            title: "Join " + business?.name + " on Punched",
            text: "Join " + business?.name + " on Punched! " + url,
            url,
          });
        } else {
          await navigator.clipboard.writeText(url);
          setCopiedLink(true);
          toast.success("Referral link copied!");
          setTimeout(() => setCopiedLink(false), 2000);
        }
      } else toast.error(res.error?.message ?? "Could not generate link");
    } catch {
      toast.error("Failed to generate referral link");
    } finally {
      setIsGeneratingLink(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
        <Store className="h-12 w-12 text-[var(--text-muted)]" />
        <p className="text-[var(--text-secondary)]">Business not found.</p>
        <button onClick={() => router.back()} className="text-brand text-sm font-medium">
          Go back
        </button>
      </div>
    );
  }

  const programs =
    business.loyaltyPrograms?.filter((p) => p.isActive) ??
    (business.loyaltyProgram ? [business.loyaltyProgram] : []);
  const stamps = enrolledCard?.totalStamps ?? 0;
  const required = enrolledCard?.program.stampsRequired ?? programs[0]?.stampsRequired ?? 0;
  const progress = required > 0 ? Math.min((stamps / required) * 100, 100) : 0;
  const rewardReady = required > 0 && stamps >= required;

  return (
    <div className="max-w-lg mx-auto pb-32">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-brand to-brand-hover overflow-hidden">
          {business.logoUrl && (
            <img src={business.logoUrl} alt={business.name} className="absolute inset-0 w-full h-full object-cover opacity-15" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 h-10 w-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Profile card overlapping hero */}
        <div className="mx-4 -mt-16 relative z-10 bg-[var(--surface)] rounded-3xl shadow-lg border border-[var(--border-light)] p-5">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-brand-surface border-2 border-white shadow-card flex items-center justify-center overflow-hidden flex-shrink-0">
              {business.logoUrl ? (
                <img src={business.logoUrl} alt={business.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-8 w-8 text-brand" />
              )}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight truncate">{business.name}</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">{business.category}</p>
              {business.location && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--text-tertiary)]">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{business.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contact actions */}
          <div className="flex gap-2 mt-4">
            {business.phoneNumber && (
              <a href={`tel:${business.phoneNumber}`} className="flex-1 flex items-center justify-center gap-2 bg-[var(--surface-raised)] hover:bg-[var(--border-light)] rounded-xl py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors">
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="flex-1 flex items-center justify-center gap-2 bg-[var(--surface-raised)] hover:bg-[var(--border-light)] rounded-xl py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors">
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-5 space-y-5">
        {/* ── Loyalty progress (enrolled) ────────────────────── */}
        {enrolledCard ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${rewardReady ? "bg-green-500" : "bg-brand"}`} />
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {rewardReady ? "Reward Ready!" : "Collecting stamps"}
                  </span>
                </div>
                <span className="text-sm font-bold text-brand">{stamps}/{required}</span>
              </div>

              {/* Stamp dots */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {Array.from({ length: Math.min(required, 12) }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      i < stamps
                        ? rewardReady ? "bg-green-500 border-green-500" : "bg-brand border-brand"
                        : "bg-[var(--surface-raised)] border-[var(--border)] border-dashed"
                    }`}
                  >
                    {i < stamps ? (
                      <Check className="h-3.5 w-3.5 text-white" />
                    ) : i === required - 1 ? (
                      <Gift className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    ) : null}
                  </div>
                ))}
                {required > 12 && <span className="text-xs text-[var(--text-tertiary)] self-center">+{required - 12}</span>}
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-[var(--border-light)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${rewardReady ? "bg-green-500" : "bg-brand"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Reward info */}
              <div className="flex items-center gap-2 mt-3 bg-brand-surface rounded-xl px-3 py-2.5">
                <Award className="h-4 w-4 text-brand flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-brand-dark truncate">{enrolledCard.program.rewardDescription}</p>
                  <p className="text-[10px] text-brand/60">KES {enrolledCard.program.rewardValue} value</p>
                </div>
                {rewardReady && (
                  <button onClick={() => router.push("/dashboard/cards/" + enrolledCard.id)} className="text-xs font-bold text-brand bg-[var(--surface)] px-3 py-1.5 rounded-lg shadow-card flex-shrink-0">
                    Claim
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => router.push("/dashboard/cards/" + enrolledCard.id)}
              className="w-full border-t border-[var(--border-light)] px-5 py-3 flex items-center justify-between hover:bg-[var(--surface-raised)] transition-colors"
            >
              <span className="text-sm font-semibold text-[var(--text-secondary)]">View your card</span>
              <ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />
            </button>
          </div>
        ) : programs.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Loyalty Programs</p>
            {programs.map((p) => (
              <div key={p.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
                    <Gift className="h-5 w-5 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{p.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{p.stampsRequired} stamps → {p.rewardDescription}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] mb-4">
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" />KES {p.rewardValue} reward</span>
                  {p.rewardExpirationHours > 0 && (
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />{p.rewardExpirationHours}h to claim</span>
                  )}
                </div>
                <button onClick={handleEnroll} disabled={!!enrollingId}
                  className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  {enrollingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                  Start collecting stamps
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--surface-raised)] rounded-2xl border border-[var(--border-light)] p-8 text-center">
            <Gift className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-tertiary)] font-medium">No active loyalty programs yet</p>
          </div>
        )}

        {/* ── About ──────────────────────────────────────────── */}
        {business.description && (
          <div>
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">About</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{business.description}</p>
          </div>
        )}

        {/* ── Refer a friend ─────────────────────────────────── */}
        {enrolledCard && business.hasReferralProgram && (
          <div className="bg-gradient-to-br from-brand to-brand-hover rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">Refer a Friend</p>
                <p className="text-xs text-white/70">Earn rewards when friends join</p>
              </div>
            </div>
            <button onClick={handleReferFriend} disabled={isGeneratingLink}
              className="w-full flex items-center justify-center gap-2 bg-[var(--surface)] text-brand rounded-xl py-3 font-bold text-sm disabled:opacity-50 transition-colors">
              {isGeneratingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : copiedLink ? (
                <><Check className="h-4 w-4" />Link Copied!</>
              ) : (
                <><Share2 className="h-4 w-4" />Share Referral Link</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── Sticky enroll CTA ────────────────────────────────── */}
      {!enrolledCard && programs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-[var(--border-light)] p-4 z-20 safe-area-bottom">
          <div className="max-w-lg mx-auto">
            <button onClick={handleEnroll} disabled={!!enrollingId}
              className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-sm tracking-wide uppercase shadow-lg">
              {enrollingId ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Enroll Now →</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}