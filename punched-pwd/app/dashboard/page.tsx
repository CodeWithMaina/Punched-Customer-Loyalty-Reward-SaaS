"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { loyaltyApi } from "@/lib/api/loyalty";
import type { LoyaltyCard } from "@/types";
import { Search, Loader2, Store, CheckCircle, QrCode, ChevronRight, Sparkles } from "lucide-react";

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "Business") router.replace("/dashboard/business");
    if (user?.role === "Staff") router.replace("/dashboard/staff");
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role !== "Customer") return;
    loyaltyApi
      .getMyCards()
      .then((res) => { if (res.success && res.data) setCards(res.data); })
      .finally(() => setCardsLoading(false));
  }, [user]);

  if (isLoading || user?.role !== "Customer") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="max-w-lg mx-auto">
      {/* Greeting + search */}
      <div className="px-4 pt-5 pb-3 space-y-4">
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Hello, {firstName} 👋</h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Earn rewards with every visit</p>
        </div>

        <Link href="/dashboard/explore">
          <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 shadow-card active:scale-[0.99] transition-transform">
            <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="text-sm text-[var(--text-muted)]">Search businesses, cafes, or service</span>
          </div>
        </Link>
      </div>

      {/* Active Stacks */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">Your Active Stacks</h3>
          <Link href="/dashboard/cards" className="text-xs text-brand font-semibold hover:text-brand-hover transition-colors">
            See all →
          </Link>
        </div>

        {cardsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded skeleton" />
                    <div className="h-2 w-full rounded skeleton" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-8 text-center space-y-3 animate-fade-in">
            <div className="h-14 w-14 bg-brand-surface rounded-2xl flex items-center justify-center mx-auto">
              <Store className="h-7 w-7 text-brand" />
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-medium">No active loyalty cards yet</p>
            <Link
              href="/dashboard/explore"
              className="inline-flex items-center gap-1.5 text-sm text-brand font-semibold hover:text-brand-hover transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Discover businesses →
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cards.slice(0, 3).map((card, index) => (
              <div key={card.id} className="animate-slide-in-right" style={{ animationDelay: `${index * 75}ms` }}>
                <ActiveStackCard card={card} />
              </div>
            ))}
            {cards.length > 3 && (
              <Link href="/dashboard/cards" className="block">
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 flex items-center justify-between hover:shadow-card-hover transition-shadow active:scale-[0.99]">
                  <span className="text-sm text-[var(--text-secondary)]">+{cards.length - 3} more cards</span>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                </div>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Discover more — accent (10%) CTA */}
      <div className="px-4 pb-6">
        <div className="bg-brand rounded-2xl p-5 text-white relative overflow-hidden shadow-soft">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white rounded-full" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Discover More</p>
            <p className="text-base font-bold mb-3">Find nearby shops and start earning rewards today.</p>
            <Link
              href="/dashboard/explore"
              className="inline-block bg-white text-brand text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-shadow active:scale-[0.97]"
            >
              Browse Merchants →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveStackCard({ card }: { card: LoyaltyCard }) {
  const stamps = card.totalStamps;
  const required = card.program.stampsRequired;
  const rewardReady = stamps >= required;
  const progress = Math.min((stamps / required) * 100, 100);

  return (
    <Link href={`/dashboard/cards/${card.id}`}>
      <div className={`bg-[var(--surface)] rounded-2xl border shadow-card p-4 hover:shadow-card-hover transition-all active:scale-[0.99] ${rewardReady ? "border-accent" : "border-[var(--border-light)]"}`}>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-brand-surface flex items-center justify-center overflow-hidden flex-shrink-0">
            {card.businessLogoUrl ? (
              <img src={card.businessLogoUrl} alt={card.businessName} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-6 w-6 text-brand" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[var(--text-primary)] text-sm">{card.businessName}</p>
              {rewardReady ? (
                <span className="text-[10px] font-bold text-ok-text bg-ok-light px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Ready
                </span>
              ) : (
                <span className="text-[10px] text-[var(--text-tertiary)] font-medium">{stamps}/{required}</span>
              )}
            </div>

            <div className="flex gap-1 mt-2">
              {Array.from({ length: Math.min(required, 5) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    i < stamps ? "bg-brand" : "bg-[var(--border-light)] border border-[var(--border)]"
                  }`}
                />
              ))}
              {required > 5 && <span className="text-[10px] text-[var(--text-tertiary)] self-center ml-0.5">+{required - 5}</span>}
            </div>

            <div className="mt-2 h-1.5 bg-[var(--border-light)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${rewardReady ? "bg-ok" : "bg-brand"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <QrCode className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0 self-center" />
        </div>
      </div>
    </Link>
  );
}


