"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "../coach.css";

const LIFE_AREAS = [
  { id: "health", label: "Health & Fitness", icon: "💪" },
  { id: "career", label: "Career & Work", icon: "💼" },
  { id: "relationships", label: "Relationships", icon: "❤️" },
  { id: "finances", label: "Finances", icon: "💰" },
  { id: "growth", label: "Personal Growth", icon: "📚" },
  { id: "fun", label: "Fun & Recreation", icon: "🎮" },
  { id: "environment", label: "Environment", icon: "🏠" },
  { id: "contribution", label: "Contribution", icon: "🌍" },
];

const VALUE_OPTIONS = [
  "Family", "Freedom", "Health", "Growth", "Honesty",
  "Discipline", "Creativity", "Adventure", "Security", "Faith",
  "Ambition", "Compassion", "Knowledge", "Independence", "Balance",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1: Values
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [customValue, setCustomValue] = useState("");

  // Step 2: Life Areas
  const [lifeAreas, setLifeAreas] = useState<Record<string, number>>(
    Object.fromEntries(LIFE_AREAS.map((a) => [a.id, 5]))
  );

  // Step 3: Keep / Quit
  const [keepItems, setKeepItems] = useState<string[]>([]);
  const [quitItems, setQuitItems] = useState<string[]>([]);
  const [keepInput, setKeepInput] = useState("");
  const [quitInput, setQuitInput] = useState("");

  // Step 4: AI Questions
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiAnswers, setAiAnswers] = useState<Record<number, string>>({});

  // Step 5: Goals
  const [suggestedGoals, setSuggestedGoals] = useState<any[]>([]);
  const [selectedGoalIndexes, setSelectedGoalIndexes] = useState<number[]>([]);

  const totalSteps = 5;

  const toggleValue = (v: string) => {
    setSelectedValues((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const addCustomValue = () => {
    if (customValue.trim() && !selectedValues.includes(customValue.trim())) {
      setSelectedValues([...selectedValues, customValue.trim()]);
      setCustomValue("");
    }
  };

  const addKeep = () => {
    if (keepInput.trim()) {
      setKeepItems([...keepItems, keepInput.trim()]);
      setKeepInput("");
    }
  };

  const addQuit = () => {
    if (quitInput.trim()) {
      setQuitItems([...quitItems, quitInput.trim()]);
      setQuitInput("");
    }
  };

  const nextStep = async () => {
    if (step === 3) {
      // Save partial profile & generate AI questions
      setLoading(true);
      try {
        await fetch("/api/coach/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            values: selectedValues,
            life_areas: lifeAreas,
            keep: keepItems,
            quit: quitItems,
          }),
        });

        const res = await fetch("/api/coach/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "generate_questions",
            profile: {
              values: selectedValues,
              life_areas: lifeAreas,
              keep: keepItems,
              quit: quitItems,
            },
          }),
        });
        const data = await res.json();
        setAiQuestions(data.questions || []);
      } catch (err) {
        console.error(err);
        setAiQuestions([
          "What's your biggest challenge right now?",
          "What does your ideal day look like?",
          "What's stopped you from reaching your goals before?",
        ]);
      }
      setLoading(false);
    }

    if (step === 4) {
      // Generate goal suggestions
      setLoading(true);
      try {
        const res = await fetch("/api/coach/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "generate_goals",
            profile: {
              values: selectedValues,
              life_areas: lifeAreas,
              keep: keepItems,
              quit: quitItems,
              onboarding_answers: aiAnswers,
            },
          }),
        });
        const data = await res.json();
        setSuggestedGoals(data.goals || []);
        setSelectedGoalIndexes(data.goals?.map((_: any, i: number) => i) || []);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }

    setStep(step + 1);
  };

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      // 1. Mark onboarding complete
      await fetch("/api/coach/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_complete: true }),
      });

      // 2. Create selected goals
      for (const idx of selectedGoalIndexes) {
        const goal = suggestedGoals[idx];
        if (goal) {
          await fetch("/api/coach/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(goal),
          });
        }
      }

      router.push("/coach");
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div className="coach-container">
      {/* Progress Bar */}
      <div className="onboarding-progress">
        <div
          className="onboarding-progress-fill"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
      <p className="step-label">Step {step} of {totalSteps}</p>

      {/* STEP 1: Values */}
      {step === 1 && (
        <div className="onboarding-step">
          <h1 className="step-title">🌟 What Matters Most to You?</h1>
          <p className="step-desc">Select your core values. These drive everything.</p>
          <div className="chip-grid">
            {VALUE_OPTIONS.map((v) => (
              <button
                key={v}
                className={`chip ${selectedValues.includes(v) ? "active" : ""}`}
                onClick={() => toggleValue(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="custom-input-row">
            <input
              type="text"
              placeholder="Add your own..."
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomValue()}
              className="coach-input"
            />
            <button className="btn-small" onClick={addCustomValue}>Add</button>
          </div>
          {selectedValues.length > 0 && (
            <div className="selected-summary">
              Selected: {selectedValues.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Life Areas */}
      {step === 2 && (
        <div className="onboarding-step">
          <h1 className="step-title">📊 Rate Your Life Areas</h1>
          <p className="step-desc">How satisfied are you in each area? (1 = struggling, 10 = thriving)</p>
          <div className="life-areas-grid">
            {LIFE_AREAS.map((area) => (
              <div key={area.id} className="life-area-card">
                <div className="life-area-header">
                  <span className="life-area-icon">{area.icon}</span>
                  <span className="life-area-label">{area.label}</span>
                  <span className="life-area-value" style={{
                    color: lifeAreas[area.id] >= 7 ? "#22c55e" : lifeAreas[area.id] >= 4 ? "#eab308" : "#ef4444"
                  }}>{lifeAreas[area.id]}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={lifeAreas[area.id]}
                  onChange={(e) =>
                    setLifeAreas({ ...lifeAreas, [area.id]: parseInt(e.target.value) })
                  }
                  className="life-area-slider"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Keep / Quit */}
      {step === 3 && (
        <div className="onboarding-step">
          <h1 className="step-title">✅ Keep vs ❌ Quit</h1>
          <p className="step-desc">What habits or behaviors do you want to keep? What do you want to stop?</p>

          <div className="keep-quit-grid">
            <div className="kq-section keep">
              <h3>✅ Keep Doing</h3>
              <div className="custom-input-row">
                <input
                  type="text"
                  placeholder="e.g. Morning exercise..."
                  value={keepInput}
                  onChange={(e) => setKeepInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeep()}
                  className="coach-input"
                />
                <button className="btn-small" onClick={addKeep}>+</button>
              </div>
              <div className="kq-list">
                {keepItems.map((item, i) => (
                  <div key={i} className="kq-item keep">
                    <span>{item}</span>
                    <button onClick={() => setKeepItems(keepItems.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="kq-section quit">
              <h3>❌ Want to Quit</h3>
              <div className="custom-input-row">
                <input
                  type="text"
                  placeholder="e.g. Late night scrolling..."
                  value={quitInput}
                  onChange={(e) => setQuitInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addQuit()}
                  className="coach-input"
                />
                <button className="btn-small" onClick={addQuit}>+</button>
              </div>
              <div className="kq-list">
                {quitItems.map((item, i) => (
                  <div key={i} className="kq-item quit">
                    <span>{item}</span>
                    <button onClick={() => setQuitItems(quitItems.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: AI Deep Dive */}
      {step === 4 && (
        <div className="onboarding-step">
          <h1 className="step-title">🧠 Let&apos;s Go Deeper</h1>
          <p className="step-desc">Your AI Coach has a few questions based on your answers.</p>
          <div className="ai-questions">
            {aiQuestions.map((q, i) => (
              <div key={i} className="ai-question-card">
                <p className="ai-question-text">{q}</p>
                <textarea
                  className="coach-textarea"
                  placeholder="Your honest answer..."
                  value={aiAnswers[i] || ""}
                  onChange={(e) =>
                    setAiAnswers({ ...aiAnswers, [i]: e.target.value })
                  }
                  rows={3}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 5: Goal Suggestions */}
      {step === 5 && (
        <div className="onboarding-step">
          <h1 className="step-title">🎯 Your Personalized Goals</h1>
          <p className="step-desc">Based on your profile, here are AI-suggested goals. Select the ones you want to commit to.</p>
          {suggestedGoals.length === 0 ? (
            <div className="empty-goals">
              <p>No goals generated yet. You can create them manually from the Coach page.</p>
            </div>
          ) : (
            <div className="goals-suggestions">
              {suggestedGoals.map((goal, i) => (
                <div
                  key={i}
                  className={`goal-suggestion-card ${selectedGoalIndexes.includes(i) ? "selected" : ""}`}
                  onClick={() =>
                    setSelectedGoalIndexes((prev) =>
                      prev.includes(i)
                        ? prev.filter((x) => x !== i)
                        : [...prev, i]
                    )
                  }
                >
                  <div className="goal-check">
                    {selectedGoalIndexes.includes(i) ? "✅" : "⬜"}
                  </div>
                  <div className="goal-info">
                    <h3>{goal.title}</h3>
                    <span className="goal-category">{goal.category}</span>
                    {goal.motivation_why && (
                      <p className="goal-why">💡 {goal.motivation_why}</p>
                    )}
                    {goal.milestones && (
                      <div className="goal-milestones-preview">
                        {goal.milestones.slice(0, 3).map((m: any, j: number) => (
                          <span key={j} className="milestone-chip">📌 {m.title}</span>
                        ))}
                      </div>
                    )}
                    {goal.daily_tasks && (
                      <div className="goal-tasks-preview">
                        {goal.daily_tasks.map((t: any, j: number) => (
                          <span key={j} className="task-chip">
                            {t.type === "habit" ? "🔄" : "📋"} {t.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="onboarding-nav">
        {step > 1 && (
          <button className="btn-secondary" onClick={() => setStep(step - 1)}>
            ← Back
          </button>
        )}
        {step < totalSteps ? (
          <button
            className="btn-primary"
            onClick={nextStep}
            disabled={loading || (step === 1 && selectedValues.length === 0)}
          >
            {loading ? "AI Thinking..." : "Continue →"}
          </button>
        ) : (
          <button
            className="btn-primary finish"
            onClick={finishOnboarding}
            disabled={saving}
          >
            {saving ? "Setting up..." : "🚀 Start My Journey"}
          </button>
        )}
      </div>
    </div>
  );
}
