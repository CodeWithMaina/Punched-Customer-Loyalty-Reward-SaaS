"use client";

import { useEffect, useState } from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { businessesApi } from "@/lib/api/businesses";
import type { StaffActivityFeedResponse } from "@/types";
import {
  Loader2, Users, Trophy, CalendarDays, TrendingUp,
  Target, Flame, AlertCircle,
} from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

const DAILY_GOAL = 20;

export default function StaffActivityPage() {
  useRoleGuard("Staff");
  const [feed, setFeed] = useState<StaffActivityFeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    businessesApi.getMyStaffActivity({ activityType: "all", page: 1, pageSize: 50 })
      .then((res) => {
        if (res.success && res.data) setFeed(res.data);
        else setError(res.error?.message || "Could not load activity.");
      })
      .catch(() => setError("Could not load activity."))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !feed) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-[var(--text-tertiary)] text-sm">{error ?? "No data available."}</p>
      </div>
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const stampsToday = feed.activity.filter((a) => a.activityType === "stamp" && a.stampedAt.slice(0, 10) === todayIso).length;
  const todayProgress = Math.min((stampsToday / DAILY_GOAL) * 100, 100);
  const goalReached = stampsToday >= DAILY_GOAL;

  return (
    <div className="max-w-lg mx-auto pb-10">
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-bold text-brand uppercase tracking-widest mb-1">My Activity</p>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{feed.staff.name}</h1>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{feed.staff.email}</p>
      </div>

      <div className={`mx-5 mb-4 rounded-2xl p-5 ${goalReached ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-brand to-brand-hover"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Today&apos;s Progress</p>
            <p className="text-white text-4xl font-bold mt-1 leading-none">{stampsToday}</p>
            <p className="text-white/70 text-xs mt-1">stamps awarded today</p>
          </div>
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${goalReached ? "bg-[var(--surface)]/20" : "bg-[var(--surface)]/15"}`}>
            {goalReached ? <Trophy className="h-8 w-8 text-white" /> : <Target className="h-8 w-8 text-white" />}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-white/70 text-xs">Daily goal: {DAILY_GOAL} stamps</p>
            <p className="text-white text-xs font-bold">{Math.round(todayProgress)}%</p>
          </div>
          <div className="h-2.5 bg-[var(--surface)]/20 rounded-full overflow-hidden">
            <div className="h-full bg-[var(--surface)] rounded-full transition-all duration-700" style={{ width: `${todayProgress}%` }} />
          </div>
          {goalReached ? (
            <p className="text-white text-xs font-semibold mt-2">Goal reached! Great work today</p>
          ) : (
            <p className="text-white/70 text-xs mt-2">{Math.max(0, DAILY_GOAL - stampsToday)} more to hit your goal</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-5 mb-4">
        {[
          { label: "Scans", value: feed.summary.totalScans, icon: CalendarDays, color: "text-brand", bg: "bg-brand-surface" },
          { label: "Redemptions", value: feed.summary.totalRedemptions, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Activities", value: feed.summary.totalActivities, icon: Flame, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "My Customers", value: feed.summary.customersServed, icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 flex items-center gap-3">
            <div className={`${bg} h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text-primary)] leading-none">{value}</p>
              <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {feed.summary.totalRedemptions > 0 && (
        <div className="mx-5 mb-4 bg-amber-50 border border-accent rounded-2xl p-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">{feed.summary.totalRedemptions} redemption action{feed.summary.totalRedemptions !== 1 ? "s" : ""} processed.</p>
            <p className="text-xs text-accent-text">Activity feed is now staff-attributed per authenticated user.</p>
          </div>
        </div>
      )}

      <div className="px-5">
        <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Recent Activity</p>
        {feed.activity.length === 0 ? (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-8 text-center">
            <AlertCircle className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-tertiary)]">No activity recorded yet</p>
          </div>
        ) : (
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden divide-y divide-[var(--border-light)]">
            {feed.activity.map((item, i) => (
              <div key={`${item.activityId ?? "a"}-${i}`} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-9 w-9 rounded-full bg-brand-surface flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand">{item.customerName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.customerName}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {item.activityType === "redemption"
                      ? `Redemption${item.rewardValue ? ` • KES ${item.rewardValue}` : ""}`
                      : `Stamp #${item.stampNumber}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-[var(--text-tertiary)]">{timeAgo(item.stampedAt)}</p>
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 ml-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
