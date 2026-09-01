// ═══════════════════════════════════════════════════════════════
//  ScanConsole state machine tests (Phase 3 acceptance)
//  Covers: resolve→confirm, every error branch, countdown
//  auto-return, queued offline phase and reset semantics.
// ═══════════════════════════════════════════════════════════════

import {
  scanConsoleReducer,
  initialScanState,
  errorGuidance,
  mapErrorToScanCode,
  ERROR_COUNTDOWN_SECONDS,
  type ScanPreview,
  type ScanSuccessResult,
} from "@/lib/scanConsoleMachine";

const preview: ScanPreview = {
  customerId: "11111111-1111-1111-1111-111111111111",
  customerName: "Jane Doe",
  cardId: "22222222-2222-2222-2222-222222222222",
  totalStamps: 7,
  stampsRequired: 10,
  stampsRemaining: 3,
  rewardReady: false,
  programName: "Coffee Club",
  rewardValue: 50,
  maxStampsPerVisit: 1,
};

const success: ScanSuccessResult = {
  cardId: preview.cardId,
  customerId: preview.customerId,
  customerName: preview.customerName,
  stampNumber: 8,
  totalStamps: 8,
  stampsRequired: 10,
  rewardReady: false,
  stampedAt: "2026-08-30T12:00:00.000Z",
};

const TOKEN = "tok_abc123";
const KEY = "stamp-key-1";

/** Walk idle → scanning → resolving → confirm. */
function toConfirm() {
  return scanConsoleReducer(
    scanConsoleReducer(scanConsoleReducer(initialScanState(), { type: "START_SCAN" }), {
      type: "TOKEN_SCANNED",
      token: TOKEN,
    }),
    { type: "RESOLVED", preview }
  );
}

/** Walk confirm → awarding. */
function toAwarding() {
  return scanConsoleReducer(toConfirm(), { type: "CONFIRM_AWARD", idempotencyKey: KEY });
}

describe("ScanConsole state machine — happy path", () => {
  it("starts idle and transitions through scanning and resolving to confirm", () => {
    expect(initialScanState().phase).toBe("idle");

    const scanning = scanConsoleReducer(initialScanState(), { type: "START_SCAN" });
    expect(scanning.phase).toBe("scanning");

    const resolving = scanConsoleReducer(scanning, { type: "TOKEN_SCANNED", token: TOKEN });
    expect(resolving).toEqual({ phase: "resolving", token: TOKEN });

    const confirm = scanConsoleReducer(resolving, { type: "RESOLVED", preview });
    expect(confirm.phase).toBe("confirm");
    if (confirm.phase === "confirm") {
      expect(confirm.preview).toEqual(preview);
      expect(confirm.token).toBe(TOKEN);
    }
  });

  it("moves confirm → awarding → success", () => {
    const awarding = toAwarding();
    expect(awarding.phase).toBe("awarding");
    if (awarding.phase === "awarding") expect(awarding.idempotencyKey).toBe(KEY);

    const succeeded = scanConsoleReducer(awarding, { type: "AWARD_SUCCEEDED", result: success });
    expect(succeeded.phase).toBe("success");
    if (succeeded.phase === "success") expect(succeeded.result).toEqual(success);
  });

  it("ignores RESOLVED when not resolving", () => {
    const state = scanConsoleReducer(initialScanState(), { type: "RESOLVED", preview });
    expect(state.phase).toBe("idle");
  });
});

describe("ScanConsole state machine — NOT_ENROLLED recovery", () => {
  it("routes NOT_ENROLLED to the enroll-confirm phase instead of a dead end", () => {
    const resolving = scanConsoleReducer(
      scanConsoleReducer(initialScanState(), { type: "START_SCAN" }),
      { type: "TOKEN_SCANNED", token: TOKEN }
    );
    const state = scanConsoleReducer(resolving, {
      type: "RESOLVE_FAILED",
      code: "NOT_ENROLLED",
      message: "Jane Doe",
    });
    expect(state.phase).toBe("enroll-confirm");
    if (state.phase === "enroll-confirm") {
      expect(state.token).toBe(TOKEN);
      expect(state.customerName).toBe("Jane Doe");
    }
  });

  it("enroll-confirm → awarding on CONFIRM_ENROLL", () => {
    const resolving = scanConsoleReducer(
      scanConsoleReducer(initialScanState(), { type: "START_SCAN" }),
      { type: "TOKEN_SCANNED", token: TOKEN }
    );
    const enroll = scanConsoleReducer(resolving, {
      type: "RESOLVE_FAILED",
      code: "NOT_ENROLLED",
      message: "Jane Doe",
    });
    const awarding = scanConsoleReducer(enroll, { type: "CONFIRM_ENROLL", idempotencyKey: KEY });
    expect(awarding.phase).toBe("awarding");
  });
});

describe("ScanConsole state machine — every error branch", () => {
  const cases: Array<{
    code: string;
    autoReturn: boolean;
    headlineIncludes: string;
  }> = [
    { code: "TOKEN_EXPIRED", autoReturn: true, headlineIncludes: "expired" },
    { code: "TOKEN_USED", autoReturn: true, headlineIncludes: "used" },
    { code: "INVALID_TOKEN", autoReturn: false, headlineIncludes: "recognised" },
    { code: "STAMP_LIMIT_EXCEEDED", autoReturn: false, headlineIncludes: "stamp" },
    { code: "IDEMPOTENCY_CONFLICT", autoReturn: false, headlineIncludes: "already" },
    { code: "NETWORK", autoReturn: false, headlineIncludes: "offline" },
    { code: "UNKNOWN", autoReturn: false, headlineIncludes: "wrong" },
  ];

  it.each(cases.map((c) => [c.code, c.autoReturn, c.headlineIncludes] as const))(
    "%s produces guided, non-dead-end error state",
    (code, autoReturn, headlineIncludes) => {
      const resolving = scanConsoleReducer(
        scanConsoleReducer(initialScanState(), { type: "START_SCAN" }),
        { type: "TOKEN_SCANNED", token: TOKEN }
      );
      const state = scanConsoleReducer(resolving, {
        type: "RESOLVE_FAILED",
        code: code as never,
        message: "details",
      });
      expect(state.phase).toBe("error");
      if (state.phase !== "error") return;

      const guidance = errorGuidance(state);
      // Every error branch must show a visible next action.
      expect(guidance.ctaLabel.length).toBeGreaterThan(0);
      expect(guidance.body.length).toBeGreaterThan(0);
      expect(guidance.autoReturn).toBe(autoReturn);
      expect(guidance.headline.toLowerCase()).toContain(headlineIncludes);

      if (autoReturn) {
        expect(state.countdown).toBe(ERROR_COUNTDOWN_SECONDS);
      } else {
        expect(state.countdown).toBeUndefined();
      }
    }
  );

  it("auto-returns to scanning when the countdown reaches zero", () => {
    const resolving = scanConsoleReducer(
      scanConsoleReducer(initialScanState(), { type: "START_SCAN" }),
      { type: "TOKEN_SCANNED", token: TOKEN }
    );
    let state = scanConsoleReducer(resolving, {
      type: "RESOLVE_FAILED",
      code: "TOKEN_EXPIRED",
      message: "expired",
    });
    expect(state.phase).toBe("error");

    for (let i = 0; i < ERROR_COUNTDOWN_SECONDS - 1; i++) {
      state = scanConsoleReducer(state, { type: "COUNTDOWN_TICK", remaining: ERROR_COUNTDOWN_SECONDS - i - 1 });
      if (state.phase === "error") expect(state.countdown).toBe(ERROR_COUNTDOWN_SECONDS - i - 1);
    }
    const final = scanConsoleReducer(state, { type: "COUNTDOWN_TICK", remaining: 0 });
    expect(final.phase).toBe("scanning");
  });
});

describe("ScanConsole state machine — offline queue phase", () => {
  it("network failure with a queued key lands in the queued phase", () => {
    const state = scanConsoleReducer(toAwarding(), {
      type: "AWARD_FAILED",
      code: "NETWORK",
      message: "Offline — stamp queued.",
      queuedIdempotencyKey: KEY,
    });
    expect(state.phase).toBe("queued");
    if (state.phase === "queued") expect(state.idempotencyKey).toBe(KEY);
  });

  it("network failure without a queued key falls back to a guided error", () => {
    const state = scanConsoleReducer(toAwarding(), {
      type: "AWARD_FAILED",
      code: "NETWORK",
      message: "Offline",
    });
    expect(state.phase).toBe("error");
    if (state.phase === "error") expect(errorGuidance(state).ctaLabel.length).toBeGreaterThan(0);
  });
});

describe("ScanConsole state machine — cancel / reset", () => {
  it("RESET returns to scanning from confirm", () => {
    const state = scanConsoleReducer(toConfirm(), { type: "RESET" });
    expect(state.phase).toBe("scanning");
  });

  it("CANCEL returns to scanning from success", () => {
    const state = scanConsoleReducer(
      scanConsoleReducer(toAwarding(), { type: "AWARD_SUCCEEDED", result: success }),
      { type: "CANCEL" }
    );
    expect(state.phase).toBe("scanning");
  });
});

describe("mapErrorToScanCode", () => {
  it("maps network errors to NETWORK regardless of code", () => {
    expect(mapErrorToScanCode("INVALID_TOKEN", true)).toBe("NETWORK");
  });

  it("maps known codes verbatim and unknown codes to UNKNOWN", () => {
    expect(mapErrorToScanCode("NOT_ENROLLED", false)).toBe("NOT_ENROLLED");
    expect(mapErrorToScanCode("TOKEN_EXPIRED", false)).toBe("TOKEN_EXPIRED");
    expect(mapErrorToScanCode("TOKEN_USED", false)).toBe("TOKEN_USED");
    expect(mapErrorToScanCode("INVALID_TOKEN", false)).toBe("INVALID_TOKEN");
    expect(mapErrorToScanCode("STAMP_LIMIT_EXCEEDED", false)).toBe("STAMP_LIMIT_EXCEEDED");
    expect(mapErrorToScanCode("IDEMPOTENCY_CONFLICT", false)).toBe("IDEMPOTENCY_CONFLICT");
    expect(mapErrorToScanCode("SOMETHING_ELSE", false)).toBe("UNKNOWN");
  });
});
