"use client";

import { useState } from "react";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { ChevronDown, ChevronUp, ArrowLeft, HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "How do I add staff to my business?",
    a: "Go to the Staff tab on the bottom navigation. From there you can invite staff members by sharing your business code or searching for them by user ID.",
  },
  {
    q: "Can I have multiple loyalty programs?",
    a: "Yes! Go to Settings → Loyalty Programs to create multiple programs with different stamp goals and rewards. The first active program is used when new customers enroll.",
  },
  {
    q: "How does the referral program work?",
    a: "Customers get a unique referral link for your business. When friends sign up through that link, the referrer earns your chosen reward after reaching the required number of referrals.",
  },
  {
    q: "How do stamps get recorded?",
    a: "Customers show their personal QR code and you or your staff scan it using the scan button. Each successful scan awards one stamp.",
  },
  {
    q: "What happens when a customer earns a reward?",
    a: "They appear as 'Ready to Redeem' on your Overview page and Customers list. Tap their profile and process the redemption to mark it complete.",
  },
  {
    q: "Can customers have cards at multiple businesses?",
    a: "Yes! Customers can enroll in loyalty programs at any business using Punched. They'll see all their cards in their wallet.",
  },
  {
    q: "How do I change the app theme?",
    a: "Go to Settings → Theme and choose between the blue and green color schemes.",
  },
  {
    q: "What is the difference between Active and Paused programs?",
    a: "Active programs are available for new customer enrollments. Paused programs are hidden from new sign-ups but existing enrolled customers retain their stamps.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--border-light)] last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-start justify-between gap-3 py-4 text-left">
        <span className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{q}</span>
        <span className="flex-shrink-0 mt-0.5">
          {open ? <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />}
        </span>
      </button>
      {open && <p className="text-sm text-[var(--text-secondary)] pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function FAQPage() {
  useRoleGuard("Business");

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/business/profile" className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">FAQ</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Frequently asked questions</p>
        </div>
      </div>

      {/* Intro */}
      <div className="mx-5 mb-5 bg-brand-surface border border-brand/10 rounded-2xl p-4 flex items-center gap-3">
        <HelpCircle className="h-5 w-5 text-brand flex-shrink-0" />
        <p className="text-sm font-semibold text-brand-dark">Got a question? Check below or contact support.</p>
      </div>

      {/* FAQ list */}
      <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card px-4 divide-y divide-[var(--border-light)]">
        {FAQ_ITEMS.map((item) => <FAQItem key={item.q} {...item} />)}
      </div>

      {/* Support link */}
      <div className="mx-5 mt-5 text-center">
        <p className="text-xs text-[var(--text-tertiary)]">
          Still need help?{" "}
          <Link href="/dashboard/business/profile/support" className="text-brand font-semibold hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
