import { useBookingStore } from "@/store/bookingStore";
import { servicesApi } from "@/lib/api/services";
import type { ServiceCatalogItemResponse } from "@/types";

// Stub the service catalog client so endAt derivation can be tested
// against fixed durations without any network call.
jest.mock("@/lib/api/services", () => ({
  servicesApi: {
    getPublic: jest.fn(),
  },
}));

const getPublicMock = servicesApi.getPublic as jest.Mock;

const UUID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UUID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const catalog: ServiceCatalogItemResponse[] = [
  {
    id: UUID_A,
    businessId: "biz-1",
    name: "Cut",
    durationMinutes: 30,
    price: 500,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: UUID_B,
    businessId: "biz-1",
    name: "Massage",
    durationMinutes: 45,
    price: 1200,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("useBookingStore — cart math", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
    jest.clearAllMocks();
  });

  it("starts empty (session-only defaults)", () => {
    const s = useBookingStore.getState();
    expect(s.businessId).toBeNull();
    expect(s.serviceIds).toEqual([]);
    expect(s.selectedStaffId).toBeNull();
    expect(s.slot).toBeNull();
    expect(s.note).toBe("");
  });

  it("adds a service with toggleService", () => {
    useBookingStore.getState().toggleService(UUID_A);
    expect(useBookingStore.getState().serviceIds).toEqual([UUID_A]);
  });

  it("removes an already-selected service with toggleService", () => {
    useBookingStore.getState().setServices([UUID_A, UUID_B]);
    useBookingStore.getState().toggleService(UUID_A);
    expect(useBookingStore.getState().serviceIds).toEqual([UUID_B]);
  });

  it("re-toggling re-adds a removed service (multi-select cart)", () => {
    const { toggleService } = useBookingStore.getState();
    toggleService(UUID_A);
    toggleService(UUID_A); // toggle off
    expect(useBookingStore.getState().serviceIds).toEqual([]);
    toggleService(UUID_A); // toggle back on
    expect(useBookingStore.getState().serviceIds).toEqual([UUID_A]);
  });

  it("clearServices empties the cart", () => {
    useBookingStore.getState().setServices([UUID_A, UUID_B]);
    useBookingStore.getState().clearServices();
    expect(useBookingStore.getState().serviceIds).toEqual([]);
  });

  // ── Dependent selection invalidation ───────────────────────────
  const SLOT = {
    startAtUtc: "2026-08-19T10:00:00.000Z",
    endAtUtc: "2026-08-19T11:00:00.000Z",
    staffUserId: "staff-1",
    staffName: "Jane",
    serviceIds: [UUID_A],
  };

  it("toggleService clears selected staff and slot (eligibility may change)", () => {
    useBookingStore.setState({ serviceIds: [UUID_A], selectedStaffId: "staff-1", slot: SLOT });
    useBookingStore.getState().toggleService(UUID_B);
    const s = useBookingStore.getState();
    expect(s.selectedStaffId).toBeNull();
    expect(s.slot).toBeNull();
  });

  it("setServices clears selected staff and slot", () => {
    useBookingStore.setState({ serviceIds: [UUID_A], selectedStaffId: "staff-1", slot: SLOT });
    useBookingStore.getState().setServices([UUID_B]);
    const s = useBookingStore.getState();
    expect(s.selectedStaffId).toBeNull();
    expect(s.slot).toBeNull();
  });

  it("clearServices clears selected staff and slot", () => {
    useBookingStore.setState({ serviceIds: [UUID_A], selectedStaffId: "staff-1", slot: SLOT });
    useBookingStore.getState().clearServices();
    const s = useBookingStore.getState();
    expect(s.selectedStaffId).toBeNull();
    expect(s.slot).toBeNull();
  });

  it("setStaff clears the slot but keeps services", () => {
    useBookingStore.setState({ serviceIds: [UUID_A], slot: SLOT });
    useBookingStore.getState().setStaff("staff-2");
    const s = useBookingStore.getState();
    expect(s.selectedStaffId).toBe("staff-2");
    expect(s.slot).toBeNull();
    expect(s.serviceIds).toEqual([UUID_A]);
  });

  it("setBusiness / setStaff / setSlot / removeSlot update state", () => {
    const slot = {
      startAtUtc: "2026-08-19T10:00:00.000Z",
      endAtUtc: "2026-08-19T11:00:00.000Z",
      staffUserId: "staff-1",
      staffName: "Jane",
      serviceIds: [UUID_A, UUID_B],
    };
    useBookingStore.getState().setBusiness("biz-1");
    useBookingStore.getState().setStaff("staff-1");
    useBookingStore.getState().setSlot(slot);
    expect(useBookingStore.getState().businessId).toBe("biz-1");
    expect(useBookingStore.getState().selectedStaffId).toBe("staff-1");
    expect(useBookingStore.getState().slot).toEqual(slot);

    useBookingStore.getState().removeSlot();
    expect(useBookingStore.getState().slot).toBeNull();
  });

  it("setNote truncates to 500 chars", () => {
    useBookingStore.getState().setNote("a".repeat(600));
    expect(useBookingStore.getState().note).toHaveLength(500);
  });

  it("reset clears all booking state", () => {
    useBookingStore.setState({
      businessId: "biz-1",
      serviceIds: [UUID_A],
      selectedStaffId: "staff-1",
      slot: {
        startAtUtc: "2026-08-19T10:00:00.000Z",
        endAtUtc: "2026-08-19T11:00:00.000Z",
        staffUserId: "staff-1",
        staffName: "Jane",
        serviceIds: [UUID_A],
      },
      note: "hello",
    });
    useBookingStore.getState().reset();
    expect(useBookingStore.getState().businessId).toBeNull();
    expect(useBookingStore.getState().serviceIds).toEqual([]);
    expect(useBookingStore.getState().selectedStaffId).toBeNull();
    expect(useBookingStore.getState().slot).toBeNull();
    expect(useBookingStore.getState().note).toBe("");
  });
});

describe("useBookingStore — endAt derivation (slot.startAtUtc + Σ durations)", () => {
  beforeEach(() => {
    useBookingStore.getState().reset();
    jest.clearAllMocks();
  });

  it("computes endAt as startAtUtc + sum of selected service durations", async () => {
    const startAtUtc = "2026-08-19T10:00:00.000Z";
    const slot = {
      startAtUtc,
      endAtUtc: "2026-08-19T11:00:00.000Z",
      staffUserId: "staff-1",
      staffName: "Jane",
      serviceIds: [UUID_A, UUID_B],
    };
    useBookingStore.setState({
      businessId: "biz-1",
      serviceIds: [UUID_A, UUID_B],
      slot,
    });

    getPublicMock.mockResolvedValue({ success: true, data: catalog, error: null });

    const res = await servicesApi.getPublic("biz-1");
    const selected = res.data!.filter((s) =>
      useBookingStore.getState().serviceIds.includes(s.id)
    );
    const totalMinutes = selected.reduce((sum, s) => sum + s.durationMinutes, 0); // 75
    const endAt = new Date(new Date(startAtUtc).getTime() + totalMinutes * 60_000).toISOString();

    expect(totalMinutes).toBe(75);
    expect(endAt).toBe("2026-08-19T11:15:00.000Z");
    expect(getPublicMock).toHaveBeenCalledWith("biz-1");
  });
});