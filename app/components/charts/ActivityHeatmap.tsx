"use client";

import { format, subDays, parseISO, differenceInDays } from "date-fns";
import { useMemo } from "react";

type DataPoint = {
  date: string;
  total_score: number;
  mode: string;
};

export function ActivityHeatmap({ data }: { data: DataPoint[] }) {
  // Generate the last 60 days
  const today = new Date();
  const days = 60;
  
  const calendarMap = useMemo(() => {
    const map = new Map<string, number>();
    if (data) {
        data.forEach(d => {
            // Take the string Date YYYY-MM-DD
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
        const dateStr = format(d, 'yyyy-MM-dd');
        const score = calendarMap.get(dateStr);
        result.push({ date: dateStr, score });
    }
    return result;
  }, [calendarMap, days, today]);

  const getColor = (score: number | undefined) => {
      if (score === undefined || score < 1) return 'var(--color-level-0)';
      if (score >= 85) return 'var(--color-level-4)'; // Excellent
      if (score >= 65) return 'var(--color-level-3)'; // Good
      if (score >= 40) return 'var(--color-level-2)'; // Average
      return 'var(--color-level-1)'; // Low
  };

  return (
    <div className="heatmap-container">
      <div className="flex justify-between items-end mb-4">
        <h3 className="chart-title mb-0">Activity Matrix</h3>
        <div className="legend">
            <span className="text-xs text-gray-400 mr-2">Less</span>
            <div className="legend-box" style={{ background: 'var(--color-level-0)' }}></div>
            <div className="legend-box" style={{ background: 'var(--color-level-1)' }}></div>
            <div className="legend-box" style={{ background: 'var(--color-level-2)' }}></div>
            <div className="legend-box" style={{ background: 'var(--color-level-3)' }}></div>
            <div className="legend-box" style={{ background: 'var(--color-level-4)' }}></div>
            <span className="text-xs text-gray-400 ml-2">More</span>
        </div>
      </div>
      
      <div className="grid-scroll">
          <div className="heatmap-grid">
            {grid.map((cell) => (
                <div 
                    key={cell.date} 
                    className="heatmap-cell"
                    style={{ background: getColor(cell.score) }}
                    title={`${cell.date}: ${cell.score !== undefined ? cell.score : 'No data'}`}
                ></div>
            ))}
          </div>
      </div>

      <style jsx>{`
        .heatmap-container {
            background: white;
            padding: 1.5rem;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            width: 100%;
            
            /* CSS Variables for theme switching */
            --color-level-0: #ebedf0;
            --color-level-1: #c6e48b;
            --color-level-2: #7bc96f;
            --color-level-3: #239a3b;
            --color-level-4: #196127;
        }
         @media (prefers-color-scheme: dark) {
            .heatmap-container { 
                background: #1f1f1f; 
                border: 1px solid #333; 
                box-shadow: none;
                
                --color-level-0: #161b22;
                --color-level-1: #0e4429;
                --color-level-2: #006d32;
                --color-level-3: #26a641;
                --color-level-4: #39d353;
            }
        }
        .chart-title {
            font-size: 1rem;
            font-weight: 600;
            color: #374151;
        }
        @media (prefers-color-scheme: dark) { .chart-title { color: #d1d5db; } }
        
        .grid-scroll {
            width: 100%;
            overflow-x: auto;
            /* Hide scrollbar for cleaner look but keep functionality */
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
        .grid-scroll::-webkit-scrollbar {
            display: none;
        }

        .heatmap-grid {
            display: grid;
            grid-template-rows: repeat(7, 1fr);
            grid-auto-flow: column;
            gap: 4px;
            /* Ensure it fits 60 days (approx 8.5 weeks) without scrolling if possible, 
               but we use grid-auto-columns to let it flow naturally */
            grid-auto-columns: 12px;
        }
        
        .heatmap-cell {
            width: 12px;
            height: 12px;
            border-radius: 3px;
            transition: transform 0.1s;
        }
        .heatmap-cell:hover {
            transform: scale(1.2);
            border: 1px solid rgba(0,0,0,0.5);
            z-index: 10;
        }
         @media (prefers-color-scheme: dark) {
             .heatmap-cell:hover { border-color: rgba(255,255,255,0.8); }
         }

        .legend {
            display: flex;
            align-items: center;
            gap: 4px;
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
