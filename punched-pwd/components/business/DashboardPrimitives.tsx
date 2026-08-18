"use client";

import Link from "next/link";
import { ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Design tokens (kept in sync with theme engine) ──────────
export const PIE_COLORS = ["var(--brand)", "var(--accent)", "#10B981", "#94A3B8", "#F472B6"];
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DISPLAY_FONT = "'Space Grotesk', 'Inter', system-ui, sans-serif";

// ── SectionTitle ──────────────────────────────────────────────
export function SectionTitle({
  icon: Icon,
  label,
  href,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  href?: string;
  hint?: string;
}) {
  const content = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-lg bg-brand-surface flex items-center justify-center flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-brand" />
        </div>
        <p className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight">{label}</p>
        {hint && <span className="text-[10px] text-[var(--text-tertiary)]">{hint}</span>}
      </div>
      {href && (
        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-brand">
          View <ChevronRight className="h-3 w-3" />
        </span>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ── MetricCard (grid variant — used on Analytics) ────────────
export function MetricCard({
  label,
  value,
  sub,
  trend,
  accent,
  warn,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accent?: boolean;
  warn?: boolean;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-500" : "text-[var(--text-tertiary)]";

  return (
    <div
      className={`rounded-2xl border p-3.5 transition-colors ${
        warn
          ? "bg-amber-50 border-amber-100"
          : accent
          ? "bg-brand-surface border-brand/10"
          : "bg-[var(--surface-raised)] border-[var(--border-light)]"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</p>
      <p
        className={`text-xl font-bold mt-1 leading-none ${warn ? "text-amber-700" : "text-[var(--text-primary)]"}`}
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {value}
      </p>
      {sub && (
        <div className={`flex items-center gap-1 mt-1.5 ${trend ? trendColor : "text-[var(--text-tertiary)]"}`}>
          {trend && <TrendIcon className="h-3 w-3 flex-shrink-0" />}
          <p className="text-[10px] font-medium truncate">{sub}</p>
        </div>
      )}
    </div>
  );
}

// ── KpiPill — horizontal-scroll KPI strip (mobile-native) ────
export function KpiPill({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "accent" | "warn" | "positive";
}) {
  const toneStyles: Record<string, string> = {
    default: "bg-[var(--surface)] border-[var(--border-light)]",
    accent: "bg-brand-surface border-brand/10",
    warn: "bg-amber-50 border-amber-100",
    positive: "bg-emerald-50 border-emerald-100",
  };
  const valueColor: Record<string, string> = {
    default: "text-[var(--text-primary)]",
    accent: "text-brand",
    warn: "text-amber-700",
    positive: "text-emerald-700",
  };
  return (
    <div
      className={`snap-start shrink-0 w-[112px] max-w-[30vw] rounded-2xl border shadow-card px-3 py-2.5 ${toneStyles[tone]}`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] truncate">
        {label}
      </p>
      <p
        className={`text-xl font-bold mt-1 leading-none truncate ${valueColor[tone]}`}
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {value}
      </p>
      {sub && <p className="text-[9px] text-[var(--text-tertiary)] mt-1 truncate">{sub}</p>}
    </div>
  );
}

// ── RankedListItem — shared row for "top N" lists (staff, customers) ─
export function RankedListItem({
  rank,
  initials,
  title,
  subtitle,
  trailing,
  href,
}: {
  rank: number;
  initials: string;
  title: string;
  subtitle?: string;
  trailing?: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-2.5 px-4 py-2.5 min-w-0">
      <span className={`text-[11px] font-bold w-4 text-center flex-shrink-0 ${rank === 1 ? "text-amber-500" : "text-[var(--text-muted)]"}`}>
        {rank}
      </span>
      <div className="h-7 w-7 rounded-full bg-brand-surface text-brand text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{title}</p>
        {subtitle && <p className="text-[10px] text-[var(--text-tertiary)] truncate">{subtitle}</p>}
      </div>
      {trailing && <span className="text-xs font-bold text-[var(--text-primary)] flex-shrink-0">{trailing}</span>}
      {href && <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)] flex-shrink-0" />}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:bg-[var(--surface-raised)] transition-colors">
      {content}
    </Link>
  ) : (
    content
  );
}

// ── MomentumRing — signature element: composite health gauge ─
// score: 0-100. Renders an SVG progress ring with a center label.
export function MomentumRing({
  score,
  size = 84,
  stroke = 8,
  label,
  dark = false,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  dark?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={dark ? "rgba(255,255,255,0.18)" : "var(--border-light)"}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={dark ? "#FFFFFF" : "var(--brand)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-lg font-bold leading-none ${dark ? "text-white" : "text-[var(--text-primary)]"}`}
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {Math.round(clamped)}
        </span>
        {label && (
          <span className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 ${dark ? "text-white/70" : "text-[var(--text-tertiary)]"}`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── PeriodTabs ────────────────────────────────────────────────
const PERIODS = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "All" },
];

export function PeriodTabs({ period, onChange }: { period: string; onChange: (p: string) => void }) {
  return (
    <div className="flex bg-[var(--surface-raised)] border border-[var(--border-light)] rounded-xl p-1 gap-1">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
            period === p.key
              ? "bg-brand text-white shadow-card"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}