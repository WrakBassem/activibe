"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DailyLog {
  id: number;
  log_date: string;
  sleep_hours: string;
  sleep_quality: number;
  food_quality: number;
  activity_level: number;
  focus_minutes: number;
  habits_score: number;
  tasks_done: number;
  mood: number;
  final_score: string;
  fatigue_penalty: number;
  imbalance_penalty: number;
  discipline_bonus: number;
}

export default function Dashboard() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/logs");
        const data = await res.json();
        if (data.success) {
          setLogs(data.data);
        } else {
          setError(data.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  // Calculate stats
  const avgScore = logs.length
    ? Math.round(logs.reduce((sum, l) => sum + parseFloat(l.final_score || "0"), 0) / logs.length)
    : 0;

  const todayStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
  const todayLog = logs.find((l) => l.log_date.split("T")[0] === todayStr);

  const weekLogs = logs.slice(0, 7);
  const weekAvg = weekLogs.length
    ? Math.round(weekLogs.reduce((sum, l) => sum + parseFloat(l.final_score || "0"), 0) / weekLogs.length)
    : 0;

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#84cc16";
    if (score >= 55) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 55) return "Average";
    if (score >= 40) return "Unstable";
    return "Alert";
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Mood emoji
  const getMoodEmoji = (mood: number) => {
    const emojis = ["😢", "😕", "😐", "🙂", "😄"];
    return emojis[mood + 2] || "😐";
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-box">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1 className="dashboard-title">Personal Operating System</h1>
        <Link href="/daily" className="log-button">
          + Log Today
        </Link>
      </header>

      {/* Stats Cards */}
      <section className="stats-grid">
        {/* Today's Score */}
        <div className="stat-card primary">
          <span className="stat-label">Today</span>
          {todayLog ? (
            <>
              <span
                className="stat-value large"
                style={{ color: getScoreColor(parseFloat(todayLog.final_score)) }}
              >
                {Math.round(parseFloat(todayLog.final_score))}
              </span>
              <span className="stat-sublabel">{getScoreLabel(parseFloat(todayLog.final_score))}</span>
            </>
          ) : (
            <>
              <span className="stat-value large muted">--</span>
              <span className="stat-sublabel">Not logged</span>
            </>
          )}
        </div>

        {/* Week Average */}
        <div className="stat-card">
          <span className="stat-label">7-Day Avg</span>
          <span className="stat-value" style={{ color: getScoreColor(weekAvg) }}>
            {weekAvg || "--"}
          </span>
        </div>

        {/* All-time Average */}
        <div className="stat-card">
          <span className="stat-label">All-Time</span>
          <span className="stat-value" style={{ color: getScoreColor(avgScore) }}>
            {avgScore || "--"}
          </span>
        </div>

        {/* Total Entries */}
        <div className="stat-card">
          <span className="stat-label">Entries</span>
          <span className="stat-value">{logs.length}</span>
        </div>
      </section>

      {/* Score Chart (Simple bar visualization) */}
      {logs.length > 0 && (
        <section className="chart-section">
          <h2 className="section-title">Recent Scores</h2>
          <div className="bar-chart">
            {weekLogs.reverse().map((log) => {
              const score = parseFloat(log.final_score || "0");
              return (
                <div key={log.id} className="bar-container">
                  <div
                    className="bar"
                    style={{
                      height: `${score}%`,
                      backgroundColor: getScoreColor(score),
                    }}
                  >
                    <span className="bar-value">{Math.round(score)}</span>
                  </div>
                  <span className="bar-label">{formatDate(log.log_date).split(",")[0]}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* History List */}
      <section className="history-section">
        <h2 className="section-title">History</h2>
        {logs.length === 0 ? (
          <div className="empty-state">
            <p>No logs yet. Start tracking your day!</p>
            <Link href="/daily" className="log-button">
              + Log Your First Day
            </Link>
          </div>
        ) : (
          <div className="history-list">
            {logs.map((log) => {
              const score = parseFloat(log.final_score || "0");
              return (
                <div key={log.id} className="history-item">
                  <div className="history-date">
                    <span className="date-main">{formatDate(log.log_date)}</span>
                  </div>
                  <div className="history-metrics">
                    <span title="Sleep">🌙 {log.sleep_hours}h</span>
                    <span title="Focus">🎯 {log.focus_minutes}m</span>
                    <span title="Mood">{getMoodEmoji(log.mood)}</span>
                  </div>
                  <div className="history-score" style={{ color: getScoreColor(score) }}>
                    {Math.round(score)}
                  </div>
                  {/* Penalties/Bonuses */}
                  <div className="history-modifiers">
                    {log.fatigue_penalty < 0 && <span className="penalty">⚡ Fatigue</span>}
                    {log.imbalance_penalty < 0 && <span className="penalty">⚠️ Imbalance</span>}
                    {log.discipline_bonus > 0 && <span className="bonus">🏆 Discipline</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          max-width: 600px;
          margin: 0 auto;
          padding: 1.5rem 1rem;
        }

        .loading,
        .error-box {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          color: #6b7280;
        }

        .error-box {
          color: #ef4444;
        }

        /* Header */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .dashboard-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--foreground);
          margin: 0;
        }

        .log-button {
          background: #6366f1;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s;
        }

        .log-button:hover {
          background: #4f46e5;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: var(--background);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-card.primary {
          grid-column: span 2;
          align-items: center;
          padding: 1.25rem;
        }

        @media (prefers-color-scheme: dark) {
          .stat-card {
            border-color: #2a2a2a;
            background: #111;
          }
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
        }

        .stat-value.large {
          font-size: 3rem;
        }

        .stat-value.muted {
          color: #9ca3af;
        }

        .stat-sublabel {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* Chart */
        .chart-section {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .bar-chart {
          display: flex;
          gap: 0.5rem;
          height: 120px;
          align-items: flex-end;
          padding: 0.5rem;
          background: var(--background);
          border: 1px solid #e5e7eb;
          border-radius: 12px;
        }

        @media (prefers-color-scheme: dark) {
          .bar-chart {
            border-color: #2a2a2a;
            background: #111;
          }
        }

        .bar-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .bar {
          width: 100%;
          border-radius: 4px 4px 0 0;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-height: 20px;
          transition: height 0.3s ease;
        }

        .bar-value {
          font-size: 0.625rem;
          font-weight: 600;
          color: white;
          padding-top: 0.25rem;
        }

        .bar-label {
          font-size: 0.625rem;
          color: #9ca3af;
          margin-top: 0.25rem;
        }

        /* History */
        .history-section {
          margin-bottom: 2rem;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .history-item {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--background);
          border: 1px solid #e5e7eb;
          border-radius: 10px;
        }

        @media (prefers-color-scheme: dark) {
          .history-item {
            border-color: #2a2a2a;
            background: #111;
          }
        }

        .history-date {
          display: flex;
          flex-direction: column;
        }

        .date-main {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--foreground);
        }

        .history-metrics {
          display: flex;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .history-score {
          font-size: 1.25rem;
          font-weight: 700;
          min-width: 40px;
          text-align: right;
        }

        .history-modifiers {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 80px;
        }

        .penalty {
          font-size: 0.625rem;
          color: #ef4444;
        }

        .bonus {
          font-size: 0.625rem;
          color: #22c55e;
        }
      `}</style>
    </div>
  );
}
