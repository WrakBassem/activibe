"use client";

import { format, parseISO } from "date-fns";

type DataPoint = {
  date: string; // YYYY-MM-DD
  total_score: number;
  mode: string;
};

export function WeeklyProgress({ data }: { data: DataPoint[] }) {
  if (!data || data.length === 0) return <div className="text-gray-500 text-sm">No data available</div>;

  const maxScore = 100; // Fixed max for consistency, or Math.max(...data.map(d => d.total_score))

  return (
    <div className="chart-container">
      <h3 className="chart-title">Weekly Trend</h3>
      <div className="bar-chart">
        {data.map((d) => {
           const height = Math.min((d.total_score / maxScore) * 100, 100);
           const dateObj = parseISO(d.date);
           const dayLabel = format(dateObj, "EEE"); // Mon, Tue...
           
           // Color based on score/mode
           let barColor = "#e5e7eb";
           if(d.total_score >= 85) barColor = "#22c55e"; // Green
           else if(d.total_score >= 60) barColor = "#3b82f6"; // Blue
           else if(d.total_score >= 40) barColor = "#f59e0b"; // Orange
           else barColor = "#ef4444"; // Red

           return (
             <div key={d.date} className="bar-group">
                <div className="bar-wrapper">
                    <div 
                        className="bar" 
                        style={{ height: `${height}%`, background: barColor }}
                        title={`${d.date}: ${d.total_score}`}
                    ></div>
                </div>
                <span className="bar-label">{dayLabel}</span>
             </div>
           )
        })}
      </div>

      <style jsx>{`
        .chart-container {
            background: white;
            padding: 1.5rem;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            width: 100%;
        }
         @media (prefers-color-scheme: dark) {
            .chart-container { background: #1f1f1f; color: white; }
        }
        .chart-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
            color: #374151;
        }
        @media (prefers-color-scheme: dark) { .chart-title { color: #d1d5db; } }

        .bar-chart {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            height: 120px;
            gap: 0.5rem;
        }
        .bar-group {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            height: 100%;
        }
        .bar-wrapper {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            margin-bottom: 0.5rem;
            background: rgba(0,0,0,0.02);
            border-radius: 8px;
            position: relative;
        }
        .bar {
            width: 12px;
            border-radius: 6px;
            min-height: 4px;
            transition: height 0.5s ease-out;
        }
        .bar-label {
            font-size: 0.7rem;
            color: #9ca3af;
        }
      `}</style>
    </div>
  );
}
