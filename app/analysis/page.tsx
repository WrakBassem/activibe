"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { calculateCorrelation, getCorrelationStrength, calculateRegression } from "../../lib/analysis";
import { canAccessFeature, FEATURE_LOCKS } from "@/lib/permissions";
import "./analysis.css";

interface DailyLog {
  log_date: string;
  sleep_hours: string;
  sleep_quality: number;
  food_quality: number;
  activity_level: number;
  focus_minutes: number;
  habits_score: number;
  mood: number;
  final_score: string;
}

export default function AnalysisPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Check Permissions first
        const xpRes = await fetch("/api/xp", { cache: 'no-store' });
        const xpData = await xpRes.json();
        const hasPerms = canAccessFeature('analysis_page', xpData?.data?.attributes);
        setHasAccess(hasPerms);
        
        if (xpData?.data?.attributes?.intellect) {
            setCurrentLevel(xpData.data.attributes.intellect.level);
        }

        if (hasPerms) {
            // 2. Load Data
            const res = await fetch("/api/logs");
            const data = await res.json();
            if (data.success) {
              setLogs(data.data.reverse()); // Chronological order
            }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div className="analysis-container">Loading...</div>;

  // --- SKILL TREE LOCK UI ---
  if (hasAccess === false) {
      const req = FEATURE_LOCKS.analysis_page;
      return (
          <div className="analysis-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', textShadow: '0 0 30px rgba(139,92,246,0.6)' }}>🔒</div>
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#f8fafc' }}>Feature Locked</h1>
              <p style={{ color: '#94a3b8', maxWidth: '400px', marginBottom: '2rem', lineHeight: 1.6 }}>
                  The Analysis Engine is advanced technology. You must reach <strong style={{color: '#c084fc'}}>Intellect Level {req.level}</strong> to unlock it.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem 2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
                  <span style={{ color: '#e2e8f0', fontSize: '0.9rem' }}>Current Intellect: </span>
                  <span style={{ color: '#c084fc', fontWeight: 'bold', fontSize: '1.1rem' }}>Lv {currentLevel}</span>
              </div>
              <Link href="/" style={{
                  background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
                  color: 'white', padding: '12px 24px', borderRadius: '12px', textDecoration: 'none',
                  fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)'
              }}>
                  ← Back to Dashboard
              </Link>
          </div>
      );
  }

  if (logs.length < 3) return (
    <div className="analysis-container">
      <h1>Not enough data</h1>
      <p>Log at least 3 days to see correlations!</p>
      <Link href="/">Back to Dashboard</Link>
    </div>
  );

  // Helper to extract arrays for correlation
  const getValues = (key: keyof DailyLog) => logs.map(l => parseFloat(l[key]?.toString() || "0"));

  const sleep = getValues("sleep_hours");
  const focus = getValues("focus_minutes");
  const activity = getValues("activity_level");
  const mood = getValues("mood");
  const score = getValues("final_score");
  const habits = getValues("habits_score");

  // Define Correlation Cards
  const correlations = [
    {
      title: "Sleep vs. Focus",
      id: "sleep-focus",
      x: sleep,
      y: focus,
      xLabel: "Sleep (h)",
      yLabel: "Focus (min)",
      insight: "Does resting more help you work deeper?"
    },
    {
      title: "Activity vs. Mood",
      id: "activity-mood",
      x: activity,
      y: mood,
      xLabel: "Activity (0-5)",
      yLabel: "Mood (-2 to +2)",
      insight: "Does moving your body improve your mind?"
    },
    {
      title: "Habits vs. Score",
      id: "habits-score",
      x: habits,
      y: score,
      xLabel: "Habits (0-5)",
      yLabel: "Daily Score (0-100)",
      insight: "Does discipline predict a good day?"
    }
  ];

  return (
    <div className="analysis-container">
      <header className="analysis-header">
        <h1 className="analysis-title">Correlation Analysis</h1>
        <Link href="/" className="back-link">← Dashboard</Link>
      </header>

      <div className="correlation-grid">
        {correlations.map(card => {
          const r = calculateCorrelation(card.x, card.y);
          const strength = getCorrelationStrength(r);
          const { m, b } = calculateRegression(card.x, card.y);
          
          return (
            <div key={card.id} className="correlation-card">
              <div className="card-header">
                <h3 className="card-title">{card.title}</h3>
                <span className={`r-value ${Math.abs(r) > 0.5 ? (r > 0 ? "strong-pos" : "strong-neg") : ""}`}>
                  r = {r.toFixed(2)}
                </span>
              </div>
              
              <ScatterChart 
                x={card.x} 
                y={card.y} 
                m={m} 
                b={b} 
                xLabel={card.xLabel} 
                yLabel={card.yLabel} 
              />
              
              <p className="correlation-insight">
                {strength} Correlation. {card.insight}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple SVG Scatter Chart Component
function ScatterChart({ x, y, m, b, xLabel, yLabel }: { x: number[], y: number[], m: number, b: number, xLabel: string, yLabel: string }) {
  const width = 300;
  const height = 150;
  const padding = 20;

  const minX = Math.min(...x);
  const maxX = Math.max(...x);
  const minY = Math.min(...y);
  const maxY = Math.max(...y);

  // Scaling functions
  const scaleX = (val: number) => padding + ((val - minX) / (maxX - minX || 1)) * (width - 2 * padding);
  const scaleY = (val: number) => height - padding - ((val - minY) / (maxY - minY || 1)) * (height - 2 * padding);

  // Regression line points
  const x1 = minX;
  const y1 = m * x1 + b;
  const x2 = maxX;
  const y2 = m * x2 + b;

  return (
    <svg width="100%" height="200px" viewBox={`0 0 ${width} ${height}`}>
      {/* Axes */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#ccc" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ccc" />

      {/* Points */}
      {x.map((val, i) => (
        <circle 
          key={i} 
          cx={scaleX(val)} 
          cy={scaleY(y[i])} 
          r="4" 
          fill="#6366f1" 
          opacity="0.8" 
        />
      ))}

      {/* Regression Line */}
      <line 
        x1={scaleX(x1)} 
        y1={scaleY(y1)} 
        x2={scaleX(x2)} 
        y2={scaleY(y2)} 
        stroke="#ef4444" 
        strokeWidth="2" 
        strokeDasharray="4"
        opacity="0.6"
      />

      {/* Labels */}
      <text x={width / 2} y={height} fontSize="10" textAnchor="middle" fill="#666">{xLabel}</text>
      <text x="5" y={height / 2} fontSize="10" textAnchor="middle" fill="#666" transform={`rotate(-90, 5, ${height / 2})`}>{yLabel}</text>
    </svg>
  );
}
