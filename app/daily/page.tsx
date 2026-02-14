"use client";

import { useState, useEffect } from "react";
import "./daily.css";
import { useRouter } from "next/navigation";

// POS Metric configuration
const METRICS = [
  {
    id: "sleep_hours",
    label: "Hours of Sleep",
    type: "slider",
    min: 0, max: 12, step: 0.5, unit: "h", icon: "🌙",
  },
  {
    id: "sleep_quality",
    label: "Sleep Quality",
    type: "rating",
    min: 1, max: 5, icon: "💤",
    labels: ["Terrible", "Poor", "Okay", "Good", "Excellent"],
  },
  {
    id: "food_quality",
    label: "Food Quality",
    type: "rating",
    min: 1, max: 5, icon: "🍎",
    labels: ["Junk", "Poor", "Average", "Good", "Optimal"],
  },
  {
    id: "activity_level",
    label: "Activity Level",
    type: "rating",
    min: 0, max: 5, icon: "🏃",
    labels: ["None", "Light", "Moderate", "Active", "Very Active", "Intense"],
  },
  {
    id: "focus_minutes",
    label: "Focus Time",
    type: "slider",
    min: 0, max: 300, step: 15, unit: "min", icon: "🎯",
  },
  {
    id: "mood",
    label: "Mood",
    type: "mood",
    min: -2, max: 2, icon: "😊",
    labels: ["😢", "😕", "😐", "🙂", "😄"],
  },
];

type MetricValues = {
  sleep_hours: number | null;
  sleep_quality: number | null;
  food_quality: number | null;
  activity_level: number | null;
  focus_minutes: number | null;
  mood: number | null;
};

type TrackingItem = {
  id: number;
  title: string;
  type: "habit" | "task";
  frequency_days: number[];
  target_time: string | null;
  duration_minutes: number;
  priority: "none" | "low" | "medium" | "high";
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  completed?: boolean;
  rating?: number | null; 
};

export default function DailyPage() {
  const router = useRouter();
  const [values, setValues] = useState<MetricValues>({
    sleep_hours: 7,
    sleep_quality: null,
    food_quality: null,
    activity_level: null,
    focus_minutes: 60,
    mood: null,
  });

  const [dailyItems, setDailyItems] = useState<TrackingItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  // Get today's date
  const todayDate = new Date();
  const todayStr = todayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
  const dayIndex = todayDate.getDay(); // 0 = Sun
  
  const formattedDate = todayDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoadingItems(true);
      
      // 1. Fetch Definitions
      const itemsRes = await fetch("/api/items");
      const itemsData = await itemsRes.json();
      
      // 2. Fetch Today's Log
      const logRes = await fetch(`/api/logs/${todayStr}`);
      const logData = await logRes.json();

      // 3. Process Items
      if (itemsData.success) {
        // Map of existing completions: item_id -> { completed, rating }
        const completionMap = new Map();
        if (logData.success && logData.data?.items) {
          logData.data.items.forEach((i: any) => {
            completionMap.set(i.item_id, { completed: i.completed, rating: i.rating });
          });
        }

        const validItems = itemsData.data.map((i: any) => {
          // Parse frequency_days — may come as JSON string from DB
          const freq = typeof i.frequency_days === 'string' 
            ? JSON.parse(i.frequency_days) 
            : (i.frequency_days || []);
          return { ...i, frequency_days: freq };
        }).filter((i: TrackingItem) => {
          if (!i.is_active) return false;
          // Frequency Check
          if (!i.frequency_days.includes(dayIndex)) return false;
          // Date Range Check
          if (i.start_date && todayStr < i.start_date.split('T')[0]) return false;
          if (i.end_date && todayStr > i.end_date.split('T')[0]) return false;
          return true;
        }).map((i: TrackingItem) => {
          const existing = completionMap.get(i.id);
          return { 
            ...i, 
            completed: existing ? existing.completed : false, 
            rating: existing ? existing.rating : null 
          };
        });
        
        setDailyItems(validItems);
      }

      // 4. Pre-fill Metrics if log exists
      if (logData.success) {
        setValues({
          sleep_hours: logData.data.sleep_hours,
          sleep_quality: logData.data.sleep_quality,
          food_quality: logData.data.food_quality,
          activity_level: logData.data.activity_level,
          focus_minutes: logData.data.focus_minutes,
          mood: logData.data.mood,
        });
        
        // If a score exists, show it, but don't block editing unless the user explicitly wants to "view" it.
        // For now, we allow updates.
        // But if we want to show the "Submitted" screen immediately if they already logged:
        // if (logData.data.id) { ... }
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoadingItems(false);
    }
  };

  const toggleTask = (id: number) => {
    setDailyItems(dailyItems.map(i => 
      i.id === id ? { ...i, completed: !i.completed } : i
    ));
  };

  const rateHabit = (id: number, rating: number) => {
     setDailyItems(dailyItems.map(i => 
      i.id === id ? { ...i, rating: rating, completed: true } : i
    ));
  };

  // Count answered questions (ratings only)
  const ratingMetrics = METRICS.filter((m) => m.type === "rating" || m.type === "mood");
  const answeredCount = ratingMetrics.filter(
    (m) => values[m.id as keyof MetricValues] !== null
  ).length;
  const allAnswered = answeredCount === ratingMetrics.length;

  // Handle value changes
  const handleChange = (id: keyof MetricValues, value: number) => {
    if (isSubmitted) return;
    setValues((prev) => ({ ...prev, [id]: value }));
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!allAnswered || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_date: todayStr,
          ...values,
          // Send Items
          items: dailyItems.map(i => ({
            item_id: i.id,
            completed: i.type === 'habit' ? !!(i.rating && i.rating > 0) : i.completed,
            rating: i.rating || null
          }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      // Fetch the score after submission
      const scoreRes = await fetch(`/api/logs/${todayStr}`);
      const scoreData = await scoreRes.json();
      if (scoreData.success) {
        setScore(Math.round(parseFloat(scoreData.data.final_score)));
      }

      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get score interpretation
  const getScoreLabel = (score: number) => {
    if (score >= 85) return { label: "Excellent", color: "#22c55e" };
    if (score >= 70) return { label: "Good", color: "#84cc16" };
    if (score >= 55) return { label: "Average", color: "#eab308" };
    if (score >= 40) return { label: "Unstable", color: "#f97316" };
    return { label: "Alert", color: "#ef4444" };
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      case "low": return "#3b82f6";
      default: return "#9ca3af";
    }
  };

  // Confirmation state
  if (isSubmitted) {
    const scoreInfo = score ? getScoreLabel(score) : null;
    return (
      <div className="daily-container">
        <div className="confirmation">
          <div className="score-circle" style={{ borderColor: scoreInfo?.color }}>
            <span className="score-value">{score}</span>
            <span className="score-label">{scoreInfo?.label}</span>
          </div>
          <p className="confirmation-text">Entry saved — {formattedDate}</p>
          <button
            className="submit-button active"
            onClick={() => window.location.reload()}
            style={{ marginTop: "2rem", maxWidth: "200px" }}
          >
            Log Another Day
          </button>
        </div>
      </div>
    );
  }

  const habits = dailyItems.filter(i => i.type === "habit");
  const tasks = dailyItems.filter(i => i.type === "task");

  return (
    <div className="daily-container">
      {/* Header */}
      <header className="daily-header">
        <h1 className="daily-title">Daily Log</h1>
        <p className="daily-date">{formattedDate}</p>
        <button 
          onClick={() => router.push("/manage")}
          style={{ 
            background: "none", border: "1px solid #e5e7eb", borderRadius: "15px", 
            padding: "4px 12px", fontSize: "0.75rem", marginTop: "0.5rem", cursor: "pointer", color: "#6b7280" 
          }}
        >
          ⚙️ Manage Habits & Tasks
        </button>
      </header>

      {/* Metric Cards */}
      <main className="questions-container">
        {METRICS.map((metric) => (
          <div key={metric.id} className="question-card">
            <label className="question-label">
              <span className="metric-icon">{metric.icon}</span>
              {metric.label}
              {metric.type === "slider" && values[metric.id as keyof MetricValues] !== null && (
                <span className="slider-value">
                  {values[metric.id as keyof MetricValues]}
                  {metric.unit}
                </span>
              )}
            </label>

            {/* Slider for hours/minutes */}
            {metric.type === "slider" && (
              <div className="slider-container">
                <input
                  type="range"
                  min={metric.min}
                  max={metric.max}
                  step={metric.step}
                  value={values[metric.id as keyof MetricValues] ?? metric.min}
                  onChange={(e) =>
                    handleChange(metric.id as keyof MetricValues, parseFloat(e.target.value))
                  }
                  className="slider-input"
                />
                <div className="slider-labels">
                  <span>{metric.min}{metric.unit}</span>
                  <span>{metric.max}{metric.unit}</span>
                </div>
              </div>
            )}

            {/* Rating buttons for quality metrics */}
            {metric.type === "rating" && (
              <div className="button-group">
                {Array.from({ length: metric.max - metric.min + 1 }, (_, i) => metric.min + i).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      className={`value-button ${
                        values[metric.id as keyof MetricValues] === value ? "selected" : ""
                      }`}
                      onClick={() => handleChange(metric.id as keyof MetricValues, value)}
                      title={metric.labels?.[value - metric.min]}
                    >
                      {value}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Mood selector with emojis */}
            {metric.type === "mood" && (
              <div className="button-group mood-group">
                {[-2, -1, 0, 1, 2].map((value, i) => (
                  <button
                    key={value}
                    type="button"
                    className={`value-button mood-button ${
                      values.mood === value ? "selected" : ""
                    }`}
                    onClick={() => handleChange("mood", value)}
                  >
                    {metric.labels?.[i]}
                  </button>
                ))}
              </div>
            )}

             {/* Show label hint for ratings */}
            {(metric.type === "rating" || metric.type === "mood") &&
              values[metric.id as keyof MetricValues] !== null && (
                <p className="rating-hint">
                  {metric.type === "mood"
                    ? metric.labels?.[values.mood! + 2]
                    : metric.labels?.[values[metric.id as keyof MetricValues]! - metric.min]}
                </p>
              )}
          </div>
        ))}

        {/* --- DYNAMIC SECTIONS --- */}
        
        {/* Habits Checklist (Star Rating) */}
        <div className="question-card">
          <label className="question-label">
            <span className="metric-icon">✅</span> Habits
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {habits.length === 0 && <p style={{fontSize: "0.8rem", color: "#999"}}>No habits scheduled for today.</p>}
            {habits.map(habit => (
              <div key={habit.id} 
                style={{ 
                  padding: "0.75rem", 
                  borderRadius: "8px", 
                  border: "1px solid #e5e7eb",
                  background: (habit.rating || 0) > 0 ? "rgba(34, 197, 94, 0.05)" : "transparent"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <div style={{ fontSize: "0.95rem", fontWeight: 500 }}>{habit.title}</div>
                    <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                      {habit.target_time && `${habit.target_time} • `}{habit.duration_minutes > 0 && `${habit.duration_minutes}m`}
                    </div>
                </div>
                
                {/* Star Rating */}
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => rateHabit(habit.id, star)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.5rem",
                        cursor: "pointer",
                        color: star <= (habit.rating || 0) ? "#fbbf24" : "#e5e7eb",
                        padding: 0,
                        transition: "transform 0.1s"
                      }}
                      className="star-btn"
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Checklist (Checkbox) */}
        <div className="question-card">
          <label className="question-label">
            <span className="metric-icon">📋</span> Tasks ({tasks.filter(t => t.completed).length}/{tasks.length})
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
             {tasks.length === 0 && <p style={{fontSize: "0.8rem", color: "#999"}}>No tasks scheduled for today.</p>}
             {tasks.map(task => (
              <div key={task.id} 
                onClick={() => toggleTask(task.id)}
                style={{ 
                  display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem", 
                  borderRadius: "8px", background: task.completed ? "rgba(34, 197, 94, 0.1)" : "transparent",
                  border: task.completed ? "1px solid #22c55e" : "1px solid transparent",
                  cursor: "pointer", transition: "all 0.2s"
                }}
              >
                <div style={{ 
                  width: "20px", height: "20px", borderRadius: "4px", 
                  background: task.completed ? "#22c55e" : "transparent",
                  border: task.completed ? "none" : "2px solid #ccc",
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.8rem"
                }}>
                  {task.completed && "✓"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.95rem", textDecoration: task.completed ? "line-through" : "none" }}>
                    {task.title}
                     {task.priority !== 'none' && (
                     <span style={{ 
                       fontSize: "0.6rem", padding: "1px 4px", borderRadius: "4px", 
                       background: getPriorityColor(task.priority), color: "white", marginLeft: "6px" 
                     }}>
                       {task.priority.toUpperCase()}
                     </span>
                  )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Progress indicator */}
      <div className="progress-indicator">{answeredCount} / {ratingMetrics.length} answered</div>

      {/* Error message */}
      {error && <p className="error-message">{error}</p>}

      {/* Submit button */}
      <button
        type="button"
        className={`submit-button ${allAnswered ? "active" : "disabled"}`}
        onClick={handleSubmit}
        disabled={!allAnswered || isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Submit Daily Log"}
      </button>
    </div>
  );
}
