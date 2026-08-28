import { renderHook, waitFor } from "@testing-library/react";
import { useModules } from "@/hooks/useModules";
import { modulesApi } from "@/lib/api/modules";
import { moduleRegistry } from "@/registry/modules";

// ═══════════════════════════════════════════════════════════════
//  Step 6 — useModules fail-open behavior.
//  never hits the network; mocks the api client + auth store and drives
//  the REAL hook with the REAL moduleRegistry + closeDependencies.
// ═══════════════════════════════════════════════════════════════

jest.mock("@/lib/api/modules", () => ({
  modulesApi: { getMyModules: jest.fn() },
}));

jest.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { id: "u1", role: "Business" } }),
}));

const getMyModulesMock = modulesApi.getMyModules as jest.Mock;

describe("useModules — fail open / closed", () => {
  it("on fetch rejection, hasModule is true for every catalog id (fail open)", async () => {
    getMyModulesMock.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useModules());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    for (const m of moduleRegistry) {
      expect(result.current.hasModule(m.id)).toBe(true);
    }
  });

  it("on success with empty entitlements, the set is closed (locked)", async () => {
    getMyModulesMock.mockResolvedValue({
      success: true,
      data: { entitlements: [], permissions: [], plan: null },
    });

    const { result } = renderHook(() => useModules());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    for (const m of moduleRegistry) {
      expect(result.current.hasModule(m.id)).toBe(false);
    }
  });

  it("returned modules array matches the explicit (non-closed) set", async () => {
    getMyModulesMock.mockResolvedValue({
      success: true,
      data: { entitlements: ["customers", "staff"], permissions: ["customers.view"], plan: null },
    });

    const { result } = renderHook(() => useModules());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    expect(result.current.modules).toEqual(["customers", "staff"]);
    expect(result.current.hasModule("customers")).toBe(true);
  });
});