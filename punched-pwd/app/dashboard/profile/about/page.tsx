"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Shield, Zap, Globe } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto px-5 pb-8">
      <div className="flex items-center gap-3 pt-4 pb-5">
        <button onClick={() => router.back()} className="h-9 w-9 rounded-xl bg-[var(--border-light)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
          <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--text-primary)]">About Punched</h1>
      </div>

      {/* Hero */}
      <div className="text-center mb-6">
        <div className="h-16 w-16 rounded-2xl bg-brand-surface flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">👊</span>
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Punched Loyalty</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Version 1.0.0</p>
      </div>

      {/* Description */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 mb-4">
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Punched is a modern digital loyalty platform that connects local businesses with their customers.
          Replace old paper punch cards with a seamless digital experience — earn stamps, track rewards,
          and redeem perks all from your phone.
        </p>
      </div>

      {/* Values */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card overflow-hidden mb-4">
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">OUR VALUES</p>
        </div>
        <div className="divide-y divide-[var(--border-light)]">
          {[
            { icon: Heart, title: "Customer First", desc: "Every feature is designed for simplicity and delight." },
            { icon: Shield, title: "Trust & Security", desc: "Your data is encrypted and never shared without consent." },
            { icon: Zap, title: "Speed", desc: "Lightning-fast QR scans and instant stamp updates." },
            { icon: Globe, title: "Local Impact", desc: "Empowering small businesses to build loyal communities." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legal */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-5 text-center space-y-2">
        <p className="text-xs text-[var(--text-tertiary)]">&copy; {new Date().getFullYear()} Punched Loyalty. All rights reserved.</p>
        <div className="flex justify-center gap-4">
          <span className="text-xs text-brand font-medium cursor-pointer hover:underline">Privacy Policy</span>
          <span className="text-xs text-brand font-medium cursor-pointer hover:underline">Terms of Service</span>
        </div>
      </div>
    </div>
  );
}
