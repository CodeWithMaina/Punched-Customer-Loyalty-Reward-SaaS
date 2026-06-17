"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { adminApi } from "@/lib/api/admin";
import type { SmartInsight } from "@/types";
import {
  Loader2,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Users,
  Activity,
  AlertTriangle,
  Target,
  BarChart2,
} from "lucide-react";

const TYPE_ICONS: Record<string, typeof Zap> = {
  top_niche: Crown,
  customer_growth: Users,
  stamp_velocity: Activity,
  high_value_customers: Target,
  dormant_businesses: AlertTriangle,
  redemption_rate: BarChart2,
};

export default function AdminInsights() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const [insights, setInsights] = useState<SmartInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "Admin") {
      router.replace("/dashboard");
      return;
    }

    adminApi.getInsights()
      .then((res) => {
        if (res.success && res.data) setInsights(res.data.insights);
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Zap className="h-6 w-6 text-amber-500" />
          Smart Insights
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">AI-driven analysis of platform performance and trends</p>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-tertiary)]">
          <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No insights available yet. Check back when there&apos;s more data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => {
            const Icon = TYPE_ICONS[insight.type] || Zap;
            const trendColor =
              insight.trend === "positive" ? "text-emerald-600" :
              insight.trend === "negative" ? "text-red-600" :
              "text-[var(--text-secondary)]";
            const trendBg =
              insight.trend === "positive" ? "bg-emerald-50 border-emerald-100" :
              insight.trend === "negative" ? "bg-red-50 border-red-100" :
              "bg-[var(--surface-raised)] border-[var(--border-light)]";

            return (
              <div
                key={i}
                className={`rounded-xl p-4 border shadow-card ${trendBg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    insight.trend === "positive" ? "bg-emerald-100" :
                    insight.trend === "negative" ? "bg-red-100" :
                    "bg-[var(--border)]"
                  }`}>
                    <Icon className={`h-5 w-5 ${trendColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[var(--text-primary)]">{insight.title}</h3>
                      {insight.metric && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          insight.trend === "positive" ? "bg-emerald-200 text-emerald-800" :
                          insight.trend === "negative" ? "bg-red-200 text-red-800" :
                          "bg-[var(--border)] text-[var(--text-secondary)]"
                        }`}>
                          {insight.metric}
                        </span>
                      )}
                      <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
                        {insight.trend === "positive" ? <TrendingUp className="h-3.5 w-3.5" /> :
                         insight.trend === "negative" ? <TrendingDown className="h-3.5 w-3.5" /> :
                         <Minus className="h-3.5 w-3.5" />}
                        {insight.trend}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
