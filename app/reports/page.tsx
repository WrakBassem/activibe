"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setReport("");
    
    try {
        const res = await fetch('/api/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: reportType, date })
        });
        
        const data = await res.json();
        
        if (data.success) {
            setReport(data.report);
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
    <div className="reports-container">
      <header className="page-header">
         <Link href="/" className="back-link">← Dashboard</Link>
         <h1>AI Performance Reports</h1>
      </header>
      
      <div className="controls">
          <div className="control-group">
              <label>Report Type</label>
              <div className="type-toggle">
                  <button 
                    className={reportType === 'daily' ? 'active' : ''} 
                    onClick={() => setReportType('daily')}
                  >Daily Analysis</button>
                  <button 
                    className={reportType === 'weekly' ? 'active' : ''} 
                    onClick={() => setReportType('weekly')}
                  >Weekly Review</button>
              </div>
          </div>
          
          <div className="control-group">
              <label>Target Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="date-input"
              />
          </div>
          
          <button 
            className="generate-btn" 
            onClick={handleGenerate}
            disabled={loading}
          >
              {loading ? 'Generating...' : '✨ Generate Report'}
          </button>
      </div>
      
      {error && (
          <div className="error-banner">
              ⚠️ {error}
          </div>
      )}
      
      {report && (
          <div className="report-content markdown-body">
              <ReactMarkdown>{report}</ReactMarkdown>
          </div>
      )}
      
      <style jsx>{`
        .reports-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        .page-header {
            margin-bottom: 2rem;
        }
        .page-header h1 {
            font-size: 1.8rem;
            font-weight: 800;
            margin-top: 0.5rem;
        }
        .back-link {
            color: #6b7280;
            text-decoration: none;
            font-size: 0.9rem; 
        }
        
        .controls {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            display: flex;
            gap: 1.5rem;
            align-items: flex-end;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .control-group label {
            font-size: 0.85rem;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        .type-toggle {
            display: flex;
            background: #f3f4f6;
            padding: 0.25rem;
            border-radius: 8px;
        }
        .type-toggle button {
            border: none;
            background: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.9rem;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s;
        }
        .type-toggle button.active {
            background: white;
            color: #6366f1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-weight: 600;
        }
        
        .date-input {
            padding: 0.6rem;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-family: inherit;
        }
        
        .generate-btn {
            background: #6366f1;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
            margin-left: auto;
        }
        .generate-btn:hover { background: #4f46e5; }
        .generate-btn:disabled { background: #a5b4fc; cursor: not-allowed; }
        
        .error-banner {
            background: #fef2f2;
            color: #991b1b;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            border: 1px solid #fee2e2;
        }
        
        .report-content {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid #e5e7eb;
            min-height: 200px;
            line-height: 1.6;
        }
        
        /* Markdown Styles */
        .markdown-body :global(h1) { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #eee; }
        .markdown-body :global(h2) { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #1f2937; }
        .markdown-body :global(p) { margin-bottom: 1rem; color: #4b5563; }
        .markdown-body :global(ul) { padding-left: 1.5rem; margin-bottom: 1rem; }
        .markdown-body :global(li) { margin-bottom: 0.25rem; }
        .markdown-body :global(strong) { color: #111827; font-weight: 600; }
        
        @media (prefers-color-scheme: dark) {
            .controls, .report-content { background: #1f1f1f; border-color: #333; }
            .type-toggle { background: #333; }
            .type-toggle button.active { background: #555; color: #fff; }
            .date-input { background: #333; border-color: #555; color: white; }
            .back-link { color: #9ca3af; }
            .white-text { color: white; }
            .control-group label { color: #9ca3af; }
            
            .markdown-body :global(h1) { border-color: #333; color: white; }
            .markdown-body :global(h2) { color: #e5e7eb; }
            .markdown-body :global(p) { color: #d1d5db; }
            .markdown-body :global(strong) { color: white; }
        }
      `}</style>
    </div>
  );
}
