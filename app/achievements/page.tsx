"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { UserAvatar } from "../components/user-avatar";

type Achievement = {
    id: string;
    title: string;
    description: string;
    icon: string;
    xp_reward: number;
    is_unlocked: boolean;
    unlocked_at: string | null;
    is_equipped: boolean;
};

export default function AchievementsPage() {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTitleId, setActiveTitleId] = useState<string | null>(null);

    useEffect(() => {
        fetchAchievements();
    }, []);

    const fetchAchievements = async () => {
        try {
            const res = await fetch('/api/achievements');
            const json = await res.json();
            if (json.success) {
                setAchievements(json.data);
                setActiveTitleId(json.active_title_id);
            }
        } catch (e) {
            console.error("Failed to load achievements", e);
        } finally {
            setLoading(false);
        }
    }

    const handleEquip = async (id: string | null) => {
        try {
            const res = await fetch('/api/achievements/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ achievement_id: id })
            });
            const json = await res.json();
            if (json.success) {
                setActiveTitleId(id);
                // Also update the local state for immediate feedback
                setAchievements(prev => prev.map(a => ({
                    ...a,
                    is_equipped: a.id === id
                })));
                // Trigger an event so UserAvatar re-renders if it was listening (or user can just refresh)
                window.dispatchEvent(new Event('titleEquipped'));
            } else {
                alert(json.error || "Failed to equip title.");
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-400">Loading Hall of Fame...</div>;

    const unlockedCount = achievements.filter(a => a.is_unlocked).length;

    return (
        <div className="achievements-page fadeIn">
            <header className="dashboard-header">
                <div>
                <h1 className="dashboard-title flex items-center gap-2">
                    <Link href="/" className="back-btn opacity-60 hover:opacity-100 transition-opacity">←</Link> 
                    Hall of Fame
                </h1>
                <p className="dashboard-subtitle">Badges earned through consistent dedication. ({unlockedCount}/{achievements.length} Unlocked)</p>
                </div>
                <div className="flex gap-2 items-center">
                    <UserAvatar />
                </div>
            </header>

            <div className="achievements-grid">
                {achievements.map(ach => (
                    <div 
                        key={ach.id} 
                        className={`achievement-card ${ach.is_unlocked ? 'unlocked' : 'locked'} ${ach.is_equipped ? 'equipped' : ''}`}
                    >
                        <div className="ach-icon-wrapper">
                            <span className="ach-icon">{ach.icon}</span>
                            {ach.is_unlocked && <div className="ach-glow"></div>}
                        </div>
                        
                        <div className="ach-info">
                            <h3 className="ach-title">{ach.title}</h3>
                            <p className="ach-desc">{ach.description}</p>
                            
                            <div className="ach-footer">
                                <span className="ach-reward">+{ach.xp_reward.toLocaleString()} XP</span>
                                
                                {ach.is_unlocked ? (
                                    ach.is_equipped ? (
                                        <button 
                                            onClick={() => handleEquip(null)}
                                            className="equip-btn active hover:bg-red-500/20 hover:text-red-400"
                                        >
                                            Unequip
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleEquip(ach.id)}
                                            className="equip-btn"
                                        >
                                            Equip Title
                                        </button>
                                    )
                                ) : (
                                    <span className="locked-text">Locked</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .achievements-page { padding: 2rem 1rem; max-width: 1200px; margin: 0 auto; color: white; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; }
                .dashboard-title { font-size: 2rem; font-weight: 800; margin: 0; color: #f9fafb; letter-spacing: -0.02em; }
                .dashboard-subtitle { font-size: 0.95rem; color: #9ca3af; margin-top: 0.25rem; }
                .back-btn { font-size: 1.5rem; text-decoration: none; color: white; }

                .achievements-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                .achievement-card {
                    background: rgba(31, 41, 55, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    gap: 1.25rem;
                    align-items: flex-start;
                    transition: all 0.2s;
                    position: relative;
                    overflow: hidden;
                }

                .achievement-card.unlocked {
                    background: linear-gradient(145deg, rgba(31,41,55,0.7) 0%, rgba(17,24,39,0.9) 100%);
                    border-color: rgba(255,255,255,0.1);
                }

                .achievement-card.equipped {
                    border-color: rgba(250, 204, 21, 0.5); /* Glowing yellow border */
                    box-shadow: 0 0 20px rgba(250, 204, 21, 0.1);
                }

                .achievement-card.locked {
                    opacity: 0.5;
                    filter: grayscale(100%);
                }

                .ach-icon-wrapper {
                    position: relative;
                    width: 60px;
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.3);
                    border-radius: 50%;
                    flex-shrink: 0;
                }

                .ach-icon {
                    font-size: 2rem;
                    position: relative;
                    z-index: 2;
                }

                .ach-glow {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle, rgba(250, 204, 21, 0.4) 0%, transparent 70%);
                    border-radius: 50%;
                    z-index: 1;
                    /* animation: subtleGlow 3s infinite alternate; */
                }

                .ach-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .ach-title {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 0.25rem;
                }
                .achievement-card.equipped .ach-title {
                    color: #fde047; /* Yellow title when equipped */
                }

                .ach-desc {
                    font-size: 0.85rem;
                    color: #9ca3af;
                    margin-bottom: 1rem;
                    line-height: 1.4;
                    min-height: 2.8em;
                }

                .ach-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: auto;
                }

                .ach-reward {
                    font-size: 0.8rem;
                    font-weight: 800;
                    color: #34d399;
                    background: rgba(52, 211, 153, 0.1);
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                }
                .achievement-card.locked .ach-reward {
                    color: #6b7280;
                    background: rgba(107, 114, 128, 0.1);
                }

                .equip-btn {
                    padding: 0.35rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .equip-btn:hover {
                    background: rgba(255,255,255,0.2);
                }
                .equip-btn.active {
                    background: rgba(250, 204, 21, 0.2);
                    color: #fde047;
                }

                .locked-text {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .fadeIn { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
