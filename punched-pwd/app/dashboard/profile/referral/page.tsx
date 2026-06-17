"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { referralsApi } from "@/lib/api/referrals";
import type { ReferralLink, Referral, ReferralStats, ReferralStatusType } from "@/types";
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Gift,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Loader2,
  QrCode,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_CONFIG: Record<ReferralStatusType, { label: string; color: string; icon: typeof Clock }> = {
  Pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50", icon: Clock },
  Activated: { label: "Activated", color: "text-blue-600 bg-blue-50", icon: Users },
  Qualified: { label: "Qualified", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  Rewarded: { label: "Rewarded", color: "text-brand bg-brand-surface", icon: Trophy },
  Expired: { label: "Expired", color: "text-[var(--text-tertiary)] bg-[var(--surface-raised)]", icon: XCircle },
};

export default function ReferralPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"links" | "activity">("links");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [linksRes, referralsRes, statsRes] = await Promise.all([
        referralsApi.getMyLinks(),
        referralsApi.getMyReferrals(),
        referralsApi.getMyStats(),
      ]);
      if (linksRes.success && linksRes.data) setLinks(linksRes.data);
      if (referralsRes.success && referralsRes.data) setReferrals(referralsRes.data);
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
    } catch {
      toast.error("Failed to load referral data");
    } finally {
      setLoading(false);
    }
  }

  function copyCode(code: string) {
    const url = `https://punched.app/refer/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast.success("Link copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function shareLink(code: string, businessName: string) {
    const url = `https://punched.app/refer/${code}`;
    const message = `Join ${businessName} on Punched and start earning loyalty rewards! ${url}`;

    if (navigator.share) {
      navigator.share({ title: `Join ${businessName} on Punched`, text: message, url });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-4 pb-5">
        <button
          onClick={() => router.back()}
          className="h-9 w-9 rounded-xl bg-[var(--border-light)] flex items-center justify-center hover:bg-[var(--border)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Referrals</h1>
      </div>

      {/* Stats Overview */}
      {stats && stats.totalReferrals > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 text-center">
            <p className="text-2xl font-bold text-brand">{stats.totalReferrals}</p>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mt-1">Total</p>
          </div>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.qualifiedReferrals}</p>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mt-1">Qualified</p>
          </div>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 text-center">
            <p className="text-2xl font-bold text-brand">{stats.totalRewardsEarned}</p>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mt-1">Rewards</p>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-[var(--border-light)] rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab("links")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "links" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-card" : "text-[var(--text-secondary)]"
          }`}
        >
          My Links ({links.length})
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "activity" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-card" : "text-[var(--text-secondary)]"
          }`}
        >
          Activity ({referrals.length})
        </button>
      </div>

      {/* My Links Tab */}
      {activeTab === "links" && (
        <div className="space-y-4">
          {links.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-brand-surface flex items-center justify-center mx-auto mb-3">
                <Gift className="h-7 w-7 text-brand" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No Referral Links Yet</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                Visit a business page and tap &quot;Refer a Friend&quot; to generate your unique link.
              </p>
              <button
                onClick={() => router.push("/dashboard/explore")}
                className="bg-brand text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-brand-hover transition-colors"
              >
                Explore Businesses
              </button>
            </div>
          ) : (
            links.map((link) => (
              <div key={link.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {link.businessLogoUrl ? (
                      <img src={link.businessLogoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-brand-surface flex items-center justify-center">
                        <QrCode className="h-5 w-5 text-brand" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{link.businessName}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {link.successfulReferrals} successful referral{link.successfulReferrals !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[var(--surface-raised)] rounded-xl px-4 py-3 mb-3">
                    <p className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-widest mb-0.5">Referral Code</p>
                    <p className="text-base font-bold font-mono tracking-wider text-[var(--text-primary)]">{link.code}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => copyCode(link.code)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-white rounded-xl py-2.5 text-sm font-semibold active:scale-[0.98] transition-transform"
                    >
                      {copiedCode === link.code ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedCode === link.code ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      onClick={() => shareLink(link.code, link.businessName)}
                      className="flex items-center justify-center gap-1.5 bg-[var(--border-light)] text-[var(--text-secondary)] rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[var(--border)] transition-colors"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (
        <div className="space-y-3">
          {referrals.length === 0 ? (
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mx-auto mb-3">
                <Users className="h-7 w-7 text-[var(--text-tertiary)]" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No Referral Activity</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Share your referral links and track who joins here.
              </p>
            </div>
          ) : (
            referrals.map((referral) => {
              const config = STATUS_CONFIG[referral.status];
              const StatusIcon = config.icon;
              return (
                <div key={referral.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{referral.refereeName}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-2">{referral.businessName}</p>
                  <div className="flex items-center gap-4 text-[10px] text-[var(--text-tertiary)]">
                    <span>Referred {new Date(referral.createdAt).toLocaleDateString()}</span>
                    {referral.status !== "Expired" && referral.status !== "Rewarded" && (
                      <span>Expires {new Date(referral.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* How It Works */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 mt-6">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">How It Works</h3>
        <div className="space-y-3">
          {[
            { step: "1", text: "Generate a referral link from a business page" },
            { step: "2", text: "Share it with friends via link or QR code" },
            { step: "3", text: "They join & get their first stamp to qualify" },
            { step: "4", text: "You earn rewards automatically!" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-brand-surface flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-brand">{step}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
