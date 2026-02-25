"use client";

import { format, subDays } from "date-fns";
import { useMemo, useState } from "react";

type DataPoint = {
  date: string;
  total_score: number;
  mode: string;
};

export function ActivityHeatmap({ data }: { data: DataPoint[] }) {
  const today = new Date();
  const days = 60;
  const [tooltip, setTooltip] = useState<{ date: string; score: number | undefined } | null>(null);

  const calendarMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data) {
      data.forEach((d) => {
        const dString = d.date.substring(0, 10);
        map.set(dString, d.total_score);
      });
    }
    return map;
  }, [data]);

  const grid = useMemo(() => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const dateStr = format(d, "yyyy-MM-dd");
      const score = calendarMap.get(dateStr);
      result.push({ date: dateStr, score });
    }
    return result;
  }, [calendarMap]);

  const getColor = (score: number | undefined) => {
    if (score === undefined || score < 1) return "var(--hm-level-0)";
    if (score >= 85) return "var(--hm-level-4)";
    if (score >= 65) return "var(--hm-level-3)";
    if (score >= 40) return "var(--hm-level-2)";
    return "var(--hm-level-1)";
  };

  const totalLogged = grid.filter((c) => c.score !== undefined).length;

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        <div>
          <h3 className="chart-title">Activity Matrix</h3>
          <p className="chart-subtitle">{totalLogged} days logged out of the last 60</p>
        </div>
        <div className="legend">
          <span className="legend-label">Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div
              key={l}
              className="legend-box"
              style={{ background: `var(--hm-level-${l})` }}
            />
          ))}
          <span className="legend-label">More</span>
        </div>
      </div>

      {tooltip && (
        <div className="heatmap-tooltip">
          <strong>{tooltip.date}</strong>
          <span>{tooltip.score !== undefined ? `Score: ${tooltip.score}` : "No data"}</span>
        </div>
      )}

      <div className="grid-scroll">
        <div className="heatmap-grid">
          {grid.map((cell) => (
            <div
              key={cell.date}
              className="heatmap-cell"
              style={{ background: getColor(cell.score) }}
              onMouseEnter={() => setTooltip({ date: cell.date, score: cell.score })}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .heatmap-container {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.6);
          padding: 1.5rem;
          border-radius: 20px;
          box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.9);
          width: 100%;
          position: relative;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;

          --hm-level-0: #ebedf0;
          --hm-level-1: #c6e48b;
          --hm-level-2: #7bc96f;
          --hm-level-3: #239a3b;
          --hm-level-4: #196127;
        }
        .heatmap-container:hover {
          box-shadow: 0 12px 40px -4px rgba(35, 154, 59, 0.15), inset 0 1px 0 rgba(255,255,255,0.9);
          border-color: rgba(35, 154, 59, 0.25);
        }
        @media (prefers-color-scheme: dark) {
          .heatmap-container {
            background: rgba(20, 20, 20, 0.75);
            border-color: rgba(255, 255, 255, 0.07);
            box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.3);

            --hm-level-0: #161b22;
            --hm-level-1: #0e4429;
            --hm-level-2: #006d32;
            --hm-level-3: #26a641;
            --hm-level-4: #39d353;
          }
          .heatmap-container:hover {
            border-color: rgba(57, 211, 83, 0.25);
            box-shadow: 0 12px 40px -4px rgba(57, 211, 83, 0.1);
          }
        }

        .heatmap-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 1rem;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          letter-spacing: -0.01em;
        }
        @media (prefers-color-scheme: dark) { .chart-title { color: #f3f4f6; } }

        .chart-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 3px 0 0;
          font-weight: 500;
        }

        .heatmap-tooltip {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          font-size: 0.78rem;
          color: #374151;
          background: rgba(0,0,0,0.05);
          padding: 4px 10px;
          border-radius: 8px;
          margin-bottom: 0.75rem;
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-color-scheme: dark) { .heatmap-tooltip { background: rgba(255,255,255,0.08); color: #d1d5db; } }

        .grid-scroll {
          width: 100%;
          overflow-x: auto;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .grid-scroll::-webkit-scrollbar { display: none; }

        .heatmap-grid {
          display: grid;
          grid-template-rows: repeat(7, 1fr);
          grid-auto-flow: column;
          gap: 4px;
          grid-auto-columns: 12px;
        }

        .heatmap-cell {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          cursor: pointer;
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.15s ease;
        }
        .heatmap-cell:hover {
          transform: scale(1.4);
          filter: brightness(1.2);
          z-index: 10;
          position: relative;
        }

        .legend {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .legend-label {
          font-size: 0.7rem;
          color: #9ca3af;
        }
        .legend-box {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
