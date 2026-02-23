"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

type AxisData = {
  axis: string;
  total_score: number;
  entries_count: number;
};

export function AxisRadarChart({ data }: { data: AxisData[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="radar-container">
      <h3 className="chart-title">Life Balance</h3>
      <div className="radar-wrapper" style={{ width: '100%', height: 260, minHeight: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="rgba(156, 163, 175, 0.2)" />
            <PolarAngleAxis 
              dataKey="axis" 
              tick={{ fill: "#6b7280", fontSize: 11, fontWeight: 600 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 'auto']} 
              tick={false} 
              axisLine={false} 
            />
            <Radar
              name="Points"
              dataKey="total_score"
              stroke="#6366f1"
              strokeWidth={2}
              fill="#6366f1"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <style jsx>{`
        .radar-container {
            background: white;
            padding: 1.5rem;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
         @media (prefers-color-scheme: dark) {
            .radar-container { background: #1f1f1f; color: white; border: 1px solid #333; box-shadow: none; }
        }
        .chart-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: #374151;
            align-self: flex-start;
        }
        @media (prefers-color-scheme: dark) { .chart-title { color: #d1d5db; } }
      `}</style>
    </div>
  );
}
