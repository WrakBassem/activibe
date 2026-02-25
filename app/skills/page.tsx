"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { UserAvatar } from "../components/user-avatar";

type Attribute = {
    name: string;
    total_xp: number;
    level: number;
    progressPercent: number;
    xpIntoLevel: number;
    xpNeededForLevel: number;
};

const ICONS: Record<string, string> = {
    strength: "💪",
    intellect: "🧠",
    vitality: "❤️",
    charisma: "🗣️",
    focus: "🎯"
};

const COLORS: Record<string, string> = {
    strength: "from-red-500 to-orange-500",
    intellect: "from-blue-500 to-cyan-500",
    vitality: "from-green-500 to-emerald-500",
    charisma: "from-pink-500 to-rose-500",
    focus: "from-purple-500 to-indigo-500"
};

export default function SkillsPage() {
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAttr, setSelectedAttr] = useState<Attribute | null>(null);

    useEffect(() => {
        async function fetchSkills() {
            try {
                const res = await fetch('/api/skills');
                const json = await res.json();
                if (json.success) {
                    setAttributes(json.data);
                    if (json.data.length > 0) setSelectedAttr(json.data[0]);
                }
            } catch (e) {
                console.error("Failed to load skills", e);
            } finally {
                setLoading(false);
            }
        }
        fetchSkills();
    }, []);

    if (loading) return <div className="p-8 text-center text-gray-400">Loading Character Sheet...</div>;

    return (
        <div className="skills-page fadeIn">
            {/* Header */}
            <header className="dashboard-header">
                <div>
                <h1 className="dashboard-title flex items-center gap-2">
                    <Link href="/" className="back-btn opacity-60 hover:opacity-100 transition-opacity">←</Link> 
                    Mastery Trees
                </h1>
                <p className="dashboard-subtitle">Long-term character progression based on your daily habits.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <UserAvatar />
                </div>
            </header>

            {/* Info Banner */}
            <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-xl p-4 mb-6 flex gap-4 items-start text-sm text-indigo-100">
                <span className="text-xl">ℹ️</span>
                <div>
                    <strong className="block mb-1 text-white">How Mastery Trees work:</strong>
                    Each attribute (Strength, Intellect, Vitality...) grows when you log habits linked to that life axis. Log consistently → earn XP → unlock tree nodes → rise in level. Your level here reflects long-term commitment, not single-day performance.
                </div>
            </div>

            <div className="skills-layout">
                {/* Left Side: Attribute Selection */}
                <div className="attribute-list">
                    <h2 className="text-xl font-bold mb-4 text-white">Core Attributes</h2>
                    {attributes.map(attr => (
                        <div 
                            key={attr.name} 
                            onClick={() => setSelectedAttr(attr)}
                            className={`attr-card ${selectedAttr?.name === attr.name ? 'active' : ''}`}
                        >
                            <div className="attr-icon">{ICONS[attr.name]}</div>
                            <div className="attr-info">
                                <div className="flex justify-between items-end mb-1">
                                    <h3 className="attr-name">{attr.name}</h3>
                                    <span className="attr-lvl">Lvl {attr.level}</span>
                                </div>
                                <div className="attr-bar-bg">
                                    <div 
                                        className={`attr-bar-fill bg-gradient-to-r ${COLORS[attr.name]}`} 
                                        style={{ width: `${attr.progressPercent}%` }} 
                                    />
                                </div>
                                <div className="text-xs text-right mt-1 opacity-50">
                                    {attr.xpIntoLevel} / {attr.xpNeededForLevel} XP
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Visual Skill Tree */}
                <div className="skill-tree-viewer">
                    {selectedAttr ? (
                        <SkillTree attribute={selectedAttr} />
                    ) : (
                        <div className="text-gray-500 text-center mt-20">Select an attribute to view mastery.</div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .skills-page { padding: 2rem 1rem; max-width: 1200px; margin: 0 auto; color: white; }
                .dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
                .dashboard-title { font-size: 2rem; font-weight: 800; margin: 0; color: #f9fafb; letter-spacing: -0.02em; }
                .dashboard-subtitle { font-size: 0.95rem; color: #9ca3af; margin-top: 0.25rem; }
                
                .back-btn { font-size: 1.5rem; text-decoration: none; color: white; }

                .skills-layout {
                    display: grid;
                    grid-template-columns: 300px 1fr;
                    gap: 2rem;
                    align-items: flex-start;
                }

                @media (max-width: 768px) {
                    .skills-layout { grid-template-columns: 1fr; }
                }

                .attribute-list {
                    background: rgba(31, 41, 55, 0.4);
                    border-radius: 16px;
                    padding: 1.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .attr-card {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    padding: 1rem;
                    background: rgba(0,0,0,0.2);
                    border-radius: 12px;
                    margin-bottom: 0.75rem;
                    cursor: pointer;
                    border: 1px solid transparent;
                    transition: all 0.2s;
                }
                .attr-card:hover { background: rgba(255,255,255,0.05); }
                .attr-card.active {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.15);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .attr-icon { font-size: 2rem; }
                .attr-info { flex: 1; }
                .attr-name { text-transform: capitalize; margin: 0; font-weight: 700; font-size: 1.05rem; }
                .attr-lvl { font-size: 0.85rem; font-weight: 800; color: #9ca3af; }

                .attr-bar-bg {
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }
                .attr-bar-fill { height: 100%; transition: width 0.5s ease-out; }

                .skill-tree-viewer {
                    background: linear-gradient(180deg, rgba(17,24,39,0.95) 0%, rgba(0,0,0,0.95) 100%);
                    border-radius: 24px;
                    min-height: 600px;
                    position: relative;
                    border: 1px solid rgba(255,255,255,0.05);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .fadeIn { animation: fadeIn 0.5s ease-out forwards; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// Visual Node Component for the Tree
function SkillTree({ attribute }: { attribute: Attribute }) {
    // Generate dummy nodes based on the attribute level to simulate a branching tree
    const maxNodes = 12; // Total nodes visually presented
    const unlockedLevel = attribute.level;
    
    // We'll arrange nodes in a neat V shape or spreading pattern
    const nodes = Array.from({ length: maxNodes }).map((_, i) => {
        const requiredLevel = (i * 2) + 1; // Unlocks at 1, 3, 5, 7...
        const isUnlocked = unlockedLevel >= requiredLevel;
        return {
            id: i,
            reqLevel: requiredLevel,
            unlocked: isUnlocked,
            // Math for rough visual placement (inverted tree spreading upwards)
            x: 50 + (i % 2 === 0 ? -1 : 1) * (15 + (i * 2)), 
            y: 90 - (i * 7) 
        };
    });

    return (
        <div className="tree-container">
            <h2 className="tree-title capitalize bg-clip-text text-transparent bg-gradient-to-r {COLORS[attribute.name]}">
                Path of {attribute.name}
            </h2>
            <div className="total-xp-display">{attribute.total_xp.toLocaleString()} Lifetime XP</div>

            <div className="tree-canvas">
                {/* SVG for connecting lines */}
                <svg className="connections">
                    {nodes.map((node, i) => {
                        if (i === 0) return null;
                        const prevNode = nodes[i - (i % 2 === 0 ? 2 : 1)] || nodes[0];
                        return (
                            <line 
                                key={`line-${i}`}
                                x1={`${prevNode.x}%`} 
                                y1={`${prevNode.y}%`} 
                                x2={`${node.x}%`} 
                                y2={`${node.y}%`}
                                stroke={node.unlocked ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.05)"}
                                strokeWidth={node.unlocked ? "3" : "2"}
                                strokeDasharray={node.unlocked ? "none" : "5,5"}
                            />
                        )
                    })}
                </svg>

                {/* Nodes */}
                {nodes.map(node => (
                    <div 
                        key={node.id}
                        className={`tree-node ${node.unlocked ? 'unlocked' : 'locked'}`}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        title={node.unlocked ? `Unlocked at Level ${node.reqLevel}` : `Reach Level ${node.reqLevel} in this attribute to unlock this milestone`}
                    >
                        <div className="node-inner bg-gradient-to-br"></div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .tree-container {
                    width: 100%;
                    height: 100%;
                    padding: 3rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .tree-title { font-size: 2.5rem; font-weight: 900; margin-bottom: 0.5rem; }
                .total-xp-display { color: #9ca3af; font-weight: 600; font-size: 1.1rem; letter-spacing: 0.05em; }
                
                .tree-canvas {
                    flex: 1;
                    width: 100%;
                    max-width: 600px;
                    position: relative;
                    margin-top: 2rem;
                }
                .connections {
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    top: 0; left: 0;
                }

                .tree-node {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    background: rgba(0,0,0,0.5);
                    border: 2px solid rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s, box-shadow 0.2s;
                    cursor: pointer;
                    z-index: 10;
                }

                .tree-node.unlocked {
                    border-color: rgba(255,255,255,0.8);
                    box-shadow: 0 0 15px rgba(255,255,255,0.3);
                }
                .tree-node.unlocked .node-inner {
                    width: 60%;
                    height: 60%;
                    border-radius: 50%;
                    background: white; /* Will inherit color via class in real app */
                    box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
                }
                .tree-node.unlocked:hover {
                    transform: translate(-50%, -50%) scale(1.1);
                    box-shadow: 0 0 25px rgba(255,255,255,0.5);
                }

                .tree-node.locked { opacity: 0.4; }
                .tree-node.locked .node-inner {
                    width: 20%; height: 20%; border-radius: 50%; background: #4b5563;
                }
            `}</style>
        </div>
    )
}
