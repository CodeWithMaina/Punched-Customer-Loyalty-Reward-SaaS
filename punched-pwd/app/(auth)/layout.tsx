// ═══════════════════════════════════════════════════════════════
//  Auth Layout — Mobile-first PWA with 60-30-10 theming
//  30% brand header → 60% white card content
// ═══════════════════════════════════════════════════════════════

import { CreditCard } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* 30% — Brand header with curved bottom */}
      <div className="bg-brand pt-16 pb-12 px-5 text-center relative overflow-hidden">
        {/* Subtle background shapes */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white rounded-full" />
          <div className="absolute top-8 -left-8 w-32 h-32 bg-white rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display tracking-tight">
            PUNCHED
          </h1>
          <p className="text-xs text-white/60 mt-1 font-medium">Loyalty Rewards</p>
        </div>
      </div>

      {/* 60% — Content card overlaps header */}
      <div className="flex-1 px-5 -mt-5">
        <div className="w-full max-w-md mx-auto bg-[var(--surface)] rounded-3xl shadow-elevated p-6 sm:p-8 mb-8 animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
