"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * Goal management for a staff member: set/clear their personal daily stamp
 * goal override. Business default is shown as the fallback target.
 * Managed directly from Staff Details — no navigation away.
 */
export function EditGoalModal({
  open,
  onClose,
  staff,
  businessDefaultGoal,
  onSave,
  saving = false,
}: {
  open: boolean;
  onClose: () => void;
  staff: {
    fullName: string;
    dailyGoalOverride?: number | null;
    dailyGoal?: number | null;
  } | null;

  /** Business-wide default goal shown as the fallback. */
  businessDefaultGoal?: number | null;
  onSave: (goal?: number) => void;
  saving?: boolean;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open && staff) {
      setValue(staff.dailyGoalOverride ? String(staff.dailyGoalOverride) : "");
    }
  }, [open, staff]);

  if (!staff) return null;

  const parsed = Number(value);
  const invalid = value !== "" && (!Number.isFinite(parsed) || parsed < 1 || parsed > 1000);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Daily goal"
      description={`${staff.fullName} — personal daily stamp target`}
      size="sm"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            isLoading={saving}
            disabled={invalid}
            onClick={() => onSave(value === "" ? undefined : Math.round(parsed))}
          >
            Save goal
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="staff-goal-input"
            className="block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2"
          >
            Daily stamps (1–1000)
          </label>
          <input
            id="staff-goal-input"
            type="number"
            min={1}
            max={1000}
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              businessDefaultGoal ? `Business default: ${businessDefaultGoal}` : "No default set"
            }
            aria-invalid={invalid}
            className={`w-full rounded-xl border bg-[var(--background)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-brand ${
              invalid ? "border-red-500" : "border-[var(--border)]"
            }`}
          />
          {invalid && (
            <p className="mt-1.5 text-[11px] text-red-500" role="alert">
              Enter a number between 1 and 1000.
            </p>
          )}
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          Leave empty to fall back to{" "}
          {businessDefaultGoal
            ? `the business default of ${businessDefaultGoal} stamps/day`
            : "no goal"}
          . Progress resets every day.
        </p>
        {staff.dailyGoalOverride && (
          <button
            onClick={() => onSave(undefined)}
            disabled={saving}
            className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand)] hover:underline disabled:opacity-50"
          >
            Remove personal override
          </button>
        )}
      </div>
    </Modal>
  );
}
