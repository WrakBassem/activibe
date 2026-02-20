"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserAvatar } from "./components/user-avatar";
import { StreakCard } from "./components/charts/StreakCard";
import { WeeklyProgress } from "./components/charts/WeeklyProgress";

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [xpStatus, setXpStatus] = useState<any>(null);
  const [levelUpData, setLevelUpData] = useState<{ level: number; newTitles: string[] } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [kpiRes, todayRes, insightRes, suggestionsRes, xpRes] = await Promise.all([
             fetch("/api/analytics"),
             fetch(`/api/daily`),
             fetch('/api/coach/insight'),
             fetch('/api/coach/adaptive'),
             fetch('/api/xp'),
        ]);

        const kpiData = await kpiRes.json();
        const todayData = await todayRes.json();
        const insightData = await insightRes.json();
        const suggestionsData = await suggestionsRes.json();
        const xpData = await xpRes.json();

        if (kpiData.success) setAnalytics(kpiData.data);
        if (todayData.success) setTodayLog(todayData.data.summary);
        if (insightData.success) setInsight(insightData.data);
        if (suggestionsData.success) setSuggestions(suggestionsData.data);
        if (xpData.success) setXpStatus(xpData.data);

      } catch (err: any) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleApplySuggestion = async (metricId: string, newLevel: number) => {
      try {
          const res = await fetch('/api/coach/adaptive', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ metric_id: metricId, new_difficulty: newLevel })
          });
          
          if (res.ok) {
              // Remove suggestion from UI
              setSuggestions(prev => prev.filter(s => s.metric_id !== metricId));
              alert("Difficulty updated! 🚀");
          }
      } catch (e) {
          console.error(e);
      }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#84cc16";
    if (score >= 55) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };
  
  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2 items-center">
            <Link href="/settings" className="icon-btn" title="Settings">⚙️</Link>
            <UserAvatar />
        </div>
      </header>

      {/* XP & Level Bar */}
      {xpStatus && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {/* Level Badge */}
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: 'white',
            flexShrink: 0,
          }}>
            {xpStatus.level}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>Level {xpStatus.level}</span>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>{xpStatus.xpIntoLevel} / {xpStatus.xpNeeded} XP</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                height: '100%',
                width: `${xpStatus.progressPercent}%`,
                borderRadius: '99px',
                transition: 'width 0.5s ease',
              }} />
            </div>
            {xpStatus.titles?.length > 0 && (
              <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {xpStatus.titles.map((t: any) => (
                  <span key={t.id} title={t.description} style={{
                    background: 'rgba(168,85,247,0.2)',
                    color: '#c4b5fd',
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    border: '1px solid rgba(168,85,247,0.3)',
                  }}>
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Coach Insight Banner */}
      {insight && (
          <div className={`insight-banner ${insight.type}`}>
              <span className="insight-icon">
                  {insight.type === 'warning' ? '⚠️' : insight.type === 'danger' ? '🛑' : insight.type === 'success' ? '💡' : 'ℹ️'}
              </span>
              <p className="insight-text">{insight.message}</p>
          </div>
      )}
      
      {/* Action Bar */}
      <section className="action-bar">
          <Link href="/daily" className="action-btn primary">
            {todayLog ? "Edit Today's Log" : "📝 Log Today"}
          </Link>
          <Link href="/reports" className="action-btn secondary">
            📊 Reports
          </Link>
          <Link href="/coach" className="action-btn secondary">
            🧠 AI Coach
          </Link>
      </section>

      {/* KPI Grid */}
      <section className="kpi-grid">
           {/* Streak Card */}
           <StreakCard streak={analytics?.global_streak || 0} label="Global Streak" />
           
           {/* Today's Score */}
           <div className="stat-card">
               <span className="stat-label">Today's Score</span>
               <div className="stat-value-wrapper">
                   {todayLog ? (
                       <span className="stat-value" style={{ color: getScoreColor(todayLog.total_score) }}>
                           {todayLog.total_score}
                       </span>
                   ) : (
                       <span className="stat-value muted">--</span>
                   )}
               </div>
               <span className="stat-sublabel">{todayLog?.mode || "Not logged"}</span>
           </div>
      </section>

      {/* Weekly Progress Chart */}
      <section className="chart-section">
          {analytics?.weekly_scores && <WeeklyProgress data={analytics.weekly_scores} />}
      </section>
      
      {/* Top Metric Streaks */}
      {analytics?.top_streaks?.length > 0 && (
          <section className="streaks-list">
              <h3 className="section-title">Top Habits</h3>
              <div className="grid gap-2">
                  {analytics.top_streaks.map((s: any) => (
                      <div key={s.name} className="streak-row">
                          <span className="streak-name">{s.icon} {s.name}</span>
                          <span className="streak-badge">🔥 {s.current_streak} days</span>
                      </div>
                  ))}
              </div>
          </section>
      )}

      <style jsx>{`
        .dashboard {
          max-width: 600px;
          margin: 0 auto;
          padding: 1.5rem 1rem 4rem;
        }
        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
        }
        .dashboard-title {
            font-size: 1.75rem;
            font-weight: 800;
            margin: 0;
            line-height: 1.2;
        }
        .dashboard-subtitle {
            font-size: 0.9rem;
            color: #6b7280;
            margin-top: 0.25rem;
        }
        .insight-banner {
            padding: 1rem;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            font-size: 0.9rem;
            line-height: 1.5;
        }
        .insight-banner.info { background: #eff6ff; color: #1e40af; border: 1px solid #dbeafe; }
        .insight-banner.success { background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
        .insight-banner.warning { background: #fff7ed; color: #9a3412; border: 1px solid #ffedd5; }
        .insight-banner.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fee2e2; }
        
        @media (prefers-color-scheme: dark) {
            .insight-banner.info { background: #172554; color: #bfdbfe; border-color: #1e3a8a; }
            .insight-banner.success { background: #052e16; color: #bbf7d0; border-color: #064e3b; }
            .insight-banner.warning { background: #451a03; color: #fed7aa; border-color: #7c2d12; }
            .insight-banner.danger { background: #450a0a; color: #fecaca; border-color: #7f1d1d; }
        }
        
        .insight-icon { font-size: 1.25rem; }

        .icon-btn {
            font-size: 1.25rem;
            text-decoration: none;
            padding: 0.5rem;
            border-radius: 50%;
            transition: background 0.2s;
        }
        .icon-btn:hover { background: #f3f4f6; }

        .action-bar {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .action-btn {
            text-align: center;
            padding: 1rem;
            border-radius: 12px;
            font-weight: 600;
            text-decoration: none;
            transition: transform 0.1s;
        }
        .action-btn:active { transform: scale(0.98); }
        .action-btn.primary {
            background: #6366f1;
            color: white;
            box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
        }
        .action-btn.secondary {
            background: white;
            border: 1px solid #e5e7eb;
            color: #4b5563;
        }
        @media (prefers-color-scheme: dark) {
            .action-btn.secondary { background: #1f1f1f; border-color: #333; color: #e5e7eb; }
            .icon-btn:hover { background: #333; }
        }

        .kpi-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        @media (prefers-color-scheme: dark) {
            .stat-card { background: #1f1f1f; border-color: #333; }
        }
        .stat-label {
            font-size: 0.75rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .stat-value { font-size: 2.5rem; font-weight: 800; line-height: 1; }
        .stat-value.muted { color: #d1d5db; }
        .stat-sublabel { font-size: 0.85rem; color: #9ca3af; margin-top: 0.25rem; }

        .chart-section { margin-bottom: 2rem; }
        
        .section-title {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 1rem;
            color: #374151;
        }
        @media (prefers-color-scheme: dark) { .section-title { color: #d1d5db; } }

        .streak-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 0.75rem 1rem;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
        }
        @media (prefers-color-scheme: dark) {
            .streak-row { background: #1f1f1f; border-color: #333; }
        }
        .streak-name { font-weight: 500; }
        .streak-badge { 
            background: #fff7ed; 
            color: #c2410c; 
            font-size: 0.75rem; 
            font-weight: 600; 
            padding: 0.25rem 0.6rem; 
            border-radius: 99px; 
        }
        @media (prefers-color-scheme: dark) {
             .streak-badge { background: #431407; color: #fdba74; }
        }
      `}</style>
    </div>
  );
}
