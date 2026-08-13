"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Shield,
  Zap,
  Globe,
} from "lucide-react";

const VALUES = [
  {
    icon: Heart,
    title: "Customer first",
    description:
      "Simple experiences that make loyalty easy and enjoyable.",
  },
  {
    icon: Shield,
    title: "Trust & security",
    description:
      "Your data is protected and handled with care.",
  },
  {
    icon: Zap,
    title: "Speed",
    description:
      "Fast scans and instant loyalty updates.",
  },
  {
    icon: Globe,
    title: "Local impact",
    description:
      "Helping local businesses build stronger communities.",
  },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-10">
      {/* Header */}
      <header className="flex items-center gap-3 pt-5 pb-6">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--border-light)] transition-colors hover:bg-[var(--border)] active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>

        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          About Punched
        </h1>
      </header>

      {/* Brand hero */}
      <section className="pb-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-surface">
          <span className="text-4xl">👊</span>
        </div>

        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Punched Loyalty
        </h2>

        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Version 1.0.0
        </p>
      </section>

      {/* Mission */}
      <section className="pb-8">
        <p className="text-center text-[15px] leading-7 text-[var(--text-secondary)]">
          Punched helps local businesses build loyal
          customer relationships through a simple digital
          loyalty experience.
        </p>

        <p className="mt-4 text-center text-sm leading-6 text-[var(--text-tertiary)]">
          Earn stamps, track rewards, and redeem perks
          directly from your phone.
        </p>
      </section>

      {/* Values */}
      <section>
        <div className="mb-3 px-1">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            What we care about
          </h3>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--surface)]">
          {VALUES.map(
            ({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                className={`flex gap-3.5 px-4 py-4 ${
                  index !== VALUES.length - 1
                    ? "border-b border-[var(--border-light)]"
                    : ""
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--border-light)]">
                  <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {title}
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-[var(--text-tertiary)]">
                    {description}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </section>

      {/* Legal */}
      <footer className="mt-8 pb-4 text-center">
        <p className="text-[11px] text-[var(--text-muted)]">
          © {new Date().getFullYear()} Punched Loyalty
        </p>

        <div className="mt-2 flex items-center justify-center gap-4">
          <button className="text-xs font-medium text-brand hover:underline">
            Privacy Policy
          </button>

          <span className="text-[var(--text-muted)]">•</span>

          <button className="text-xs font-medium text-brand hover:underline">
            Terms of Service
          </button>
        </div>
      </footer>
    </main>
  );
}