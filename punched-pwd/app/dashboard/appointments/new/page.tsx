"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useBooking } from "@/hooks/useBooking";
import { useBookingStore } from "@/store/bookingStore";
import { servicesApi } from "@/lib/api/services";
import { ServiceList, StaffSelector, AppointmentCalendar } from "@/components/book";
import type { ServiceCatalogItemResponse } from "@/types";
import { ChevronLeft } from "lucide-react";

export default function BookingWizardPage() {
  useRoleGuard("Customer");
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") ?? "";
  const rescheduleId = searchParams.get("reschedule") ?? null;

  const {
    serviceIds, toggleService,
    selectedStaffId, setStaff, setBusiness,
    slot,
    currentStep, nextStep, prevStep, reset,
  } = useBookingStore();

  const { createAppointment, rescheduleAppointment, isLoading } = useBooking();
  const [services, setServicesData] = useState<ServiceCatalogItemResponse[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  useEffect(() => {
    if (!businessId) { router.replace("/dashboard/explore"); return; }
    setBusiness(businessId);
    setServicesLoading(true);
    servicesApi.getPublic(businessId)
      .then((res) => { if (res.success && res.data) setServicesData(res.data); })
      .finally(() => setServicesLoading(false));
  }, [businessId, router, setBusiness]);

  const durationTotal = services.filter((s) => serviceIds.includes(s.id))
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const priceTotal = services.filter((s) => serviceIds.includes(s.id))
    .reduce((sum, s) => sum + (s.price ?? 0), 0);

  const handleBook = async () => {
    if (!slot || serviceIds.length === 0) return;
    const payload = {
      businessId, serviceIds,
      staffUserId: selectedStaffId ?? undefined,
      scheduledAt: slot.startAtUtc, note: "",
    };
    if (rescheduleId) {
      await rescheduleAppointment(rescheduleId, {
        scheduledAt: slot.startAtUtc, serviceIds,
        staffUserId: selectedStaffId ?? undefined,
      });
    } else {
      await createAppointment(payload);
    }
    reset();
  };

  const stepTitles = ["Services", "Staff", "Time", "Review"];
  const progressPercent = (currentStep / 4) * 100;

  return (
    <div className="relative min-h-[80vh] max-w-lg mx-auto pb-32 overflow-x-hidden">
      {/* Step watermark */}
      <div
        aria-hidden
        className="fixed top-1/3 left-0 w-full pointer-events-none flex items-center justify-center opacity-[0.04] z-0 select-none overflow-hidden"
      >
        <span
          className="font-extrabold leading-none text-[var(--text-primary)] text-[200px]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {String(currentStep).padStart(2, "0")}
        </span>
      </div>

      {/* Transactional header */}
      <div className="relative z-10 px-5 pt-5 pb-4">
        <Link
          href="/dashboard/appointments"
          aria-label="Back to appointments"
          className="inline-flex items-center gap-2 border border-[var(--border)] px-3 py-2 text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-secondary)] hover:border-brand hover:text-brand transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      {/* Step progress */}
      <div className="relative z-10 px-5 mb-8">
        <div className="flex justify-between items-center mb-2">
          <span
            className="text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Step {currentStep} of 4
          </span>
          <span
            className="text-[12px] tracking-[0.15em] uppercase font-bold text-[var(--text-primary)]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {stepTitles[currentStep - 1]}
          </span>
        </div>
        <div className="w-full h-[2px] bg-[var(--surface-container-high, var(--border-light))]">
          <div
            className="h-full bg-[var(--text-primary)] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="relative z-10 px-5 space-y-6">
        {currentStep === 1 && (
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-3">
              What services do you need?
            </p>
            {servicesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-[var(--surface-raised)] border border-[var(--border)] animate-pulse" />
                ))}
              </div>
            ) : (
              <ServiceList businessId={businessId} selectedIds={serviceIds} onToggle={toggleService} />
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-3">
              Who would you prefer?
            </p>
            <StaffSelector businessId={businessId} selectedStaffId={selectedStaffId} onSelect={setStaff} />
          </div>
        )}

        {/* Step 3: Time */}
        {currentStep === 3 && (
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-4">
              Pick a time slot
            </p>
            <AppointmentCalendar
              businessId={businessId}
              serviceIds={serviceIds}
              staffUserId={selectedStaffId}
            />
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <div>
            <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] mb-3">
              Review &amp; confirm
            </p>
            <div className="border border-[var(--border)] bg-[var(--surface-raised)] relative overflow-hidden">
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/20" />
              <ul>
                {[
                  { label: "Services", value: `${serviceIds.length} selected` },
                  { label: "Duration", value: `${durationTotal} min` },
                  ...(priceTotal > 0 ? [{ label: "Price", value: `KES ${priceTotal}` }] : []),
                  ...(slot
                    ? [{
                        label: "Time",
                        value: `${new Date(slot.startAtUtc).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${new Date(slot.startAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                      }]
                    : []),
                  ...(selectedStaffId ? [{ label: "Staff", value: "Selected" }] : []),
                ].map(({ label, value }, i, arr) => (
                  <li
                    key={label}
                    className={`flex justify-between items-center gap-4 py-4 px-5 ${i < arr.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                  >
                    <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] flex-shrink-0">
                      {label}
                    </span>
                    <span
                      className={`text-right truncate text-sm text-[var(--text-primary)] ${label === "Price" ? "font-bold" : ""}`}
                      style={label === "Price" ? { fontFamily: "'Space Mono', monospace" } : undefined}
                    >
                      {value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Sticky navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--background)] border-t border-[var(--border)] p-4 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {priceTotal > 0 && currentStep === 1 && serviceIds.length > 0 && (
            <div className="hidden xs:flex flex-col flex-shrink-0">
              <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">Total</span>
              <span
                className="font-mono text-sm font-bold text-[var(--text-primary)]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                KES {priceTotal}
              </span>
            </div>
          )}
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex-1 border border-[var(--border)] bg-transparent text-[var(--text-primary)] py-3.5 rounded-none text-sm disabled:opacity-40 transition-colors hover:border-[var(--text-primary)]"
          >
            Back
          </button>
          {currentStep < 4 ? (
            <button
              onClick={nextStep}
              disabled={currentStep === 1 && serviceIds.length === 0}
              className="flex-1 bg-[var(--text-primary)] hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] text-[var(--background)] py-3.5 rounded-none text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleBook}
              disabled={isLoading || !slot || serviceIds.length === 0}
              className="flex-1 bg-[var(--text-primary)] hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] text-[var(--background)] py-3.5 rounded-none text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {isLoading ? "Booking…" : rescheduleId ? "Reschedule" : "Confirm Booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}