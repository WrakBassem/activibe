"use client";

import { useState, useEffect } from 'react';

export function MorningModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [briefing, setBriefing] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check if we already showed it today
        const todayStr = new Date().toDateString();
        const lastBriefing = localStorage.getItem('lastMorningBriefing');

        if (lastBriefing !== todayStr) {
            setIsOpen(true);
            fetchBriefing();
        }
    }, []);

    const fetchBriefing = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/reports/morning');
            const json = await res.json();
            
            if (json.success && json.data) {
                setBriefing(json.data);
            } else {
                setError("Oracle unavailable this morning.");
            }
        } catch (e) {
            console.error(e);
            setError("Failed to consult the Oracle.");
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = () => {
        const todayStr = new Date().toDateString();
        localStorage.setItem('lastMorningBriefing', todayStr);
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                padding: '2.5rem',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.1)',
                color: 'white',
                position: 'relative',
                animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', fontSize: '3rem', filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.5))' }}>
                    🌅
                </div>

                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-pulse mb-4 text-purple-400 text-lg">The Oracle is divining your path...</div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: '100%', background: '#8b5cf6', animation: 'progress 2s infinite linear', transformOrigin: 'left' }}></div>
                        </div>
                    </div>
                ) : error ? (
                    <div className="text-center py-4">
                        <p className="text-red-400 mb-6">{error}</p>
                        <button onClick={handleDismiss} className="action-btn primary w-full justify-center">Enter Dashboard</button>
                    </div>
                ) : briefing ? (
                    <div className="fadeIn">
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.5rem', color: '#f8fafc' }}>
                            {briefing.greeting}
                        </h2>
                        
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <span style={{ 
                                display: 'inline-block', padding: '4px 12px', borderRadius: '99px', 
                                background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.5)',
                                color: '#c4b5fd', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase'
                            }}>
                                Focus: {briefing.theme}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
                            {briefing.priorities.map((p: any, idx: number) => (
                                <div key={idx} style={{ 
                                    background: 'rgba(255, 255, 255, 0.03)', 
                                    borderLeft: '3px solid #8b5cf6',
                                    padding: '1rem', borderRadius: '0 8px 8px 0'
                                }}>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.25rem' }}>{p.habit_name}</h4>
                                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>{p.reason}</p>
                                </div>
                            ))}
                        </div>

                        <button 
                            onClick={handleDismiss} 
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: 'linear-gradient(to right, #8b5cf6, #6d28d9)',
                                color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer',
                                transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)'
                            }}
                            className="hover:scale-[1.02] hover:shadow-lg"
                        >
                            Let's Go ⚔️
                        </button>
                    </div>
                ) : null}
            </div>

            <style jsx>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes progress {
                    0% { transform: scaleX(0); }
                    50% { transform: scaleX(0.5); }
                    100% { transform: scaleX(1); }
                }
                .fadeIn { animation: opacityIn 0.5s ease-out; }
                @keyframes opacityIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}
