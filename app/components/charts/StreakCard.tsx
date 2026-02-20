"use client";

import { useEffect, useState } from "react";

export function StreakCard({ streak, label = "Current Streak" }: { streak: number; label?: string }) {
  // Animation state
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (streak > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [streak]);

  return (
    <div className="card-container">
      <div className="streak-icon-wrapper">
        <div className={`streak-icon ${animate ? "pulse" : ""}`}>
           🔥
        </div>
      </div>
      <div className="streak-info">
        <span className="streak-count">{streak}</span>
        <span className="streak-label">{label}</span>
      </div>

      <style jsx>{`
        .card-container {
            background: linear-gradient(135deg, #1f2937, #111827);
            color: white;
            padding: 1.5rem;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            position: relative;
            overflow: hidden;
            min-width: 140px;
        }
        .card-container::before {
             content: "";
             position: absolute;
             top: 0; left: 0; right: 0; height: 4px;
             background: linear-gradient(90deg, #f59e0b, #ef4444);
        }

        .streak-icon-wrapper {
            margin-bottom: 0.5rem;
        }
        .streak-icon {
            font-size: 2.5rem;
            transition: transform 0.2s;
        }
        .streak-icon.pulse {
            animation: pulse-animation 0.8s ease-in-out;
        }

        .streak-info {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .streak-count {
            font-size: 2rem;
            font-weight: 800;
            line-height: 1;
            background: -webkit-linear-gradient(#fbbf24, #f59e0b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .streak-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #9ca3af;
            margin-top: 0.25rem;
        }

        @keyframes pulse-animation {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
