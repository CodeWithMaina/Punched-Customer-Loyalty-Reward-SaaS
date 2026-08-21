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
import { ChevronLeft, Check } from "lucide-react";

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
    return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <Link href="/dashboard/appointments" className="text-[var(--text-secondary)]">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Book Appointment</h1>
      </div>

      <div className="px-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          {stepTitles.map((t, i) => (
            <div key={t} className="flex-1 flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i + 1 <= currentStep ? "bg-brand text-white" : "bg-[var(--surface-raised)] text-[var(--text-tertiary)]"
              }`}>
                {i + 1 < currentStep ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              {i < 3 && <div className={`flex-1 h-1 mx-1 ${
                i + 1 < currentStep ? "bg-brand" : "bg-[var(--border-light)]"
              }`} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">{stepTitles[currentStep - 1]}</p>
      </div>

      <div className="px-5 space-y-6">
        {currentStep === 1 && (
          <div>
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">
              What services do you need?
            </p>
            {servicesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-[var(--surface-raised)] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <ServiceList businessId={businessId} selectedIds={serviceIds} onToggle={toggleService} />
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">
              Who would you prefer?
            </p>
            <StaffSelector businessId={businessId} selectedStaffId={selectedStaffId} onSelect={setStaff} />
          </div>
        )}
                {/* Step 3: Time */}
        {currentStep === 3 && (
          <div>
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">
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
          <div className="space-y-4">
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 px-1">
              Review & confirm
            </p>
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] shadow-card p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Services</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{serviceIds.length} selected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Duration</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{durationTotal} min</span>
              </div>
              {priceTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Price</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">KES {priceTotal}</span>
                </div>
              )}
              {slot && (
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Time</span>
                  <span className="text-sm font-medium text-[var(--text-primary)] text-right">
                    {new Date(slot.startAtUtc).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                    {" "}
                    {new Date(slot.startAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" – "}
                    {new Date(slot.endAtUtc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              {selectedStaffId && (
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Staff</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">Selected</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-[var(--border-light)] p-4 safe-area-bottom">
        <div className="max-w-lg mx-auto flex gap-3">
          <button onClick={prevStep} disabled={currentStep === 1}
            className="flex-1 border border-[var(--border-light)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--text-primary)] font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50">
            Back
          </button>
          {currentStep < 4 ? (
            <button onClick={nextStep}
              disabled={currentStep === 1 && serviceIds.length === 0}
              className="flex-1 bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50">
              Next
            </button>
          ) : (
            <button onClick={handleBook}
              disabled={isLoading || !slot || serviceIds.length === 0}
              className="flex-1 bg-brand hover:bg-brand-hover text-white font-semibold py-3.5 rounded-2xl text-sm disabled:opacity-50">
              {isLoading ? "Booking…" : rescheduleId ? "Reschedule" : "Book Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}