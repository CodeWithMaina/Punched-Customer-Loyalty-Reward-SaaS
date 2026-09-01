// ═══════════════════════════════════════════════════════════════
//  Guided scan console state machine (Phase 3)
//  Pure, framework-free reducer so the ScanConsole flow is unit-testable:
//  idle → scanning → resolving → confirm → awarding → success | error
//  with guided recovery for every error branch (no dead ends).
// ═══════════════════════════════════════════════════════════════

export type ScanErrorCode =
  | "NOT_ENROLLED"
  | "TOKEN_EXPIRED"
  | "TOKEN_USED"
  | "INVALID_TOKEN"
  | "STAMP_LIMIT_EXCEEDED"
  | "IDEMPOTENCY_CONFLICT"
  | "NETWORK"
  | "UNKNOWN";

export interface ScanPreview {
  customerId: string;
  customerName: string;
  cardId: string;
  totalStamps: number;
  stampsRequired: number;
  stampsRemaining: number;
  rewardReady: boolean;
  programName: string;
  rewardValue: number;
  maxStampsPerVisit: number;
}

export interface ScanSuccessResult {
  cardId: string;
  customerId: string;
  customerName: string;
  stampNumber: number;
  totalStamps: number;
  stampsRequired: number;
  rewardReady: boolean;
  rewardDescription?: string;
  stampedAt: string;
}

export type ScanState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "resolving"; token: string }
  | { phase: "confirm"; token: string; preview: ScanPreview }
  /** NOT_ENROLLED recovery: enroll & give the first stamp inline. */
  | { phase: "enroll-confirm"; token: string; customerName: string }
  | { phase: "awarding"; token: string; preview: ScanPreview | null; idempotencyKey: string }
  | { phase: "success"; result: ScanSuccessResult }
  | {
      phase: "error";
      token: string;
      code: ScanErrorCode;
      message: string;
      /** Seconds before auto-return to scanning (TOKEN_EXPIRED / TOKEN_USED). */
      countdown?: number;
      /** Set when the award was queued offline — replay keeps the same key. */
      queuedIdempotencyKey?: string;
    }
  /** Award failed offline and is queued — visible banner, replayed on reconnect. */
  | { phase: "queued"; idempotencyKey: string; hint?: string };

export type ScanEvent =
  | { type: "START_SCAN" }
  | { type: "TOKEN_SCANNED"; token: string }
  | { type: "RESOLVED"; preview: ScanPreview }
  | { type: "RESOLVE_FAILED"; code: ScanErrorCode; message: string }
  | { type: "CONFIRM_AWARD"; idempotencyKey: string; preview?: ScanPreview }
  | { type: "CONFIRM_ENROLL"; idempotencyKey: string }
  | { type: "AWARD_SUCCEEDED"; result: ScanSuccessResult }
  | { type: "AWARD_FAILED"; code: ScanErrorCode; message: string; queuedIdempotencyKey?: string }
  | { type: "COUNTDOWN_TICK"; remaining: number }
  | { type: "CANCEL" }
  | { type: "RESET" };

/** Seconds before the expired/used-code error auto-returns to scanning. */
export const ERROR_COUNTDOWN_SECONDS = 5;

export function initialScanState(): ScanState {
  return { phase: "idle" };
}

/** Human-facing guidance for an error state — every branch has a next action. */
export function errorGuidance(state: Extract<ScanState, { phase: "error" }>): {
  headline: string;
  body: string;
  ctaLabel: string;
  autoReturn: boolean;
} {
  switch (state.code) {
    case "TOKEN_EXPIRED":
    case "TOKEN_USED":
      return {
        headline: state.code === "TOKEN_EXPIRED" ? "Code expired" : "Code already used",
        body: "Ask the customer to refresh their QR code, then scan again.",
        ctaLabel: "Scan again",
        autoReturn: true,
      };
    case "INVALID_TOKEN":
      return {
        headline: "Code not recognised",
        body: "That code wasn't recognised — try scanning again.",
        ctaLabel: "Scan again",
        autoReturn: false,
      };
    case "STAMP_LIMIT_EXCEEDED":
      return {
        headline: "Stamp limit reached",
        body: "This visit already hit the maximum stamps allowed per visit.",
        ctaLabel: "Scan again",
        autoReturn: false,
      };
    case "IDEMPOTENCY_CONFLICT":
      return {
        headline: "Already processed",
        body: "This stamp was already awarded with a different request. Scan the customer's fresh code.",
        ctaLabel: "Scan again",
        autoReturn: false,
      };
    case "NETWORK":
      return {
        headline: "You're offline",
        body: "The stamp was queued — it will sync automatically when you're back online.",
        ctaLabel: "Scan again",
        autoReturn: false,
      };
    default:
      return {
        headline: "Something went wrong",
        body: state.message || "Try scanning again.",
        ctaLabel: "Scan again",
        autoReturn: false,
      };
  }
}

export function scanConsoleReducer(state: ScanState, event: ScanEvent): ScanState {
  switch (event.type) {
    case "START_SCAN":
      return { phase: "scanning" };

    case "TOKEN_SCANNED":
      return { phase: "resolving", token: event.token };

    case "RESOLVED":
      if (state.phase !== "resolving") return state;
      return { phase: "confirm", token: state.token, preview: event.preview };

    case "RESOLVE_FAILED":
      if (state.phase !== "resolving") return state;
      if (event.code === "NOT_ENROLLED") {
        return { phase: "enroll-confirm", token: state.token, customerName: event.message };
      }
      return {
        phase: "error",
        token: state.token,
        code: event.code,
        message: event.message,
        countdown:
          event.code === "TOKEN_EXPIRED" || event.code === "TOKEN_USED"
            ? ERROR_COUNTDOWN_SECONDS
            : undefined,
      };

    case "CONFIRM_AWARD":
      if (state.phase !== "confirm") return state;
      return {
        phase: "awarding",
        token: state.token,
        preview: event.preview ?? state.preview,
        idempotencyKey: event.idempotencyKey,
      };

    case "CONFIRM_ENROLL":
      if (state.phase !== "enroll-confirm") return state;
      return {
        phase: "awarding",
        token: state.token,
        preview: null,
        idempotencyKey: event.idempotencyKey,
      };

    case "AWARD_SUCCEEDED":
      if (state.phase !== "awarding") return state;
      return { phase: "success", result: event.result };

    case "AWARD_FAILED":
      if (state.phase !== "awarding") return state;
      if (event.code === "NETWORK" && event.queuedIdempotencyKey) {
        return { phase: "queued", idempotencyKey: event.queuedIdempotencyKey };
      }
      return {
        phase: "error",
        token: state.token,
        code: event.code,
        message: event.message,
        countdown:
          event.code === "TOKEN_EXPIRED" || event.code === "TOKEN_USED"
            ? ERROR_COUNTDOWN_SECONDS
            : undefined,
      };

    case "COUNTDOWN_TICK":
      if (state.phase !== "error" || state.countdown === undefined) return state;
      return state.countdown <= 1
        ? { phase: "scanning" }
        : { ...state, countdown: state.countdown - 1 };

    case "CANCEL":
    case "RESET":
      return { phase: state.phase === "idle" ? "idle" : "scanning" };

    default:
      return state;
  }
}

/** Maps an API error envelope to a ScanErrorCode. */
export function mapErrorToScanCode(code: string | undefined, network: boolean): ScanErrorCode {
  if (network) return "NETWORK";
  switch (code) {
    case "NOT_ENROLLED":
      return "NOT_ENROLLED";
    case "TOKEN_EXPIRED":
      return "TOKEN_EXPIRED";
    case "TOKEN_USED":
      return "TOKEN_USED";
    case "INVALID_TOKEN":
      return "INVALID_TOKEN";
    case "STAMP_LIMIT_EXCEEDED":
      return "STAMP_LIMIT_EXCEEDED";
    case "IDEMPOTENCY_CONFLICT":
      return "IDEMPOTENCY_CONFLICT";
    default:
      return "UNKNOWN";
  }
}
