// ═══════════════════════════════════════════════════════════════
//  Stamping zod schema tests (Phase 3 acceptance)
// ═══════════════════════════════════════════════════════════════

import {
  phoneSchema,
  manualLookupSchema,
  stampAdjustmentSchema,
  stampCountSchema,
  fulfilmentCodeSchema,
} from "@/lib/validations/stamping";

const BIZ = "33333333-3333-3333-3333-333333333333";
const CARD = "44444444-4444-4444-4444-444444444444";

describe("phoneSchema", () => {
  it("accepts valid E.164 numbers", () => {
    expect(phoneSchema.safeParse("+254712345678").success).toBe(true);
    expect(phoneSchema.safeParse("254712345678").success).toBe(true);
  });

  it("rejects empty, too-short and non-numeric values", () => {
    expect(phoneSchema.safeParse("").success).toBe(false);
    expect(phoneSchema.safeParse("123").success).toBe(false);
    expect(phoneSchema.safeParse("not-a-phone").success).toBe(false);
  });
});

describe("manualLookupSchema", () => {
  it("requires a valid phone and business uuid", () => {
    expect(manualLookupSchema.safeParse({ phone: "+254712345678", businessId: BIZ }).success).toBe(true);
    expect(manualLookupSchema.safeParse({ phone: "0712345678", businessId: BIZ }).success).toBe(false);
    expect(manualLookupSchema.safeParse({ phone: "+254712345678", businessId: "nope" }).success).toBe(false);
  });
});

describe("stampAdjustmentSchema", () => {
  it("accepts non-zero deltas with a valid reason", () => {
    expect(
      stampAdjustmentSchema.safeParse({ cardId: CARD, delta: -2, reason: "VoidMistake", note: "wrong tap" }).success
    ).toBe(true);
    expect(
      stampAdjustmentSchema.safeParse({ cardId: CARD, delta: 1, reason: "Goodwill" }).success
    ).toBe(true);
  });

  it("rejects zero delta, bad reasons and over-long notes", () => {
    expect(
      stampAdjustmentSchema.safeParse({ cardId: CARD, delta: 0, reason: "Goodwill" }).success
    ).toBe(false);
    expect(
      stampAdjustmentSchema.safeParse({ cardId: CARD, delta: 1.5, reason: "Goodwill" }).success
    ).toBe(false);
    expect(
      stampAdjustmentSchema.safeParse({ cardId: CARD, delta: 1, reason: "Because" }).success
    ).toBe(false);
    expect(
      stampAdjustmentSchema.safeParse({ cardId: CARD, delta: 1, reason: "Goodwill", note: "x".repeat(501) }).success
    ).toBe(false);
  });
});

describe("stampCountSchema", () => {
  it("accepts 1..10 and rejects 0, negatives, fractions and > 10", () => {
    expect(stampCountSchema.safeParse(1).success).toBe(true);
    expect(stampCountSchema.safeParse(10).success).toBe(true);
    expect(stampCountSchema.safeParse(0).success).toBe(false);
    expect(stampCountSchema.safeParse(-1).success).toBe(false);
    expect(stampCountSchema.safeParse(1.5).success).toBe(false);
    expect(stampCountSchema.safeParse(11).success).toBe(false);
  });
});

describe("fulfilmentCodeSchema", () => {
  it("accepts exactly 6 chars from the unambiguous alphabet", () => {
    expect(fulfilmentCodeSchema.safeParse("ABC234").success).toBe(true);
    expect(fulfilmentCodeSchema.safeParse("WXYZ9A").success).toBe(true);
  });

  it("rejects ambiguous characters (I, O, 0, 1), wrong length and lowercase", () => {
    expect(fulfilmentCodeSchema.safeParse("ABC1O2").success).toBe(false);
    expect(fulfilmentCodeSchema.safeParse("ABCDE").success).toBe(false);
    expect(fulfilmentCodeSchema.safeParse("ABCDEFG").success).toBe(false);
    expect(fulfilmentCodeSchema.safeParse("abc234").success).toBe(false);
  });
});
