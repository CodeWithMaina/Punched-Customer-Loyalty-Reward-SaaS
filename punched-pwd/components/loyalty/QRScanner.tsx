"use client";

import { useEffect, useRef } from "react";
import { BrowserQRCodeReader, IScannerControls } from "@zxing/browser";

interface QRScannerProps {
  onScan: (result: string) => void;
  isActive: boolean;
}

/**
 * QR scanner component using the device camera.
 * Uses ZXing browser library for reliable QR decoding.
 * Only renders while `isActive` is true.
 */
export function QRScanner({ onScan, isActive }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const hasFiredRef = useRef(false);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    hasFiredRef.current = false;
    let localControls: IScannerControls | null = null;
    let cancelled = false;
    const codeReader = new BrowserQRCodeReader();

    (async () => {
      try {
        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        if (cancelled) return;
        const backCamera = devices.find((d) =>
          d.label.toLowerCase().includes("back") ||
          d.label.toLowerCase().includes("rear") ||
          d.label.toLowerCase().includes("environment")
        );
        const deviceId = backCamera?.deviceId ?? devices[0]?.deviceId;

        const controls = await codeReader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result) => {
            if (result && !hasFiredRef.current && !cancelled) {
              hasFiredRef.current = true;
              // Stop scanner immediately using local variable (avoids stale ref)
              localControls?.stop();
              controlsRef.current?.stop();
              onScanRef.current(result.getText());
            }
          }
        );

        localControls = controls;
        controlsRef.current = controls;

        // If cancelled while awaiting, stop now
        if (cancelled || hasFiredRef.current) {
          controls.stop();
        }
      } catch (err) {
        if (!cancelled) console.error("QR scanner error:", err);
      }
    })();

    return () => {
      cancelled = true;
      localControls?.stop();
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [isActive]);

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto border border-[var(--border)] bg-black overflow-hidden">
      <style>{`
        @keyframes scanline {
          0% { top: 0%; }
          50% { top: calc(100% - 1px); }
          100% { top: 0%; }
        }
      `}</style>
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
      {/* Dark scrim for instrumentation contrast */}
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      {/* Instrumentation overlay */}
      <div className="absolute inset-5 pointer-events-none" aria-hidden>
        {/* Corner brackets */}
        {[
          "top-0 left-0 border-t-[3px] border-l-[3px]",
          "top-0 right-0 border-t-[3px] border-r-[3px]",
          "bottom-0 left-0 border-b-[3px] border-l-[3px]",
          "bottom-0 right-0 border-b-[3px] border-r-[3px]",
        ].map((cls, i) => (
          <div key={i} className={`absolute w-10 h-10 border-[var(--text-primary)] ${cls}`} />
        ))}
        {/* Reticle + scan line */}
        <div className="absolute inset-0 m-auto w-3/4 h-3/4 border border-[var(--border)]">
          <div
            className="absolute left-0 right-0 h-px bg-[var(--text-primary)] opacity-80"
            style={{ animation: "scanline 2s linear infinite", boxShadow: "0 0 8px var(--brand-ring)" }}
          />
        </div>
      </div>
      {/* Reticle center label */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-[var(--text-primary)] opacity-50" style={{ fontFamily: "'Space Mono', monospace" }}>
          Target Acquisition
        </span>
      </div>
      {/* Status readouts */}
      <div className="absolute -top-3 -left-3 z-10 font-mono text-[8px] tracking-[0.2em] uppercase text-[var(--text-primary)] opacity-40" style={{ fontFamily: "'Space Mono', monospace" }}>
        SYS_READY
      </div>
      <div className="absolute -bottom-3 -right-3 z-10 font-mono text-[8px] tracking-[0.2em] uppercase text-[var(--text-primary)] opacity-40" style={{ fontFamily: "'Space Mono', monospace" }}>
        ENCRYPTED_LINK
      </div>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse" />
        <span className="font-mono text-[9px] tracking-[0.2em] text-[var(--text-tertiary)]" style={{ fontFamily: "'Space Mono', monospace" }}>REC</span>
      </div>
    </div>
  );
}
