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
    <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} className="w-full h-full object-cover" />
      {/* Scan frame overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-48 h-48 border-2 border-white/70 rounded-xl relative">
          {/* Corner decorations */}
          {[
            "top-0 left-0 border-t-4 border-l-4 rounded-tl-lg",
            "top-0 right-0 border-t-4 border-r-4 rounded-tr-lg",
            "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg",
            "bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg",
          ].map((cls, i) => (
            <div key={i} className={`absolute w-6 h-6 border-brand ${cls}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
