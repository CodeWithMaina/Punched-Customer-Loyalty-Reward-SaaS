import {
  cancelSchema,
  createAppointmentSchema,
  rescheduleSchema,
} from "@/lib/validations/appointments";

const UUID_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const UUID_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const BIZ = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const futureIso = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();
const pastIso = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();

describe("createAppointmentSchema", () => {
  const valid = {
    businessId: BIZ,
    serviceIds: [UUID_A, UUID_B],
    scheduledAt: futureIso(),
  };

  it("accepts a valid payload", () => {
    const result = createAppointmentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects an empty service selection", () => {
    const result = createAppointmentSchema.safeParse({
      ...valid,
      serviceIds: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message);
      expect(issues).toContain("Select at least one service");
    }
  });

  it("rejects a scheduledAt in the past", () => {
    const result = createAppointmentSchema.safeParse({
      ...valid,
      scheduledAt: pastIso(),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message);
      expect(issues.some((m) => m.includes("future"))).toBe(true);
    }
  });

  it("rejects a non-uuid businessId / serviceIds", () => {
    expect(
      createAppointmentSchema.safeParse({ ...valid, businessId: "not-a-uuid" }).success
    ).toBe(false);
    expect(
      createAppointmentSchema.safeParse({ ...valid, serviceIds: ["nope"] }).success
    ).toBe(false);
  });
});

describe("rescheduleSchema", () => {
  it("accepts an optional serviceIds/staffUserId/note", () => {
    const result = rescheduleSchema.safeParse({
      scheduledAt: futureIso(),
      serviceIds: [UUID_A],
      staffUserId: UUID_A,
      note: "later please",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a past scheduledAt", () => {
    const result = rescheduleSchema.safeParse({ scheduledAt: pastIso() });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message).some((m) => m.includes("future"))).toBe(
        true
      );
    }
  });
});

describe("cancelSchema", () => {
  it("accepts an omitted or present note", () => {
    expect(cancelSchema.safeParse({}).success).toBe(true);
    expect(cancelSchema.safeParse({ note: "unwell" }).success).toBe(true);
  });

  it("rejects a note longer than 500 chars", () => {
    const result = cancelSchema.safeParse({ note: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});