"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Don't show if dismissed recently
    const dismissed = localStorage.getItem("punched-install-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay showing banner for smooth UX
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("punched-install-dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-slide-up">
      <div className="bg-[var(--surface)] rounded-2xl shadow-elevated border border-[var(--border-light)] p-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-brand rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Install Punched</p>
          <p className="text-xs text-[var(--text-tertiary)]">Add to home screen for the best experience</p>
        </div>
        <button
          onClick={handleInstall}
          className="bg-brand text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-brand-hover active:scale-[0.97] transition-all flex-shrink-0"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex-shrink-0 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
