"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./coach.css";

interface Goal {
  id: number;
  title: string;
  category: string;
  deadline: string | null;
  milestones: { title: string; done: boolean }[];
  status: string;
  motivation_why: string;
  linked_items: any[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "📅 Plan my week", prompt: "Help me plan my week based on my goals and recent performance." },
  { label: "💪 Motivate me", prompt: "I need motivation right now. Remind me why I'm doing this." },
  { label: "📊 Analyze my data", prompt: "Analyze my recent daily logs and tell me what patterns you see." },
  { label: "🎯 Check my goals", prompt: "Review my goals progress and suggest what I should focus on today." },
  { label: "😔 I'm struggling", prompt: "I'm having a tough time. Help me get back on track without judgment." },
  { label: "🔄 Update goals", prompt: "I want to review and update my current goals. What should change?" },
];

export default function CoachPage() {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"coach" | "goals">("coach");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchData() {
    try {
      const [profileRes, goalsRes] = await Promise.all([
        fetch("/api/coach/profile"),
        fetch("/api/coach/goals"),
      ]);
      const profileData = await profileRes.json();
      const goalsData = await goalsRes.json();

      setProfile(profileData.data);
      setGoals(goalsData.data || []);

      // Redirect to onboarding if not complete
      if (!profileData.data?.onboarding_complete) {
        router.push("/coach/onboarding");
        return;
      }

      // Add welcome message
      setMessages([
        {
          role: "assistant",
          content: getWelcomeMessage(profileData.data, goalsData.data),
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getWelcomeMessage(profile: any, goals: Goal[]) {
    const values = profile?.values?.slice(0, 3)?.join(", ") || "your goals";
    const activeGoals = goals?.filter((g) => g.status === "active")?.length || 0;
    return `Hey! 👋 Welcome back. You have **${activeGoals} active goal${activeGoals !== 1 ? "s" : ""}** and your core values are **${values}**.\n\nHow can I help you today? Use the quick actions below or type anything.`;
  }

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
          sessionType: "check-in",
        }),
      });
      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
        setSessionId(data.sessionId);

        // Refresh goals if a new goal was created
        if (data.createdGoal) {
          const goalsRes = await fetch("/api/coach/goals");
          const goalsData = await goalsRes.json();
          setGoals(goalsData.data || []);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${data.error}` },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Error: ${err.message}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function toggleMilestone(goalId: number, milestoneIndex: number) {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const currentMilestones = Array.isArray(goal.milestones) ? goal.milestones : [];
    const updatedMilestones = currentMilestones.map((m, i) =>
      i === milestoneIndex ? { ...m, done: !m.done } : m
    );

    try {
      await fetch("/api/coach/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: goalId, milestones: updatedMilestones }),
      });

      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId ? { ...g, milestones: updatedMilestones } : g
        )
      );
    } catch (err) {
      console.error(err);
    }
  }

  // Simple markdown-like renderer for AI messages
  function renderMessage(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br/>");
  }

  if (loading) {
    return (
      <div className="coach-container">
        <div className="coach-loading">
          <div className="pulse-dot" />
          <p>Loading your coach...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coach-container">
      {/* Header */}
      <header className="coach-header">
        <Link href="/" className="back-link">← Dashboard</Link>
        <h1 className="coach-title">🧠 AI Coach</h1>
        <Link href="/coach/onboarding" className="settings-link">⚙️</Link>
      </header>

      {/* Tabs */}
      <div className="coach-tabs">
        <button
          className={`tab ${activeTab === "coach" ? "active" : ""}`}
          onClick={() => setActiveTab("coach")}
        >
          💬 Coach
        </button>
        <button
          className={`tab ${activeTab === "goals" ? "active" : ""}`}
          onClick={() => setActiveTab("goals")}
        >
          🎯 Goals ({goals.filter((g) => g.status === "active").length})
        </button>
      </div>

      {/* Coach Tab */}
      {activeTab === "coach" && (
        <div className="coach-chat-container">
          {/* Quick Actions */}
          <div className="quick-actions">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                className="quick-action-btn"
                onClick={() => sendMessage(action.prompt)}
                disabled={sending}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.role === "assistant" && <span className="bubble-avatar">🧠</span>}
                <div
                  className="bubble-content"
                  dangerouslySetInnerHTML={{ __html: renderMessage(msg.content) }}
                />
              </div>
            ))}
            {sending && (
              <div className="chat-bubble assistant">
                <span className="bubble-avatar">🧠</span>
                <div className="bubble-content typing">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Talk to your coach..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              disabled={sending}
            />
            <button
              className="send-btn"
              onClick={() => sendMessage(input)}
              disabled={sending || !input.trim()}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <div className="goals-container">
          {goals.length === 0 ? (
            <div className="empty-goals-state">
              <p>No goals yet. Chat with your coach to create some!</p>
              <button className="btn-primary" onClick={() => setActiveTab("coach")}>
                💬 Talk to Coach
              </button>
            </div>
          ) : (
            goals.map((goal) => {
              const milestones = Array.isArray(goal.milestones) ? goal.milestones : [];
              const completedMilestones = milestones.filter((m) => m.done).length;
              const totalMilestones = milestones.length || 1;
              const progress = Math.round((completedMilestones / totalMilestones) * 100);

              return (
                <div key={goal.id} className={`goal-card ${goal.status}`}>
                  <div className="goal-card-header">
                    <div>
                      <h3 className="goal-card-title">{goal.title}</h3>
                      <span className="goal-card-category">{goal.category}</span>
                    </div>
                    <div className="goal-progress-circle">
                      <svg viewBox="0 0 36 36" className="progress-ring">
                        <path
                          className="ring-bg"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="ring-fill"
                          strokeDasharray={`${progress}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="progress-text">{progress}%</span>
                    </div>
                  </div>

                  {goal.motivation_why && (
                    <p className="goal-motivation">💡 {goal.motivation_why}</p>
                  )}

                  {goal.deadline && (
                    <p className="goal-deadline">
                      📅 Deadline: {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}

                  {/* Milestones */}
                  <div className="milestones-list">
                    {milestones.map((m, i) => (
                      <div
                        key={i}
                        className={`milestone-item ${m.done ? "done" : ""}`}
                        onClick={() => toggleMilestone(goal.id, i)}
                      >
                        <span className="milestone-check">{m.done ? "✅" : "⬜"}</span>
                        <span className={`milestone-title ${m.done ? "completed" : ""}`}>{m.title}</span>
                      </div>
                    ))}
                  </div>

                  {/* Linked Daily Items */}
                  {goal.linked_items?.length > 0 && (
                    <div className="linked-items">
                      <p className="linked-items-label">Daily Tasks:</p>
                      {goal.linked_items.map((item: any) => (
                        <span key={item.id} className={`linked-item-chip ${item.completed ? "done" : ""}`}>
                          {item.type === "habit" ? "🔄" : "📋"} {item.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
