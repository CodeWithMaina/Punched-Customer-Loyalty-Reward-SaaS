"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Globe2,
  HeadphonesIcon,
  ShieldCheck,
  BarChart3,
  Layers,
} from "lucide-react";

/* ============================================================
   PUNCHED Enterprise — marketing page for groups, franchises
   and multi-location operators. Same Atmospheric Brutalism
   language as the landing page; theme-adaptive via CSS vars.
   ============================================================ */

const HEADLINE = "'Plus Jakarta Sans', sans-serif";
const MONO = "'Space Mono', monospace";

const CAPABILITIES = [
  {
    icon: Building2,
    title: "Multi-Location",
    desc: "Run every branch from one console. Per-location loyalty programs, staff rosters and stamp ledgers with consolidated roll-ups.",
  },
  {
    icon: BarChart3,
    title: "Consolidated Analytics",
    desc: "Cross-business dashboards for stamps, redemptions and staff performance. Export everything, own your data.",
  },
  {
    icon: ShieldCheck,
    title: "Security & Compliance",
    desc: "Cryptographically signed single-use QR tokens, role-scoped APIs and audited attribution on every stamp.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support",
    desc: "Priority channel with a named success manager, onboarding workshops and quarterly program reviews.",
  },
  {
    icon: Layers,
    title: "Custom Programs",
    desc: "Tiered rewards, referral engines and campaign stamps tailored to your brand rules.",
  },
  {
    icon: Globe2,
    title: "Built to Scale",
    desc: "Real-time infrastructure designed for high transaction volume across regions.",
  },
];

export default function EnterprisePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col relative overflow-x-hidden">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 h-12 bg-[var(--background)] border-b border-[var(--border)] flex justify-between items-center px-5 md:px-16">
        <Link href="/" className="text-lg font-bold tracking-tighter" style={{ fontFamily: HEADLINE }}>
          PUNCHED
        </Link>
        <span
          className="text-[10px] tracking-[0.3em] uppercase font-bold text-brand"
          style={{ fontFamily: HEADLINE }}
        >
          Enterprise
        </span>
        <Link
          href="/business-register"
          className="font-mono text-xs border border-[var(--border)] px-4 py-1 hover:bg-[var(--surface-raised)] transition-colors"
          style={{ fontFamily: MONO }}
        >
          Get Started
        </Link>
      </header>

      <main className="flex-grow flex flex-col pt-12">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative min-h-[70vh] flex flex-col justify-center items-center text-center px-5 md:px-16 overflow-hidden py-20">
          <div
            aria-hidden
            className="absolute -left-[6%] top-1/2 -translate-y-1/2 leading-none font-extrabold select-none pointer-events-none text-[36vw] md:text-[360px]"
            style={{ fontFamily: HEADLINE, color: "var(--text-secondary)", opacity: 0.06 }}
          >
            ENT
          </div>

          <div className="z-10 flex flex-col items-center max-w-3xl w-full">
            <p
              className="text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--text-tertiary)] mb-8"
              style={{ fontFamily: HEADLINE }}
            >
              For groups · franchises · multi-location operators
            </p>
            <h1
              className="text-[44px] md:text-[80px] leading-[0.95] font-extrabold tracking-tighter mb-8"
              style={{ fontFamily: HEADLINE }}
            >
              Loyalty at
              <br />
              Enterprise Scale.
            </h1>
            <p
              className="font-mono text-sm md:text-base text-[var(--text-secondary)] max-w-xl mb-12"
              style={{ fontFamily: MONO }}
            >
              One platform for every branch. Consolidated analytics, custom
              programs and priority support — backed by real-time stamp
              infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                href="/business-register"
                className="inline-flex items-center justify-center gap-2 bg-[var(--text-primary)] text-[var(--background)] text-[10px] tracking-[0.15em] uppercase font-bold px-8 py-4 hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] transition-colors"
              >
                Register Your Business
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:sales@punched.app"
                className="inline-flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-primary)] text-[10px] tracking-[0.15em] uppercase font-bold px-8 py-4 hover:border-[var(--text-primary)] transition-colors"
              >
                Talk to Sales
              </a>
            </div>
          </div>
        </section>

        {/* ── Capabilities index ───────────────────────────── */}
        <section className="w-full px-5 py-24">
          <h2
            className="text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--text-tertiary)] mb-12 pl-2"
            style={{ fontFamily: HEADLINE }}
          >
            What Enterprise Unlocks
          </h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {CAPABILITIES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="relative border border-[var(--border)] p-6 md:p-8 bg-transparent hover:bg-[var(--surface-raised)] transition-colors overflow-hidden group"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Icon className="h-6 w-6 text-brand mb-4" strokeWidth={1.25} />
                <h3
                  className="uppercase text-base font-bold tracking-tight mb-2"
                  style={{ fontFamily: HEADLINE }}
                >
                  {title}
                </h3>
                <p className="font-mono text-xs leading-relaxed text-[var(--text-tertiary)]" style={{ fontFamily: MONO }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SLA strip ────────────────────────────────────── */}
        <section className="w-full px-5 pb-24">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { value: "99.9%", label: "Platform Uptime Target" },
              { value: "<1s", label: "Stamp Propagation" },
              { value: "24/7", label: "Enterprise Support" },
            ].map(({ value, label }) => (
              <div key={label} className="border border-[var(--border)] p-6 flex flex-col gap-2">
                <span className="text-4xl font-extrabold tracking-tight" style={{ fontFamily: HEADLINE }}>
                  {value}
                </span>
                <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA band ─────────────────────────────────────── */}
        <section className="w-full px-5 pb-24">
          <div className="max-w-5xl mx-auto relative border border-[var(--border)] p-8 md:p-14 text-center overflow-hidden">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tighter mb-4" style={{ fontFamily: HEADLINE }}>
              Deploy loyalty across every location.
            </h2>
            <p className="font-mono text-sm text-[var(--text-tertiary)] max-w-lg mx-auto mb-10" style={{ fontFamily: MONO }}>
              Tell us about your footprint and we&apos;ll tailor a rollout plan for your brand.
            </p>
            <Link
              href="/business-register"
              className="inline-flex items-center gap-2 bg-[var(--text-primary)] text-[var(--background)] text-[10px] tracking-[0.15em] uppercase font-bold px-8 py-4 hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] transition-colors"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="w-full py-8 px-5 md:px-16 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-[var(--border)] mt-auto">
        <span className="font-bold tracking-tighter" style={{ fontFamily: HEADLINE }}>
          PUNCHED
        </span>
        <nav
          className="flex flex-wrap justify-center gap-6 font-mono text-xs text-[var(--text-tertiary)]"
          style={{ fontFamily: MONO }}
        >
          <Link href="/" className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline transition-colors">Home</Link>
          <Link href="/register" className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline transition-colors">Register</Link>
          <Link href="/login" className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline transition-colors">Log in</Link>
        </nav>
      </footer>
    </div>
  );
}