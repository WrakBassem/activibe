"use client";

import React, { useEffect, useState } from "react";
import { useTutorial } from "./TutorialProvider";

/**
 * TutorialDialog — full-screen welcome dialog shown to first-time users.
 * Contains a 3-slide carousel explaining the Activibe concept before offering
 * to start the interactive dashboard tour.
 */

const SLIDES = [
  {
    emoji: "🎮",
    title: "Welcome to Activibe",
    subtitle: "Your Real-Life RPG",
    body: "Activibe turns your daily habits and goals into a role-playing game. Every positive action earns you XP. Every skipped habit costs you progress. The goal? Become the best version of yourself — one day at a time.",
    accent: "from-violet-600 to-indigo-600",
  },
  {
    emoji: "⚙️",
    title: "How It Works",
    subtitle: "The Core Loop",
    body: null, // Rendered as a feature list instead
    features: [
      { icon: "📝", label: "Log your habits daily", sub: "Check off what you've done." },
      { icon: "⚡", label: "Earn XP & level up", sub: "Progress across 5 core attributes." },
      { icon: "📜", label: "Complete AI quests", sub: "Targeted challenges for weak spots." },
      { icon: "🧠", label: "Get AI insights", sub: "Your coach learns your patterns." },
    ],
    accent: "from-indigo-600 to-blue-600",
  },
  {
    emoji: "🚀",
    title: "You're Ready",
    subtitle: "Let's take a quick tour",
    body: "Take a 2-minute guided tour of the Dashboard to understand every widget, stat, and button — then start logging your first day. Your journey starts now.",
    accent: "from-blue-600 to-cyan-600",
  },
];

export function TutorialDialog() {
  const { hasSeenWelcome, markWelcomeSeen } = useTutorial();
  const [slide, setSlide] = useState(0);
  const [exiting, setExiting] = useState(false);

  // Don't render if user already saw it
  if (hasSeenWelcome) return null;

  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  const handleNext = () => {
    if (isLast) return;
    setSlide((s) => s + 1);
  };

  const handleSkip = () => {
    setExiting(true);
    setTimeout(() => markWelcomeSeen(false), 350);
  };

  const handleStartTour = () => {
    setExiting(true);
    setTimeout(() => markWelcomeSeen(true), 350);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
        animation: exiting
          ? "dialogFadeOut 0.35s cubic-bezier(0.16,1,0.3,1) forwards"
          : "dialogFadeIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: "24px",
          padding: "2.5rem",
          maxWidth: "480px",
          width: "100%",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative top gradient bar */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: "4px",
            background: `linear-gradient(90deg, #8b5cf6, #6366f1, #3b82f6)`,
            borderRadius: "24px 24px 0 0",
          }}
        />

        {/* Slide content */}
        <div
          key={slide}
          style={{ animation: "slideFadeIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards" }}
        >
          {/* Big emoji */}
          <div style={{ fontSize: "3.5rem", marginBottom: "1.25rem", lineHeight: 1 }}>
            {current.emoji}
          </div>

          {/* Title */}
          <h2
            style={{
              margin: "0 0 4px",
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "#f5f5ff",
              letterSpacing: "-0.02em",
            }}
          >
            {current.title}
          </h2>
          <p
            style={{
              margin: "0 0 1.5rem",
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#a5b4fc",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {current.subtitle}
          </p>

          {/* Body text */}
          {current.body && (
            <p
              style={{
                margin: 0,
                fontSize: "0.95rem",
                lineHeight: 1.65,
                color: "#c4c4e0",
              }}
            >
              {current.body}
            </p>
          )}

          {/* Feature list (slide 2 only) */}
          {current.features && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {current.features.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                  }}
                >
                  <span style={{ fontSize: "1.4rem", lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "#f5f5ff", fontSize: "0.9rem" }}>
                      {f.label}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "2px" }}>
                      {f.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slide indicator dots */}
        <div style={{ display: "flex", gap: "6px", margin: "2rem 0 1.5rem" }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              onClick={() => setSlide(i)}
              style={{
                width: i === slide ? "24px" : "8px",
                height: "8px",
                borderRadius: "99px",
                background:
                  i === slide
                    ? "linear-gradient(90deg,#8b5cf6,#6366f1)"
                    : i < slide
                    ? "rgba(139,92,246,0.4)"
                    : "rgba(255,255,255,0.1)",
                transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          {isLast ? (
            <>
              <button
                onClick={handleSkip}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#9ca3af",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  padding: "12px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                Skip
              </button>
              <button
                onClick={handleStartTour}
                style={{
                  flex: 2,
                  background: "linear-gradient(90deg, #8b5cf6, #6366f1)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  padding: "12px 20px",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(99,102,241,0.4)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.transform = "scale(1.02)")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.transform = "scale(1)")}
              >
                🗺️ Start the Tour
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSkip}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "rgba(165,180,252,0.6)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  padding: "12px",
                  cursor: "pointer",
                }}
              >
                Skip Intro
              </button>
              <button
                onClick={handleNext}
                style={{
                  flex: 2,
                  background: "linear-gradient(90deg, #8b5cf6, #6366f1)",
                  border: "none",
                  borderRadius: "12px",
                  color: "white",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  padding: "12px 20px",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(99,102,241,0.4)",
                }}
              >
                Next →
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dialogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dialogFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideFadeIn {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
