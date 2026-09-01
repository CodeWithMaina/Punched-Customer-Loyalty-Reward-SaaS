// ═══════════════════════════════════════════════════════════════
//  Offline replay hook (Phase 3)
//  On mount and whenever the browser regains connectivity, replay
//  every queued offline stamp award using its *stable* idempotency
//  key — the backend's idempotency store guarantees no duplicates.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from "react";
import {
  beginReplay,
  dequeueStamp,
  endReplay,
  getQueuedStamps,
  isNetworkError,
} from "@/lib/api/offlineQueue";
import { stampsApi } from "@/lib/api/stamps";

export function useOfflineReplay(businessId: string) {
  const replay = async () => {
    const queue = getQueuedStamps();
    for (const item of queue) {
      // In-flight guard (Phase 4): skip keys already being replayed so
      // concurrent replay loops (mount + online event) never double-send.
      if (!beginReplay(item.idempotencyKey)) continue;
      try {
        const res = await stampsApi.award(
          { token: item.token, businessId, stampCount: item.stampCount },
          { idempotencyKey: item.idempotencyKey },
        );
        if (res.success) {
          dequeueStamp(item.idempotencyKey);
        } else {
          // Non-network error — leave in queue.
          console.warn("Replay failed:", res.error?.code);
        }
      } catch (err) {
        if (!isNetworkError(err)) {
          dequeueStamp(item.idempotencyKey);
        }
      } finally {
        endReplay(item.idempotencyKey);
      }
    }
  };

  useEffect(() => {
    replay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  useEffect(() => {
    const handler = () => {
      if (navigator.onLine) replay();
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [businessId]);
}
