"use client";

import React, { useEffect, useState } from "react";

type Quest = {
  id: string;
  title: string;
  description: string;
  metric_name: string;
  target_value: number;
  current_value: number;
  xp_reward: number;
  status: "active" | "completed" | "expired";
  expires_at: string;
};

export function QuestBoard() {
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [recentQuests, setRecentQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuests = async () => {
    try {
      const res = await fetch("/api/quests");
      const json = await res.json();
      if (json.success) {
        setActiveQuests(json.data.active);
        setRecentQuests(json.data.recent_completed);
      }
    } catch (err) {
      console.error("Failed to fetch quests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const generateQuest = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/quests", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchQuests(); // Refresh board
      } else {
        setError(json.message || "Failed to generate quest.");
      }
    } catch (err) {
        setError("Network error hitting AI generator.");
    } finally {
      setGenerating(false);
    }
  };

  const deleteQuest = async (id: string) => {
    setError(null);
    try {
      const res = await fetch("/api/quests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchQuests();
      } else {
        setError(json.message || "Failed to abandon quest.");
      }
    } catch (err) {
      setError("Network error abandoning quest.");
    }
  };

  if (loading) return null;

  const canGenerate = activeQuests.length < 3;

  return (
    <div className="quest-board-container fadeIn">
      <div className="board-header">
        <h3 className="section-title flex items-center gap-2">
          <span className="icon text-yellow-400">📜</span> Active Quests
        </h3>
        <div className="flex gap-3 items-center">
            {activeQuests.length > 0 && (
                <button 
                  onClick={() => deleteQuest('all')} 
                  className="text-red-400 opacity-60 hover:opacity-100 transition-opacity text-sm font-semibold"
                >
                    Abandon All
                </button>
            )}
            {canGenerate && (
                <button 
                  onClick={generateQuest} 
                  disabled={generating}
                  className="generate-btn transition-transform hover:scale-105"
                >
                    {generating ? "Consulting Oracle..." : "+ Seek New Quest"}
                </button>
            )}
        </div>
      </div>

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      <div className="quests-grid">
        {activeQuests.length === 0 ? (
           <div className="empty-state">
              <p>Your quest log is empty.</p>
              <p className="hint">Seek a new quest to challenge your weak points!</p>
           </div>
        ) : (
          activeQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} onDelete={deleteQuest} />
          ))
        )}
      </div>

      {/* Completed Bounties Section */}
      {recentQuests.length > 0 && (
         <div className="mt-8 border-t border-gray-700/50 pt-4">
             <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Recently Cleared</h4>
             <div className="flex gap-2 flex-wrap">
                 {recentQuests.map(q => (
                     <div key={q.id} className="completed-badge">
                         {q.title} <span className="text-green-400 font-bold ml-1">+{q.xp_reward} XP</span>
                     </div>
                 ))}
             </div>
         </div>
      )}

      <style jsx>{`
        .quest-board-container {
            background: linear-gradient(145deg, rgba(31,41,55,0.8) 0%, rgba(17,24,39,0.9) 100%);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 30px rgba(0,0,0,0.2);
        }

        .board-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .section-title {
            color: #f9fafb;
            font-size: 1.25rem;
            font-weight: 800;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        .generate-btn {
            background: rgba(234, 179, 8, 0.1);
            color: #facc15;
            border: 1px solid rgba(234, 179, 8, 0.3);
            padding: 0.4rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
        }
        .generate-btn:hover:not(:disabled) {
            background: rgba(234, 179, 8, 0.2);
            border-color: rgba(234, 179, 8, 0.5);
        }
        .generate-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .quests-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1rem;
        }

        .empty-state {
            grid-column: 1 / -1;
            text-align: center;
            padding: 2rem;
            background: rgba(0,0,0,0.2);
            border-radius: 12px;
            border: 1px dashed rgba(255,255,255,0.1);
            color: #9ca3af;
        }
        .empty-state .hint { font-size: 0.85rem; opacity: 0.7; margin-top: 0.5rem; }

        .completed-badge {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.2);
            color: #d1d5db;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}

// Sub-component for individual quest cards
function QuestCard({ quest, onDelete }: { quest: Quest, onDelete: (id: string) => void }) {
    const progressPercent = Math.min((quest.current_value / quest.target_value) * 100, 100);
    const daysLeft = Math.max(0, Math.ceil((new Date(quest.expires_at).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));

    return (
        <div className="quest-card">
            <div className="quest-top">
                <div className="flex items-center gap-2">
                    <div className="quest-xp">+{quest.xp_reward} XP</div>
                    <button 
                        onClick={() => onDelete(quest.id)} 
                        className="text-gray-500 hover:text-red-400 transition-colors bg-transparent border-none cursor-pointer p-0" 
                        title="Abandon Quest"
                    >
                        ✕
                    </button>
                </div>
                <div className="quest-time text-xs opacity-70">⏳ {daysLeft}d left</div>
            </div>
            <h4 className="quest-title">{quest.title}</h4>
            <p className="quest-desc">{quest.description}</p>
            
            <div className="progress-section">
                <div className="progress-labels">
                    <span className="font-semibold text-gray-300">Progress</span>
                    <span className="font-bold text-indigo-400">{quest.current_value} / {quest.target_value}</span>
                </div>
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>
            </div>

            <style jsx>{`
                .quest-card {
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(99, 102, 241, 0.2);
                    border-radius: 12px;
                    padding: 1.25rem;
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .quest-card:hover {
                    border-color: rgba(99, 102, 241, 0.5);
                    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.1);
                    transform: translateY(-2px);
                }

                .quest-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
                .quest-xp { 
                    font-size: 0.8rem; font-weight: 800; color: #fbbf24; 
                    background: rgba(251, 191, 36, 0.1); padding: 2px 8px; border-radius: 8px;
                }

                .quest-title { font-size: 1.05rem; font-weight: 700; color: #f3f4f6; margin: 0 0 0.25rem 0; }
                .quest-desc { font-size: 0.85rem; color: #9ca3af; line-height: 1.4; margin: 0 0 1rem 0; }

                .progress-section { margin-top: auto; }
                .progress-labels { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.5rem; }
                .progress-track {
                    height: 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #a855f7);
                    transition: width 0.5s ease-out;
                }
            `}</style>
        </div>
    )
}
