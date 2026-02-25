"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type AxisData = {
  axis: string;
  total_score: number;
  entries_count: number;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "rgba(99,102,241,0.9)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "10px",
          padding: "6px 12px",
          color: "white",
          fontSize: "0.8rem",
          fontWeight: 700,
        }}
      >
        {payload[0].payload.axis}: {Math.round(payload[0].value)}
      </div>
    );
  }
  return null;
};

export function AxisRadarChart({ data }: { data: AxisData[] }) {
  if (!data || data.length === 0) return null;

  const maxScore = Math.max(...data.map((d) => d.total_score));

  return (
    <div className="radar-container">
      <div className="radar-header">
        <h3 className="chart-title">Life Balance</h3>
        <span className="chart-badge">Last 7 days</span>
      </div>

      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <defs>
              <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
              </radialGradient>
            </defs>
            <PolarGrid stroke="rgba(156, 163, 175, 0.15)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "#6b7280", fontSize: 10.5, fontWeight: 700 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, "auto"]}
              tick={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Score"
              dataKey="total_score"
              stroke="#6366f1"
              strokeWidth={2.5}
              fill="url(#radarFill)"
              fillOpacity={1}
              dot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "white" }}
              activeDot={{ r: 6, fill: "#4f46e5", stroke: "white", strokeWidth: 2 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Axis score chips */}
      <div className="axis-chips">
        {data.map((d) => (
          <div key={d.axis} className="axis-chip">
            <span className="chip-name">{d.axis}</span>
            <span className="chip-score">{Math.round(d.total_score)}</span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .radar-container {
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 20px;
          padding: 1.5rem;
          box-shadow: 0 8px 32px -4px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,0.9);
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .radar-container:hover {
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 12px 40px -4px rgba(99, 102, 241, 0.18), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        @media (prefers-color-scheme: dark) {
          .radar-container {
            background: rgba(20, 20, 20, 0.8);
            border-color: rgba(99, 102, 241, 0.2);
            box-shadow: 0 8px 32px -4px rgba(0, 0, 0, 0.3);
          }
          .radar-container:hover {
            border-color: rgba(99, 102, 241, 0.4);
            box-shadow: 0 12px 40px -4px rgba(99, 102, 241, 0.2);
          }
        }

        .radar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
          letter-spacing: -0.01em;
        }
        @media (prefers-color-scheme: dark) { .chart-title { color: #f3f4f6; } }

        .chart-badge {
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
          padding: 3px 8px;
          border-radius: 99px;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        @media (prefers-color-scheme: dark) { .chart-badge { color: #a5b4fc; border-color: rgba(99, 102, 241, 0.3); } }

        .axis-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 0.75rem;
          justify-content: center;
        }
        .axis-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(99, 102, 241, 0.07);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 8px;
          padding: 3px 10px;
          transition: background 0.2s;
        }
        .axis-chip:hover { background: rgba(99, 102, 241, 0.14); }
        @media (prefers-color-scheme: dark) {
          .axis-chip { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.25); }
        }
        .chip-name {
          font-size: 0.72rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        @media (prefers-color-scheme: dark) { .chip-name { color: #9ca3af; } }
        .chip-score {
          font-size: 0.78rem;
          font-weight: 800;
          color: #6366f1;
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-color-scheme: dark) { .chip-score { color: #818cf8; } }
      `}</style>
    </div>
  );
}
