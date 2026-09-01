// ═══════════════════════════════════════════════════════════════
//  Offline stamp queue (Phase 3)
//  When an award fails from a network error the scan console queues the
//  request in localStorage with a STABLE idempotency key, then replays it
//  (same key) once the connection returns — the backend's idempotency
//  store guarantees no duplicate stamps on replay.
// ═══════════════════════════════════════════════════════════════

import type { StampAwardedResponse } from "@/types";

export interface QueuedStamp {
  /** Stable per-queued-item idempotency key — reused across replays. */
  idempotencyKey: string;
  token: string;
  businessId: string;
  stampCount: number;
  queuedAt: string;
  /** Optional label for the confirmation banner. */
  customerHint?: string;
}

const QUEUE_KEY = "punched_offline_stamp_queue";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getQueuedStamps(): QueuedStamp[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedStamp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedStamp[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Storage full / private mode — queueing is best-effort.
  }
}

/** Generates a stable idempotency key for a queued award. */
export function createIdempotencyKey(): string {
  if (isBrowser() && typeof window.crypto?.randomUUID === "function") {
    return `stamp-${window.crypto.randomUUID()}`;
  }
  return `stamp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function enqueueStamp(item: Omit<QueuedStamp, "idempotencyKey" | "queuedAt"> & { idempotencyKey?: string }): QueuedStamp {
  const full: QueuedStamp = {
    ...item,
    idempotencyKey: item.idempotencyKey ?? createIdempotencyKey(),
    queuedAt: new Date().toISOString(),
  };
  writeQueue([...getQueuedStamps(), full]);
  return full;
}

export function dequeueStamp(idempotencyKey: string): QueuedStamp[] {
  const remaining = getQueuedStamps().filter((q) => q.idempotencyKey !== idempotencyKey);
  writeQueue(remaining);
  return remaining;
}

export function queuedStampCount(): number {
  return getQueuedStamps().length;
}

/** True when the error looks like a network failure (offline / timeout / 5xx). */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const err = error as { code?: string; response?: { status?: number }; message?: string };
  if (err?.code === "ECONNABORTED" || err?.code === "ERR_NETWORK") return true;
  const status = err?.response?.status;
  if (status !== undefined && status >= 500) return true;
  const msg = err?.message ?? "";
  return /network|timeout|failed to fetch/i.test(msg);
}

// ═══════════════════════════════════════════════════════════════
//  In-flight replay guard (Phase 4)
//  Module-level (per-tab) set of idempotency keys currently being
//  replayed. Prevents a second concurrent replay loop — e.g. two
//  tabs mounted at once, or the online event firing while a mount
//  replay is still running — from re-sending the same item.
//  Cross-tab double replay is additionally safe-by-construction:
//  the backend idempotency store dedupes by key.
// ═══════════════════════════════════════════════════════════════

const inFlightReplays = new Set<string>();

/** Attempts to claim exclusive replay rights for a key. False if already in flight. */
export function beginReplay(idempotencyKey: string): boolean {
  if (inFlightReplays.has(idempotencyKey)) return false;
  inFlightReplays.add(idempotencyKey);
  return true;
}

/** Releases the in-flight claim for a key once its replay attempt finished. */
export function endReplay(idempotencyKey: string): void {
  inFlightReplays.delete(idempotencyKey);
}

/** True when a replay for the key is currently in progress in this tab. */
export function isReplayInFlight(idempotencyKey: string): boolean {
  return inFlightReplays.has(idempotencyKey);
}

export type { StampAwardedResponse };