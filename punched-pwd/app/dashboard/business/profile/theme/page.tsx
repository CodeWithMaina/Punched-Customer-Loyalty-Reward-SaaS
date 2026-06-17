"use client";

import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useThemeStore } from "@/store/themeStore";
import { ArrowLeft, Check } from "lucide-react";

const THEMES = [
  {
    id: "blue" as const,
    label: "Ocean Blue",
    description: "Clean and professional",
    primary: "#2563eb",
    surface: "#eff6ff",
  },
  {
    id: "green" as const,
    label: "Forest Green",
    description: "Fresh and natural",
    primary: "#16a34a",
    surface: "#f0fdf4",
  },
];

export default function ThemePage() {
  useRoleGuard("Business");
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/business/profile" className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-light)] transition-colors flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Theme</h1>
          <p className="text-xs text-[var(--text-tertiary)]">Choose your app color scheme</p>
        </div>
      </div>

      <div className="px-5 space-y-3 mt-2">
        {THEMES.map(({ id, label, description, primary, surface }) => {
          const isActive = theme === id;
          return (
            <button key={id} onClick={() => setTheme(id)}
              className={`w-full text-left bg-[var(--surface)] rounded-2xl border-2 shadow-card p-4 flex items-center gap-4 transition-all ${isActive ? "border-brand" : "border-[var(--border-light)] hover:border-[var(--border)]"}`}>
              {/* Swatch */}
              <div className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: surface }}>
                <div className="h-6 w-6 rounded-lg" style={{ backgroundColor: primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${isActive ? "text-brand" : "text-[var(--text-primary)]"}`}>{label}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{description}</p>
              </div>
              {isActive && (
                <div className="h-6 w-6 rounded-full bg-brand flex items-center justify-center flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}

        <p className="text-center text-xs text-[var(--text-tertiary)] pt-2">Changes apply instantly across the whole app.</p>
      </div>
    </div>
  );
}
