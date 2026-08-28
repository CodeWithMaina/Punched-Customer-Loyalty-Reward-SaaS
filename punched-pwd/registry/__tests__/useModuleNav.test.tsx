import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useModuleNav } from "@/hooks/useModuleNav";
import { useModules } from "@/hooks/useModules";
import { RequireModule } from "@/components/modules/RequireModule";
import { UpgradeBadge } from "@/components/modules/UpgradePrompt";
import { shellProfiles } from "@/registry/shells";
import { moduleRegistry, closeDependencies } from "@/registry/modules";
import type { ShellScope } from "@/registry/types";

// ═══════════════════════════════════════════════════════════════
//  Step 6 nav + guard tests.
//  useModules is mocked (never hits the network); the REAL
//  shellProfiles + moduleRegistry/closeDependencies drive genuine
//  nav + closure semantics.
// ═══════════════════════════════════════════════════════════════

jest.mock("@/hooks/useModules");

const useModulesMock = useModules as jest.MockedFunction<typeof useModules>;

function mockModules(overrides: {
  hasModule?: (id: string) => boolean;
  hasPermission?: (code: string) => boolean;
  isLoaded?: boolean;
}) {
  useModulesMock.mockReturnValue({
    hasModule: overrides.hasModule ?? (() => true),
    hasPermission: overrides.hasPermission ?? (() => true),
    isLoaded: overrides.isLoaded ?? true,
  } as unknown as ReturnType<typeof useModules>);
}

/** hasModule predicate over an explicit entitled set (real closure semantics). */
function entitledSet(keys: string[]): (id: string) => boolean {
  const closed = closeDependencies(keys);
  return (id) => closed.has(id);
}

function hrefsOf(scope: ShellScope, entitlements: string[]): string[] {
  mockModules({ hasModule: entitledSet(entitlements) });
  const { result } = renderHook(() => useModuleNav(scope));
  return result.current.map((item) => item.href);
}

describe("useModuleNav — role × plan generation", () => {
  it("full (pro/enterprise) Business nav includes analytics + customers", () => {
    const allIds = moduleRegistry.map((m) => m.id);
    const hrefs = hrefsOf("Business", allIds);

    expect(hrefs).toContain("/dashboard/business/analytics");
    expect(hrefs).toContain("/dashboard/business/customers");
    expect(hrefs).toContain("/dashboard/business/staff");
    expect(hrefs).toContain("/dashboard/business/appointments");
  });

  it("starter Business nav hides analytics but keeps customers/staff", () => {
    const hrefs = hrefsOf("Business", ["customers", "staff", "settings"]);

    expect(hrefs).not.toContain("/dashboard/business/analytics");
    expect(hrefs).toContain("/dashboard/business/customers");
    expect(hrefs).toContain("/dashboard/business/staff");
  });

  it("expired Business nav collapses to core routes only", () => {
    const hrefs = hrefsOf("Business", []);

    expect(hrefs).toEqual(["/dashboard/business"]);
  });

  it("Admin nav is the static core set (not entitlement-gated)", () => {
    const hrefs = hrefsOf("Admin", []);

    const core = shellProfiles.Admin.coreRoutes.map((i) => i.href).sort();
    expect(hrefs.sort()).toEqual(core);
  });

  it("Customer nav includes customer-facing modules only", () => {
    const hrefs = hrefsOf("Customer", ["appointments", "rewards"]);

    expect(hrefs).toContain("/dashboard/appointments");
    expect(hrefs).not.toContain("/dashboard/business/analytics");
  });
});

describe("<RequireModule>", () => {
  it("renders children when entitled", () => {
    mockModules({ hasModule: (id) => id !== "analytics", isLoaded: true });
    render(
      <RequireModule module="customers">
        <p>Visible customers</p>
      </RequireModule>
    );
    expect(screen.getByText("Visible customers")).toBeInTheDocument();
  });

  it("renders UpgradePrompt when not entitled", () => {
    mockModules({ hasModule: (id) => id !== "analytics", isLoaded: true });
    render(
      <RequireModule module="analytics">
        <p>Hidden analytics</p>
      </RequireModule>
    );
    expect(screen.getByText(/Analytics is not part of your current plan/i)).toBeInTheDocument();
    expect(screen.queryByText("Hidden analytics")).not.toBeInTheDocument();
  });

  it("renders nothing (neutral) while isLoaded === false", () => {
    mockModules({ hasModule: () => false, isLoaded: false });
    const { container } = render(
      <RequireModule module="analytics">
        <p>Neutral</p>
      </RequireModule>
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe("widget gating", () => {
  // Representative widget mirroring the hasModule('analytics') pattern used in
  // app/dashboard/business/page.tsx (locked → UpgradeBadge, entitled → content).
  function BusinessWidget({ entitled }: { entitled: boolean }) {
    mockModules({ hasModule: () => entitled, isLoaded: true });
    const { hasModule } = useModules();
    if (!hasModule("analytics")) return <UpgradeBadge module="analytics" compact />;
    return <div>Analytics chart</div>;
  }

  it("renders the upgrade variant when unentitled", () => {
    render(<BusinessWidget entitled={false} />);
    expect(screen.getByText(/Analytics locked/i)).toBeInTheDocument();
    expect(screen.queryByText("Analytics chart")).not.toBeInTheDocument();
  });

  it("renders content when entitled", () => {
    render(<BusinessWidget entitled />);
    expect(screen.getByText("Analytics chart")).toBeInTheDocument();
  });
});