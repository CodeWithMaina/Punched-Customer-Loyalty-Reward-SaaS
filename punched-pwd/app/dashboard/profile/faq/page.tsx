"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

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
    <div className="max-w-lg mx-auto px-5 pb-8">
      <div className="flex items-center gap-3 pt-4 pb-5">
        <button onClick={() => router.back()} className="h-9 w-9 rounded-xl bg-[var(--border-light)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">FAQ</h1>
      </div>

      <div className="space-y-4">
        {FAQ_DATA.map((section) => (
          <div key={section.section} className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden">
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{section.section}</p>
            </div>
            <div className="divide-y divide-[var(--border-light)]">
              {section.items.map((item, idx) => {
                const key = `${section.section}-${idx}`;
                const isOpen = openIndex === key;
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggle(key)}
                      className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-[var(--surface-raised)] transition-colors"
                    >
                      <span className="flex-1 text-sm font-semibold text-[var(--text-primary)]">{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)] flex-shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3">
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
