"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  Users,
  Star,
  QrCode,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import { FeatureSheet, type FeatureInfo } from "@/components/landing/FeatureSheet";

/* ============================================================
   PUNCHED — Atmospheric Brutalism landing page.
   Void surfaces, wireframe borders, label-caps micro-type,
   marquee divider and a "System Architecture" module index.
   Theme-adaptive via CSS variables.
   ============================================================ */

const HEADLINE = "'Plus Jakarta Sans', sans-serif";
const MONO = "'Space Mono', monospace";

const MARQUEE_WORDS = ["AURORA", "LUMEN", "ELITE", "STARK", "VANGUARD", "NOVA"];

const FEATURES: FeatureInfo[] = [
  {
    label: "Appointments",
    icon: CalendarDays,
    summary:
      "A live scheduling board for your business. See today at a glance, navigate week by week, and act on bookings in one tap.",
    benefits: [
      "Current-time timeline so you always know what's happening now",
      "Confirm, complete or reschedule bookings without phone calls",
      "Customers self-book only into real availability — no double booking",
    ],
  },
  {
    label: "Clients",
    icon: Users,
    summary:
      "Every customer who walks in becomes a profile with their visit history, stamps and rewards attached.",
    benefits: [
      "Full visit history per customer",
      "Spot your regulars and your dormant customers",
      "Book on behalf of walk-ins in seconds",
    ],
  },
  {
    label: "Loyalty",
    icon: Star,
    summary:
      "Digital stamp cards that replace paper punch cards. Customers collect stamps by QR scan and redeem rewards automatically.",
    benefits: [
      "Set any N-stamps → reward rule per program",
      "Fraud-resistant QR stamping",
      "Reward progress visible to customers in their own PWA",
    ],
  },
  {
    label: "Stamp Cards",
    icon: QrCode,
    summary:
      "Each business gets a unique stamp QR. A single scan awards a stamp and updates every linked loyalty card instantly.",
    benefits: [
      "One scan = one verified visit",
      "Works offline-tolerantly on the customer's phone",
      "No hardware, cards or printers to buy",
    ],
  },
  {
    label: "Staff",
    icon: BadgeCheck,
    summary:
      "Invite staff by email and give each one a scoped calendar where they confirm and complete their own appointments.",
    benefits: [
      "Email invitations — no shared logins",
      "Staff see only their own schedule",
      "Owners keep full oversight of the whole calendar",
    ],
  },
];

export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState<FeatureInfo | null>(null);

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
          {/* Feature nav pills — open the feature experience */}
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 pt-8 w-full max-w-4xl mx-auto">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.label}
                  onClick={() => setActiveFeature(feature)}
                  aria-haspopup="dialog"
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] px-5 py-2.5 text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-all backdrop-blur-sm active:scale-95 motion-reduce:active:scale-100"
                  style={{ fontFamily: HEADLINE }}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {feature.label}
                </button>
              );
            })}
          </div>
        </section>

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

      {/* Feature information experience (mobile sheet / desktop modal) */}
      <FeatureSheet feature={activeFeature} onClose={() => setActiveFeature(null)} />
    </div>
  );
}