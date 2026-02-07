"use client";

import { useState } from "react";
import "./daily.css";

// POS Metric configuration
const METRICS = [
  {
    id: "sleep_hours",
    label: "Hours of Sleep",
    type: "slider",
    min: 0,
    max: 12,
    step: 0.5,
    unit: "h",
    icon: "🌙",
  },
  {
    id: "sleep_quality",
    label: "Sleep Quality",
    type: "rating",
    min: 1,
    max: 5,
    icon: "💤",
    labels: ["Terrible", "Poor", "Okay", "Good", "Excellent"],
  },
  {
    id: "food_quality",
    label: "Food Quality",
    type: "rating",
    min: 1,
    max: 5,
    icon: "🍎",
    labels: ["Junk", "Poor", "Average", "Good", "Optimal"],
  },
  {
    id: "activity_level",
    label: "Activity Level",
    type: "rating",
    min: 0,
    max: 5,
    icon: "🏃",
    labels: ["None", "Light", "Moderate", "Active", "Very Active", "Intense"],
  },
  {
    id: "focus_minutes",
    label: "Focus Time",
    type: "slider",
    min: 0,
    max: 300,
    step: 15,
    unit: "min",
    icon: "🎯",
  },
  {
    id: "habits_score",
    label: "Habits Completed",
    type: "rating",
    min: 0,
    max: 5,
    icon: "✅",
    labels: ["0/5", "1/5", "2/5", "3/5", "4/5", "5/5"],
  },
  {
    id: "tasks_done",
    label: "Tasks Completed",
    type: "rating",
    min: 0,
    max: 5,
    icon: "📋",
    labels: ["0", "1", "2", "3", "4", "5+"],
  },
  {
    id: "mood",
    label: "Mood",
    type: "mood",
    min: -2,
    max: 2,
    icon: "😊",
    labels: ["😢", "😕", "😐", "🙂", "😄"],
  },
];

type MetricValues = {
  sleep_hours: number | null;
  sleep_quality: number | null;
  food_quality: number | null;
  activity_level: number | null;
  focus_minutes: number | null;
  habits_score: number | null;
  tasks_done: number | null;
  mood: number | null;
};

export default function DailyPage() {
  const [values, setValues] = useState<MetricValues>({
    sleep_hours: 7,
    sleep_quality: null,
    food_quality: null,
    activity_level: null,
    focus_minutes: 60,
    habits_score: null,
    tasks_done: null,
    mood: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  // Get today's date in local time
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD format in local time
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
          log_date: today,
          ...values,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      // Fetch the score after submission
      const scoreRes = await fetch(`/api/logs/${today}`);
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

  return (
    <div className="daily-container">
      {/* Header */}
      <header className="daily-header">
        <h1 className="daily-title">Daily Log</h1>
        <p className="daily-date">{formattedDate}</p>
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
