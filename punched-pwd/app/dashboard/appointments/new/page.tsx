"use client";

import { RequireModule } from "@/components/modules/RequireModule";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useBooking } from "@/hooks/useBooking";
import { useBookingStore } from "@/store/bookingStore";
import { servicesApi } from "@/lib/api/services";
import { businessesApi } from "@/lib/api/businesses";
import { ServiceList, StaffSelector, AppointmentCalendar } from "@/components/book";
import type { ServiceCatalogItemResponse } from "@/types";
import { ArrowLeft, ArrowRight } from "lucide-react";

const HEADLINE = "'Plus Jakarta Sans', sans-serif";
const MONO = "'Space Mono', monospace";

function BookingWizardPageContent() {
  useRoleGuard("Customer");
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") ?? "";
  const rescheduleId = searchParams.get("reschedule") ?? null;

  const {
    serviceIds, toggleService,
    selectedStaffId, setStaff, setBusiness,
    slot,
    currentStep, nextStep, prevStep, setStep, reset,
  } = useBookingStore();

  const { createAppointment, rescheduleAppointment, isLoading } = useBooking();
  const [services, setServicesData] = useState<ServiceCatalogItemResponse[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [businessName, setBusinessName] = useState<string>("");

  useEffect(() => {
    if (!businessId) { router.replace("/dashboard/explore"); return; }
    setBusiness(businessId);
    setServicesLoading(true);
    servicesApi.getPublic(businessId)
      .then((res) => { if (res.success && res.data) setServicesData(res.data); })
      .finally(() => setServicesLoading(false));
    businessesApi.getById(businessId)
      .then((res) => { if (res.success && res.data) setBusinessName(res.data.name); });
  }, [businessId, router, setBusiness]);

  const selectedServices = services.filter((s) => serviceIds.includes(s.id));
  const durationTotal = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const priceTotal = selectedServices.reduce((sum, s) => sum + (s.price ?? 0), 0);

  const handleBook = async () => {
    if (!slot || serviceIds.length === 0) return;
    const payload = {
      businessId, serviceIds,
      staffUserId: selectedStaffId ?? undefined,
      scheduledAt: slot.startAtUtc, note: "",
    };
    if (rescheduleId) {
      const ok = await rescheduleAppointment(rescheduleId, {
        scheduledAt: slot.startAtUtc, serviceIds,
        staffUserId: selectedStaffId ?? undefined,
      });
      if (!ok) setStep(3); // conflict/validation failure -> back to time selection
      return;
    }
    const booked = await createAppointment(payload);
    // Server revalidated availability and rejected (e.g. OVERBOOKING) -> return to time selection
    if (booked) reset(); else setStep(3);
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

      {/* Transactional top bar */}
      <header className="fixed top-0 inset-x-0 z-50 h-[48px] bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between px-5">
        <button
          onClick={() => router.push("/dashboard/appointments")}
          aria-label="Go back"
          className="text-[var(--text-primary)] hover:text-brand transition-colors active:opacity-70"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <span
          className="uppercase font-bold tracking-[0.2em] text-sm text-[var(--text-primary)]"
          style={{ fontFamily: HEADLINE }}
        >
          PUNCHED
        </span>
        <span className="w-6" aria-hidden />
      </header>

      <div className="relative z-10 pt-[72px]" />

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
            <StaffSelector businessId={businessId} serviceIds={serviceIds} selectedStaffId={selectedStaffId} onSelect={setStaff} />
          </div>
        )}

        {/* Step 3: Time */}
        {currentStep === 3 && (
          <div>
            {/* Booking summary (design: Date & Time screen) */}
            <div className="border border-[var(--border)] p-5 mb-8">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2
                    className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
                    style={{ fontFamily: HEADLINE }}
                  >
                    {businessName || "Your booking"}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
                    {selectedServices.map((s) => s.name).join(", ") || "No services selected"}
                  </p>
                </div>
                <button
                  onClick={prevStep}
                  className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)] underline underline-offset-4 hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
                >
                  Edit
                </button>
              </div>
              <div className="flex items-center text-xs text-[var(--text-secondary)]" style={{ fontFamily: MONO }}>
                <span>{durationTotal} MIN</span>
                {priceTotal > 0 && (
                  <>
                    <span className="mx-2">•</span>
                    <span>KES {priceTotal}</span>
                  </>
                )}
              </div>
            </div>

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
            <h1
              className="text-[44px] leading-[48px] md:text-6xl md:leading-none font-extrabold tracking-tighter text-[var(--text-primary)] mb-10"
              style={{ fontFamily: HEADLINE }}
            >
              Summary
            </h1>

            {/* Confirmation card */}
            <div className="border border-[var(--border)] bg-[var(--surface-raised)] relative overflow-hidden">
              <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />
              <ul>
                {[
                  { label: "Services", value: selectedServices.map((s) => s.name).join(", "), editStep: 1 },
                  ...(selectedStaffId ? [{ label: "Staff", value: "Selected", editStep: 2 }] : []),
                  ...(slot
                    ? [{
                        label: "Date",
                        value: new Date(slot.startAtUtc).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
                        editStep: 3,
                      }]
                    : []),
                  ...(slot
                    ? [{
                        label: "Time",
                        value: new Date(slot.startAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        editStep: 3,
                      }]
                    : []),
                  ...(durationTotal > 0 ? [{ label: "Duration", value: `${durationTotal} min`, editStep: null as number | null }] : []),
                  ...(priceTotal > 0 ? [{ label: "Price", value: `KES ${priceTotal}`, editStep: null as number | null }] : []),
                ].map(({ label, value, editStep }, i, arr) => (
                  <li
                    key={label}
                    className={`flex justify-between items-center gap-4 py-4 px-5 ${i < arr.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                  >
                    <span className="flex flex-col gap-1 min-w-0">
                      <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">
                        {label}
                      </span>
                      <span
                        className={`truncate text-sm text-[var(--text-primary)] ${label === "Price" ? "font-bold" : ""}`}
                        style={label === "Price" || label === "Duration" ? { fontFamily: MONO } : undefined}
                      >
                        {value}
                      </span>
                    </span>
                    {editStep !== null && editStep !== undefined && (
                      <button
                        onClick={() => setStep(editStep)}
                        className="text-xs text-[var(--text-tertiary)] underline decoration-[var(--border)] underline-offset-4 hover:text-brand hover:decoration-brand transition-colors flex-shrink-0"
                      >
                        Edit
                      </button>
                    )}
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
          {currentStep < 4 ? (
            <>
              {priceTotal > 0 && currentStep === 1 && serviceIds.length > 0 && (
                <div className="hidden xs:flex flex-col flex-shrink-0">
                  <span className="text-[10px] tracking-[0.15em] uppercase font-bold text-[var(--text-tertiary)]">Total</span>
                  <span
                    className="font-mono text-sm font-bold text-[var(--text-primary)]"
                    style={{ fontFamily: MONO }}
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
              <button
                onClick={nextStep}
                disabled={currentStep === 1 && serviceIds.length === 0}
                className="flex-1 bg-[var(--text-primary)] hover:bg-transparent hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--text-primary)] text-[var(--background)] py-3.5 rounded-none text-sm font-bold uppercase tracking-widest disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next →
              </button>
            </>
          ) : (
            /* Step 4 — single full-width confirm CTA */
            <button
              onClick={handleBook}
              disabled={isLoading || !slot || serviceIds.length === 0}
              className="w-full h-16 bg-white text-black font-bold flex items-center justify-center gap-2 rounded-none text-base hover:bg-black hover:text-white hover:border hover:border-white transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
            >
              {rescheduleId ? (isLoading ? "Rescheduling…" : "CONFIRM RESCHEDULE") : isLoading ? "Booking…" : "CONFIRM BOOKING"}
              {!isLoading && <ArrowRight className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingWizardPage() {
  return (
    <RequireModule module="appointments">
      <BookingWizardPageContent />
    </RequireModule>
  );
}