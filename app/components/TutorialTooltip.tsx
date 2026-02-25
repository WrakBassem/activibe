"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTutorial } from "./TutorialProvider";

/**
 * TutorialTooltip — renders a spotlight overlay + floating tooltip bubble
 * during the step-by-step dashboard tour.
 *
 * It finds the target DOM element via its `data-tutorial-id` attribute,
 * calculates its bounding rect, and positions a glowing highlight ring
 * plus a tooltip bubble nearby.
 */
export function TutorialTooltip() {
  const { isTourActive, currentStep, steps, nextStep, endTour } = useTutorial();

  // Bounding box of the highlighted element
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  const step = steps[currentStep];

  // Re-calculate target element position whenever the step changes
  useEffect(() => {
    if (!isTourActive || !step) {
      setVisible(false);
      return;
    }

    // Small delay so page layout settles before we measure
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-tutorial-id="${step.id}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
        setVisible(true);
        // Smooth-scroll the element into view
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        // Element not found on this page — skip this step
        nextStep();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [isTourActive, currentStep, step, nextStep]);

  // Update rect on scroll/resize so the ring follows the element
  useEffect(() => {
    if (!isTourActive) return;

    const update = () => {
      if (!step) return;
      const el = document.querySelector(`[data-tutorial-id="${step.id}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isTourActive, step]);

  if (!isTourActive || !visible || !rect || !step) return null;

  // ─── Layout calculations ──────────────────────────────────────────────────
  const PADDING = 10; // spotlight ring padding around the element
  const TOOLTIP_W = 320;

  // Spotlight ring coords
  const spotX = rect.left - PADDING;
  const spotY = rect.top - PADDING;
  const spotW = rect.width + PADDING * 2;
  const spotH = rect.height + PADDING * 2;

  // Tooltip position based on placement hint
  const vp = { w: window.innerWidth, h: window.innerHeight };
  let tooltipStyle: React.CSSProperties = {
    position: "fixed",
    width: TOOLTIP_W,
    zIndex: 10001,
  };

  if (step.placement === "bottom") {
    tooltipStyle.top = spotY + spotH + 12;
    tooltipStyle.left = Math.min(
      Math.max(rect.left + rect.width / 2 - TOOLTIP_W / 2, 12),
      vp.w - TOOLTIP_W - 12
    );
  } else if (step.placement === "top") {
    tooltipStyle.top = spotY - 180;
    tooltipStyle.left = Math.min(
      Math.max(rect.left + rect.width / 2 - TOOLTIP_W / 2, 12),
      vp.w - TOOLTIP_W - 12
    );
  } else if (step.placement === "left") {
    tooltipStyle.top = rect.top + rect.height / 2 - 80;
    tooltipStyle.right = vp.w - spotX + 12;
  } else {
    tooltipStyle.top = rect.top + rect.height / 2 - 80;
    tooltipStyle.left = spotX + spotW + 12;
  }

  // Clamp tooltip vertically
  if (typeof tooltipStyle.top === "number") {
    tooltipStyle.top = Math.max(12, Math.min(tooltipStyle.top as number, vp.h - 220));
  }

  const isLast = currentStep === steps.length - 1;

  return (
    <>
      {/* ── Dark backdrop with cutout hole using SVG clip-path ── */}
      <svg
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          pointerEvents: "none",
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White = visible backdrop */}
            <rect width="100%" height="100%" fill="white" />
            {/* Black rect punches the hole (the spotlight area) */}
            <rect
              x={spotX}
              y={spotY}
              width={spotW}
              height={spotH}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        {/* Semi-transparent dark overlay with hole */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.72)"
          mask="url(#spotlight-mask)"
        />
        {/* Glowing ring around the highlighted element */}
        <rect
          x={spotX}
          y={spotY}
          width={spotW}
          height={spotH}
          rx="12"
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="2.5"
        />
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Backdrop click-blocker (prevents accidental clicks on page) ── */}
      <div
        onClick={endTour}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          cursor: "default",
        }}
      />

      {/* ── Tooltip Bubble ── */}
      <div
        style={{
          ...tooltipStyle,
          background: "linear-gradient(145deg, #1e1b4b 0%, #1e1e2e 100%)",
          border: "1px solid rgba(139,92,246,0.4)",
          borderRadius: "16px",
          boxShadow:
            "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
          padding: "20px",
          animation: "tooltipFadeIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards",
          // Prevent backdrop click-blocker from intercepting tooltip clicks
          zIndex: 10002,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator dots */}
        <div style={{ display: "flex", gap: "5px", marginBottom: "14px" }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentStep ? "18px" : "6px",
                height: "6px",
                borderRadius: "99px",
                background:
                  i === currentStep
                    ? "linear-gradient(90deg,#8b5cf6,#6366f1)"
                    : i < currentStep
                    ? "rgba(139,92,246,0.5)"
                    : "rgba(255,255,255,0.1)",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* Icon + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{step.icon}</span>
          <h4
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 800,
              color: "#f5f5ff",
              letterSpacing: "-0.01em",
            }}
          >
            {step.title}
          </h4>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 18px",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            color: "#a5b4fc",
          }}
        >
          {step.description}
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={endTour}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(165,180,252,0.5)",
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            Skip Tour
          </button>
          <button
            onClick={nextStep}
            style={{
              background: "linear-gradient(90deg, #8b5cf6, #6366f1)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontWeight: 700,
              fontSize: "0.875rem",
              padding: "9px 20px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = "scale(1.03)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            {isLast ? "🎉 Finish Tour" : "Next →"}
          </button>
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes tooltipFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
