"use client";

import { useState, useEffect, useRef } from 'react';

export function MorningModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [briefing, setBriefing] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const fetchedRef = useRef(false);

    useEffect(() => {
        // Only show once per day — check localStorage
        const todayStr = new Date().toDateString();
        const lastShown = localStorage.getItem('lastMorningBriefing');
        if (lastShown === todayStr) return;

        // Don't double-fetch
        if (fetchedRef.current) return;
        fetchedRef.current = true;

        // Silent background fetch — no loading state shown on the dashboard
        fetch('/api/reports/morning')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data) {
                    setBriefing(json.data);
                    setIsOpen(true); // ← dialog appears only when data is ready
                } else {
                    // If AI fails, don't bother the user — just mark as seen so we don't retry
                    console.warn('[MorningModal] Briefing unavailable:', json.error);
                }
            })
            .catch(err => {
                console.warn('[MorningModal] Fetch failed:', err);
            });
    }, []);

    const handleDismiss = () => {
        const todayStr = new Date().toDateString();
        localStorage.setItem('lastMorningBriefing', todayStr);
        setIsOpen(false);
    };

    if (!isOpen || !briefing) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{
                background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                borderRadius: '20px',
                padding: '2.5rem 2rem 2rem',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 30px 60px -10px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1), 0 0 60px rgba(139,92,246,0.08)',
                color: 'white',
                position: 'relative',
                animation: 'morningSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>

                {/* Floating sunrise icon */}
                <div style={{
                    position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
                    fontSize: '3rem', filter: 'drop-shadow(0 0 14px rgba(251,191,36,0.6))',
                    animation: 'sunRise 0.6s ease-out 0.2s both'
                }}>🌅</div>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.75rem', marginTop: '0.25rem' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.5rem' }}>
                        {briefing.greeting}
                    </h2>
                    <span style={{
                        display: 'inline-block', padding: '3px 14px', borderRadius: '99px',
                        background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.45)',
                        color: '#c4b5fd', fontSize: '0.78rem', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase'
                    }}>
                        Today's Focus · {briefing.theme}
                    </span>
                </div>

                {/* Priority items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {(briefing.priorities || []).map((p: any, idx: number) => (
                        <div key={idx} style={{
                            background: 'rgba(255,255,255,0.035)',
                            borderLeft: `3px solid ${idx === 0 ? '#8b5cf6' : idx === 1 ? '#6366f1' : '#4f46e5'}`,
                            padding: '0.9rem 1rem', borderRadius: '0 10px 10px 0',
                            animation: `priorityIn 0.4s ease-out ${0.1 + idx * 0.08}s both`
                        }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.2rem' }}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {p.habit_name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                {p.reason}
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <button
                    onClick={handleDismiss}
                    style={{
                        width: '100%', padding: '13px', borderRadius: '10px',
                        background: 'linear-gradient(to right, #8b5cf6, #6d28d9)',
                        color: 'white', fontWeight: 700, fontSize: '0.95rem',
                        border: 'none', cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        letterSpacing: '0.02em'
                    }}
                    onMouseEnter={e => {
                        (e.target as HTMLButtonElement).style.transform = 'scale(1.02)'
                        ;(e.target as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(139,92,246,0.55)'
                    }}
                    onMouseLeave={e => {
                        (e.target as HTMLButtonElement).style.transform = 'scale(1)'
                        ;(e.target as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(139,92,246,0.4)'
                    }}
                >
                    Let's Forge the Day ⚔️
                </button>

                {/* Dismiss link */}
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                    <button
                        onClick={handleDismiss}
                        style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                        Skip for today
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes morningSlideIn {
                    from { opacity: 0; transform: translateY(24px) scale(0.94); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes sunRise {
                    from { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.7); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
                }
                @keyframes priorityIn {
                    from { opacity: 0; transform: translateX(-12px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
