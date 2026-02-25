"use client";

import { format, parseISO } from "date-fns";
import { useState } from "react";

type DataPoint = {
  date: string;
  total_score: number;
  mode: string;
};

export function WeeklyProgress({ data }: { data: DataPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0)
    return <div className="text-gray-500 text-sm">No data available</div>;

  const maxScore = 100;
  const avg = Math.round(data.reduce((a, b) => a + b.total_score, 0) / data.length);

  const getBarColor = (score: number) => {
    if (score >= 85) return { solid: "#22c55e", glow: "rgba(34, 197, 94, 0.4)" };
    if (score >= 60) return { solid: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" };
    if (score >= 40) return { solid: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" };
    return { solid: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" };
  };

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Weekly Trend</h3>
        <div className="chart-avg">
          <span className="avg-label">7-day avg</span>
          <span className="avg-value">{avg}</span>
        </div>
      </div>

      <div className="bar-chart">
        {data.map((d, i) => {
          const height = Math.min((d.total_score / maxScore) * 100, 100);
          const dayLabel = format(parseISO(d.date), "EEE");
          const colors = getBarColor(d.total_score);
          const isHovered = hoveredIdx === i;

          return (
            <div
              key={d.date}
              className="bar-group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {isHovered && (
                <div className="bar-score-tooltip" style={{ color: colors.solid }}>
                  {d.total_score}
                </div>
              )}
              <div className="bar-wrapper">
                <div
                  className="bar"
                  style={{
                    height: `${height}%`,
                    background: colors.solid,
                    boxShadow: isHovered ? `0 0 16px 4px ${colors.glow}` : "none",
                    transform: isHovered ? "scaleX(1.25)" : "scaleX(1)",
                  }}
                />
              </div>
              <span className="bar-label" style={{ color: isHovered ? colors.solid : undefined }}>
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .chart-container {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          padding: 1.5rem;
          border-radius: 20px;
          box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.9);
          width: 100%;
          transition: box-shadow 0.3s, border-color 0.3s;
        }
        .chart-container:hover {
          box-shadow: 0 12px 40px -4px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255,255,255,0.9);
          border-color: rgba(59, 130, 246, 0.2);
        }
        @media (prefers-color-scheme: dark) {
          .chart-container {
            background: rgba(20, 20, 20, 0.75);
            border-color: rgba(255, 255, 255, 0.07);
            box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.3);
          }
          .chart-container:hover {
            border-color: rgba(59, 130, 246, 0.25);
            box-shadow: 0 12px 40px -4px rgba(59, 130, 246, 0.12);
          }
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          letter-spacing: -0.01em;
        }
        @media (prefers-color-scheme: dark) { .chart-title { color: #f3f4f6; } }

        .chart-avg {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
        }
        .avg-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9ca3af;
          font-weight: 600;
        }
        .avg-value {
          font-size: 1.1rem;
          font-weight: 800;
          color: #111827;
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-color-scheme: dark) { .avg-value { color: #f3f4f6; } }

        .bar-chart {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          height: 130px;
          gap: 0.4rem;
          position: relative;
        }
        .bar-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          height: 100%;
          position: relative;
          cursor: pointer;
        }
        .bar-score-tooltip {
          position: absolute;
          top: -4px;
          font-size: 0.7rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          animation: popIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bar-wrapper {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          margin-bottom: 0.5rem;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 8px;
          position: relative;
        }
        @media (prefers-color-scheme: dark) { .bar-wrapper { background: rgba(255,255,255,0.04); } }
        .bar {
          width: 10px;
          border-radius: 6px;
          min-height: 4px;
          transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                      box-shadow 0.2s ease, 
                      transform 0.2s ease;
        }
        .bar-label {
          font-size: 0.68rem;
          color: #9ca3af;
          font-weight: 600;
          transition: color 0.2s;
        }
      `}</style>
    </div>
  );
}
