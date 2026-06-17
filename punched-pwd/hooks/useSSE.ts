"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { SseStampEvent } from "@/types";
import { getAccessToken } from "@/lib/api/client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/v1";

interface UseSSEOptions {
  onStamp?: (event: SseStampEvent) => void;
  enabled?: boolean;
}

interface UseSSEReturn {
  isConnected: boolean;
  lastEvent: SseStampEvent | null;
  reconnect: () => void;
}

/**
 * Hook for subscribing to real-time stamp events via Server-Sent Events.
 * Automatically reconnects on error with exponential backoff.
 * Only connects while the component is mounted and `enabled` is true.
 */
export function useSSE(cardId: string | null, options: UseSSEOptions = {}): UseSSEReturn {
  const { onStamp, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SseStampEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRY_DELAY_MS = 30_000;

  const connect = useCallback(() => {
    if (!cardId || !enabled) return;

    const token = getAccessToken();
    if (!token) return;

    // EventSource doesn't support custom headers — pass token as query param.
    // The server should validate it identically to the Authorization header.
    const url = `${API_BASE_URL}/sse/cards/${cardId}?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("open", () => {
      setIsConnected(true);
      retryCountRef.current = 0;
    });

    es.addEventListener("stamp_awarded", (e) => {
      try {
        const evt: SseStampEvent = JSON.parse((e as MessageEvent).data);
        setLastEvent(evt);
        onStamp?.(evt);
      } catch {
        // Ignore malformed payloads
      }
    });

    es.addEventListener("error", () => {
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Exponential backoff: 1s, 2s, 4s, ... capped at MAX_RETRY_DELAY_MS
      const delay = Math.min(1000 * 2 ** retryCountRef.current, MAX_RETRY_DELAY_MS);
      retryCountRef.current++;
      reconnectTimerRef.current = setTimeout(connect, delay);
    });
  }, [cardId, enabled, onStamp]);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);

  return { isConnected, lastEvent, reconnect };
}
