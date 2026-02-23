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
  input_type: 'boolean' | 'emoji_5' | 'scale_0_5' | 'scale_0_10';
};

type MetricField = {
  id: string;
  metric_id: string;
  name: string;
  label: string;
  field_type: 'int' | 'boolean' | 'scale_0_5' | 'text';
  active: boolean;
};

type FieldValue = {
  field_id: string;
  metric_id: string;
  value_int?: number | null;
  value_bool?: boolean | null;
  value_text?: string | null;
  review?: string | null;
};

type DailyEntry = {
  metric_id: string;
  completed: boolean;
  score_awarded: number;
  time_spent_minutes?: number;
  review?: string;
  score_value?: number | null;
};

type DailySummary = {
  date: string;
  total_score: number;
  mode: string;
};

const EMOJIS = ['😞', '😕', '😐', '🙂', '😄'];
const EMOJI_LABELS = ['Bad', 'Poor', 'Okay', 'Good', 'Great'];

export default function DailyLogPage() {
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  // Data State
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [entries, setEntries] = useState<Record<string, DailyEntry>>({});
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [metricFields, setMetricFields] = useState<Record<string, MetricField[]>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  
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
          fetch("/api/metrics", { cache: 'no-store' }),
          fetch(`/api/daily?date=${date}&t=${Date.now()}`, { cache: 'no-store' })
        ]);

        const metricsData = await metricsRes.json();
        const logData = await logRes.json();

        if (metricsData.success) {
            const loadedMetrics = metricsData.data;
            setMetrics(loadedMetrics);
            // Fetch fields for all metrics in parallel
            const fieldResults = await Promise.all(
              loadedMetrics.map((m: Metric) =>
                fetch(`/api/metrics/${m.id}/fields`).then(r => r.json())
              )
            );
            const fieldsMap: Record<string, MetricField[]> = {};
            loadedMetrics.forEach((m: Metric, i: number) => {
              if (fieldResults[i]?.success) {
                fieldsMap[m.id] = fieldResults[i].data.filter((f: MetricField) => f.active);
              }
            });
            setMetricFields(fieldsMap);
        }

        if (logData.success) {
            setSummary(logData.data.summary);
            const entryMap: Record<string, DailyEntry> = {};
            if(logData.data.entries) {
                logData.data.entries.forEach((e: any) => {
                    entryMap[e.metric_id] = {
                        metric_id: e.metric_id,
                        completed: e.completed,
                        score_awarded: e.score_awarded,
                        time_spent_minutes: e.time_spent_minutes,
                        review: e.review || '',
                        score_value: e.score_value ?? null,
                    };
                });
            }
            setEntries(entryMap);

            // Pre-fill field values from saved log
            if (logData.data.field_values) {
              const fvMap: Record<string, FieldValue> = {};
              logData.data.field_values.forEach((fv: any) => {
                fvMap[fv.field_id] = {
                  field_id: fv.field_id,
                  metric_id: fv.metric_id,
                  value_int: fv.value_int,
                  value_bool: fv.value_bool,
                  value_text: fv.value_text,
                  review: fv.review,
                };
              });
              setFieldValues(fvMap);
            }
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

  const handleFieldChange = (fieldId: string, metricId: string, field: MetricField, rawValue: any) => {
    setFieldValues(prev => {
      const existing = prev[fieldId] || { field_id: fieldId, metric_id: metricId };
      const updated = { ...existing };
      if (field.field_type === 'boolean') updated.value_bool = Boolean(rawValue);
      else if (field.field_type === 'text') updated.value_text = String(rawValue);
      else updated.value_int = rawValue === '' ? null : Number(rawValue);
      return { ...prev, [fieldId]: updated };
    });
  };

  const handleFieldReview = (fieldId: string, metricId: string, text: string) => {
    setFieldValues(prev => {
      const existing = prev[fieldId] || { field_id: fieldId, metric_id: metricId };
      return { ...prev, [fieldId]: { ...existing, review: text } };
    });
  };

  const handleScoreValue = (metricId: string, value: number) => {
    setEntries(prev => {
      const current = prev[metricId] || { metric_id: metricId, completed: false, score_awarded: 0 };
      // If tapping the same value, deselect (set to 0)
      const newValue = current.score_value === value ? 0 : value;
      return {
        ...prev,
        [metricId]: { ...current, score_value: newValue, completed: newValue > 0 }
      };
    });
  };

  const handleReview = (metricId: string, text: string) => {
    setEntries(prev => {
      const current = prev[metricId] || { metric_id: metricId, completed: false, score_awarded: 0 };
      return {
        ...prev,
        [metricId]: { ...current, review: text }
      };
    });
  };

  const handleSubmit = async () => {
      try {
          setSubmitting(true);
          const payload = {
              date,
              metric_inputs: Object.values(entries).map(e => ({
                  metric_id: e.metric_id,
                  completed: e.completed,
                  time_spent_minutes: e.time_spent_minutes,
                  review: e.review || null,
                  score_value: e.score_value ?? null,
              })),
              field_values: Object.values(fieldValues),
          };

          const res = await fetch("/api/daily", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (data.success) {
              setSummary(data.data.summary);
              setMessage(data.data.xp ? `✨ +${data.data.xp.xp - (data.data.xp.xp - 10)} XP! Log saved!` : 'Log saved successfully!');
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
                            const entry = entries[metric.id] || { completed: false, score_value: null };
                            const fields = metricFields[metric.id] || [];
                            const isExpanded = expandedFields[metric.id];
                            const inputType = metric.input_type || 'boolean';
                            const scoreVal = entry.score_value ?? 0;
                            const isActive = inputType === 'boolean' ? entry.completed : (scoreVal > 0);
                            return (
                                <div key={metric.id} style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '6px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${isActive ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.07)'}`, transition: 'border-color 0.2s' }}>
                                  {/* Metric Input Row */}
                                  <div style={{
                                    padding: '12px 14px',
                                    background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                                    transition: 'background 0.2s',
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{metric.name}</span>
                                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>{metric.max_points} pts</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {fields.length > 0 && (
                                          <button
                                            onClick={() => setExpandedFields(prev => ({ ...prev, [metric.id]: !prev[metric.id] }))}
                                            style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: 'none', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}
                                          >
                                            {isExpanded ? '▲' : '▼'} {fields.length}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* === INPUT WIDGET (type-specific) === */}
                                    {inputType === 'boolean' && (
                                      <div
                                        onClick={() => handleToggle(metric.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}
                                      >
                                        <div style={{
                                          width: '28px', height: '28px', borderRadius: '50%',
                                          border: `2px solid ${entry.completed ? '#22c55e' : '#555'}`,
                                          background: entry.completed ? '#22c55e' : 'transparent',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          color: 'white', fontSize: '14px', fontWeight: 700, transition: 'all 0.2s',
                                        }}>
                                          {entry.completed && '✓'}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: entry.completed ? '#86efac' : '#9ca3af' }}>
                                          {entry.completed ? 'Completed' : 'Not done'}
                                        </span>
                                      </div>
                                    )}

                                    {inputType === 'emoji_5' && (
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {EMOJIS.map((emoji, i) => {
                                          const val = i + 1;
                                          const selected = scoreVal === val;
                                          return (
                                            <button key={val}
                                              onClick={() => handleScoreValue(metric.id, val)}
                                              title={EMOJI_LABELS[i]}
                                              style={{
                                                fontSize: '1.5rem', padding: '6px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                                background: selected ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
                                                transform: selected ? 'scale(1.2)' : 'scale(1)',
                                                transition: 'all 0.15s',
                                                filter: selected ? 'none' : 'grayscale(0.6)',
                                              }}
                                            >{emoji}</button>
                                          );
                                        })}
                                        {scoreVal > 0 && <span style={{ fontSize: '11px', color: '#a5b4fc', marginLeft: '4px' }}>{EMOJI_LABELS[scoreVal - 1]}</span>}
                                      </div>
                                    )}

                                    {inputType === 'scale_0_5' && (
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        {[0,1,2,3,4,5].map(n => (
                                          <button key={n}
                                            onClick={() => handleScoreValue(metric.id, n)}
                                            style={{
                                              width: '36px', height: '36px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                                              fontWeight: 700, fontSize: '14px',
                                              background: scoreVal === n && n > 0 ? '#6366f1' : scoreVal === n && n === 0 ? '#ef4444' : 'rgba(255,255,255,0.08)',
                                              color: scoreVal === n ? 'white' : '#9ca3af',
                                              transition: 'all 0.15s',
                                              transform: scoreVal === n ? 'scale(1.15)' : 'scale(1)',
                                            }}
                                          >{n}</button>
                                        ))}
                                        <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '4px' }}>/5</span>
                                      </div>
                                    )}

                                    {inputType === 'scale_0_10' && (
                                      <div>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                                          {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
                                            <button key={n}
                                              onClick={() => handleScoreValue(metric.id, n)}
                                              style={{
                                                width: '30px', height: '30px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                fontWeight: 600, fontSize: '12px',
                                                background: scoreVal === n && n > 0
                                                  ? `hsl(${n * 12}, 70%, 50%)`
                                                  : scoreVal === n && n === 0 ? '#ef4444' 
                                                  : 'rgba(255,255,255,0.06)',
                                                color: scoreVal === n ? 'white' : '#9ca3af',
                                                transition: 'all 0.15s',
                                                transform: scoreVal === n ? 'scale(1.15)' : 'scale(1)',
                                              }}
                                            >{n}</button>
                                          ))}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Score: {scoreVal}/10</div>
                                      </div>
                                    )}

                                    {/* === REVIEW TEXTAREA === */}
                                    <div style={{ marginTop: '10px' }}>
                                      <textarea
                                        value={entry.review || ''}
                                        onChange={e => handleReview(metric.id, e.target.value)}
                                        placeholder="Write your review... (optional)"
                                        rows={2}
                                        style={{
                                          width: '100%', resize: 'vertical',
                                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                          borderRadius: '8px', padding: '8px 10px', color: '#d1d5db', fontSize: '13px',
                                          fontFamily: 'inherit',
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {/* Fields Panel */}
                                  {fields.length > 0 && isExpanded && (
                                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px 14px', display: 'grid', gap: '10px' }}>
                                      {fields.map(field => {
                                        const fv = fieldValues[field.id];
                                        return (
                                          <div key={field.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>{field.label || field.name}</label>
                                            {field.field_type === 'boolean' && (
                                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input type="checkbox"
                                                  checked={Boolean(fv?.value_bool)}
                                                  onChange={e => handleFieldChange(field.id, metric.id, field, e.target.checked)}
                                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontSize: '13px', color: '#e5e7eb' }}>{fv?.value_bool ? 'Yes' : 'No'}</span>
                                              </label>
                                            )}
                                            {field.field_type === 'int' && (
                                              <input type="number" min={0}
                                                value={fv?.value_int ?? ''}
                                                placeholder="0"
                                                onChange={e => handleFieldChange(field.id, metric.id, field, e.target.value)}
                                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', color: '#e5e7eb', fontSize: '14px', width: '100%' }}
                                              />
                                            )}
                                            {field.field_type === 'scale_0_5' && (
                                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                {[0,1,2,3,4,5].map(n => (
                                                  <button key={n}
                                                    onClick={() => handleFieldChange(field.id, metric.id, field, n)}
                                                    style={{
                                                      width: '32px', height: '32px', borderRadius: '50%', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                                                      background: (fv?.value_int ?? -1) === n ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                                      color: (fv?.value_int ?? -1) === n ? 'white' : '#9ca3af',
                                                    }}>{n}</button>
                                                ))}
                                              </div>
                                            )}
                                            {field.field_type === 'text' && (
                                              <textarea
                                                value={fv?.value_text ?? ''}
                                                placeholder="Type your notes..."
                                                rows={2}
                                                onChange={e => handleFieldChange(field.id, metric.id, field, e.target.value)}
                                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 10px', color: '#e5e7eb', fontSize: '13px', width: '100%', resize: 'vertical' }}
                                              />
                                            )}
                                            <input
                                              type="text"
                                              value={fv?.review || ''}
                                              onChange={e => handleFieldReview(field.id, metric.id, e.target.value)}
                                              placeholder="Review submetric... (optional)"
                                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px 8px', color: '#d1d5db', fontSize: '12px', marginTop: '2px', width: '100%' }}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
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
