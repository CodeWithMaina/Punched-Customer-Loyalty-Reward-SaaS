"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { loyaltyApi } from "@/lib/api/loyalty";
import type { LoyaltyCard } from "@/types";
import { QrCode, Gift, CheckCircle, Loader2, Store, Compass, Trophy, Stamp } from "lucide-react";

export default function MyCardsPage() {
  useRoleGuard("Customer");
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loyaltyApi.getMyCards()
      .then((res) => { if (res.success && res.data) setCards(res.data); })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  );

  const readyCount = cards.filter((c) => c.totalStamps >= c.program.stampsRequired).length;

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      {/* Header */}
      <div className="pt-5 pb-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">My Cards</h1>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{cards.length} card{cards.length !== 1 ? "s" : ""}{readyCount > 0 ? ` · ${readyCount} ready to claim` : ""}</p>
      </div>

      {/* Reward-ready alert */}
      {readyCount > 0 && (
        <div className="mb-4 bg-amber-50 border border-accent rounded-2xl p-3.5 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            {readyCount} reward{readyCount !== 1 ? "s" : ""} ready to claim!
          </p>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-10 text-center space-y-4">
          <div className="h-16 w-16 bg-brand-surface rounded-2xl flex items-center justify-center mx-auto">
            <QrCode className="h-8 w-8 text-brand" />
          </div>
          <div>
            <p className="text-[var(--text-secondary)] font-semibold">No loyalty cards yet</p>
            <p className="text-[var(--text-tertiary)] text-sm mt-1">Discover businesses and start earning stamps today.</p>
          </div>
          <Link href="/dashboard/explore"
            className="inline-flex items-center gap-2 bg-brand text-white font-semibold text-sm px-5 py-2.5 rounded-xl">
            <Compass className="h-4 w-4" />Browse Merchants
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => <LoyaltyCardItem key={card.id} card={card} />)}

          <div className="bg-[var(--surface-raised)] rounded-2xl border border-dashed border-[var(--border)] p-6 text-center space-y-2.5">
            <div className="h-10 w-10 bg-brand-surface rounded-full flex items-center justify-center mx-auto">
              <Store className="h-5 w-5 text-brand" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Discover More Businesses</p>
            <p className="text-xs text-[var(--text-tertiary)]">Find nearby shops and earn rewards.</p>
            <Link href="/dashboard/explore" className="inline-block text-brand font-bold text-sm">Browse Merchants →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function LoyaltyCardItem({ card }: { card: LoyaltyCard }) {
  const stamps = card.totalStamps;
  const required = card.program.stampsRequired;
  const rewardReady = stamps >= required;
  const progress = Math.min((stamps / required) * 100, 100);
  const remaining = Math.max(required - stamps, 0);
  const gridCols = required <= 5 ? required : required <= 10 ? 5 : required <= 15 ? 5 : 5;

  return (
    <div className={`rounded-2xl overflow-hidden shadow-card border ${rewardReady ? "border-accent" : "border-[var(--border-light)]"}`}>
      {/* Reward banner */}
      {rewardReady && (
        <div className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider text-center py-1.5 flex items-center justify-center gap-1.5">
          <Trophy className="h-3 w-3" />Ready to Claim Your Reward!
        </div>
      )}

      {/* Business header — prominent logo */}
      <div className={`p-4 ${rewardReady ? "bg-amber-50" : "bg-[var(--surface)]"}`}>
        <div className="flex items-center gap-3.5 mb-4">
          <div className="h-14 w-14 rounded-2xl overflow-hidden bg-brand-surface flex items-center justify-center flex-shrink-0 border-2 border-white shadow-md">
            {card.businessLogoUrl ? (
              <img src={card.businessLogoUrl} alt={card.businessName} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-7 w-7 text-brand" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[var(--text-primary)] text-base leading-tight truncate">{card.businessName}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{card.program.name}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{card.program.rewardDescription}</p>
          </div>
          {rewardReady && (
            <div className="h-10 w-10 rounded-xl bg-accent-light flex items-center justify-center flex-shrink-0">
              <Gift className="h-5 w-5 text-accent-text" />
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className={`text-xl font-bold ${rewardReady ? "text-accent-text" : "text-brand"}`}>{stamps}<span className="text-sm font-medium text-[var(--text-tertiary)]">/{required}</span></span>
            <span className="text-xs text-[var(--text-tertiary)]">{rewardReady ? "Goal reached!" : `${remaining} stamp${remaining !== 1 ? "s" : ""} to go`}</span>
          </div>
          <div className="h-2.5 bg-[var(--border-light)] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${rewardReady ? "bg-amber-500" : "bg-brand"}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Stamp grid */}
        <div className="grid gap-1.5 mb-4" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
          {Array.from({ length: required }).map((_, i) => (
            <div key={i} className={`aspect-square rounded-xl flex items-center justify-center border-2 transition-colors ${
              i < stamps
                ? rewardReady ? "bg-accent-light border-amber-400" : "bg-brand-surface border-brand"
                : "bg-[var(--surface-raised)] border-dashed border-[var(--border)]"
            }`}>
              {i < stamps ? (
                <CheckCircle className={`h-4 w-4 ${rewardReady ? "text-accent-text" : "text-brand"}`} />
              ) : i === required - 1 ? (
                <Gift className="h-4 w-4 text-[var(--text-muted)]" />
              ) : (
                <Stamp className="h-3 w-3 text-[var(--text-muted)]" />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        {rewardReady ? (
          <Link href={`/dashboard/cards/${card.id}`}>
            <button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              <Gift className="h-4 w-4" />Claim Your Reward
            </button>
          </Link>
        ) : (
          <Link href={`/dashboard/cards/${card.id}`}>
            <button className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">
              <QrCode className="h-4 w-4" />Show QR for Stamp
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

