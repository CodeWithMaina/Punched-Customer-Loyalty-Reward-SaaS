/**
 * Lightweight in-flight request deduplication + short TTL cache.
 * Prevents duplicate API calls when multiple components mount simultaneously
 * or when navigating back to a page quickly.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 15_000; // 15 seconds

/**
 * Wraps a fetch function with deduplication and short-lived caching.
 * - If the same key is already in-flight, returns the existing promise (dedup).
 * - If a cached result exists within TTL, returns it immediately.
 * - Otherwise, calls the fetcher and caches the result.
 */
export function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  // Return cached data if within TTL
  const cached = cache.get(key) as CacheEntry<T> | undefined;
  if (cached && Date.now() - cached.timestamp < ttlMs) {
    return Promise.resolve(cached.data);
  }

  // Deduplicate in-flight requests
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now() });
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, promise);
  return promise;
}

/** Invalidate a specific cache key or all keys matching a prefix. */
export function invalidateCache(keyOrPrefix?: string): void {
  if (!keyOrPrefix) {
    cache.clear();
    return;
  }
  const keys = Array.from(cache.keys());
  for (const key of keys) {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cache.delete(key);
    }
  }
}
