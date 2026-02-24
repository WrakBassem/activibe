"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserAvatar } from "./components/user-avatar";
import { StreakCard } from "./components/charts/StreakCard";
import { WeeklyProgress } from "./components/charts/WeeklyProgress";
import { ActivityHeatmap } from "./components/charts/ActivityHeatmap";
import { AxisRadarChart } from "./components/charts/AxisRadarChart";
import { RippleEffectSlider } from "./components/charts/RippleEffectSlider";
import { GrowthAvatar } from "./components/GrowthAvatar";
import { HabitConstellation } from "./components/charts/HabitConstellation";
import { QuestBoard } from "./components/QuestBoard";
import { MorningModal } from "./components/MorningModal";

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [todayLog, setTodayLog] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [xpStatus, setXpStatus] = useState<any>(null);
  const [levelUpData, setLevelUpData] = useState<{ level: number; newTitles: string[] } | null>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [correlations, setCorrelations] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [kpiRes, todayRes, insightRes, suggestionsRes, xpRes, aiInsightsRes, corrRes] = await Promise.all([
             fetch("/api/analytics"),
             fetch(`/api/daily`),
             fetch('/api/coach/insight'),
             fetch('/api/coach/adaptive'),
             fetch('/api/xp'),
             fetch('/api/reports/insights?type=daily'),
             fetch('/api/analytics/correlations')
        ]);

        const kpiData = await kpiRes.json();
        const todayData = await todayRes.json();
        const insightData = await insightRes.json();
        const suggestionsData = await suggestionsRes.json();
        const xpData = await xpRes.json();
        const aiInsightsData = await aiInsightsRes.json();
        const corrData = await corrRes.json();

        if (kpiData.success) setAnalytics(kpiData.data);
        if (todayData.success) setTodayLog(todayData.data.summary);
        if (insightData.success) setInsight(insightData.data);
        if (suggestionsData.success) setSuggestions(suggestionsData.data);
        if (xpData.success) setXpStatus(xpData.data);
        if (aiInsightsData.success && aiInsightsData.data) setAiInsights(aiInsightsData.data);
        if (corrData.success) setCorrelations(corrData.data);

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
  
  // Dynamic Burnout/Momentum Banner calculation
  const getDynamicStatus = () => {
      // Very basic logic for demo: In a real app we'd fetch burnout_flag or recent_avg
      if (todayLog?.mode === "Burnout Risk") return { type: 'danger', icon: '🧯', msg: 'High Burnout Risk Detected' };
      if (analytics?.global_streak >= 5) return { type: 'momentum', icon: '🔥', msg: 'Momentum Active! Keep it going.' };
      if (todayLog?.total_score >= 80) return { type: 'success', icon: '⚡', msg: 'Peak Performance Today' };
      return null;
  };

  const dynamicStatus = getDynamicStatus();
  
  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

  return (
    <div className="dashboard">
      <MorningModal />
      
      {/* Dynamic Status Banner */}
      {dynamicStatus && (
          <div className={`status-banner ${dynamicStatus.type}`}>
               <div className="status-glow"></div>
               <span className="status-icon">{dynamicStatus.icon}</span>
               <span className="status-msg">{dynamicStatus.msg}</span>
          </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2 items-center">
            <Link href="/focus" className="icon-btn tooltip-container" title="Deep Focus Forge">
                <span className="text-xl">⏳</span>
            </Link>
            <Link href="/achievements" className="icon-btn tooltip-container" title="Hall of Fame">
                <span className="text-xl">🏆</span>
            </Link>
            <Link href="/magazine" className="icon-btn tooltip-container" title="Weekly Oracle Magazine">
                <span className="text-xl">📜</span>
            </Link>
            <Link href="/skills" className="icon-btn tooltip-container" title="Mastery Skill Trees">
                <span className="text-xl">⚔️</span>
            </Link>
            <Link href="/settings" className="icon-btn tooltip-container" title="Settings">
                <span className="text-xl">⚙️</span>
            </Link>
            <UserAvatar />
        </div>
      </header>

      {/* XP & Level Bar (Modernized) */}
      {xpStatus && (
        <div className="xp-container">
          {/* Dynamic Growth Avatar */}
          <GrowthAvatar 
              level={xpStatus.level} 
              statusType={dynamicStatus?.type as "success" | "danger" | "momentum" | undefined} 
          />

          <div className="xp-content">
            <div className="xp-header">
              <span className="xp-level-text">Level {xpStatus.level}</span>
              <span className="xp-ratio-text">{xpStatus.xpIntoLevel} / {xpStatus.xpNeeded} XP</span>
            </div>
            <div className="xp-bar-bg">
              <div 
                className="xp-bar-fill" 
                style={{ width: `${xpStatus.progressPercent}%` }} 
              />
            </div>
            {xpStatus.titles?.length > 0 && (
              <div className="xp-titles">
                {xpStatus.titles.map((t: any) => (
                  <span key={t.id} title={t.description} className="xp-title-badge">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* RPG Quest Board */}
      <QuestBoard />

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
          <Link href="/daily" className="action-btn primary group">
            <span className="btn-icon transition-transform group-hover:scale-110">📝</span>
            <span>{todayLog ? "Edit Today's Log" : "Log Today"}</span>
          </Link>
          <div className="action-row">
            <Link href="/reports" className="action-btn secondary group">
              <span className="btn-icon transition-transform group-hover:scale-110">📊</span>
              <span>Reports</span>
            </Link>
            <Link href="/coach" className="action-btn secondary group">
              <span className="btn-icon transition-transform group-hover:scale-110">🧠</span>
              <span>AI Coach</span>
            </Link>
          </div>
      </section>

      {/* KPI Grid */}
      <section className="kpi-grid">
           {/* Streak Card */}
           <StreakCard streak={analytics?.global_streak || 0} label="Global Streak" />
           
           {/* Today's Score */}
           <div className={`stat-card ${todayLog ? 'active-glow' : ''}`}>
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

      {/* New Activity Heatmap */}
      <section className="chart-section fadeIn">
          {analytics?.heatmap_scores && <ActivityHeatmap data={analytics.heatmap_scores} />}
      </section>

      {/* Charts Grid */}
      <section className="charts-grid fadeIn">
          {/* Weekly Progress Chart */}
          <div className="chart-wrapper">
            {analytics?.weekly_scores && <WeeklyProgress data={analytics.weekly_scores} />}
          </div>
          
          {/* Axis Radar Chart */}
          <div className="chart-wrapper">
            {analytics?.axis_performance && <AxisRadarChart data={analytics.axis_performance} />}
          </div>
      </section>
      
      {/* Top Metric Streaks */}
      {analytics?.top_streaks?.length > 0 && (
          <section className="streaks-list fadeIn">
              <h3 className="section-title">Top Habits</h3>
              <div className="grid gap-3">
                  {analytics.top_streaks.map((s: any) => (
                      <div key={s.name} className="streak-row group">
                          <span className="streak-name flex items-center gap-2">
                             <span className="streak-icon-wrap">{s.icon}</span> 
                             {s.name}
                          </span>
                          <span className="streak-badge group-hover:bg-orange-100 transition-colors">
                              🔥 {s.current_streak}
                          </span>
                      </div>
                  ))}
              </div>
          </section>
      )}

      {/* Habit Constellation Map */}
      <section className="fadeIn">
        <HabitConstellation />
      </section>

      {/* AI Insights Card */}
      {aiInsights && (aiInsights.tips?.length > 0 || aiInsights.strategies?.length > 0 || aiInsights.focus_areas?.length > 0) && (
        <section className="ai-insights-card fadeIn">
          <div className="ai-insights-header">
            <span className="ai-insights-title flex items-center gap-2">
                <span className="ai-pulse"></span>
                🤖 AI Coach Insights
            </span>
            <span className="ai-insights-badge">
              {aiInsights.report_type === 'weekly' ? '🗓 Last Week' : '📅 Yesterday'}
            </span>
          </div>

          <div className="ai-insights-grid">
            {aiInsights.focus_areas?.length > 0 && (
                <div className="ai-insights-section">
                <p className="ai-insights-label">🎯 Focus Areas</p>
                <div className="focus-chips">
                    {aiInsights.focus_areas.map((f: any, i: number) => (
                    <div key={i} className="focus-chip" title={f.reason}>
                        <span className="focus-chip-area">{f.area}</span>
                        {f.reason && <span className="focus-chip-reason">{f.reason}</span>}
                    </div>
                    ))}
                </div>
                </div>
            )}

            <div className="flex flex-col gap-4">
                {aiInsights.tips?.length > 0 && (
                    <div className="ai-insights-section">
                    <p className="ai-insights-label">💡 Tips</p>
                    <ul className="ai-list">
                        {aiInsights.tips.slice(0, 2).map((tip: string, i: number) => (
                        <li key={i} className="ai-list-item">
                            <span className="ai-bullet">›</span> {tip}
                        </li>
                        ))}
                    </ul>
                    </div>
                )}

                {aiInsights.strategies?.length > 0 && (
                    <div className="ai-insights-section">
                    <p className="ai-insights-label">⚡ Strategy</p>
                    <ul className="ai-list">
                        {aiInsights.strategies.slice(0, 1).map((s: string, i: number) => (
                        <li key={i} className="ai-list-item">
                            <span className="ai-bullet">›</span> {s}
                        </li>
                        ))}
                    </ul>
                    </div>
                )}
            </div>
          </div>
        </section>
      )}

      {/* Ripple Effect Sandbox */}
      {correlations && correlations.length > 0 ? (
          <RippleEffectSlider correlations={correlations} />
      ) : (
          <div className="ripple-sandbox placeholder-sandbox">
             <div className="sandbox-header">
                <h3 className="section-title flex items-center gap-2">
                  <span className="sandbox-icon">🎛️</span>
                  Sandbox: Actions & Consequences
                </h3>
                <p className="sandbox-subtitle">Not enough data to calculate habit ripples yet.</p>
             </div>
             <div className="placeholder-content">
                 <div className="placeholder-icon">🌱</div>
                 <p>Log a few more days of data. Once the AI detects patterns between your habits, interactive sliders will appear here to help you diagnose what drives your success.</p>
             </div>
          </div>
      )}

      <style jsx>{`
        .placeholder-sandbox {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 3rem 1.5rem;
            border-style: dashed;
            border-width: 2px;
            background: rgba(255,255,255,0.3);
            border-color: rgba(0,0,0,0.1);
            border-radius: 20px;
            margin-top: 2rem;
        }
        @media (prefers-color-scheme: dark) {
            .placeholder-sandbox { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); }
        }
        .placeholder-sandbox .sandbox-header { margin-bottom: 2rem; display: flex; flex-direction: column; align-items: center; }
        .placeholder-content { max-width: 400px; color: #6b7280; font-size: 0.95rem; line-height: 1.6; }
        .placeholder-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.8; filter: grayscale(0.5); }
        @media (prefers-color-scheme: dark) { .placeholder-content { color: #9ca3af; } }

        /* Global Animations */
        @keyframes fadeInScale {
            0% { opacity: 0; transform: translateY(10px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fadeIn {
            animation: fadeInScale 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .dashboard {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem 1rem 4rem;
        }
        
        /* Dynamic Status Banner */
        .status-banner {
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 99px;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
            font-weight: 600;
            box-shadow: 0 4px 15px -3px rgba(0,0,0,0.1);
            animation: pulse-border 2s infinite;
        }
        .status-banner.momentum {
            background: linear-gradient(90deg, #ffedd5, #ffedd5);
            color: #c2410c;
            border: 1px solid #fdba74;
        }
        .status-banner.success {
            background: linear-gradient(90deg, #dcfce7, #dcfce7);
            color: #15803d;
            border: 1px solid #86efac;
        }
        .status-banner.danger {
            background: linear-gradient(90deg, #fee2e2, #fee2e2);
            color: #b91c1c;
            border: 1px solid #fca5a5;
        }
        @media (prefers-color-scheme: dark) {
            .status-banner.momentum { background: linear-gradient(90deg, #431407, #431407); color: #fdba74; border-color: #7c2d12; }
            .status-banner.success { background: linear-gradient(90deg, #052e16, #052e16); color: #86efac; border-color: #065f46; }
            .status-banner.danger { background: linear-gradient(90deg, #450a0a, #450a0a); color: #fca5a5; border-color: #7f1d1d; }
        }

        .dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2rem;
        }
        .dashboard-title {
            font-size: 2rem;
            font-weight: 800;
            margin: 0;
            line-height: 1.1;
            letter-spacing: -0.02em;
        }
        .dashboard-subtitle {
            font-size: 0.95rem;
            color: #6b7280;
            margin-top: 0.25rem;
            font-weight: 500;
        }
        
        /* Modernized XP Bar */
        .xp-container {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 16px;
          padding: 12px 16px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,1);
        }
        @media (prefers-color-scheme: dark) {
            .xp-container { 
                background: rgba(30,30,30,0.6); 
                border-color: rgba(255,255,255,0.05);
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
            }
        }
        .xp-content { flex: 1; }
        .xp-header { display: flex; justify-content: space-between; margin-bottom: 6px; align-items: flex-end; }
        .xp-level-text { font-size: 0.85rem; color: #8b5cf6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .xp-ratio-text { font-size: 0.75rem; color: #6b7280; font-weight: 600; font-variant-numeric: tabular-nums; }
        .xp-bar-bg { background: rgba(0,0,0,0.05); border-radius: 99px; height: 8px; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
        @media (prefers-color-scheme: dark) { .xp-bar-bg { background: rgba(255,255,255,0.1); } }
        .xp-bar-fill {
            background: linear-gradient(90deg, #8b5cf6, #3b82f6);
            height: 100%;
            border-radius: 99px;
            transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
        }
        .xp-bar-fill::after {
            content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transform: translateX(-100%);
            animation: shimmer 2s infinite;
        }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        
        .xp-titles { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
        .xp-title-badge {
            background: rgba(139,92,246,0.1);
            color: #7c3aed;
            font-size: 0.65rem;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid rgba(139,92,246,0.2);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        @media (prefers-color-scheme: dark) { .xp-title-badge { color: #c4b5fd; border-color: rgba(139,92,246,0.3); } }

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

        /* Action Bar Upgrade */
        .action-bar {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-bottom: 2rem;
        }
        .action-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
        }
        .action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 1.125rem;
            border-radius: 16px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .action-btn:active { transform: scale(0.97); }
        .action-btn.primary {
            background: linear-gradient(135deg, #111827 0%, #374151 100%);
            color: white;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            font-size: 1.05rem;
        }
        @media (prefers-color-scheme: dark) {
            .action-btn.primary {
                background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
                color: #111827;
                box-shadow: 0 10px 25px -5px rgba(255, 255, 255, 0.1);
            }
        }
        .action-btn.primary:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.3); transform: translateY(-2px); }
        .action-btn.secondary {
            background: white;
            border: 1px solid #e5e7eb;
            color: #4b5563;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .action-btn.secondary:hover { border-color: #d1d5db; background: #f9fafb; transform: translateY(-1px); }
        
        @media (prefers-color-scheme: dark) {
            .action-btn.secondary { background: #1f1f1f; border-color: #333; color: #e5e7eb; }
            .action-btn.secondary:hover { background: #2a2a2a; border-color: #444; }
            .icon-btn:hover { background: #333; }
        }

        .kpi-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
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
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }
        .stat-card.active-glow {
            border-color: rgba(34,197,94,0.3);
            box-shadow: 0 10px 25px -5px rgba(34,197,94,0.1);
        }
        @media (prefers-color-scheme: dark) {
            .stat-card { background: #1f1f1f; border-color: #333; }
            .stat-card.active-glow { border-color: rgba(34,197,94,0.2); box-shadow: 0 10px 25px -5px rgba(34,197,94,0.05); }
        }
        .stat-label {
            font-size: 0.75rem;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        .stat-value { font-size: 2.75rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
        .stat-value.muted { color: #d1d5db; @media(prefers-color-scheme: dark) { color: #374151; } }
        .stat-sublabel { font-size: 0.85rem; color: #9ca3af; margin-top: 0.5rem; font-weight: 500; background: rgba(0,0,0,0.04); padding: 2px 8px; border-radius: 6px; }
        @media(prefers-color-scheme: dark) { .stat-sublabel { background: rgba(255,255,255,0.05); } }

        .chart-section { margin-bottom: 1.5rem; animation-delay: 0.1s; }
        
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
            animation-delay: 0.2s;
        }
        
        /* Show side by side on slightly larger screens */
        @media (min-width: 640px) {
            .charts-grid {
                grid-template-columns: 1fr 1fr;
            }
            .charts-grid .chart-wrapper:first-child { grid-column: 1 / -1; }
        }
        
        .section-title {
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 1rem;
            color: #111827;
            letter-spacing: -0.01em;
        }
        @media (prefers-color-scheme: dark) { .section-title { color: #f9fafb; } }

        .streaks-list {
            margin-bottom: 2rem;
            animation-delay: 0.3s;
        }
        .streak-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: white;
            padding: 1rem 1.25rem;
            border-radius: 14px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0,0,0,0.01);
            transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }
        .streak-row:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px -3px rgba(0,0,0,0.05);
            border-color: #d1d5db;
        }
        @media (prefers-color-scheme: dark) {
            .streak-row { background: #1f1f1f; border-color: #333; }
            .streak-row:hover { border-color: #4b5563; }
        }
        .streak-name { font-weight: 600; font-size: 0.95rem; }
        .streak-icon-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: rgba(0,0,0,0.04);
            border-radius: 8px;
            font-size: 1.1rem;
        }
        @media (prefers-color-scheme: dark) { .streak-icon-wrap { background: rgba(255,255,255,0.05); } }
        .streak-badge { 
            background: #fff7ed; 
            color: #ea580c; 
            font-size: 0.8rem; 
            font-weight: 700; 
            padding: 0.35rem 0.75rem; 
            border-radius: 99px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        @media (prefers-color-scheme: dark) {
             .streak-badge { background: #431407; color: #fdba74; }
        }

        /* AI Insights Card Upgraded */
        .ai-insights-card {
          background: linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.05) 100%);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 20px;
          padding: 1.5rem;
          margin-top: 2rem;
          position: relative;
          overflow: hidden;
          animation-delay: 0.4s;
        }
        .ai-insights-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; height: 4px;
            background: linear-gradient(90deg, #6366f1, #a855f7);
        }

        @media (prefers-color-scheme: dark) {
          .ai-insights-card {
            background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%);
            border-color: rgba(99,102,241,0.3);
          }
        }
        .ai-pulse {
            display: inline-block;
            width: 8px; height: 8px;
            background: #6366f1;
            border-radius: 50%;
            box-shadow: 0 0 0 rgba(99, 102, 241, 0.4);
            animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
            0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
            100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        
        .ai-insights-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .ai-insights-title {
          font-size: 1rem;
          font-weight: 700;
          color: #4338ca;
        }
        @media (prefers-color-scheme: dark) { .ai-insights-title { color: #a5b4fc; } }
        .ai-insights-badge {
          font-size: 0.7rem;
          background: rgba(99,102,241,0.1);
          color: #6366f1;
          padding: 0.25rem 0.6rem;
          border-radius: 99px;
          font-weight: 600;
          border: 1px solid rgba(99,102,241,0.2);
        }
        @media (prefers-color-scheme: dark) { .ai-insights-badge { color: #c7d2fe; } }
        
        .ai-insights-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.25rem;
        }
        @media (min-width: 640px) {
            .ai-insights-grid { grid-template-columns: 1fr 1fr; gap: 2rem; }
        }
        
        .ai-insights-section { margin-bottom: 0; }
        .ai-insights-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6b7280;
          margin-bottom: 0.75rem;
        }
        .focus-chips { display: flex; flex-direction: column; gap: 0.5rem; }
        .focus-chip {
          background: white;
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 12px;
          padding: 0.75rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        @media (prefers-color-scheme: dark) { .focus-chip { background: rgba(0,0,0,0.2); border-color: rgba(99,102,241,0.3); } }
        .focus-chip-area {
          display: block;
          font-size: 0.9rem;
          font-weight: 700;
          color: #4338ca;
        }
        @media (prefers-color-scheme: dark) { .focus-chip-area { color: #c7d2fe; } }
        .focus-chip-reason {
          display: block;
          font-size: 0.8rem;
          color: #4b5563;
          margin-top: 0.25rem;
          line-height: 1.4;
        }
        @media (prefers-color-scheme: dark) { .focus-chip-reason { color: #9ca3af; } }
        .ai-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
        .ai-list-item {
          font-size: 0.9rem;
          color: #374151;
          line-height: 1.5;
          display: flex;
          gap: 0.5rem;
        }
        @media (prefers-color-scheme: dark) { .ai-list-item { color: #d1d5db; } }
        .ai-bullet { color: #8b5cf6; font-weight: bold; }
      `}</style>
    </div>
  );
}
