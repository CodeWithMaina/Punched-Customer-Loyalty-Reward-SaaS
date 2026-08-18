"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ScanLine,
  Award,
  Users,
  QrCode,
  ArrowRight,
  Check,
} from "lucide-react";

/* ============================================================
   PUNCHED — landing page, handwritten / paper-punch-card world

   The old loyalty card was a paper rectangle a shop owner
   hand-stamped and scribbled on at the counter. This design
   leans all the way into that: cream paper, ink-black serif
   body copy, a script hand for emphasis, taped-down cards,
   hand-drawn underlines and arrows that "ink themselves in"
   as you scroll, and a hero stamp card that punches itself
   the way it would at checkout.

   - Paper: warm cream, faint grain overlay, notebook-rule lines.
   - Ink: near-black warm ink for body text.
   - Stamp red: the one saturated colour — literally the colour
     of the rubber stamp ink the whole product is named after.
   - Script: Caveat, used only for emphasis words/notes — body
     copy stays in a clean sans so it's still easy to read.
   ============================================================ */

type RevealProps = {
  as?: React.ElementType;
  delay?: number;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

type CountUpProps = {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
};

function useReveal(threshold = 0.18) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, visible] as [React.RefObject<HTMLElement>, boolean];
}

function Reveal({ as: Tag = "div", className = "", delay = 0, children, ...rest }: RevealProps) {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`pk-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function CountUp({ to, prefix = "", suffix = "", duration = 1100 }: CountUpProps) {
  const [ref, visible] = useReveal(0.6);
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let raf: number | undefined;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  }, [visible, to, duration]);
  const display = Number.isInteger(to) ? Math.round(val) : val.toFixed(1);
  return (
    <span ref={ref} className="pk-stat-num pk-script">
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

/* ---------- hand-drawn doodles (CSS-triggered by an ancestor .is-visible) ---------- */

function UnderlineDoodle({ className = "", width = 200 }) {
  return (
    <svg
      className={`pk-doodle pk-underline ${className}`}
      viewBox="0 0 200 18"
      width={width}
      height={(18 * width) / 200}
      fill="none"
    >
      <path
        pathLength="1"
        d="M3 11C34 4 71 3 101 8C131 13 165 5 197 9"
        stroke="var(--stamp)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CircleScribble({ className = "" }) {
  return (
    <svg className={`pk-doodle pk-circle ${className}`} viewBox="0 0 90 60" fill="none">
      <path
        pathLength="1"
        d="M45 4C20 4 6 16 5 30C4 45 20 56 45 56C71 56 86 46 85 31C84 17 70 6 47 5C30 4 12 12 10 20"
        stroke="var(--ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowDoodle({ className = "", flip = false }) {
  return (
    <svg
      className={`pk-doodle pk-arrow ${className}`}
      viewBox="0 0 120 60"
      fill="none"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        pathLength="1"
        d="M4 12C34 8 74 40 108 42"
        stroke="var(--ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        pathLength="1"
        d="M90 30C97 35 103 39 109 42C103 45 96 49 91 55"
        stroke="var(--ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---------- signature element: the card that stamps itself ---------- */

function StampCard() {
  const TOTAL = 8;
  const [stamped, setStamped] = useState(0);
  const [phase, setPhase] = useState("filling");
  const jitter = [-3, 2, -2, 3, -2, 2, -3, 2];

    useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (phase === "filling") {
      if (stamped < TOTAL) {
        timer = setTimeout(() => setStamped((s) => s + 1), 620);
      } else {
        timer = setTimeout(() => setPhase("done"), 1000);
      }
    } else if (phase === "done") {
      timer = setTimeout(() => setPhase("resetting"), 1900);
    } else if (phase === "resetting") {
      setStamped(0);
      timer = setTimeout(() => setPhase("filling"), 500);
    }
    return () => clearTimeout(timer);
  }, [stamped, phase]);

  const remaining = TOTAL - stamped;

  return (
    <div className="pk-cardwrap">
      <span className="pk-tape pk-tape-l" />
      <span className="pk-tape pk-tape-r" />
      <div className="pk-card">
        <div className="pk-card-head">
          <div>
            <div className="pk-card-name pk-script">Maua Coffee House</div>
            <div className="pk-card-sub">
              <span className={`pk-live-dot ${phase !== "resetting" ? "is-on" : ""}`} />
              stamped live
            </div>
          </div>
          <div className="pk-card-stamp-icon">☕</div>
        </div>

        <div className="pk-grid">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const isStamped = i < stamped;
            const isNewest = i === stamped - 1;
            return (
              <div
                key={i}
                className={`pk-dot ${isStamped ? "is-stamped" : ""} ${isNewest ? "is-newest" : ""}`}
                                style={{ "--r": `${jitter[i]}deg` } as React.CSSProperties}
              >
                {isStamped && <Check size={16} strokeWidth={3} />}
              </div>
            );
          })}
        </div>

        <div className="pk-card-foot">
          {phase === "done" ? (
            <span className="pk-reward-pill pk-script">free coffee, on us!</span>
          ) : (
            <span className="pk-card-foot-text">
              {remaining === 0 ? 1 : remaining} more stamp{remaining === 1 ? "" : "s"} to go
            </span>
          )}
        </div>
      </div>
      <div className="pk-postit">
        <span className="pk-script">no more soggy paper cards</span>
      </div>
    </div>
  );
}

export default function PunchedLanding() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const FEATURES = [
    { icon: ScanLine, title: "Scan to earn", rot: -2, desc: "Staff scan a code at the counter and the stamp lands instantly. No app-switching, no manual entry." },
    { icon: Award, title: "Reward loyalty", rot: 1.5, desc: "Set the stamp count and the reward. Punched tracks progress and unlocks it the moment it's earned." },
    { icon: Users, title: "Track your team", rot: -1, desc: "Every stamp is attributed to the staff member who gave it — so you know who's driving repeat visits." },
    { icon: QrCode, title: "Go cardless", rot: 2, desc: "Customers carry their card on their phone. Nothing to laminate, nothing to lose, nothing left at home." },
  ];

  const STEPS = [
    { n: "01", title: "Show the code", desc: "The customer opens Punched and shows their code at checkout — it rotates every 45 seconds, so it can't be screenshotted and reused." },
    { n: "02", title: "Tap to stamp", desc: "Staff scan it with the built-in camera. The stamp is awarded and logged before the phone's back in a pocket." },
    { n: "03", title: "Reward, unlocked", desc: "Hit the target and the reward appears on the customer's card by itself, countdown and all." },
  ];

  return (
    <div className="pk-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

        .pk-root {
          --paper: #f7f0e1;
          --paper-deep: #efe2c3;
          --ink: #211a12;
          --ink-soft: #74695a;
          --ink-faint: #a89d89;
          --line: #ddceac;
          --stamp: #c3172c;
          --stamp-deep: #870f1f;
          --stamp-soft: rgba(195, 23, 44, 0.09);
          --stamp-soft-2: rgba(195, 23, 44, 0.17);
          --tape: rgba(244, 214, 120, 0.55);
          font-family: 'Inter', -apple-system, sans-serif;
          background: var(--paper);
          color: var(--ink);
          -webkit-font-smoothing: antialiased;
          position: relative;
          overflow-x: hidden;
        }
        .pk-root * { box-sizing: border-box; }
        .pk-script { font-family: 'Caveat', cursive; }

        .pk-grain {
          position: fixed;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          opacity: 0.5;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.32'/%3E%3C/svg%3E");
        }

        .pk-wrap { max-width: 1120px; margin: 0 auto; padding: 0 32px; position: relative; z-index: 3; }

        .pk-reveal {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(.16,.8,.24,1), transform 0.7s cubic-bezier(.16,.8,.24,1);
        }
        .pk-reveal.is-visible { opacity: 1; transform: translateY(0); }

        .pk-doodle path { transition: stroke-dashoffset 0.9s ease 0.25s; stroke-dasharray: 1; stroke-dashoffset: 1; }
        .pk-reveal.is-visible .pk-doodle path { stroke-dashoffset: 0; }
        .pk-doodle { overflow: visible; display: block; }

        /* ---------- Nav ---------- */
        .pk-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          padding: 22px 0;
          transition: padding 0.35s ease, background 0.35s ease, border-color 0.35s ease;
          border-bottom: 2px solid transparent;
        }
        .pk-nav.is-scrolled {
          padding: 12px 0;
          background: rgba(247, 240, 225, 0.86);
          backdrop-filter: blur(12px);
          border-bottom: 2px solid var(--line);
        }
        .pk-nav-row { display: flex; align-items: center; justify-content: space-between; }
        .pk-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ink); }
        .pk-logo-mark {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--stamp); color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Caveat', cursive; font-weight: 700; font-size: 19px;
          transform: rotate(-8deg);
          box-shadow: 0 2px 0 rgba(33,26,18,0.15);
        }
        .pk-logo-text { font-weight: 700; font-size: 16px; letter-spacing: 0.01em; }
        .pk-nav-links { display: flex; align-items: center; gap: 34px; }
        .pk-nav-link {
          position: relative;
          font-size: 14.5px; font-weight: 500; color: var(--ink-soft); text-decoration: none;
          padding-bottom: 3px;
        }
        .pk-nav-link .pk-doodle { position: absolute; left: 0; bottom: -6px; width: 100%; }
        .pk-nav-link:hover { color: var(--ink); }
        .pk-nav-link:hover .pk-doodle path { stroke-dashoffset: 0; }
        .pk-nav-cta { display: flex; align-items: center; gap: 22px; }
        .pk-signin { font-size: 14.5px; font-weight: 500; color: var(--ink); text-decoration: none; }
        @media (max-width: 780px) { .pk-nav-links { display: none; } }

        /* ---------- Buttons (stamped) ---------- */
        .pk-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          height: 50px; padding: 0 26px;
          border-radius: 999px;
          font-size: 15px; font-weight: 700;
          text-decoration: none; border: 2px solid transparent;
          transition: transform 0.18s cubic-bezier(.3,.6,.4,1.5), box-shadow 0.2s ease, border-color .2s ease;
          cursor: pointer; white-space: nowrap;
        }
        .pk-btn-primary {
          background: var(--stamp); color: #fff;
          box-shadow: 0 3px 0 var(--stamp-deep);
          transform: rotate(-1deg);
        }
        .pk-btn-primary:hover { transform: rotate(-1deg) translateY(-2px); }
        .pk-btn-primary:active { transform: rotate(-1deg) translateY(2px) scale(0.97); box-shadow: 0 1px 0 var(--stamp-deep); }
        .pk-btn-ghost {
          background: transparent; color: var(--ink); border-color: var(--ink);
          transform: rotate(1deg);
        }
        .pk-btn-ghost:hover { transform: rotate(1deg) translateY(-2px); background: rgba(33,26,18,0.04); }

        /* ---------- Hero ---------- */
        .pk-hero { padding: 190px 0 130px; position: relative; }
        .pk-hero-grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 60px; align-items: center; }
        @media (max-width: 940px) { .pk-hero-grid { grid-template-columns: 1fr; } .pk-hero { padding: 150px 0 80px; } }

        .pk-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: 'Caveat', cursive; font-weight: 700; font-size: 19px;
          color: var(--stamp-deep);
          background: #fff;
          border: 2px solid var(--ink);
          border-radius: 10px;
          padding: 7px 16px;
          transform: rotate(-2deg);
          box-shadow: 3px 3px 0 var(--line);
        }

        .pk-h1 {
          margin: 30px 0 22px;
          font-size: clamp(38px, 5.6vw, 62px);
          line-height: 1.08;
          letter-spacing: -0.01em;
          font-weight: 700;
        }
        .pk-h1-emphasis {
          position: relative;
          display: inline-block;
          font-family: 'Caveat', cursive;
          font-weight: 700;
          color: var(--stamp);
          font-size: 1.2em;
        }
        .pk-h1-emphasis .pk-underline { position: absolute; left: 2%; bottom: -14px; width: 96%; height: auto; }

        .pk-sub { font-size: 18px; line-height: 1.65; color: var(--ink-soft); max-width: 460px; margin-bottom: 38px; }
        .pk-hero-actions { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
        .pk-hero-note { margin-top: 24px; font-family: 'Caveat', cursive; font-size: 19px; color: var(--ink-soft); }

        .pk-hero-visual { position: relative; display: flex; justify-content: center; }

        /* ---------- Stamp card ---------- */
        .pk-cardwrap { position: relative; width: 100%; max-width: 320px; }
        .pk-tape {
          position: absolute; top: -14px; width: 64px; height: 26px;
          background: var(--tape);
          border: 1px solid rgba(33,26,18,0.08);
          z-index: 2;
        }
        .pk-tape-l { left: -6px; transform: rotate(-9deg); }
        .pk-tape-r { right: -6px; transform: rotate(7deg); }

        .pk-card {
          position: relative;
          background: #fffdf7;
          border: 2px solid var(--ink);
          border-radius: 4px 16px 4px 16px;
          padding: 26px 24px;
          box-shadow: 6px 6px 0 var(--line), 0 20px 40px -20px rgba(33,26,18,0.3);
          transform: rotate(-1.6deg);
        }
        .pk-card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
        .pk-card-name { font-size: 24px; font-weight: 700; line-height: 1; }
        .pk-card-sub { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-faint); margin-top: 6px; }
        .pk-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ink-faint); }
        .pk-live-dot.is-on { background: var(--stamp); animation: pkPulse 1.4s ease-in-out infinite; }
        .pk-card-stamp-icon { font-size: 22px; transform: rotate(8deg); }

        .pk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 11px; margin-bottom: 20px; }
        .pk-dot {
          aspect-ratio: 1; border-radius: 50%;
          border: 2px dashed var(--line);
          display: flex; align-items: center; justify-content: center; color: #fff;
          transition: transform 0.2s ease;
        }
        .pk-dot.is-stamped {
          border: 2px solid var(--stamp-deep);
          background: var(--stamp);
          transform: rotate(var(--r, 0deg));
        }
        .pk-dot.is-newest { animation: pkStamp 0.45s cubic-bezier(.2,1.6,.4,1); }
        .pk-card-foot { border-top: 2px dashed var(--line); padding-top: 14px; }
        .pk-card-foot-text { font-size: 13.5px; color: var(--ink-soft); }
        .pk-reward-pill { font-size: 20px; color: var(--stamp-deep); }

        .pk-postit {
          position: absolute; bottom: -26px; right: -18px;
          background: #fdf0b8;
          border: 1px solid rgba(33,26,18,0.1);
          box-shadow: 3px 4px 8px rgba(33,26,18,0.12);
          padding: 10px 14px 12px;
          font-size: 17px;
          color: var(--ink);
          transform: rotate(6deg);
          max-width: 150px;
          text-align: center;
        }

        @keyframes pkStamp {
          0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
          55% { transform: scale(1.2) rotate(var(--r, 0deg)); opacity: 1; }
          100% { transform: scale(1) rotate(var(--r, 0deg)); }
        }
        @keyframes pkPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(195,23,44,0.5); }
          70% { box-shadow: 0 0 0 6px rgba(195,23,44,0); }
        }

        /* ---------- Sections ---------- */
        .pk-section { padding: 110px 0; }
        .pk-section-alt { background: var(--paper-deep); border-top: 2px solid var(--line); border-bottom: 2px solid var(--line); }
        .pk-kicker { font-family: 'Caveat', cursive; font-weight: 700; font-size: 20px; color: var(--stamp-deep); margin-bottom: 6px; }
        .pk-h2 { font-size: clamp(27px, 3.2vw, 38px); line-height: 1.16; letter-spacing: -0.01em; font-weight: 700; max-width: 560px; }
        .pk-section-sub { font-size: 16px; color: var(--ink-soft); max-width: 480px; margin-top: 14px; line-height: 1.6; }

        /* ---------- How it works ---------- */
        .pk-steps { margin-top: 66px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; position: relative; }
        @media (max-width: 860px) { .pk-steps { grid-template-columns: 1fr; gap: 44px; } }
        .pk-step { position: relative; }
        .pk-step-n-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 54px; height: 40px; margin-bottom: 16px; }
        .pk-step-n { font-family: 'Caveat', cursive; font-weight: 700; font-size: 24px; position: relative; z-index: 1; }
        .pk-step-n-wrap .pk-circle { position: absolute; inset: -4px; width: calc(100% + 8px); height: calc(100% + 8px); }
        .pk-step-arrow { position: absolute; top: 6px; right: -46px; width: 90px; }
        @media (max-width: 860px) { .pk-step-arrow { display: none; } }
        .pk-step-title { font-size: 19px; font-weight: 700; margin-bottom: 8px; }
        .pk-step-desc { font-size: 14.5px; line-height: 1.65; color: var(--ink-soft); }

        /* ---------- Features (pinned cards) ---------- */
        .pk-features { margin-top: 60px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 26px; }
        @media (max-width: 700px) { .pk-features { grid-template-columns: 1fr; } }
        .pk-feature {
          background: #fffdf7;
          border: 2px solid var(--ink);
          border-radius: 4px 14px 4px 14px;
          padding: 30px;
          box-shadow: 5px 5px 0 var(--line);
          transition: transform 0.3s cubic-bezier(.2,.8,.3,1.2), box-shadow 0.3s ease;
        }
        .pk-feature:hover { transform: rotate(0deg) translateY(-4px) !important; box-shadow: 7px 8px 0 var(--stamp-soft-2); }
        .pk-feature-icon {
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--stamp-soft); color: var(--stamp);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px; border: 2px dashed var(--stamp-soft-2);
        }
        .pk-feature-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; }
        .pk-feature-desc { font-size: 14.5px; line-height: 1.6; color: var(--ink-soft); }

        /* ---------- Metrics ---------- */
        .pk-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; text-align: center; }
        @media (max-width: 700px) { .pk-stats { grid-template-columns: 1fr; gap: 46px; } }
        .pk-stat-num { font-size: clamp(38px, 5.4vw, 52px); font-weight: 700; color: var(--stamp); display: block; }
        .pk-stat-label { margin-top: 8px; font-size: 14px; color: var(--ink-soft); line-height: 1.5; }

        /* ---------- Final CTA ---------- */
        .pk-cta-band { text-align: center; padding: 120px 0; }
        .pk-cta-band .pk-h2 { margin: 0 auto; }
        .pk-cta-emphasis { position: relative; display: inline-block; }
        .pk-cta-emphasis .pk-underline { position: absolute; left: 0; bottom: -10px; width: 100%; }
        .pk-cta-actions { margin-top: 32px; display: flex; justify-content: center; align-items: center; gap: 16px; flex-wrap: wrap; }
        .pk-cta-note { display: flex; align-items: center; gap: 4px; font-family: 'Caveat', cursive; font-size: 19px; color: var(--ink-soft); }
        .pk-cta-note .pk-doodle { width: 46px; }

        /* ---------- Footer ---------- */
        .pk-footer {
          border-top: 2px solid var(--ink);
          padding: 44px 0;
          clip-path: polygon(0% 6px, 2% 0%, 4% 6px, 6% 0%, 8% 6px, 10% 0%, 12% 6px, 14% 0%, 16% 6px, 18% 0%, 20% 6px, 22% 0%, 24% 6px, 26% 0%, 28% 6px, 30% 0%, 32% 6px, 34% 0%, 36% 6px, 38% 0%, 40% 6px, 42% 0%, 44% 6px, 46% 0%, 48% 6px, 50% 0%, 52% 6px, 54% 0%, 56% 6px, 58% 0%, 60% 6px, 62% 0%, 64% 6px, 66% 0%, 68% 6px, 70% 0%, 72% 6px, 74% 0%, 76% 6px, 78% 0%, 80% 6px, 82% 0%, 84% 6px, 86% 0%, 88% 6px, 90% 0%, 92% 6px, 94% 0%, 96% 6px, 98% 0%, 100% 6px, 100% 100%, 0% 100%);
        }
        .pk-footer-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .pk-footer-links { display: flex; gap: 26px; }
        .pk-footer-links a { font-size: 13.5px; color: var(--ink-soft); text-decoration: none; }
        .pk-footer-links a:hover { color: var(--ink); }
        .pk-footer-fine { font-family: 'Caveat', cursive; font-size: 17px; color: var(--ink-soft); }

        @media (prefers-reduced-motion: reduce) {
          .pk-reveal, .pk-dot, .pk-live-dot, .pk-btn, .pk-doodle path { transition: none !important; animation: none !important; }
        }
      `}</style>

      <div className="pk-grain" />

      {/* ---------- Nav ---------- */}
      <nav className={`pk-nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="pk-wrap pk-nav-row">
          <a href="#top" className="pk-logo">
            <span className="pk-logo-mark">P</span>
            <span className="pk-logo-text">Punched</span>
          </a>
          <div className="pk-nav-links">
            <a href="#how" className="pk-nav-link">
              How it works
              <UnderlineDoodle width={90} />
            </a>
            <a href="#features" className="pk-nav-link">
              Features
              <UnderlineDoodle width={70} />
            </a>
            <a href="#business" className="pk-nav-link">
              For business
              <UnderlineDoodle width={100} />
            </a>
          </div>
          <div className="pk-nav-cta">
            <a href="/login" className="pk-signin">Log in</a>
            <a href="/business-register" className="pk-btn pk-btn-primary">Get started</a>
          </div>
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <header id="top" className="pk-hero">
        <div className="pk-wrap pk-hero-grid">
          <div>
            <Reveal>
              <span className="pk-eyebrow">no plastic. no lost cards.</span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="pk-h1">
                Reward every visit,{" "}
                <span className="pk-h1-emphasis">
                  automatically.
                  <UnderlineDoodle className="pk-underline" width={220} />
                </span>
              </h1>
            </Reveal>
            <Reveal delay={140}>
              <p className="pk-sub">
                Punched replaces the paper punch card with a live, cardless
                loyalty system. Staff scan, the stamp lands on the customer's
                phone in under a second, and the reward unlocks itself.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="pk-hero-actions">
                <a href="/business-register" className="pk-btn pk-btn-primary">
                  Register your business <ArrowRight size={16} />
                </a>
                <a href="/login" className="pk-btn pk-btn-ghost">Log in</a>
              </div>
              <p className="pk-hero-note">free to set up, live by this afternoon ✎</p>
            </Reveal>
          </div>

          <Reveal delay={160} className="pk-hero-visual">
            <StampCard />
          </Reveal>
        </div>
      </header>

      {/* ---------- How it works ---------- */}
      <section id="how" className="pk-section">
        <div className="pk-wrap">
          <Reveal>
            <div className="pk-kicker">how it works</div>
            <h2 className="pk-h2">Three steps. No training manual required.</h2>
          </Reveal>
          <div className="pk-steps">
            {STEPS.map((s, i) => (
              <Reveal as="div" className="pk-step" key={s.n} delay={i * 100}>
                <div className="pk-step-n-wrap">
                  <span className="pk-step-n">{s.n}</span>
                  <CircleScribble className="pk-circle" />
                </div>
                {i < STEPS.length - 1 && <ArrowDoodle className="pk-step-arrow" />}
                <div className="pk-step-title">{s.title}</div>
                <div className="pk-step-desc">{s.desc}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="pk-section pk-section-alt">
        <div className="pk-wrap">
          <Reveal>
            <div className="pk-kicker">built for the counter, not a boardroom</div>
            <h2 className="pk-h2">Everything a local business needs, nothing it doesn't.</h2>
          </Reveal>
          <div className="pk-features">
            {FEATURES.map((f, i) => (
              <Reveal
                as="div"
                className="pk-feature"
                key={f.title}
                delay={i * 70}
                style={{ transform: `rotate(${f.rot}deg)` }}
              >
                <div className="pk-feature-icon">
                  <f.icon size={19} strokeWidth={2} />
                </div>
                <div className="pk-feature-title">{f.title}</div>
                <div className="pk-feature-desc">{f.desc}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Metrics ---------- */}
      <section id="business" className="pk-section">
        <div className="pk-wrap">
          <Reveal>
            <div className="pk-kicker">under the hood</div>
            <h2 className="pk-h2">Real-time, by design — not an afterthought.</h2>
            <p className="pk-section-sub">
              Every scan is a cryptographically signed, single-use token.
              Every stamp is pushed live. Nothing here is faked for the demo.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="pk-stats" style={{ marginTop: 60 }}>
              <div>
                <CountUp to={45} suffix="s" />
                <div className="pk-stat-label">QR token lifetime, rotated automatically</div>
              </div>
              <div>
                <CountUp to={1} prefix="<" suffix="s" />
                <div className="pk-stat-label">For a stamp to appear on the customer's phone</div>
              </div>
              <div>
                <CountUp to={0} />
                <div className="pk-stat-label">Plastic cards printed, laminated, or lost</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="pk-section-alt">
        <div className="pk-wrap pk-cta-band">
          <Reveal>
            <div className="pk-kicker" style={{ display: "flex", justifyContent: "center" }}>
              ready when you are
            </div>
            <h2 className="pk-h2">
              Stamp your{" "}
              <span className="pk-cta-emphasis">
                first customer
                <UnderlineDoodle className="pk-underline" width={180} />
              </span>{" "}
              today.
            </h2>
            <div className="pk-cta-actions">
              <a href="/business-register" className="pk-btn pk-btn-primary">
                Register your business <ArrowRight size={16} />
              </a>
              <a href="/login" className="pk-btn pk-btn-ghost">Log in</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="pk-footer">
        <div className="pk-wrap">
          <div className="pk-footer-row">
            <span className="pk-logo-text" style={{ fontSize: 14 }}>Punched</span>
            <div className="pk-footer-links">
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="/login">Log in</a>
              <a href="/business-register">Register</a>
            </div>
            <span className="pk-footer-fine">made for shop counters, not boardrooms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
