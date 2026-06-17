import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { ThemeApplier } from "@/components/ThemeApplier";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

// ═══════════════════════════════════════════════════════════════
//  Root Layout — PWA-ready, mobile-first
// ═══════════════════════════════════════════════════════════════

export const metadata: Metadata = {
  title: "Punched — Loyalty Rewards",
  description:
    "Digital loyalty cards for Kenyan businesses — earn stamps, get rewards with every visit.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Punched",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563EB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="blue" suppressHydrationWarning>
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased font-sans">
        <ThemeApplier />
        <ServiceWorkerRegistrar />
        {/* Toast notifications */}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#111827",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "14px",
              padding: "12px 16px",
              maxWidth: "360px",
            },
            success: {
              iconTheme: {
                primary: "#16A34A",
                secondary: "#fff",
              },
            },
            error: {
              iconTheme: {
                primary: "#EF4444",
                secondary: "#fff",
              },
            },
          }}
        />

        {/* Main content */}
        {children}
      </body>
    </html>
  );
}
