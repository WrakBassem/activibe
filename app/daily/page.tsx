"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

// --- Types ---
type Metric = {
  id: string;
  name: string;
  axis_id: string;
  axis_name: string;
  max_points: number;
  difficulty_level: number;
};

type DailyEntry = {
  metric_id: string;
  completed: boolean;
  score_awarded: number;
  time_spent_minutes?: number;
};

type DailySummary = {
  date: string;
  total_score: number;
  mode: string;
};

export default function DailyLogPage() {
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Data State
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [entries, setEntries] = useState<Record<string, DailyEntry>>({});
  const [summary, setSummary] = useState<DailySummary | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch Metrics & Existing Log
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Parallel fetch: Metrics definition AND Daily Log for selected date
        const [metricsRes, logRes] = await Promise.all([
          fetch("/api/metrics"),
          fetch(`/api/daily?date=${date}`)
        ]);

        const metricsData = await metricsRes.json();
        const logData = await logRes.json();

        if (metricsData.success) {
            setMetrics(metricsData.data);
        }

        if (logData.success) {
            setSummary(logData.data.summary);
            
            // Map entries array to object for easier active state management
            const entryMap: Record<string, DailyEntry> = {};
            if(logData.data.entries) {
                logData.data.entries.forEach((e: any) => {
                    entryMap[e.metric_id] = {
                        metric_id: e.metric_id,
                        completed: e.completed,
                        score_awarded: e.score_awarded,
                        time_spent_minutes: e.time_spent_minutes
                    };
                });
            }
            setEntries(entryMap);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [date]);

  // Handlers
  const handleToggle = (metricId: string) => {
      setEntries(prev => {
          const current = prev[metricId] || { metric_id: metricId, completed: false, score_awarded: 0 };
          return {
              ...prev,
              [metricId]: { ...current, completed: !current.completed }
          };
      });
  };

  const handleTimeChange = (metricId: string, minutes: number) => {
       setEntries(prev => {
          const current = prev[metricId] || { metric_id: metricId, completed: false, score_awarded: 0 };
          return {
              ...prev,
              [metricId]: { ...current, time_spent_minutes: minutes }
          };
      });
  };

  const handleSubmit = async () => {
      try {
          setSubmitting(true);
          // Transform entries object to array
          const payload = {
              date,
              metric_inputs: Object.values(entries).map(e => ({
                  metric_id: e.metric_id,
                  completed: e.completed,
                  time_spent_minutes: e.time_spent_minutes
              }))
          };

          const res = await fetch("/api/daily", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (data.success) {
              setSummary(data.data.summary);
              setMessage("Log saved successfully!");
              setTimeout(() => setMessage(null), 3000);
          } else {
              alert("Error saving log");
          }
      } catch (err) {
          console.error(err);
      } finally {
          setSubmitting(false);
      }
  };

  // Group metrics by Axis
  const axes = Array.from(new Set(metrics.map(m => m.axis_name))).sort();

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Daily Log...</div>;

  return (
    <div className="daily-container">
      <header className="daily-header">
        <Link href="/" className="back-link">← Dashboard</Link>
        <div className="date-picker">
            <label>Date:</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </header>

      {/* Summary Card */}
      <div className="summary-card">
          <div className="score-ring">
              <span className="score-val">{summary?.total_score || 0}</span>
              <span className="score-label">Score</span>
          </div>
          <div className="mode-badge">
              Status: <strong>{summary?.mode || "Unknown"}</strong>
          </div>
      </div>

      <main className="metrics-form">
        {axes.map(axisName => {
            const axisMetrics = metrics.filter(m => m.axis_name === axisName);
            
            return (
                <div key={axisName} className="axis-section">
                    <h3 className="axis-header">{axisName}</h3>
                    <div className="metrics-grid">
                        {axisMetrics.map(metric => {
                            const entry = entries[metric.id] || { completed: false };
                            return (
                                <div key={metric.id} className={`metric-card ${entry.completed ? 'completed' : ''}`} onClick={() => handleToggle(metric.id)}>
                                    <div className="metric-check">
                                        <div className={`checkbox ${entry.completed ? 'checked' : ''}`}>
                                            {entry.completed && "✓"}
                                        </div>
                                    </div>
                                    <div className="metric-info">
                                        <span className="metric-name">{metric.name}</span>
                                        <span className="metric-pts">{metric.max_points} pts</span>
                                    </div>
                                    {/* Optional: Time Input propagation stop */}
                                    {/* For now keeping it simple: just toggle */}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        })}
      </main>

      <footer className="daily-footer">
          {message && <span className="success-msg">{message}</span>}
          <button className="submit-btn" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving..." : "Save Daily Log"}
          </button>
      </footer>

      <style jsx>{`
        .daily-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 1.5rem 1rem 6rem; /* extra padding for fixed footer */
        }
        .daily-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        .back-link {
            text-decoration: none;
            color: #6b7280;
            font-weight: 500;
        }
        .date-picker {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #6b7280;
        }
        .date-picker input {
            padding: 0.25rem 0.5rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            color: var(--foreground);
            background: var(--background);
        }

        /* Summary */
        .summary-card {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 16px;
            padding: 1.5rem;
            color: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        .score-ring {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(255,255,255,0.2);
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
        }
        .score-val { font-size: 2rem; font-weight: 800; line-height: 1; }
        .score-label { font-size: 0.75rem; text-transform: uppercase; opacity: 0.9; }
        .mode-badge { font-size: 1rem; }

        /* Metrics */
        .axis-section { margin-bottom: 2rem; }
        .axis-header {
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            margin-bottom: 0.75rem;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 0.25rem;
        }
        .metrics-grid {
            display: grid;
            gap: 0.75rem;
        }
        .metric-card {
            background: var(--background);
            border: 1px solid #e5e7eb;
            padding: 1rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 1rem;
            cursor: pointer;
            transition: all 0.2s;
        }
        .metric-card:hover { transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        .metric-card.completed {
            background: #f0fdf4;
            border-color: #86efac;
        }
         @media (prefers-color-scheme: dark) {
            .metric-card { background: #111; border-color: #333; }
            .metric-card.completed { background: #064e3b; border-color: #059669; }
        }

        .checkbox {
            width: 24px; height: 24px;
            border: 2px solid #d1d5db;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 0.875rem;
            transition: all 0.2s;
        }
        .metric-card.completed .checkbox {
            background: #22c55e;
            border-color: #22c55e;
        }
        
        .metric-info { display: flex; flex-direction: column; }
        .metric-name { font-weight: 600; font-size: 1rem; }
        .metric-pts { font-size: 0.75rem; color: #6b7280; }

        /* Footer */
        .daily-footer {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            background: var(--background);
            border-top: 1px solid #e5e7eb;
            padding: 1rem;
            display: flex;
            justify-content: center; /* Center button */
            align-items: center;
            gap: 1rem;
            z-index: 10;
             @media (prefers-color-scheme: dark) {
                background: #000; border-color: #333;
            }
        }
        .submit-btn {
            background: #111827;
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 99px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            transition: transform 0.1s;
        }
         @media (prefers-color-scheme: dark) {
            .submit-btn { background: #fff; color: black; }
        }
        .submit-btn:active { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        
        .success-msg { color: #22c55e; font-size: 0.9rem; font-weight: 500; position: absolute; top: -30px; }
      `}</style>
    </div>
  );
}
