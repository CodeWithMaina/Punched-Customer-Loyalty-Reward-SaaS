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
  reset: () => void;
}

export type BookingStore = BookingState & BookingActions;

export const useBookingStore = create<BookingStore>()((set) => ({
  businessId: null,
  serviceIds: [],
  selectedStaffId: null,
  slot: null,
  note: "",

  setBusiness: (id) => set({ businessId: id }),
  setServices: (ids) => set({ serviceIds: ids }),
  toggleService: (id) =>
    set((s) => ({
      serviceIds: s.serviceIds.includes(id)
        ? s.serviceIds.filter((x) => x !== id)
        : [...s.serviceIds, id],
    })),
  clearServices: () => set({ serviceIds: [] }),
  setStaff: (id) => set({ selectedStaffId: id }),
  setSlot: (slot) => set({ slot }),
  removeSlot: () => set({ slot: null }),
  setNote: (note) => set({ note: note.slice(0, 500) }),
  reset: () =>
    set({
      businessId: null,
      serviceIds: [],
      selectedStaffId: null,
      slot: null,
      note: "",
    }),
}));
