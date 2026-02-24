"use client";

import React from "react";

type GrowthAvatarProps = {
  level: number;
  statusType?: "success" | "danger" | "momentum" | null;
};

export function GrowthAvatar({ level, statusType }: GrowthAvatarProps) {
  // Determine Visual Tiers based on Level
  const isTier2 = level >= 10;
  const isTier3 = level >= 20;

  // Determine base colors depending on status
  let baseColor = "#8b5cf6"; // Default Purple (Stable)
  let glowColor = "rgba(139, 92, 246, 0.4)";
  let animationSpeed = "4s";
  let isGlitching = false;

  if (statusType === "momentum") {
    baseColor = "#f97316"; // Orange (Momentum)
    glowColor = "rgba(249, 115, 22, 0.5)";
    animationSpeed = "2s"; // Fast breathing
  } else if (statusType === "danger") {
    baseColor = "#ef4444"; // Red (Burnout Risk)
    glowColor = "rgba(239, 68, 68, 0.3)";
    isGlitching = true;
    animationSpeed = "0.5s";
  } else if (statusType === "success") {
    baseColor = "#10b981"; // Green (Peak performance)
    glowColor = "rgba(16, 185, 129, 0.5)";
    animationSpeed = "3s";
  }

  return (
    <div className={`avatar-container ${isGlitching ? "glitch" : ""}`}>
      {/* Dynamic SVG Canvas */}
      <svg
        viewBox="0 0 100 100"
        className="avatar-svg"
        style={{
          filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor})`,
          animationDuration: animationSpeed,
        }}
      >
        {/* Base Core (Always visible) */}
        <circle cx="50" cy="50" r={isTier3 ? "12" : isTier2 ? "16" : "20"} fill={baseColor} className="core" />

        {/* Tier 2: Orbiting Rings */}
        {isTier2 && (
          <g className="orbit-group" style={{ animationDuration: animationSpeed }}>
            <circle cx="50" cy="50" r="28" fill="none" stroke={baseColor} strokeWidth="1.5" strokeDasharray="10 5" opacity="0.6" />
            <circle cx="50" cy="80" r="4" fill={baseColor} />
            <circle cx="20" cy="50" r="2.5" fill={baseColor} opacity="0.8" />
            <circle cx="80" cy="50" r="2.5" fill={baseColor} opacity="0.8" />
          </g>
        )}

        {/* Tier 3: Geometric Shell */}
        {isTier3 && (
          <g className="geometric-shell">
            <polygon points="50,15 85,50 50,85 15,50" fill="none" stroke={baseColor} strokeWidth="2" strokeLinejoin="round" opacity="0.8" />
            <polygon points="50,22 78,50 50,78 22,50" fill="none" stroke={baseColor} strokeWidth="1" strokeLinejoin="round" opacity="0.4" />
          </g>
        )}
      </svg>

      {/* Embedded Level Text */}
      <div className="level-text">{level}</div>

      <style jsx>{`
        .avatar-container {
          position: relative;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .avatar-svg {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          animation: breath linear infinite alternate;
        }

        .core {
          transform-origin: center;
          animation: pulse 2s ease-in-out infinite alternate;
        }

        .orbit-group {
          transform-origin: 50px 50px;
          animation: spin linear infinite;
        }

        .geometric-shell {
          transform-origin: 50px 50px;
          animation: counter-spin 10s linear infinite;
        }

        .level-text {
          position: relative;
          z-index: 10;
          font-weight: 800;
          font-size: ${isTier3 ? "1.1rem" : "1.2rem"};
          color: white;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }

        /* Animations */
        @keyframes breath {
          0% { transform: scale(0.95); opacity: 0.85; }
          100% { transform: scale(1.05); opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: scale(0.9); }
          100% { transform: scale(1.1); }
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        @keyframes counter-spin {
          100% { transform: rotate(-360deg); }
        }

        /* Glitch Effect for Burnout Risk */
        .glitch {
          animation: glitching 0.5s infinite;
        }

        @keyframes glitching {
          0% { transform: translate(0) skew(0deg); opacity: 1; }
          20% { transform: translate(-2px, 2px) skew(-5deg); opacity: 0.8; }
          40% { transform: translate(2px, -1px) skew(5deg); opacity: 0.9; }
          60% { transform: translate(-1px, 1px) skew(0deg); opacity: 1; filter: hue-rotate(-20deg); }
          80% { transform: translate(2px, 0) skew(2deg); opacity: 0.7; }
          100% { transform: translate(0) skew(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
