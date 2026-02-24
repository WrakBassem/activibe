"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { UserAvatar } from "../components/user-avatar";

type MagazineData = {
    title: string;
    theme_color: string;
    theme: string;
    highlights: { title: string; description: string }[];
    narrative: string;
    intention: string;
}

export default function MagazinePage() {
    const [magazine, setMagazine] = useState<MagazineData | null>(null);
    const [dateRange, setDateRange] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMagazine() {
            try {
                const res = await fetch('/api/reports/magazine');
                const json = await res.json();
                if (json.success) {
                    setMagazine(json.data);
                    setDateRange(json.date_range || "This Week");
                } else {
                    setError(json.message || "Failed to consult the Oracle.");
                }
            } catch (e) {
                setError("Network Error: Could not reach the Oracle.");
            } finally {
                setLoading(false);
            }
        }
        fetchMagazine();
    }, []);

    // Split narrative into paragraphs
    const narrativeParagraphs = magazine?.narrative?.split('\n').filter(p => p.trim() !== '') || [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8 zine-loading">
                <div className="oracle-orb mb-8"></div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Consulting the Oracle...</h2>
                <p className="text-gray-400 mt-2 max-w-md">Synthesizing your past 7 days of performance into a cohesive narrative.</p>
                
                <style jsx>{`
                    .oracle-orb {
                        width: 80px; height: 80px;
                        border-radius: 50%;
                        background: radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.8), rgba(99, 102, 241, 0.2));
                        box-shadow: 0 0 40px rgba(168, 85, 247, 0.4);
                        animation: pulseOrb 2s infinite ease-in-out alternate;
                    }
                    @keyframes pulseOrb {
                        from { transform: scale(0.9); box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
                        to { transform: scale(1.1); box-shadow: 0 0 60px rgba(168, 85, 247, 0.6); }
                    }
                `}</style>
            </div>
        )
    }

    if (error || !magazine) {
        return (
            <div className="p-8 text-center mt-20">
                <h2 className="text-xl text-red-400 mb-2">The Oracle is Silent</h2>
                <p className="text-gray-400 mb-6">{error || "Not enough data to write your story yet."}</p>
                <Link href="/" className="px-6 py-2 bg-indigo-600 rounded-lg text-white font-bold inline-block hover:bg-indigo-500 transition-colors">Return to Dashboard</Link>
            </div>
        )
    }

    return (
        <div className="magazine-layout fadeIn">
            {/* Top Navigation Bar - minimal so it doesn't distract from the zine */}
            <nav className="mini-nav">
                <Link href="/" className="back-btn tooltip-container" title="Back to Dashboard">
                    <span className="text-2xl opacity-60 hover:opacity-100 transition-opacity">←</span>
                </Link>
                <div className="issue-date opacity-50 text-sm tracking-widest uppercase font-mono">
                    Issue: {dateRange}
                </div>
                <UserAvatar />
            </nav>

            <article className="zine-content">
                {/* Hero Header */}
                <header className="zine-hero" style={{ borderBottom: `4px solid ${magazine.theme_color}` }}>
                    <div className="zine-hero-inner">
                        <h1 className="zine-title bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, white, ${magazine.theme_color})` }}>
                            {magazine.title}
                        </h1>
                        <p className="zine-theme">"{magazine.theme}"</p>
                    </div>
                </header>

                <div className="zine-body">
                    {/* Left Column: Narrative */}
                    <div className="narrative-column">
                        {/* Drop cap effect for the first letter of the first paragraph */}
                        {narrativeParagraphs.map((para, idx) => (
                            <p key={idx} className={idx === 0 ? "drop-cap-para" : "zine-para"}>
                                {idx === 0 ? (
                                    <>
                                        <span className="drop-cap" style={{ color: magazine.theme_color }}>{para.charAt(0)}</span>
                                        {para.slice(1)}
                                    </>
                                ) : (para)}
                            </p>
                        ))}

                        <div className="intention-box mt-12 p-8 rounded-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 opacity-10 transition-opacity group-hover:opacity-20" style={{ backgroundColor: magazine.theme_color }}></div>
                            <div className="relative z-10">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">The Oracle's Decree</h3>
                                <p className="text-xl font-medium leading-relaxed italic text-white flex items-center gap-4">
                                    <span className="text-4xl opacity-50" style={{ color: magazine.theme_color }}>“</span>
                                    {magazine.intention}
                                    <span className="text-4xl opacity-50" style={{ color: magazine.theme_color }}>”</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Highlights Sidebar */}
                    <aside className="highlights-column">
                        <h3 className="highlights-header" style={{ color: magazine.theme_color }}>Key Victories</h3>
                        <div className="highlights-list">
                            {magazine.highlights.map((hlt, idx) => (
                                <div key={idx} className="highlight-card">
                                    <div className="highlight-index" style={{ backgroundColor: magazine.theme_color }}>{idx + 1}</div>
                                    <div>
                                        <h4 className="highlight-title">{hlt.title}</h4>
                                        <p className="highlight-desc">{hlt.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </article>

            <style jsx>{`
                .magazine-layout {
                    min-height: 100vh;
                    background-color: #0f1115; /* Even darker than dashboard to let colors pop */
                    background-image: radial-gradient(circle at top right, rgba(255,255,255,0.02) 0%, transparent 60%);
                    color: #f3f4f6;
                    padding-bottom: 4rem;
                }

                .mini-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 3rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .zine-content {
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 0 2rem;
                }

                .zine-hero {
                    margin-top: 2rem;
                    margin-bottom: 4rem;
                    padding-bottom: 2rem;
                    position: relative;
                }
                
                .zine-hero::after {
                    content: '';
                    position: absolute;
                    bottom: -15px;
                    left: 0;
                    width: 100px;
                    height: 1px;
                    background: rgba(255,255,255,0.2);
                }

                .zine-title {
                    font-size: 5rem;
                    font-weight: 900;
                    line-height: 1.1;
                    letter-spacing: -0.03em;
                    margin-bottom: 1.5rem;
                    text-wrap: balance;
                    font-family: 'Georgia', serif; /* Use a serif font for editorial feel */
                }

                .zine-theme {
                    font-size: 1.5rem;
                    font-weight: 300;
                    font-style: italic;
                    color: #9ca3af;
                    border-left: 2px solid rgba(255,255,255,0.2);
                    padding-left: 1.5rem;
                    line-height: 1.6;
                }

                .zine-body {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 6rem;
                    align-items: flex-start;
                }

                @media (max-width: 900px) {
                    .zine-body { grid-template-columns: 1fr; gap: 4rem; }
                    .zine-title { font-size: 3.5rem; }
                }

                /* Typography */
                .zine-para, .drop-cap-para {
                    font-size: 1.15rem;
                    line-height: 1.8;
                    color: #d1d5db;
                    margin-bottom: 1.5rem;
                    font-family: 'Georgia', serif;
                }

                .drop-cap {
                    float: left;
                    font-size: 4.5rem;
                    line-height: 0.8;
                    padding-top: 8px;
                    padding-right: 8px;
                    font-weight: 900;
                    font-style: italic;
                }

                /* Sidebar Highlights */
                .highlights-header {
                    font-size: 1rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 2rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 0.5rem;
                }

                .highlight-card {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    align-items: flex-start;
                }
                
                .highlight-index {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: bold;
                    color: #000;
                    flex-shrink: 0;
                    margin-top: 4px;
                }

                .highlight-title {
                    font-weight: 700;
                    font-size: 1.1rem;
                    margin-bottom: 0.25rem;
                    color: #f9fafb;
                }

                .highlight-desc {
                    font-size: 0.95rem;
                    color: #9ca3af;
                    line-height: 1.5;
                }

                .fadeIn { animation: fadeIn 0.8s ease-out forwards; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
