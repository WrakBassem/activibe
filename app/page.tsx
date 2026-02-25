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
import { StatusGauge } from "./components/charts/StatusGauge";
import { canAccessFeature, FEATURE_LOCKS } from "@/lib/permissions";
// ─── Tutorial system ───────────────────────────────────────────────────────
import { TutorialDialog } from "./components/TutorialDialog";
import { TutorialTooltip } from "./components/TutorialTooltip";
import { useTutorial } from "./components/TutorialProvider";
import { NotificationPrompt } from "./components/NotificationPrompt";

const SMOKE_BOMB_EFFECT = 'hide_negatives_24h';

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
  const [activeBuffs, setActiveBuffs] = useState<any[]>([]);
  const [activeBoss, setActiveBoss] = useState<any>(null);
  const [smugglerActive, setSmugglerActive] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  // Tutorial hook — exposes startTour() for the help button
  const { startTour } = useTutorial();

  useEffect(() => {
    async function fetchData() {
      try {
        const fetchOpts = { cache: 'no-store' as RequestCache };
        const [kpiRes, todayRes, insightRes, suggestionsRes, xpRes, aiInsightsRes, corrRes, invRes, smugglerRes] = await Promise.all([
             fetch("/api/analytics", fetchOpts),
             fetch(`/api/daily`, fetchOpts),
             fetch('/api/coach/insight', fetchOpts),
             fetch('/api/coach/adaptive', fetchOpts),
             fetch('/api/xp', fetchOpts),
             fetch('/api/reports/insights?type=daily', fetchOpts),
             fetch('/api/analytics/correlations', fetchOpts),
             fetch('/api/inventory', fetchOpts),
             fetch('/api/shop/smuggler', fetchOpts)
        ]);

        const kpiData = await kpiRes.json();
        const todayData = await todayRes.json();
        const insightData = await insightRes.json();
        const suggestionsData = await suggestionsRes.json();
        const xpData = await xpRes.json();
        const aiInsightsData = await aiInsightsRes.json();
        const corrData = await corrRes.json();
        const invData = await invRes.json();
        const smugglerRes_Data = await smugglerRes.json();
        const smugglerActive = smugglerRes_Data.active;
        setSmugglerActive(smugglerActive);

        // Fetch User Role
        const roleRes = await fetch('/api/user/role', fetchOpts);
        const roleData = await roleRes.json();
        if (roleData.success) setUserRole(roleData.role);
        if (todayData.success) setTodayLog(todayData.data.summary);
        if (insightData.success) setInsight(insightData.data);
        if (suggestionsData.success) setSuggestions(suggestionsData.data);
        if (xpData.success) setXpStatus(xpData.data);
        if (aiInsightsData.success && aiInsightsData.data) setAiInsights(aiInsightsData.data);
        if (corrData.success) setCorrelations(corrData.data);
        if (invData.success) setActiveBuffs(invData.data.activeBuffs || []);
        if (todayData.success && todayData.data.active_boss) setActiveBoss(todayData.data.active_boss);

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

  const isSmokeBombActive = activeBuffs.some(b => b.effect_type === SMOKE_BOMB_EFFECT);

  const getScoreColor = (score: number) => {
    if (isSmokeBombActive && score < 55) return "#94a3b8"; // Neutral blue-gray for "hidden" scores
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#84cc16";
    if (score >= 55) return "#eab308";
    if (score >= 40) return "#f97316";
    return "#ef4444";
  };
  
  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

  return (
    <div className={`dashboard ${xpStatus?.hardcore_mode_active ? 'hardcore-active' : ''} ${activeBoss ? 'boss-fight-active' : ''}`}>
      <MorningModal />

      {smugglerActive && (
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 py-2 px-4 text-center border-b border-purple-500/30 flex items-center justify-center gap-4 anim-pulse-slow">
              <span className="text-purple-300 font-black text-[10px] uppercase tracking-[0.2em]">Live Event</span>
              <p className="text-white text-sm font-bold">The Smuggler has arrived with rare gear!</p>
              <Link href="/shop" className="bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full border border-white/20 transition-all">
                  Visit the Market
              </Link>
          </div>
      )}

      {activeBoss && (
          <div className="boss-encounter-banner anim-slide-down">
              <div className="boss-visual">
                  <span className="boss-icon">{activeBoss.image_url || '👹'}</span>
                  <div className="boss-aura"></div>
              </div>
              <div className="boss-info">
                  <div className="boss-header">
                      <h2 className="boss-name">{activeBoss.name}</h2>
                      <span className="boss-lvl">ELITE ADVERSARY</span>
                  </div>
                  <div className="boss-health-container">
                      <div 
                        className="boss-health-fill" 
                        style={{ width: `${Math.round((activeBoss.current_health / activeBoss.max_health) * 100)}%` }}
                      ></div>
                      <span className="boss-health-text">{activeBoss.current_health} / {activeBoss.max_health} HP</span>
                  </div>
                  <p className="boss-warning">Draining {activeBoss.daily_penalty_xp} XP every day until defeated! Log perfect days to strike back.</p>
              </div>
          </div>
      )}
      
      {/* Status Gauge — premium momentum/burnout banner */}
      <StatusGauge 
        todayLog={todayLog} 
        analytics={analytics} 
        smokeBombActive={isSmokeBombActive} 
      />

      {/* PWA Push Notification Request */}
      <NotificationPrompt />

      {/* Welcome dialog (shown once to new users) + spotlight tour overlay */}
      <TutorialDialog />
      <TutorialTooltip />

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        {/* data-tutorial-id targets the icon row for step 8 of the tour */}
        <div className="flex gap-2 items-center" data-tutorial-id="header-icons">
            {xpStatus?.gold !== undefined && (
                <div className="flex items-center bg-black/40 px-3 py-1 mr-2 rounded-full border border-yellow-500/30 tooltip-container" title="Focus Coins (Gold)">
                    <span className="text-yellow-400 font-bold mr-1">{xpStatus.gold}</span>
                    <span className="text-sm">🪙</span>
                </div>
            )}
            {userRole === 'admin' && (
                <Link href="/admin" className="icon-btn tooltip-container" title="Admin Panel">
                    <span className="text-xl">🛡️</span>
                </Link>
            )}
            <Link href="/shop" className="icon-btn tooltip-container relative" title="The Black Market">
                <span className="text-xl text-yellow-500">💰</span>
                {smugglerActive && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-[#0a0a0a] animate-pulse"></span>
                )}
            </Link>
            <Link href="/inventory" className="icon-btn tooltip-container" title="Inventory Bag">
                <span className="text-xl">🎒</span>
            </Link>
            <Link href="/focus" className="icon-btn tooltip-container" title="Deep Focus Forge">
                <span className="text-xl">⏳</span>
            </Link>
            <Link href="/achievements" className="icon-btn tooltip-container" title="Hall of Fame">
                <span className="text-xl">🏆</span>
            </Link>
            <Link href="/magazine" className="icon-btn tooltip-container" title="Weekly Oracle Magazine">
                <span className="text-xl">📜</span>
            </Link>
            <Link href="/campaign" className="icon-btn tooltip-container" title="Story Campaign">
                <span className="text-xl">⚔️</span>
            </Link>
            <Link href="/skills" className="icon-btn tooltip-container" title="Mastery Skill Trees">
                <span className="text-xl">🔮</span>
            </Link>
            {userRole === 'admin' && (
                <button 
                  onClick={async () => {
                    const res = await fetch('/api/notifications/test', { method: 'POST' });
                    const data = await res.json();
                    alert(data.message || data.error);
                  }}
                  className="icon-btn tooltip-container relative text-indigo-400" 
                  title="Test Push Notification"
                >
                    <span className="text-xl">📡</span>
                </button>
            )}
            <Link href="/settings" className="icon-btn tooltip-container" title="Settings">
                <span className="text-xl">⚙️</span>
            </Link>
            {/* Tour trigger button — always visible in the header */}
            <button
              onClick={startTour}
              className="icon-btn tooltip-container"
              title="Start Guided Tour"
              aria-label="Start tutorial tour"
            >
              <span className="text-xl">❓</span>
            </button>
            <UserAvatar />
        </div>
      </header>

      {/* XP & Level Bar (Modernized) — tour step 1 */}
      {xpStatus && (
        <div className="xp-container" data-tutorial-id="xp-bar">
          {/* Dynamic Growth Avatar */}
          <GrowthAvatar 
              level={xpStatus.level} 
          />

          <div className="xp-content">
            <div className="xp-header">
              <span className="xp-level-text">
                Level {xpStatus.level} 
                {xpStatus.hardcore_mode_active && <span className="hardcore-skull" title="Hardcore Mode Active (2x XP)"> 💀</span>}
              </span>
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
            
            {/* Active Buffs Indicator */}
            {activeBuffs.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {activeBuffs.map(buff => (
                   <div key={buff.buff_id} className="text-xs font-semibold py-1 px-2 rounded-full border flex items-center gap-1"
                        style={{ borderColor: 'var(--accent-color, #fbbf24)', color: 'var(--accent-text, #fbbf24)', background: 'rgba(251, 191, 36, 0.1)' }}>
                      <span>{buff.icon}</span>
                      <span>{buff.name} Active</span>
                   </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* RPG Quest Board — tour step 2 */}
      <div data-tutorial-id="quest-board">
        <QuestBoard />
      </div>

      {/* Coach Insight Banner — tour step 3 */}
      {insight && (
          <div className={`insight-banner ${insight.type}`} data-tutorial-id="coach-insight">
              <span className="insight-icon">
                  {insight.type === 'warning' ? '⚠️' : insight.type === 'danger' ? '🛑' : insight.type === 'success' ? '💡' : 'ℹ️'}
              </span>
              <p className="insight-text">{insight.message}</p>
          </div>
      )}
      
      {/* Action Bar — tour step 4 */}
      <section className="action-bar" data-tutorial-id="action-bar">
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
          {userRole === 'admin' && (
              <Link href="/admin" className="action-btn secondary group bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50 mt-1">
                <span className="btn-icon transition-transform group-hover:scale-110 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">🛡️</span>
                <span className="font-bold tracking-tight">Overseer Command Center</span>
              </Link>
          )}
      </section>

      {/* KPI Grid — tour step 5 */}
      <section className="kpi-grid" data-tutorial-id="kpi-grid">
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

      {/* Activity Heatmap — tour step 6 */}
      <section className="chart-section fadeIn" data-tutorial-id="heatmap">
          {analytics?.heatmap_scores && <ActivityHeatmap data={analytics.heatmap_scores} />}
      </section>

      {/* Charts Grid — tour step 7 */}
      <section className="charts-grid fadeIn" data-tutorial-id="charts-grid">
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
        
        /* StatusGauge is now a standalone component */

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
            padding: 1rem 1rem 1rem 1.25rem;
            border-radius: 14px;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            font-size: 0.9rem;
            line-height: 1.5;
            position: relative;
            border: 1px solid transparent;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .insight-banner:hover { transform: translateY(-1px); }
        .insight-banner::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0;
            width: 4px;
            border-radius: 14px 0 0 14px;
        }
        .insight-banner.info { background: #eff6ff; color: #1e40af; border-color: #dbeafe; box-shadow: 0 4px 12px -2px rgba(30, 64, 175, 0.08); }
        .insight-banner.info::before { background: #3b82f6; }
        .insight-banner.success { background: #f0fdf4; color: #166534; border-color: #dcfce7; box-shadow: 0 4px 12px -2px rgba(22, 101, 52, 0.08); }
        .insight-banner.success::before { background: #22c55e; }
        .insight-banner.warning { background: #fff7ed; color: #9a3412; border-color: #ffedd5; box-shadow: 0 4px 12px -2px rgba(154, 52, 18, 0.08); }
        .insight-banner.warning::before { background: #f97316; }
        .insight-banner.danger { background: #fef2f2; color: #991b1b; border-color: #fee2e2; box-shadow: 0 4px 12px -2px rgba(153, 27, 27, 0.08); }
        .insight-banner.danger::before { background: #ef4444; }
        
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
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.6);
            border-radius: 20px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,1);
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 28px -5px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255,255,255,1);
            border-color: rgba(139, 92, 246, 0.2);
        }
        .stat-card.active-glow {
            border-color: rgba(34,197,94,0.3);
            box-shadow: 0 10px 25px -5px rgba(34,197,94,0.15), inset 0 1px 0 rgba(255,255,255,1);
        }
        .stat-card.active-glow:hover {
            box-shadow: 0 16px 40px -5px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,1);
            border-color: rgba(34,197,94,0.5);
        }
        @media (prefers-color-scheme: dark) {
            .stat-card { background: rgba(25, 25, 25, 0.8); border-color: rgba(255,255,255,0.06); }
            .stat-card:hover { border-color: rgba(139, 92, 246, 0.25); box-shadow: 0 12px 28px -5px rgba(0,0,0,0.3); }
            .stat-card.active-glow { border-color: rgba(34,197,94,0.25); box-shadow: 0 10px 25px -5px rgba(34,197,94,0.1); }
            .stat-card.active-glow:hover { border-color: rgba(34,197,94,0.4); box-shadow: 0 16px 40px -5px rgba(34,197,94,0.2); }
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
        
        /* --- HARDCORE MODE UI --- */
        .dashboard.hardcore-active {
            border: 2px solid rgba(239, 68, 68, 0.4);
            border-radius: 24px;
            padding: 1rem;
            animation: hardcore-pulse 4s infinite ease-in-out;
            margin: 0.5rem;
        }

        @keyframes hardcore-pulse {
            0% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }
            50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.3); border-color: rgba(239, 68, 68, 0.6); }
            100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }
        }

        .hardcore-skull {
            color: #ef4444;
            animation: flicker 2s infinite;
            text-shadow: 0 0 8px rgba(239, 68, 68, 0.8);
        }

        @keyframes flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
            75% { opacity: 0.9; }
        }

        /* --- BOSS ENCOUNTER UI --- */
        .boss-encounter-banner {
            margin: 1rem 1rem 2rem 1rem;
            background: linear-gradient(135deg, #111 0%, #2a0a0a 100%);
            border: 2px solid #ef4444;
            border-radius: 20px;
            padding: 1.5rem;
            display: flex;
            gap: 1.5rem;
            align-items: center;
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(239, 68, 68, 0.2);
        }
        .boss-fight-active {
            background-color: #050000;
        }
        .boss-visual {
            position: relative;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .boss-icon {
            font-size: 3.5rem;
            z-index: 2;
            filter: drop-shadow(0 0 10px #ef4444);
            animation: boss-float 3s infinite ease-in-out;
        }
        @keyframes boss-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .boss-aura {
            position: absolute;
            width: 100%; height: 100%;
            background: radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%);
            animation: aura-pulse 2s infinite alternate;
        }
        @keyframes aura-pulse {
            from { transform: scale(1); opacity: 0.4; }
            to { transform: scale(1.5); opacity: 0.2; }
        }
        .boss-info { flex: 1; }
        .boss-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem; }
        .boss-name { font-size: 1.25rem; font-weight: 800; color: #fecaca; text-transform: uppercase; letter-spacing: 1px; }
        .boss-lvl { font-size: 0.7rem; font-weight: 900; color: #ef4444; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); padding: 2px 8px; border-radius: 4px; }
        .boss-health-container {
            height: 24px;
            background: #450a0a;
            border-radius: 6px;
            overflow: hidden;
            position: relative;
            border: 1px solid rgba(239,68,68,0.4);
            margin-bottom: 0.5rem;
        }
        .boss-health-fill {
            height: 100%;
            background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%);
            transition: width 1s ease-in-out;
            box-shadow: 0 0 15px #ef4444;
        }
        .boss-health-text {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.75rem; font-weight: 900; color: white; text-shadow: 0 1px 2px black;
        }
        .boss-warning { font-size: 0.8rem; color: #9ca3af; font-style: italic; }

        @media (max-width: 640px) {
            .boss-encounter-banner { flex-direction: column; text-align: center; gap: 1rem; }
            .boss-header { flex-direction: column; align-items: center; gap: 0.5rem; }
        }
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
