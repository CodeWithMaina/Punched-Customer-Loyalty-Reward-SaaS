"use client";

import Link from "next/link";
import {
  CalendarDays,
  Users,
  Star,
  QrCode,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";

/* ============================================================
   PUNCHED — Atmospheric Brutalism landing page.
   Void surfaces, wireframe borders, label-caps micro-type,
   marquee divider and a "System Architecture" module index.
   Theme-adaptive via CSS variables.
   ============================================================ */

const HEADLINE = "'Plus Jakarta Sans', sans-serif";
const MONO = "'Space Mono', monospace";

const MARQUEE_WORDS = ["AURORA", "LUMEN", "ELITE", "STARK", "VANGUARD", "NOVA"];

const MODULES = [
  { label: "Appointments", icon: CalendarDays, href: "/login" },
  { label: "Clients", icon: Users, href: "/login" },
  { label: "Loyalty", icon: Star, href: "/login" },
  { label: "Stamp Cards", icon: QrCode, href: "/login" },
  { label: "Staff", icon: BadgeCheck, href: "/login" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col relative overflow-x-hidden">
      <style>{`
        @keyframes pk-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* ── Top navigation ─────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 h-12 bg-[var(--background)] border-b border-[var(--border)] flex justify-between items-center px-5 md:px-16">
        <span className="text-lg font-bold tracking-tighter" style={{ fontFamily: HEADLINE }}>
          PUNCHED
        </span>
        <nav
          className="hidden md:flex gap-6 font-mono text-xs text-[var(--text-tertiary)]"
          style={{ fontFamily: MONO }}
        >
          <Link href="/#modules" className="hover:text-[var(--text-primary)] transition-colors">Platform</Link>
          <Link href="/enterprise" className="hover:text-[var(--text-primary)] transition-colors">Enterprise</Link>
          <Link href="/register" className="hover:text-[var(--text-primary)] transition-colors">Pricing</Link>
          <Link href="/business-register" className="hover:text-[var(--text-primary)] transition-colors">For Business</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/enterprise"
            className="hidden sm:inline-block text-[10px] tracking-[0.15em] uppercase font-bold border border-transparent px-3 py-1 text-brand hover:border-brand/40 transition-colors"
          >
            Enterprise
          </Link>
          <Link
            href="/login"
            className="font-mono text-xs border border-[var(--border)] px-4 py-1 hover:bg-[var(--surface-raised)] transition-colors"
            style={{ fontFamily: MONO }}
          >
            Log In
          </Link>
        </div>
      </header>

      {/* ── Marquee ──────────────────────────────────────── */}
      <main className="flex-grow flex flex-col pt-12">
        <div className="w-full overflow-hidden border-b border-[var(--border)] py-3">
          <div className="flex whitespace-nowrap" style={{ animation: "pk-marquee 30s linear infinite" }}>
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="flex gap-12 px-6 items-center text-[10px] tracking-[0.2em] uppercase font-bold text-[var(--text-tertiary)] opacity-60"
                style={{ fontFamily: HEADLINE }}
              >
                {MARQUEE_WORDS.map((w) => (
                  <span key={`${copy}-${w}`} className="flex items-center gap-12">
                    {w}
                    <span className="w-1 h-1 bg-[var(--border)] rounded-full inline-block" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="relative min-h-[80vh] flex flex-col justify-center items-center text-center px-5 md:px-16 overflow-hidden py-20">
          <div
            aria-hidden
            className="absolute -right-[8%] top-1/2 -translate-y-1/2 leading-none font-extrabold select-none pointer-events-none text-[40vw] md:text-[400px]"
            style={{ fontFamily: HEADLINE, color: "var(--text-secondary)", opacity: 0.08 }}
          >
            P
          </div>

          <div className="z-10 flex flex-col items-center max-w-4xl w-full">
            <p
              className="text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--text-tertiary)] mb-8"
              style={{ fontFamily: HEADLINE }}
            >
              Loyalty infrastructure for modern service businesses
            </p>
            <h1
              className="text-[64px] md:text-[110px] leading-[0.9] font-extrabold tracking-tighter mb-12"
              style={{ fontFamily: HEADLINE }}
            >
              PUNCHED
            </h1>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[var(--text-primary)] text-[var(--background)] text-[10px] tracking-[0.15em] uppercase font-bold px-8 py-4 hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] transition-colors mb-16"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* Feature nav pills */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 pt-8 w-full max-w-4xl mx-auto">
            {MODULES.map(({ label, icon: Icon }) => (
              <Link
                key={label}
                href="/login"
                className="flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all backdrop-blur-sm"
                style={{ fontFamily: HEADLINE }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── System Architecture modules ──────────────────── */}
        <section id="modules" className="w-full px-5 py-24 z-10">
          <h2
            className="text-[10px] tracking-[0.3em] uppercase font-bold text-[var(--text-tertiary)] mb-12 pl-2"
            style={{ fontFamily: HEADLINE }}
          >
            System Architecture
          </h2>
          <div className="max-w-5xl mx-auto flex flex-col border-t border-[var(--border)]">
            {MODULES.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                className="group flex justify-between items-center py-6 border-b border-[var(--border)] hover:bg-[var(--surface-raised)] transition-colors duration-300 px-2"
              >
                <span
                  className="uppercase text-base md:text-lg group-hover:pl-2 transition-all duration-300 text-[var(--text-primary)]"
                  style={{ fontFamily: HEADLINE }}
                >
                  {label}
                </span>
                <Icon
                  className="h-5 w-5 text-[var(--text-tertiary)] group-hover:text-brand transition-colors"
                  strokeWidth={1.25}
                />
              </Link>
            ))}
          </div>

          {/* Enterprise teaser */}
          <div className="max-w-5xl mx-auto mt-16 border border-[var(--border)] p-6 md:p-10 relative overflow-hidden">
            <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3
                  className="text-xl md:text-2xl font-bold tracking-tight mb-2"
                  style={{ fontFamily: HEADLINE }}
                >
                  PUNCHED Enterprise
                </h3>
                <p
                  className="font-mono text-sm text-[var(--text-tertiary)] max-w-md"
                  style={{ fontFamily: MONO }}
                >
                  Multi-location loyalty, dedicated support, custom SLAs and
                  consolidated analytics for groups and franchises.
                </p>
              </div>
              <Link
                href="/enterprise"
                className="self-start md:self-auto inline-flex items-center gap-2 border border-[var(--text-primary)] text-[var(--text-primary)] text-[10px] tracking-[0.15em] uppercase font-bold px-6 py-3 hover:bg-[var(--text-primary)] hover:text-[var(--background)] transition-colors flex-shrink-0"
              >
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="w-full py-8 px-5 md:px-16 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-[var(--border)] mt-auto">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <span className="font-bold tracking-tighter" style={{ fontFamily: HEADLINE }}>
            PUNCHED
          </span>
          <span className="font-mono text-xs text-[var(--text-tertiary)]" style={{ fontFamily: MONO }}>
            © 2026 PUNCHED OS. ALL RIGHTS RESERVED.
          </span>
        </div>
        <nav
          className="flex flex-wrap justify-center gap-6 font-mono text-xs text-[var(--text-tertiary)]"
          style={{ fontFamily: MONO }}
        >
          <Link href="/register" className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline transition-colors">Register</Link>
          <Link href="/login" className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline transition-colors">Log in</Link>
          <Link href="/enterprise" className="hover:text-[var(--text-primary)] underline-offset-4 hover:underline transition-colors">Enterprise</Link>
        </nav>
      </footer>
    </div>
  );
}