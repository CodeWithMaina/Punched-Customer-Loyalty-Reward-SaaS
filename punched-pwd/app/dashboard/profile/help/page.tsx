"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Phone,
  ExternalLink,
  Clock3,
  HelpCircle,
  ChevronRight,
} from "lucide-react";

const CONTACT_OPTIONS = [
  {
    href: "mailto:support@punched.app",
    icon: Mail,
    title: "Email support",
    description: "support@punched.app",
    external: false,
  },
  {
    href: "https://wa.me/254700000000",
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Quick responses, Mon–Fri",
    external: true,
  },
  {
    href: "tel:+254700000000",
    icon: Phone,
    title: "Call us",
    description: "+254 700 000 000",
    external: false,
  },
];

const SUPPORT_HOURS = [
  { day: "Monday – Friday", time: "8:00 AM – 6:00 PM" },
  { day: "Saturday", time: "9:00 AM – 1:00 PM" },
  { day: "Sunday & Holidays", time: "Closed" },
];

export default function HelpPage() {
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

        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Help & Support
          </h1>

          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            We&apos;re here when you need us
          </p>
        </div>
      </header>

      {/* Intro */}
      <section className="pb-7">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-surface">
            <MessageCircle className="h-5 w-5 text-brand" />
          </div>

          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Need a hand?
            </h2>

            <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
              Choose the easiest way to reach our support team.
            </p>
          </div>
        </div>
      </section>

      {/* Contact options */}
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold text-[var(--text-tertiary)]">
          CONTACT US
        </h2>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--surface)]">
          {CONTACT_OPTIONS.map(
            (
              {
                href,
                icon: Icon,
                title,
                description,
                external,
              },
              index
            ) => (
              <a
                key={title}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className={`flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[var(--border-light)] active:bg-[var(--border-light)] ${
                  index !== CONTACT_OPTIONS.length - 1
                    ? "border-b border-[var(--border-light)]"
                    : ""
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface">
                  <Icon className="h-4 w-4 text-brand" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {title}
                  </p>

                  <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                    {description}
                  </p>
                </div>

                {external ? (
                  <ExternalLink className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                )}
              </a>
            )
          )}
        </div>
      </section>

      {/* FAQ shortcut */}
      <button
        onClick={() => router.push("/dashboard/profile/faq")}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] px-4 py-4 text-left transition-colors hover:bg-[var(--border-light)] active:bg-[var(--border-light)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--border-light)]">
          <HelpCircle className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Browse frequently asked questions
          </p>

          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Find an answer without contacting support
          </p>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
      </button>

      {/* Support hours */}
      <section className="mt-7">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Clock3 className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />

          <h2 className="text-xs font-semibold text-[var(--text-tertiary)]">
            SUPPORT HOURS
          </h2>
        </div>

        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface)] px-4">
          {SUPPORT_HOURS.map(({ day, time }, index) => (
            <div
              key={day}
              className={`flex items-center justify-between py-3.5 ${
                index !== SUPPORT_HOURS.length - 1
                  ? "border-b border-[var(--border-light)]"
                  : ""
              }`}
            >
              <span className="text-sm text-[var(--text-secondary)]">
                {day}
              </span>

              <span
                className={`text-sm font-medium ${
                  time === "Closed"
                    ? "text-[var(--text-tertiary)]"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {time}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <p className="mt-7 px-4 text-center text-[11px] leading-5 text-[var(--text-muted)]">
        We&apos;ll do our best to respond as quickly as possible during
        support hours.
      </p>
    </main>
  );
}