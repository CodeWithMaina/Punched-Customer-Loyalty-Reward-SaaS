"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Gift, Sparkles } from "lucide-react";

interface StampAwardedOverlayProps {
  stampNumber: number;
  stampsRequired: number;
  rewardReady: boolean;
  onDone: () => void;
}

/**
 * Full-screen celebratory overlay shown to the *customer* when a stamp
 * is received in real-time via SSE.
 *
 * Three-phase animation:
 *   1. stamp-slam  – large icon punches in with a bounce
 *   2. detail      – count text fades up
 *   3. reward      – if earned, flashes gold
 *
 * Auto-dismisses after 2.8 s (tap to dismiss early).
 */
export function StampAwardedOverlay({
  stampNumber,
  stampsRequired,
  rewardReady,
  onDone,
}: StampAwardedOverlayProps) {
  const [phase, setPhase] = useState<"slam" | "detail" | "reward">("slam");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("detail"), 500);
    const t2 = setTimeout(() => {
      if (rewardReady) setPhase("reward");
    }, 1200);
    const t3 = setTimeout(onDone, 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [rewardReady, onDone]);

  const isReward = phase === "reward";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onDone}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" />

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-full"
            style={{
              width: `${6 + (i % 4) * 3}px`,
              height: `${6 + (i % 4) * 3}px`,
              left: "50%",
              top: "50%",
              background: isReward
                ? `hsl(${40 + i * 8}, 90%, ${55 + (i % 3) * 10}%)`
                : `hsl(${160 + i * 15}, 80%, ${55 + (i % 3) * 10}%)`,
              animation: `particle-burst ${0.7 + (i % 3) * 0.15}s cubic-bezier(0.2, 0.8, 0.3, 1) forwards`,
              animationDelay: `${0.15 + i * 0.04}s`,
              opacity: 0,
              transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(0)`,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative z-10 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon ring */}
        <div
          className={`relative flex items-center justify-center transition-colors duration-500 ${
            phase === "slam" ? "animate-[stampSlam_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]" : ""
          }`}
        >
          {/* Glow ring */}
          <div
            className={`absolute h-28 w-28 rounded-full transition-all duration-700 ${
              isReward
                ? "bg-amber-400/30 scale-125"
                : "bg-brand/20 scale-110"
            }`}
            style={{ filter: "blur(12px)" }}
          />

          {/* Solid circle */}
          <div
            className={`relative h-24 w-24 rounded-full flex items-center justify-center border-4 shadow-2xl transition-all duration-500 ${
              isReward
                ? "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300"
                : "bg-gradient-to-br from-brand to-emerald-600 border-brand/60"
            }`}
          >
            {isReward ? (
              <Gift className="h-11 w-11 text-white drop-shadow-lg" />
            ) : (
              <CheckCircle className="h-11 w-11 text-white drop-shadow-lg" />
            )}

            {/* Sparkle decorations */}
            <Sparkles
              className={`absolute -top-2 -right-2 h-5 w-5 transition-all duration-500 ${
                phase !== "slam" ? "opacity-100 scale-100" : "opacity-0 scale-0"
              } ${isReward ? "text-amber-300" : "text-brand/70"}`}
            />
            <Sparkles
              className={`absolute -bottom-1 -left-2 h-4 w-4 transition-all duration-500 delay-100 ${
                phase !== "slam" ? "opacity-100 scale-100" : "opacity-0 scale-0"
              } ${isReward ? "text-amber-300" : "text-brand/70"}`}
            />
          </div>
        </div>

        {/* Text */}
        <div
          className={`text-center transition-all duration-500 ${
            phase === "slam"
              ? "opacity-0 translate-y-4"
              : "opacity-100 translate-y-0"
          }`}
        >
          <p className="text-3xl font-extrabold text-white drop-shadow-lg">
            {isReward ? "Reward Earned!" : "Stamped!"}
          </p>

          <p className="mt-1.5 text-base font-medium text-white/80 drop-shadow">
            {isReward
              ? "Tap Claim to redeem your reward"
              : `${stampNumber} / ${stampsRequired}`}
          </p>

          {/* Progress dots */}
          {!isReward && (
            <div className="flex justify-center gap-1.5 mt-3">
              {Array.from({ length: stampsRequired }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    i < stampNumber
                      ? i === stampNumber - 1
                        ? "bg-white scale-125 shadow-[0_0_6px_rgba(255,255,255,0.8)]"
                        : "bg-white/80"
                      : "bg-white/25"
                  }`}
                  style={{
                    transitionDelay: i === stampNumber - 1 ? "0.3s" : "0s",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tap to dismiss hint */}
        <p
          className={`text-xs text-white/50 mt-2 transition-opacity duration-500 ${
            phase === "slam" ? "opacity-0" : "opacity-100"
          }`}
        >
          Tap anywhere to dismiss
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes stampSlam {
          0% { transform: scale(2.5) rotate(-15deg); opacity: 0; }
          50% { transform: scale(0.85) rotate(2deg); opacity: 1; }
          70% { transform: scale(1.1) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes particle-burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--r, 0deg)) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--r, 0deg)) translateY(-120px);
          }
        }
      `}</style>
    </div>
  );
}
