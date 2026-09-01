// ═══════════════════════════════════════════════════════════════
//  Offline stamp queue tests (Phase 3 acceptance)
//  Verifies the queued award keeps a STABLE idempotency key across
//  replays, and that replay-friendly helpers behave correctly.
// ═══════════════════════════════════════════════════════════════

import {
  enqueueStamp,
  dequeueStamp,
  getQueuedStamps,
  createIdempotencyKey,
  queuedStampCount,
  isNetworkError,
  beginReplay,
  endReplay,
  isReplayInFlight,
} from "@/lib/api/offlineQueue";

const BIZ = "33333333-3333-3333-3333-333333333333";

function resetQueue() {
  window.localStorage.clear();
}

describe("offline stamp queue", () => {
  beforeEach(() => resetQueue());
  afterEach(() => resetQueue());

  it("generates a stable, unique idempotency key per queued item", () => {
    const a = createIdempotencyKey();
    const b = createIdempotencyKey();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^stamp-/);
  });

  it("enqueues an award and reads it back from localStorage", () => {
    const item = enqueueStamp({ token: "tok", businessId: BIZ, stampCount: 1 });
    expect(item.idempotencyKey).toMatch(/^stamp-/);
    expect(item.queuedAt).toBeTruthy();
    expect(getQueuedStamps()).toHaveLength(1);
    expect(getQueuedStamps()[0].token).toBe("tok");
    expect(queuedStampCount()).toBe(1);
  });

  it("reuses a caller-supplied idempotency key so replays are idempotent", () => {
    const key = "stamp-fixed-key";
    const first = enqueueStamp({ idempotencyKey: key, token: "tok", businessId: BIZ, stampCount: 2 });
    // Simulate a replay enqueue with the SAME key (e.g. a second offline attempt).
    const replay = enqueueStamp({ idempotencyKey: key, token: "tok", businessId: BIZ, stampCount: 2 });
    expect(replay.idempotencyKey).toBe(first.idempotencyKey);
    expect(first.idempotencyKey).toBe(key);
  });

  it("dequeues exactly the replayed item after success", () => {
    enqueueStamp({ idempotencyKey: "k1", token: "a", businessId: BIZ, stampCount: 1 });
    enqueueStamp({ idempotencyKey: "k2", token: "b", businessId: BIZ, stampCount: 1 });

    const remaining = dequeueStamp("k1");
    expect(remaining.map((q) => q.idempotencyKey)).toEqual(["k2"]);
    expect(queuedStampCount()).toBe(1);
  });

  it("classifies network failures for the queueing decision", () => {
    expect(isNetworkError(new Error("Network Error"))).toBe(true);
    expect(isNetworkError({ code: "ERR_NETWORK" })).toBe(true);
    expect(isNetworkError({ code: "ECONNABORTED" })).toBe(true);
    expect(isNetworkError({ response: { status: 502 } })).toBe(true);
    // Business errors must NOT be treated as offline.
    expect(isNetworkError({ response: { status: 400 } })).toBe(false);
    expect(isNetworkError(new Error("Request failed"))).toBe(false);
  });
});


describe("in-flight replay guard (Phase 4)", () => {
  it("claims exclusive replay rights per idempotency key", () => {
    const key = "stamp-guard-test-1";
    expect(isReplayInFlight(key)).toBe(false);
    expect(beginReplay(key)).toBe(true);
    expect(isReplayInFlight(key)).toBe(true);
    // Second concurrent replay loop (e.g. two tabs / online event) is blocked.
    expect(beginReplay(key)).toBe(false);
    endReplay(key);
    expect(isReplayInFlight(key)).toBe(false);
    // Key can be claimed again after release.
    expect(beginReplay(key)).toBe(true);
    endReplay(key);
  });

  it("tracks different keys independently", () => {
    const a = "stamp-guard-a";
    const b = "stamp-guard-b";
    expect(beginReplay(a)).toBe(true);
    expect(beginReplay(b)).toBe(true);
    expect(isReplayInFlight(a)).toBe(true);
    expect(isReplayInFlight(b)).toBe(true);
    endReplay(a);
    expect(isReplayInFlight(a)).toBe(false);
    expect(isReplayInFlight(b)).toBe(true);
    endReplay(b);
  });
});
