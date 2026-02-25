"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BossDefeatedModal, BossReward } from '../components/BossDefeatedModal';

export default function FocusForge() {
    // Timer State
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<'focus' | 'break'>('focus');
    
    // Background Data
    const [metrics, setMetrics] = useState<any[]>([]);
    const [selectedMetric, setSelectedMetric] = useState<string>('');
    const [xpRewards, setXpRewards] = useState<string[]>([]);
    const [isFinishing, setIsFinishing] = useState(false);
    const [bossReward, setBossReward] = useState<BossReward | null>(null);

    // Audio State
    const [isPlayingSound, setIsPlayingSound] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Fetch metrics to tie the focus session to a specific habit
        const fetchMetrics = async () => {
            try {
                const res = await fetch('/api/metrics');
                const json = await res.json();
                if (json.success && json.data) {
                    setMetrics(json.data.filter((m: any) => m.active));
                }
            } catch (e) {
                console.error("Failed to load metrics", e);
            }
        };
        fetchMetrics();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            handleTimerComplete();
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft]);

    const handleTimerComplete = async () => {
        setIsActive(false);
        setIsFinishing(true);

        if (mode === 'focus') {
            // Trigger Backend XP
            try {
                const res = await fetch('/api/log/focus', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        minutes_focused: 25,
                        metric_id: selectedMetric || undefined
                    })
                });
                const json = await res.json();
                if (json.success && json.data) {
                    let msgs = [...(json.data.messages || [])];
                    
                    if (json.data.boss) {
                        const b = json.data.boss;
                        if (b.type === 'defeat') {
                            setBossReward({
                                xp: b.xp,
                                item: b.item,
                                boss_name: b.boss_name
                            });
                        } else if (b.type === 'damage') {
                            msgs.push(`💥 ${b.damage} DMG to ${b.boss_name}!`);
                            msgs.push(`❤️ ${b.current_health} HP LEFT`);
                        }
                    }

                    if (json.data.campaign) {
                        const camp = json.data.campaign;
                        if (camp.defeated) {
                            setBossReward({
                                xp: camp.reward.xp,
                                gold: camp.reward.gold,
                                item: camp.reward.item,
                                boss_name: camp.reward.boss_name
                            } as any);
                        } else if (camp.damage > 0) {
                            msgs.push(`🛡️ Story Boss: -${camp.damage} HP!`);
                        }
                    }
                    
                    setXpRewards(msgs.length > 0 ? msgs : ["Focus Session Complete!"]);
                } else {
                    setXpRewards(["Focus Session Complete!"]);
                }
            } catch (e) {
                console.error(e);
                setXpRewards(["Focus Session Complete! (Offline)"]);
            }
            
            // Switch to break after 4 seconds of celebration
            setTimeout(() => {
                setXpRewards([]);
                setIsFinishing(false);
                setMode('break');
                setTimeLeft(5 * 60); // 5 min break
            }, 4000);
        } else {
            // Break completed, back to focus
            setMode('focus');
            setTimeLeft(25 * 60);
            setIsFinishing(false);
        }
    };

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
    };

    const skipTimer = () => {
        // Dev cheat/skip for testing
        setTimeLeft(2);
        if (!isActive) setIsActive(true);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Very simple ambient noise generator using Web Audio API to avoid CORS/Iframe issues
    const toggleAmbientNoise = () => {
        if (!audioRef.current) {
            // We use a safe placeholder audio or a youtube embed in reality. 
            // For this UI, let's just use a YouTube embed state to display Lofi Girl
            setIsPlayingSound(!isPlayingSound);
        } else {
            setIsPlayingSound(!isPlayingSound);
        }
    };

    return (
        <div className="focus-forge-container">
            <BossDefeatedModal reward={bossReward} onClose={() => setBossReward(null)} />
            {/* Header Navigation */}
            <nav className="p-6 flex justify-between items-center z-10 relative">
                <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                    <span>←</span> Return to Base
                </Link>
                <div className="flex gap-4">
                    <button 
                        onClick={toggleAmbientNoise} 
                        className={`action-btn ${isPlayingSound ? 'primary' : 'secondary'}`}
                        title="Toggle Lofi Radio"
                    >
                        {isPlayingSound ? '🎧 Lofi: ON' : '🎧 Lofi: OFF'}
                    </button>
                </div>
            </nav>

            {/* Collapsible Help */}
            <div className="z-10 relative flex justify-center w-full px-4 mb-4">
                <details className="w-full max-w-md bg-indigo-900/20 border border-indigo-500/30 rounded-xl text-sm text-indigo-100 group">
                    <summary className="p-3 cursor-pointer select-none flex items-center gap-3 font-semibold text-white outline-none">
                        <span className="text-xl">ℹ️</span>
                        <span>What is the Focus Forge?</span>
                        <span className="ml-auto opacity-50 text-xs">▼ Click to expand</span>
                    </summary>
                    <div className="p-4 pt-1 text-indigo-200/90 leading-relaxed border-t border-indigo-500/10 mt-1">
                        <strong>Deep Focus Forge:</strong> Use the Pomodoro timer to run focused work sessions. Complete a full session to earn XP and advance quest progress. Ambient sounds help you stay in flow. Hardcore Mode doubles your XP gains but doubles penalties too.
                    </div>
                </details>
            </div>

            {/* YouTube Embed for Lofi Background (Hidden visually, audio plays) */}
            {isPlayingSound && (
                <div style={{ position: 'absolute', top: -9999, left: -9999 }}>
                    <iframe 
                        width="560" height="315" 
                        src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=0&loop=1&playlist=jfKfPfyJRdk" 
                        title="Lofi Girl" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    ></iframe>
                </div>
            )}

            {/* Main Content Center */}
            <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 relative">
                
                {/* Mode Selector */}
                <div className="flex gap-4 mb-12">
                    <button 
                        onClick={() => { setMode('focus'); setTimeLeft(25 * 60); setIsActive(false); }}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${mode === 'focus' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Deep Focus
                    </button>
                    <button 
                        onClick={() => { setMode('break'); setTimeLeft(5 * 60); setIsActive(false); }}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${mode === 'break' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Rest
                    </button>
                </div>

                {/* The Timer */}
                <div className={`timer-display ${isActive ? 'timer-active' : ''} ${isFinishing ? 'timer-finish' : ''}`}>
                    {formatTime(timeLeft)}
                </div>

                {/* Floating XP Rewards Animation overlay */}
                {xpRewards.length > 0 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-50">
                        {xpRewards.map((msg, i) => (
                            <div key={i} className="float-up text-2xl font-bold font-mono text-green-400 mb-2" style={{ animationDelay: (i * 0.2) + 's' }}>
                                + {msg}
                            </div>
                        ))}
                    </div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-6 mt-12 mb-16">
                    <button onClick={resetTimer} className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors">
                        🔄
                    </button>
                    <button 
                        onClick={toggleTimer} 
                        className="w-24 h-24 rounded-full bg-white text-black text-3xl flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                    >
                        {isActive ? '⏸' : '▶'}
                    </button>
                    <button onClick={skipTimer} className="p-4 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors" title="Skip to end (Testing)">
                        ⏭
                    </button>
                </div>

                {/* Metric Selector */}
                {mode === 'focus' && (
                    <div className="w-full max-w-md bg-gray-900/50 backdrop-blur-md border border-gray-800 p-6 rounded-2xl text-center">
                        <label className="block text-gray-400 text-sm font-semibold mb-3 tracking-wider uppercase">
                            Tie Session to Habit / Quest
                        </label>
                        <select 
                            value={selectedMetric} 
                            onChange={(e) => setSelectedMetric(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                            disabled={isActive}
                        >
                            <option value="">No specific habit (Global Core XP only)</option>
                            {metrics.map(m => (
                                <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                            Completing a Focus Session while tied to a habit automatically logs 25 minutes of dedicated time, grants massive attribute XP, and progresses any active quests.
                        </p>
                    </div>
                )}
            </main>

            {/* Styling */}
            <style dangerouslySetInnerHTML={{ __html: `
                .focus-forge-container {
                    min-height: 100vh;
                    background: radial-gradient(circle at center, #1e1b4b 0%, #000000 100%);
                    color: white;
                    font-family: 'Inter', sans-serif;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .timer-display {
                    font-size: 8rem;
                    font-weight: 800;
                    font-variant-numeric: tabular-nums;
                    letter-spacing: -0.05em;
                    color: #e2e8f0;
                    text-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }
                .timer-active {
                    color: #fff;
                    text-shadow: 0 0 60px rgba(147, 51, 234, 0.6), 0 0 20px rgba(147, 51, 234, 0.4);
                }
                .timer-finish {
                    animation: pulse-glow 1s ease-in-out infinite alternate;
                }
                @keyframes pulse-glow {
                    from { text-shadow: 0 0 60px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.4); color: #86efac; }
                    to { text-shadow: 0 0 100px rgba(34, 197, 94, 0.9), 0 0 40px rgba(34, 197, 94, 0.6); color: #bbf7d0; }
                }
                .float-up {
                    animation: floatUpAndFade 2.5s ease-out forwards;
                    opacity: 0;
                }
                @keyframes floatUpAndFade {
                    0% { opacity: 0; transform: translateY(20px) scale(0.9); }
                    20% { opacity: 1; transform: translateY(0) scale(1.1); }
                    80% { opacity: 1; transform: translateY(-30px) scale(1); }
                    100% { opacity: 0; transform: translateY(-50px) scale(0.9); }
                }
            ` }} />
        </div>
    );
}
