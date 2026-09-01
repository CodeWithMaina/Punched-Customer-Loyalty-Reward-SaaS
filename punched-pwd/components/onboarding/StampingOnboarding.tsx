"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

const MONO_FONT = "'Space Mono', monospace";
const HEADLINE_FONT = "'Plus Jakarta Sans', sans-serif";

const STEPS = [
  { key: "program", label: "Create your program", href: "/dashboard/business/profile/programs" },
  { key: "poster", label: "Print your enrollment poster", href: "/dashboard/business/poster" },
  { key: "staff", label: "Invite staff", href: "/dashboard/business/staff" },
  { key: "scan", label: "Go to Scan & meet your first customer", href: "/dashboard/business/scan" },
];

const STORAGE_KEY = "punched_business_onboarding_v1";

/**
 * Post-registration guided onboarding checklist. Persists completed steps in
 * localStorage so the wizard resumes where the owner left off.
 */
export function StampingOnboarding() {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setCompleted(JSON.parse(raw));
    } catch {
      // ignore malformed stored state
    }
  }, []);

  const toggle = (key: string) => {
    const next = { ...completed, [key]: !completed[key] };
    setCompleted(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // best-effort persistence
    }
  };

  const allDone = STEPS.every((s) => completed[s.key]);

  if (allDone) return null;

  return (
    <section className="mb-6 border border-brand/30 bg-[var(--surface-raised)] p-5">
      <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-brand mb-1" style={{ fontFamily: MONO_FONT }}>
        Getting started
      </p>
      <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: HEADLINE_FONT }}>
        Set up your loyalty program
      </h2>

      <ol className="flex flex-col gap-2">
        {STEPS.map((step) => {
          const done = !!completed[step.key];
          return (
            <li key={step.key} className="flex items-center gap-3">
              <button
                onClick={() => toggle(step.key)}
                aria-label={done ? `Mark ${step.label} as not done` : `Mark ${step.label} as done`}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  done ? "bg-brand border-brand text-white" : "border-[var(--border)] text-transparent"
                }`}
              >
                <Check className="h-4 w-4" />
              </button>

              <Link
                href={step.href}
                className={`flex-1 flex items-center justify-between gap-2 text-sm ${
                  done ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)] hover:text-brand"
                }`}
                style={{ fontFamily: MONO_FONT }}
              >
                <span>{step.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}