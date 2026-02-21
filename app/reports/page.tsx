"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

/* ─── Section Detection Logic ─── */
type ParsedSection = {
  icon: string;
  title: string;
  body: string;
  gradient: string;
  accentColor: string;
};

const SECTION_MAP: Record<string, { icon: string; gradient: string; accent: string }> = {
  'verdict':     { icon: '📊', gradient: 'linear-gradient(135deg, #6366f120, #8b5cf620)', accent: '#a78bfa' },
  'sub-metric':  { icon: '🔬', gradient: 'linear-gradient(135deg, #06b6d420, #0ea5e920)', accent: '#22d3ee' },
  'deep dive':   { icon: '🔬', gradient: 'linear-gradient(135deg, #06b6d420, #0ea5e920)', accent: '#22d3ee' },
  'missed':      { icon: '📋', gradient: 'linear-gradient(135deg, #f5922020, #ef444420)', accent: '#f87171' },
  'warning':     { icon: '⚠️', gradient: 'linear-gradient(135deg, #f5922020, #ef444420)', accent: '#f87171' },
  'progress':    { icon: '📈', gradient: 'linear-gradient(135deg, #10b98120, #22c55e20)', accent: '#34d399' },
  'streak':      { icon: '🔥', gradient: 'linear-gradient(135deg, #f97316 20, #f59e0b20)', accent: '#fbbf24' },
  'smart tips':  { icon: '💡', gradient: 'linear-gradient(135deg, #eab30820, #f59e0b20)', accent: '#fbbf24' },
  'tips':        { icon: '💡', gradient: 'linear-gradient(135deg, #eab30820, #f59e0b20)', accent: '#fbbf24' },
  'focus':       { icon: '🎯', gradient: 'linear-gradient(135deg, #ec489920, #f4365620)', accent: '#f472b6' },
  'tomorrow':    { icon: '🎯', gradient: 'linear-gradient(135deg, #ec489920, #f4365620)', accent: '#f472b6' },
  'wins':        { icon: '🏆', gradient: 'linear-gradient(135deg, #eab30820, #f59e0b20)', accent: '#fbbf24' },
  'bright':      { icon: '🏆', gradient: 'linear-gradient(135deg, #eab30820, #f59e0b20)', accent: '#fbbf24' },
  'calibration': { icon: '⚙️', gradient: 'linear-gradient(135deg, #6b728020, #9ca3af20)', accent: '#9ca3af' },
  'strategy':    { icon: '🚀', gradient: 'linear-gradient(135deg, #6366f120, #8b5cf620)', accent: '#818cf8' },
  'analysis':    { icon: '🔬', gradient: 'linear-gradient(135deg, #06b6d420, #0ea5e920)', accent: '#22d3ee' },
};

function detectSection(heading: string): { icon: string; gradient: string; accent: string } {
  const lower = heading.toLowerCase();
  for (const [keyword, style] of Object.entries(SECTION_MAP)) {
    if (lower.includes(keyword)) return style;
  }
  return { icon: '📄', gradient: 'linear-gradient(135deg, #6366f120, #8b5cf620)', accent: '#a78bfa' };
}

function parseReportIntoSections(markdown: string): ParsedSection[] {
  if (!markdown) return [];

  // Split by ## headings (keep h1 as part of first or skip)
  const lines = markdown.split('\n');
  const sections: ParsedSection[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h1Match = line.match(/^#\s+(.+)/);
    
    if (h2Match || h1Match) {
      if (current) {
        const style = detectSection(current.title);
        sections.push({
          icon: style.icon,
          title: current.title.replace(/^[^\w\s]*\s*/, '').replace(/[^\w\s]*$/, '').trim(),
          body: current.lines.join('\n').trim(),
          gradient: style.gradient,
          accentColor: style.accent,
        });
      }
      current = { title: (h2Match || h1Match)![1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      // Lines before any heading → preamble
      if (line.trim()) {
        if (!current) current = { title: 'Overview', lines: [] };
        current.lines.push(line);
      }
    }
  }

  // Push last section
  if (current) {
    const style = detectSection(current.title);
    sections.push({
      icon: style.icon,
      title: current.title.replace(/^[^\w\s]*\s*/, '').replace(/[^\w\s]*$/, '').trim(),
      body: current.lines.join('\n').trim(),
      gradient: style.gradient,
      accentColor: style.accent,
    });
  }

  return sections;
}

/* ─── Inline Markdown Renderer ─── */
function renderInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>');
}

function RichMarkdown({ body, accent }: { body: string; accent: string }) {
  if (!body) return null;

  const lines = body.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="rpt-list">
          {listItems.map((item, i) => (
            <li key={i}>
              <span className="list-bullet" style={{ color: accent }}>●</span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    // List item (- or *)
    const listMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    // Sub-heading (h3)
    const h3Match = trimmed.match(/^###\s+(.+)/);
    if (h3Match) {
      flushList();
      elements.push(
        <h4 key={key++} className="rpt-subheading" style={{ color: accent }}>
          <span dangerouslySetInnerHTML={{ __html: renderInline(h3Match[1]) }} />
        </h4>
      );
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={key++} className="rpt-paragraph" dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />
    );
  }
  flushList();

  return <>{elements}</>;
}

/* ─── Main Component ─── */
export default function ReportsPage() {
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawReport, setRawReport] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sections = useMemo(() => parseReportIntoSections(rawReport), [rawReport]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setRawReport("");
    
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: reportType, date })
      });
      const data = await res.json();
      if (data.success) {
        setRawReport(data.report);
      } else {
        setError(data.error || "Failed to generate report");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rpt-page">
      {/* Ambient Background */}
      <div className="ambient-glow" />

      {/* Header */}
      <header className="rpt-header">
        <Link href="/" className="rpt-back">← Dashboard</Link>
        <div className="rpt-title-row">
          <h1 className="rpt-title">
            <span className="title-icon">📊</span>
            AI Performance Reports
          </h1>
          <span className="rpt-subtitle">Deep-dive analytics powered by Gemini AI</span>
        </div>
      </header>

      {/* Controls Card */}
      <div className="rpt-controls">
        <div className="ctrl-row">
          <div className="ctrl-group">
            <span className="ctrl-label">REPORT TYPE</span>
            <div className="rpt-toggle">
              <button 
                className={`toggle-btn ${reportType === 'daily' ? 'active' : ''}`}
                onClick={() => setReportType('daily')}
              >
                <span className="toggle-icon">📅</span> Daily
              </button>
              <button 
                className={`toggle-btn ${reportType === 'weekly' ? 'active' : ''}`}
                onClick={() => setReportType('weekly')}
              >
                <span className="toggle-icon">📆</span> Weekly
              </button>
            </div>
          </div>

          <div className="ctrl-group">
            <span className="ctrl-label">DATE</span>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="rpt-date-input"
            />
          </div>

          <button 
            className="rpt-generate-btn" 
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Analyzing...
              </span>
            ) : (
              <>✨ Generate Report</>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rpt-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="rpt-loading-state">
          <div className="loading-brain">🧠</div>
          <p className="loading-text">AI is analyzing your data...</p>
          <div className="loading-bar">
            <div className="loading-bar-fill" />
          </div>
          <p className="loading-sub">This usually takes 5-10 seconds</p>
        </div>
      )}

      {/* Report Sections */}
      {sections.length > 0 && !loading && (
        <div className="rpt-sections">
          {sections.map((section, i) => (
            <div
              key={i}
              className="rpt-section-card"
              style={{
                background: section.gradient,
                borderColor: `${section.accentColor}30`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div className="section-header">
                <span className="section-icon">{section.icon}</span>
                <h3 className="section-title" style={{ color: section.accentColor }}>
                  {section.title}
                </h3>
                <div className="section-line" style={{ background: `${section.accentColor}40` }} />
              </div>
              <div className="section-body">
                <RichMarkdown body={section.body} accent={section.accentColor} />
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        /* ═══════════════════════════════════
           REPORTS PAGE — Premium Dark UI
           ═══════════════════════════════════ */

        .rpt-page {
          max-width: 860px;
          margin: 0 auto;
          padding: 2rem 1.25rem 4rem;
          position: relative;
          min-height: 100vh;
          font-family: var(--font-geist-sans), 'Inter', system-ui, sans-serif;
        }

        .ambient-glow {
          position: fixed;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 400px;
          background: radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ─── Header ─── */
        .rpt-header {
          position: relative;
          z-index: 1;
          margin-bottom: 2rem;
        }

        .rpt-back {
          display: inline-block;
          color: #6b7280;
          text-decoration: none;
          font-size: 0.85rem;
          margin-bottom: 0.75rem;
          transition: color 0.2s;
        }
        .rpt-back:hover { color: #a78bfa; }

        .rpt-title-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .rpt-title {
          font-size: 1.75rem;
          font-weight: 800;
          background: linear-gradient(135deg, #a78bfa, #818cf8, #c084fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .title-icon { -webkit-text-fill-color: initial; }

        .rpt-subtitle {
          font-size: 0.85rem;
          color: #6b7280;
        }

        /* ─── Controls ─── */
        .rpt-controls {
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 1.25rem 1.5rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(12px);
        }

        .ctrl-row {
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .ctrl-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ctrl-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #6b7280;
          text-transform: uppercase;
        }

        .rpt-toggle {
          display: flex;
          background: rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 3px;
          gap: 2px;
        }

        .toggle-btn {
          border: none;
          background: transparent;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.25s;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .toggle-btn.active {
          background: rgba(99,102,241,0.25);
          color: #c4b5fd;
          font-weight: 600;
          box-shadow: 0 0 12px rgba(99,102,241,0.15);
        }

        .toggle-icon { font-size: 0.9rem; }

        .rpt-date-input {
          padding: 0.55rem 0.75rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #e5e7eb;
          font-size: 0.85rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
          color-scheme: dark;
        }
        .rpt-date-input:focus { border-color: #6366f1; }

        .rpt-generate-btn {
          margin-left: auto;
          padding: 0.65rem 1.5rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s;
          box-shadow: 0 4px 15px rgba(99,102,241,0.3);
        }
        .rpt-generate-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99,102,241,0.4);
        }
        .rpt-generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ─── Error ─── */
        .rpt-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }
        .error-icon { font-size: 1.25rem; }

        /* ─── Loading State ─── */
        .rpt-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 4rem 1rem;
          animation: fadeIn 0.3s ease;
        }

        .loading-brain {
          font-size: 3rem;
          animation: pulse-brain 1.5s ease-in-out infinite;
        }

        @keyframes pulse-brain {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        .loading-text {
          font-size: 1.1rem;
          font-weight: 600;
          color: #c4b5fd;
        }

        .loading-bar {
          width: 200px;
          height: 4px;
          background: rgba(255,255,255,0.08);
          border-radius: 2px;
          overflow: hidden;
        }

        .loading-bar-fill {
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #a78bfa, #6366f1);
          border-radius: 2px;
          animation: loading-sweep 1.8s ease-in-out infinite;
        }

        @keyframes loading-sweep {
          0% { transform: translateX(-100%); width: 40%; }
          50% { width: 60%; }
          100% { transform: translateX(350%); width: 40%; }
        }

        .loading-sub {
          font-size: 0.8rem;
          color: #6b7280;
        }

        /* ─── Sections ─── */
        .rpt-sections {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .rpt-section-card {
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
          animation: fadeIn 0.4s ease both;
          transition: border-color 0.3s, box-shadow 0.3s;
        }

        .rpt-section-card:hover {
          border-color: rgba(255,255,255,0.12);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 1rem;
        }

        .section-icon {
          font-size: 1.4rem;
          flex-shrink: 0;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          margin: 0;
          white-space: nowrap;
        }

        .section-line {
          flex: 1;
          height: 1px;
          border-radius: 1px;
          margin-left: 0.5rem;
        }

        /* ─── Rich Content Typography ─── */
        .section-body {
          font-size: 0.88rem;
          line-height: 1.7;
          color: #d1d5db;
        }

        .rpt-paragraph {
          margin: 0 0 0.6rem;
          color: #d1d5db;
        }

        .rpt-paragraph strong {
          color: #f3f4f6;
          font-weight: 600;
        }

        .rpt-paragraph em {
          color: #a78bfa;
          font-style: italic;
        }

        .inline-code {
          background: rgba(99,102,241,0.15);
          color: #c4b5fd;
          padding: 0.1em 0.4em;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: 'JetBrains Mono', monospace;
        }

        .rpt-subheading {
          font-size: 0.9rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
        }

        .rpt-list {
          list-style: none;
          padding: 0;
          margin: 0 0 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .rpt-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.4rem 0.6rem;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          transition: background 0.2s;
          line-height: 1.5;
        }

        .rpt-list li:hover {
          background: rgba(255,255,255,0.06);
        }

        .list-bullet {
          font-size: 0.5rem;
          flex-shrink: 0;
          margin-top: 0.45rem;
        }

        .rpt-list li strong {
          color: #f3f4f6;
        }

        .rpt-list li em {
          color: #a78bfa;
        }

        /* ─── Light Mode ─── */
        @media (prefers-color-scheme: light) {
          .rpt-title {
            background: linear-gradient(135deg, #6366f1, #7c3aed);
            -webkit-background-clip: text;
            background-clip: text;
          }
          .rpt-controls { background: rgba(0,0,0,0.02); border-color: #e5e7eb; }
          .rpt-toggle { background: #f3f4f6; }
          .toggle-btn { color: #6b7280; }
          .toggle-btn.active { background: white; color: #6366f1; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .rpt-date-input { background: white; border-color: #d1d5db; color: #111; color-scheme: light; }
          .ambient-glow { background: radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%); }
          .section-body, .rpt-paragraph { color: #4b5563; }
          .rpt-paragraph strong, .rpt-list li strong { color: #111827; }
          .rpt-paragraph em, .rpt-list li em { color: #6366f1; }
          .inline-code { background: rgba(99,102,241,0.08); color: #6366f1; }
          .rpt-section-card { backdrop-filter: none; background: white !important; border-color: #e5e7eb !important; }
          .rpt-section-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.06); border-color: #d1d5db !important; }
          .rpt-list li { background: rgba(0,0,0,0.02); }
          .rpt-list li:hover { background: rgba(0,0,0,0.04); }
          .rpt-error { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
          .loading-text { color: #6366f1; }
          .loading-bar { background: #e5e7eb; }
          .ctrl-label { color: #374151; }
          .rpt-subtitle { color: #6b7280; }
        }

        /* ─── Mobile ─── */
        @media (max-width: 640px) {
          .ctrl-row { flex-direction: column; align-items: stretch; }
          .rpt-generate-btn { margin-left: 0; width: 100%; }
          .rpt-section-card { padding: 1.25rem; }
          .rpt-title { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
}
