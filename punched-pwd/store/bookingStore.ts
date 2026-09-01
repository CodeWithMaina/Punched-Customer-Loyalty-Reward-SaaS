import { create } from "zustand";
import type { AvailabilitySlotResponse } from "@/types";

// ═══════════════════════════════════════════════════════════════
//  Booking cart store (Zustand, SESSION-ONLY — no persist).
//  A persisted cart could survive a reload and book at the wrong
//  business (multi-tenant safety), so per stack rule #9 the cart is
//  never persisted.
//  endAt is NOT stored here: it is derived as
//  slot.startAtUtc + Σ(service durations) by the consumer via
//  servicesApi.getPublic(businessId) (frontend.md §6 / backend.md §8).
// ═══════════════════════════════════════════════════════════════

export interface BookingState {
  businessId: string | null;
  serviceIds: string[];
  selectedStaffId: string | null;
  slot: AvailabilitySlotResponse | null;
  note: string;
  /** Wizard step: 1=Services, 2=Staff, 3=Time, 4=Review */
  currentStep: number;
}

export interface BookingActions {
  setBusiness: (id: string | null) => void;
  setServices: (ids: string[]) => void;
  toggleService: (id: string) => void;
  clearServices: () => void;
  setStaff: (id: string | null) => void;
  setSlot: (slot: AvailabilitySlotResponse) => void;
  removeSlot: () => void;
  setNote: (note: string) => void;
  /** Direct step setter (1–4). */
  setStep: (step: number) => void;
  /** Advance one step, respecting guards (empty cart / no slot). Bails when blocked. */
  nextStep: () => void;
  /** Go back one step (never below 1). */
  prevStep: () => void;
  reset: () => void;
}

export type BookingStore = BookingState & BookingActions;

export const useBookingStore = create<BookingStore>()((set) => ({
  businessId: null,
  serviceIds: [],
  selectedStaffId: null,
  slot: null,
  note: "",
  currentStep: 1,

  setBusiness: (id) => set({ businessId: id }),
  setServices: (ids) =>
    set((s) => ({
      serviceIds: ids,
      // Dependent invalidation: a different service cart may have different
      // eligible staff, and durations drive slot length — drop both.
      selectedStaffId: null,
      slot: null,
    })),
  toggleService: (id) =>
    set((s) => ({
      serviceIds: s.serviceIds.includes(id)
        ? s.serviceIds.filter((x) => x !== id)
        : [...s.serviceIds, id],
      selectedStaffId: null,
      slot: null,
    })),
  clearServices: () => set({ serviceIds: [], selectedStaffId: null, slot: null }),
  setStaff: (id) => set({ selectedStaffId: id, slot: null }),
  setSlot: (slot) => set({ slot }),
  removeSlot: () => set({ slot: null }),
  setNote: (note) => set({ note: note.slice(0, 500) }),
  setStep: (step) => set({ currentStep: Math.min(4, Math.max(1, step)) }),
  nextStep: () =>
    set((s) => {
      // Guards: cannot leave the Services step with an empty cart, cannot
      // leave the Time step without a selected slot, cannot pass Review.
      const blocked =
        (s.currentStep === 1 && s.serviceIds.length === 0) ||
        (s.currentStep === 3 && !s.slot) ||
        s.currentStep >= 4;
      return blocked
        ? { currentStep: s.currentStep }
        : { currentStep: s.currentStep + 1 };
    }),
  prevStep: () =>
    set((s) => ({
      currentStep: Math.max(1, s.currentStep - 1),
    })),
  reset: () =>
    set({
      businessId: null,
      serviceIds: [],
      selectedStaffId: null,
      slot: null,
      note: "",
      currentStep: 1,
    }),
}));
