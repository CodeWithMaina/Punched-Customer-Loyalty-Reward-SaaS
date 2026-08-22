// ═══════════════════════════════════════════════════════════════
//  Auth Layout — Atmospheric Brutalism "void" shell
//  Ghost-card content on the themed background with a structural
//  watermark. Adapts to the active theme via CSS variables.
// ═══════════════════════════════════════════════════════════════

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[var(--background)] flex flex-col overflow-x-hidden">
      {/* Structural watermark */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.03] select-none"
      >
        <span
          className="font-extrabold tracking-tighter text-[var(--text-primary)] text-[20vw] whitespace-nowrap -rotate-12"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          PUNCHED
        </span>
      </div>

      {/* Slim top bar */}
      <header className="relative z-10 h-12 w-full border-b border-[var(--border)] flex items-center justify-between px-5">
        <span
          className="text-lg font-bold tracking-tighter text-[var(--text-primary)]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          PUNCHED.
        </span>
        <span className="text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">
          Loyalty Rewards
        </span>
      </header>

      {/* Content canvas */}
      <main className="relative z-10 flex-1 flex flex-col justify-center px-5 py-12">
        <div className="w-full max-w-md mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
