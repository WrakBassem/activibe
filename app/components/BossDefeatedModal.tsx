"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./BossDefeatedModal.css";

export interface BossReward {
    xp: number;
    item: {
        name: string;
        description: string;
        icon: string;
        rarity: string;
    } | null;
    boss_name: string;
}

interface BossDefeatedModalProps {
    reward: BossReward | null;
    onClose: () => void;
}

export function BossDefeatedModal({ reward, onClose }: BossDefeatedModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (reward) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [reward]);

    if (!reward) return null;

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 400); 
    };

    return (
        <div className={`boss-modal-overlay ${isVisible ? 'visible' : ''}`}>
            <div className={`boss-modal-content ${isVisible ? 'entry-anim' : ''}`}>
                <div className="boss-modal-inner">
                    <div className="boss-victory-header">
                        <span className="victory-crown">👑</span>
                        <h2 className="victory-title">ADVERSARY VANQUISHED</h2>
                        <span className="victory-crown">👑</span>
                    </div>

                    <div className="boss-defeat-summary">
                        <h1 className="boss-dead-name">{reward.boss_name}</h1>
                        <p className="boss-dead-desc">has been purged from your psyche.</p>
                    </div>

                    <div className="reward-section">
                        <div className="reward-pill xp-reward">
                            <span className="reward-label">EXPERIENCE</span>
                            <span className="reward-value">+{reward.xp} XP</span>
                        </div>
                        
                        {(reward as any).gold && (
                            <div className="reward-pill gold-reward">
                                <span className="reward-label">TREASURE</span>
                                <span className="reward-value">+{(reward as any).gold} GOLD</span>
                            </div>
                        )}

                        {reward.item && (
                            <div className="boss-item-reward">
                                <p className="reward-meta">LEGACY LOOT DROPPED</p>
                                <div className={`boss-item-card rarity-${reward.item.rarity}`}>
                                    <span className="boss-item-icon">{reward.item.icon}</span>
                                    <div className="boss-item-info">
                                        <h4>{reward.item.name}</h4>
                                        <p>{reward.item.description}</p>
                                        <span className="boss-item-rarity">{reward.item.rarity.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="boss-modal-actions">
                        <Link href="/" className="boss-act-btn primary" onClick={handleClose}>
                            Return to Dashboard
                        </Link>
                        <button className="boss-act-btn secondary" onClick={handleClose}>
                            Continue
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Dark/Blood Confetti */}
            {isVisible && (
                <div className="boss-victory-particles">
                    {[...Array(30)].map((_, i) => (
                        <div key={i} className="particle" style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 1.5}s`,
                            backgroundColor: i % 2 === 0 ? '#ef4444' : '#6b21a8'
                        }}></div>
                    ))}
                </div>
            )}
        </div>
    );
}
