"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone, ExternalLink } from "lucide-react";

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto px-5 pb-8">
      <div className="flex items-center gap-3 pt-4 pb-5">
        <button onClick={() => router.back()} className="h-9 w-9 rounded-xl bg-[var(--border-light)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Help & Support</h1>
      </div>

      {/* Quick Help */}
      <div className="bg-brand-surface rounded-2xl p-5 mb-6 text-center">
        <div className="h-14 w-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-3">
          <MessageCircle className="h-7 w-7 text-brand" />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-1">Need Help?</h2>
        <p className="text-sm text-[var(--text-secondary)]">We&apos;re here to help. Choose how you&apos;d like to reach us.</p>
      </div>

      {/* Contact Options */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden mb-6">
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">CONTACT US</p>
        </div>
        <div className="divide-y divide-[var(--border-light)]">
          <a
            href="mailto:support@punched.app"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors"
          >
            <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Email Support</p>
              <p className="text-xs text-[var(--text-tertiary)]">support@punched.app</p>
            </div>
            <ExternalLink className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          </a>

          <a
            href="https://wa.me/254700000000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors"
          >
            <div className="h-9 w-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">WhatsApp Chat</p>
              <p className="text-xs text-[var(--text-tertiary)]">Quick responses, Mon–Fri</p>
            </div>
            <ExternalLink className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          </a>

          <a
            href="tel:+254700000000"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors"
          >
            <div className="h-9 w-9 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Phone className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Call Us</p>
              <p className="text-xs text-[var(--text-tertiary)]">+254 700 000 000</p>
            </div>
            <ExternalLink className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
          </a>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 mb-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Support Hours</h3>
        <div className="space-y-2">
          {[
            { day: "Monday – Friday", time: "8:00 AM – 6:00 PM" },
            { day: "Saturday", time: "9:00 AM – 1:00 PM" },
            { day: "Sunday & Holidays", time: "Closed" },
          ].map(({ day, time }) => (
            <div key={day} className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">{day}</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">{time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-xs text-amber-700 leading-relaxed">
          <span className="font-semibold">Tip:</span> Before reaching out, check our{" "}
          <span
            onClick={() => router.push("/dashboard/profile/faq")}
            className="text-brand font-semibold cursor-pointer hover:underline"
          >
            FAQ
          </span>{" "}
          — your question might already be answered there!
        </p>
      </div>
    </div>
  );
}
