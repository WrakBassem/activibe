"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./LootDropModal.css";

export interface LootItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
}

interface LootDropModalProps {
    item: LootItem | null;
    onClose: () => void;
}

export function LootDropModal({ item, onClose }: LootDropModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (item) {
            // Slight delay for dramatic effect after the API returns
            const timer = setTimeout(() => setIsVisible(true), 500);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [item]);

    if (!item) return null;

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
    };

    return (
        <div className={`loot-modal-overlay ${isVisible ? 'visible' : ''}`}>
            <div className={`loot-modal-content rarity-${item.rarity} ${isVisible ? 'scaled-up' : ''}`}>
                <button className="close-btn" onClick={handleClose}>×</button>
                
                <div className="loot-header">
                    <span className="loot-sparkles">✨</span>
                    <h2>Loot Drop Secured!</h2>
                    <span className="loot-sparkles">✨</span>
                </div>
                
                <p className="loot-subtitle">Your perfect score unlocked a reward.</p>
                
                <div className="loot-item-showcase">
                    <div className="loot-icon-wrapper pulse-animation">
                        <span className="loot-icon">{item.icon}</span>
                    </div>
                </div>
                
                <div className="loot-details">
                    <span className={`loot-rarity-badge badge-${item.rarity}`}>
                        {item.rarity.toUpperCase()}
                    </span>
                    <h3 className="loot-item-name">{item.name}</h3>
                    <p className="loot-item-desc">{item.description}</p>
                </div>
                
                <div className="loot-actions">
                    <Link href="/inventory" className="loot-action-btn primary" onClick={handleClose}>
                        Open Bag
                    </Link>
                    <button className="loot-action-btn secondary" onClick={handleClose}>
                        Keep Grinding
                    </button>
                </div>
            </div>
            
            {/* Celebration particles */}
            {isVisible && (
                <div className="confetti-container">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className={`confetti rarity-${item.rarity}`} style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 0.5}s`,
                            animationDuration: `${1 + Math.random()}s`
                        }}></div>
                    ))}
                </div>
            )}
        </div>
    );
}
