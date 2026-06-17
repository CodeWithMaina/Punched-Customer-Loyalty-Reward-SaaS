"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Loader2, CreditCard } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
//  Splash Screen — PWA entry point with branded loading
// ═══════════════════════════════════════════════════════════════

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      if (isAuthenticated) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, router]);

  if (!showSplash) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center animate-scale-in">
        <div className="h-20 w-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 shadow-elevated">
          <CreditCard className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white font-display tracking-tight">
          PUNCHED
        </h1>
        <p className="text-white/60 text-sm mt-2 font-medium">
          Loyalty Rewards
        </p>
      </div>

      <div className="absolute bottom-16 animate-fade-in delay-300">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    </div>
  );
}
