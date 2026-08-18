"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from "lucide-react";

const FAQ_DATA = [
  {
    section: "Getting Started",
    items: [
      {
        q: "How do I earn stamps?",
        a: "Visit a participating business and ask them to scan your QR code. Each scan gives you a stamp on your loyalty card.",
      },
      {
        q: "How do I redeem rewards?",
        a: "Once you've collected enough stamps to fill your card, a 'Claim Reward' button will appear. Tap it and show the confirmation to the business.",
      },
      {
        q: "Can I use Punched at any business?",
        a: "You can use Punched at any business that has registered on the platform. Browse the Explore page to discover participating businesses near you.",
      },
    ],
  },
  {
    section: "Account & Security",
    items: [
      {
        q: "How do I change my password?",
        a: "Go to Profile > Change Password. Enter your current password and your new password, then tap Update.",
      },
      {
        q: "I forgot my password. What do I do?",
        a: "On the login screen, tap 'Forgot Password?' and follow the instructions to reset it via email.",
      },
      {
        q: "Is my data secure?",
        a: "Yes. All data is encrypted in transit and at rest. We never share your personal information without your consent.",
      },
    ],
  },
  {
    section: "For Businesses",
    items: [
      {
        q: "How do I register my business?",
        a: "Sign up with a Business account and follow the onboarding steps to create your business profile and loyalty program.",
      },
      {
        q: "Can I customize my loyalty program?",
        a: "Yes. You can set the number of stamps required, the reward description, and your program's branding.",
      },
      {
        q: "How do I give stamps to customers?",
        a: "Use the QR scanner in your dashboard to scan a customer's QR code. The stamp is recorded automatically.",
      },
    ],
  },
];

export default function FAQPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenIndex((prev) => (prev === key ? null : key));
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-10">
      {/* Header */}
      <header className="flex items-center gap-3 pt-5 pb-5">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--border-light)] transition-colors hover:bg-[var(--border)] active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Frequently asked questions
          </h1>

          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
            Quick answers about Punched
          </p>
        </div>
      </header>

      {/* Intro */}
      <section className="pb-6">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          Find answers to common questions about stamps, rewards,
          your account, and using Punched.
        </p>
      </section>

      {/* FAQ sections */}
      <div className="space-y-7">
        {FAQ_DATA.map((section) => (
          <section key={section.section}>
            <h2 className="mb-2 px-1 text-xs font-semibold text-[var(--text-tertiary)]">
              {section.section}
            </h2>

            <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--surface)]">
              {section.items.map((item, idx) => {
                const key = `${section.section}-${idx}`;
                const isOpen = openIndex === key;

                return (
                  <div
                    key={key}
                    className={
                      idx !== section.items.length - 1
                        ? "border-b border-[var(--border-light)]"
                        : ""
                    }
                  >
                    <button
                      onClick={() => toggle(key)}
                      aria-expanded={isOpen}
                      className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors ${
                        isOpen
                          ? "bg-brand-surface"
                          : "hover:bg-[var(--border-light)] active:bg-[var(--border-light)]"
                      }`}
                    >
                      <span
                        className={`min-w-0 flex-1 text-sm font-medium leading-5 ${
                          isOpen
                            ? "text-brand-text"
                            : "text-[var(--text-primary)]"
                        }`}
                      >
                        {item.q}
                      </span>

                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isOpen
                            ? "bg-[var(--surface)]"
                            : "bg-[var(--border-light)]"
                        }`}
                      >
                        {isOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 text-brand" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        )}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="bg-brand-surface px-4 pb-4">
                        <div className="border-l-2 border-brand/30 pl-3">
                          <p className="text-sm leading-6 text-[var(--text-secondary)]">
                            {item.a}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Still need help */}
      <section className="mt-8 rounded-2xl bg-[var(--border-light)] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
            <MessageCircle className="h-4 w-4 text-[var(--text-secondary)]" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Still need help?
            </p>

            <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
              Our support team can help you out.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard/profile/help")}
            className="shrink-0 text-xs font-semibold text-brand"
          >
            Contact us
          </button>
        </div>
      </section>
    </main>
  );
}