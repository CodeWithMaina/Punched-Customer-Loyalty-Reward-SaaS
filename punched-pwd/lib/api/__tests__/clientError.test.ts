import {
  getApiErrorMessage,
  isModuleDisabledError,
  MODULE_DISABLED_MESSAGE,
} from "../client";

// ═══════════════════════════════════════════════════════════════
//  Step 4.2 — MODULE_DISABLED error surfacing helper.
// ═══════════════════════════════════════════════════════════════

describe("isModuleDisabledError / getApiErrorMessage", () => {
  const moduleDisabledError = {
    response: { data: { error: { code: "MODULE_DISABLED", message: "The 'analytics' module is not enabled for this business." } } },
  };

  it("detects MODULE_DISABLED from a 403 envelope", () => {
    expect(isModuleDisabledError(moduleDisabledError)).toBe(true);
    expect(isModuleDisabledError({ response: { data: { error: { code: "FORBIDDEN" } } } })).toBe(false);
    expect(isModuleDisabledError(new Error("boom"))).toBe(false);
  });

  it("surfaces upgrade messaging instead of the raw backend string", () => {
    expect(getApiErrorMessage(moduleDisabledError)).toBe(MODULE_DISABLED_MESSAGE);
  });

  it("falls back to the backend message / Error for ordinary failures", () => {
    expect(
      getApiErrorMessage({ response: { data: { error: { message: "Validation failed" } } } })
    ).toBe("Validation failed");
    expect(getApiErrorMessage(new Error("network"))).toBe("network");
    expect(getApiErrorMessage(undefined)).toBe("Something went wrong.");
  });
});