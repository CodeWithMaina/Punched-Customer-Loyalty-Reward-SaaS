"use client";

import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { ArrowLeft, Mail, MessageCircle, Twitter, Globe } from "lucide-react";

const CONTACT_OPTIONS = [
  {
    icon: Mail,
    label: "Email Support",
    value: "support@punched.app",
    href: "mailto:support@punched.app",
    description: "We respond within 24 hours",
  },
  {
    icon: Twitter,
    label: "Twitter / X",
    value: "@punchedapp",
    href: "https://twitter.com/punchedapp",
    description: "DM us for quick help",
  },
  {
    icon: Globe,
    label: "Help Center",
    value: "help.punched.app",
    href: "https://help.punched.app",
    description: "Browse guides and docs",
  },
];

export default function SupportPage() {
  useRoleGuard("Business");

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/business/profile" className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Support</h1>
          <p className="text-xs text-[var(--text-tertiary)]">We're here to help</p>
        </div>
      </div>

      {/* Hero message */}
      <div className="mx-5 mb-5 bg-brand-surface border border-brand/10 rounded-2xl p-4 flex items-start gap-3">
        <MessageCircle className="h-5 w-5 text-brand mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-brand-dark">Talk to the Punched team</p>
          <p className="text-xs text-brand/70 mt-1 leading-relaxed">Use any of the channels below. We typically respond within one business day.</p>
        </div>
      </div>

      {/* Contact options */}
      <div className="mx-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden divide-y divide-[var(--border-light)]">
        {CONTACT_OPTIONS.map(({ icon: Icon, label, value, href, description }) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 px-4 py-4 hover:bg-[var(--surface-raised)] active:bg-[var(--border-light)] transition-colors">
            <div className="h-10 w-10 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
              <Icon className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
              <p className="text-xs text-brand font-medium truncate">{value}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{description}</p>
            </div>
          </a>
        ))}
      </div>

      {/* FAQ link */}
      <div className="mx-5 mt-5 bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Browse the FAQ</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Find quick answers to common questions</p>
        </div>
        <Link href="/dashboard/business/profile/faq"
          className="text-xs font-bold text-brand bg-brand-surface px-3 py-1.5 rounded-xl hover:bg-brand/10 transition-colors flex-shrink-0">
          View FAQ
        </Link>
      </div>

      <p className="text-center text-[10px] text-[var(--text-muted)] mt-8">Punched v1.0.0 · Built with ❤ in Nairobi</p>
    </div>
  );
}
