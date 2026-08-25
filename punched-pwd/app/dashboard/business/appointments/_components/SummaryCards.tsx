import type { ReactNode } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock } from "lucide-react";

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-light)] text-[var(--brand)]">
          {icon}
        </span>

        <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">
        {label}
      </p>
    </div>
  );
}

export function SummaryCards({
  counts,
}: {
  counts: { today: number; upcoming: number; pending: number; completed: number };
}) {
  return (
    <section
      aria-label="Appointment summary"
      className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <SummaryCard icon={<CalendarDays className="h-4 w-4" />} label="Today" value={counts.today} />
      <SummaryCard icon={<Clock className="h-4 w-4" />} label="Upcoming" value={counts.upcoming} />
      <SummaryCard icon={<AlertCircle className="h-4 w-4" />} label="Needs attention" value={counts.pending} />
      <SummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={counts.completed} />
    </section>
  );
}