"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTutorial } from "../components/TutorialProvider";

interface Boss {
  stage_number: number;
  name: string;
  description: string;
  max_health: number;
  image_url: string;
  reward_xp: number;
  reward_gold: number;
  reward_item_rarity: string;
}

interface CampaignStatus {
  current_stage: number;
  current_boss_health: number;
  boss: Boss | null;
}

export default function CampaignPage() {
  const [status, setStatus] = useState<CampaignStatus | null>(null);
  const [allBosses, setAllBosses] = useState<Boss[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statusRes, bossesRes] = await Promise.all([
          fetch("/api/campaign/status"),
          fetch("/api/campaign/bosses"),
        ]);
        const statusData = await statusRes.json();
        const bossesData = await bossesRes.json();

        if (statusData.success) setStatus(statusData.data);
        if (bossesData.success) setAllBosses(bossesData.data);
      } catch (err) {
        console.error("Failed to fetch campaign data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="campaign-container flex items-center justify-center">
        <div className="pulse-dot"></div>
      </div>
    );
  }

  const currentBoss = status?.boss;
  const progressPercent = currentBoss 
    ? Math.max(0, Math.min(100, (status.current_boss_health / currentBoss.max_health) * 100))
    : 0;

  return (
    <div className="campaign-container p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <Link href="/" className="back-link">← Return to Base</Link>
        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Story Campaign</h1>
        <div className="w-24"></div> 
      </header>

      <main className="max-w-4xl mx-auto">
        {currentBoss ? (
          <div className="boss-battle-card mb-12">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {/* Boss Visual */}
              <div className="boss-visual-outer group">
                <div className="boss-visual text-7xl md:text-9xl animate-bounce">
                  {currentBoss.image_url}
                </div>
                <div className="boss-shadow"></div>
              </div>

              {/* Boss Info */}
              <div className="flex-1">
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-indigo-400 font-bold text-sm uppercase tracking-widest">Stage {status.current_stage}</span>
                  <h2 className="text-4xl font-black text-white leading-none">{currentBoss.name}</h2>
                </div>
                <p className="text-gray-400 leading-relaxed mb-6 italic">
                  "{currentBoss.description}"
                </p>

                {/* Health Bar */}
                <div className="health-bar-container mb-2">
                  <div 
                    className="health-bar-fill" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                  <span className="health-text">
                    {status.current_boss_health} / {currentBoss.max_health} HP
                  </span>
                </div>
                
                {/* Rewards Preview */}
                <div className="flex gap-4 mt-6">
                    <div className="reward-chip">
                        <span className="text-yellow-400">XP</span> {currentBoss.reward_xp}
                    </div>
                    <div className="reward-chip">
                        <span className="text-yellow-500">🪙</span> {currentBoss.reward_gold}
                    </div>
                    <div className={`reward-chip rarity-${currentBoss.reward_item_rarity}`}>
                        🎁 {currentBoss.reward_item_rarity}
                    </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="completed-state text-center py-12">
            <span className="text-6xl mb-4 block">🏆</span>
            <h2 className="text-3xl font-bold text-white mb-2">Campaign Defeated!</h2>
            <p className="text-gray-400">You have conquered all current bosses. Stay tuned for new story chapters.</p>
          </div>
        )}

        {/* Campaign Timeline */}
        <section>
          <h3 className="text-xl font-bold text-gray-300 mb-6 flex items-center gap-2">
            <span className="text-indigo-500">🗺️</span> Adventure Progress
          </h3>
          <div className="timeline-grid">
            {allBosses.map((boss) => {
              const isCurrent = boss.stage_number === status?.current_stage;
              const isDefeated = boss.stage_number < (status?.current_stage || 0);
              const isLocked = boss.stage_number > (status?.current_stage || 99);

              return (
                <div 
                  key={boss.stage_number} 
                  className={`timeline-item ${isCurrent ? 'active' : isDefeated ? 'defeated' : 'locked'}`}
                >
                  <div className="timeline-node">
                    {isDefeated ? '✅' : boss.image_url}
                  </div>
                  <div className="timeline-label">
                    <span className="block text-[10px] uppercase font-bold opacity-50">Boss {boss.stage_number}</span>
                    <span className="font-semibold text-xs whitespace-nowrap">{boss.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <style jsx>{`
        .campaign-container {
          min-height: 100vh;
          background: radial-gradient(circle at center, #1b1b3a 0%, #0a0a0a 100%);
          color: white;
        }
        .back-link {
          color: #94a3b8;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: white;
        }
        .boss-battle-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 2rem;
          padding: 3rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .boss-visual-outer {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .boss-visual {
          filter: drop-shadow(0 0 20px rgba(139, 92, 246, 0.3));
          transition: transform 0.3s;
        }
        .boss-shadow {
          width: 80px;
          height: 10px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 50%;
          filter: blur(4px);
          margin-top: 10px;
        }
        .health-bar-container {
          height: 32px;
          background: #000;
          border: 2px solid #1e293b;
          border-radius: 99px;
          position: relative;
          overflow: hidden;
        }
        .health-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .health-text {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 0.75rem;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          color: white;
          letter-spacing: 0.1em;
        }
        .reward-chip {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .rarity-legendary { border-color: #f59e0b; color: #f59e0b; }
        .rarity-epic { border-color: #a855f7; color: #a855f7; }
        .rarity-rare { border-color: #3b82f6; color: #3b82f6; }

        .timeline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 20px;
        }
        .timeline-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          transition: all 0.3s;
        }
        .timeline-item.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-4px);
        }
        .timeline-item.locked {
          opacity: 0.3;
          filter: grayscale(1);
        }
        .timeline-node {
          width: 60px;
          height: 60px;
          background: #000;
          border: 2px solid #1e293b;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }
        .timeline-item.active .timeline-node {
          border-color: #6366f1;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }
        .timeline-label {
          text-align: center;
        }
        
        .pulse-dot {
          width: 12px;
          height: 12px;
          background: #6366f1;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(0.9); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
