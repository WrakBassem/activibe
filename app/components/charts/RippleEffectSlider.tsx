"use client";

import { useState, useEffect } from "react";

type Correlation = {
  source_metric_name: string;
  target_metric_name: string;
  target_axis: string;
  impact_factor: number; // e.g. 0.45 or -0.2
  base_avg: number;      // e.g. 0.5 (representing 50%)
};

export function RippleEffectSlider({ correlations }: { correlations: Correlation[] }) {
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState<number>(50); // 0 to 100
  const [sources, setSources] = useState<string[]>([]);

  useEffect(() => {
    if (correlations && correlations.length > 0) {
      // Extract unique sources that have at least one impact > 0.1
      const uniqueSources = Array.from(new Set(correlations.map(c => c.source_metric_name)));
      setSources(uniqueSources);
      if (uniqueSources.length > 0 && !activeSource) {
        setActiveSource(uniqueSources[0]);
      }
    }
  }, [correlations]);

  if (!correlations || correlations.length === 0) return null;
  if (!activeSource) return null;

  // Get impacts for the active source
  const activeImpacts = correlations.filter(c => c.source_metric_name === activeSource);
  
  // Normalized slider value [0, 1] for calculations
  const normalizedSlider = sliderValue / 100;

  return (
    <div className="ripple-sandbox">
      <div className="sandbox-header">
        <h3 className="section-title flex items-center gap-2">
          <span className="sandbox-icon">🎛️</span>
          Sandbox: Actions & Consequences
        </h3>
        <p className="sandbox-subtitle">Drag the slider to see how changing one habit affects your other metrics.</p>
      </div>

      {/* Source Selection & Control */}
      <div className="control-panel">
        <div className="source-tabs">
          {sources.map(source => (
            <button
              key={source}
              onClick={() => {
                setActiveSource(source);
                setSliderValue(50); // Reset on switch
              }}
              className={`source-tab ${activeSource === source ? 'active' : ''}`}
            >
              {source}
            </button>
          ))}
        </div>

        <div className="slider-wrapper">
          <div className="slider-labels">
            <span className="label-low">Low {activeSource}</span>
            <span className="label-high">Max {activeSource}</span>
          </div>
          
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={sliderValue}
            onChange={(e) => setSliderValue(Number(e.target.value))}
            className="styled-slider"
          />
        </div>
      </div>

      {/* Target Impact Visualization */}
      <div className="impact-zone">
        <h4 className="impact-title">Predicted Ripple Effect:</h4>
        
        <div className="impact-bars">
          {activeImpacts.map(impact => {
            // Calculation: 
            // When slider is 0 (Low), target is at base_avg.
            // When slider is 1 (High), target is base_avg + impact_factor.
            // We interpolate based on the normalizedSlider (0 to 1).
            
            const predictedValue = Math.min(Math.max(impact.base_avg + (normalizedSlider * impact.impact_factor), 0), 1);
            const predictedPercentage = Math.round(predictedValue * 100);
            
            // Determine color based on impact factor polarity
            const isPositive = impact.impact_factor > 0;
            const barColor = isPositive ? 'var(--positive-color, #22c55e)' : 'var(--negative-color, #ef4444)';

            return (
              <div key={impact.target_metric_name} className="impact-row">
                <div className="impact-info">
                  <span className="impact-name">{impact.target_metric_name}</span>
                  <span className="impact-score" style={{ color: barColor }}>
                    {predictedPercentage}%
                  </span>
                </div>
                
                <div className="bar-bg">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      width: `${predictedPercentage}%`,
                      backgroundColor: barColor 
                    }} 
                  />
                  {/* Ghost bar showing the max potential shift */}
                  {isPositive && (
                      <div className="bar-ghost positive-ghost" style={{ left: `${impact.base_avg * 100}%`, width: `${impact.impact_factor * 100}%` }} />
                  )}
                  {!isPositive && (
                      <div className="bar-ghost negative-ghost" style={{ left: `${(impact.base_avg + impact.impact_factor) * 100}%`, width: `${Math.abs(impact.impact_factor) * 100}%` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .ripple-sandbox {
            background: rgba(255,255,255,0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255,255,255,0.4);
            border-radius: 20px;
            padding: 1.5rem;
            margin-top: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8);
            overflow: hidden;
            position: relative;
        }

        @media (prefers-color-scheme: dark) {
            .ripple-sandbox {
                background: rgba(30,30,30,0.6);
                border-color: rgba(255,255,255,0.08);
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
        }

        .ripple-sandbox::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
        }

        .sandbox-header { margin-bottom: 1.5rem; }
        .section-title { font-size: 1.15rem; font-weight: 800; color: #111827; margin: 0 0 0.25rem 0; letter-spacing: -0.01em; }
        .sandbox-subtitle { font-size: 0.85rem; color: #6b7280; margin: 0; }
        
        @media (prefers-color-scheme: dark) {
            .section-title { color: #f9fafb; }
            .sandbox-subtitle { color: #9ca3af; }
        }

        .control-panel {
            background: white;
            border-radius: 16px;
            padding: 1.25rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            border: 1px solid #f3f4f6;
            margin-bottom: 1.5rem;
        }

        @media (prefers-color-scheme: dark) {
            .control-panel { background: #1f1f1f; border-color: #333; }
        }

        .source-tabs {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 1rem;
            scrollbar-width: none;
        }
        .source-tabs::-webkit-scrollbar { display: none; }
        
        .source-tab {
            padding: 0.4rem 1rem;
            border-radius: 99px;
            font-size: 0.85rem;
            font-weight: 600;
            background: #f3f4f6;
            color: #4b5563;
            border: 1px solid transparent;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
        }
        .source-tab:hover { background: #e5e7eb; }
        .source-tab.active {
            background: #eef2ff;
            color: #4f46e5;
            border-color: #c7d2fe;
            box-shadow: 0 2px 4px rgba(79, 70, 229, 0.1);
        }

        @media (prefers-color-scheme: dark) {
            .source-tab { background: #374151; color: #d1d5db; }
            .source-tab:hover { background: #4b5563; }
            .source-tab.active { background: #3730a3; color: #e0e7ff; border-color: #4f46e5; }
        }

        .slider-wrapper { margin-top: 0.5rem; }
        .slider-labels {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .label-low { color: #f87171; }
        .label-high { color: #4ade80; }

        .styled-slider {
            -webkit-appearance: none;
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 8px;
            outline: none;
            transition: background 0.3s;
        }
        .styled-slider:focus { outline: 2px solid #a5b4fc; outline-offset: 2px; }
        .styled-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #4f46e5;
            cursor: pointer;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2), 0 2px 4px rgba(0,0,0,0.2);
            transition: transform 0.1s;
        }
        .styled-slider::-webkit-slider-thumb:active { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(79, 70, 229, 0.3); }
        .styled-slider::-moz-range-thumb {
            width: 24px; height: 24px; border-radius: 50%; background: #4f46e5; cursor: pointer;
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2); border: none;
        }
        
        @media (prefers-color-scheme: dark) {
            .styled-slider { background: #4b5563; }
            .styled-slider::-webkit-slider-thumb { background: #818cf8; box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.2); }
        }

        .impact-zone { padding: 0 0.5rem; }
        .impact-title { font-size: 0.9rem; font-weight: 700; color: #4b5563; margin-bottom: 1rem; }
        @media (prefers-color-scheme: dark) { .impact-title { color: #d1d5db; } }

        .impact-bars { display: flex; flex-direction: column; gap: 1.25rem; }
        .impact-row { display: flex; flex-direction: column; gap: 0.4rem; }
        
        .impact-info { display: flex; justify-content: space-between; align-items: flex-end; }
        .impact-name { font-size: 0.85rem; font-weight: 600; color: #374151; }
        .impact-score { font-size: 0.9rem; font-weight: 800; font-variant-numeric: tabular-nums; }
        @media (prefers-color-scheme: dark) { .impact-name { color: #e5e7eb; } }

        .bar-bg {
            width: 100%;
            height: 10px;
            background: #f3f4f6;
            border-radius: 99px;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
        }
        @media (prefers-color-scheme: dark) { .bar-bg { background: #374151; } }

        .bar-fill {
            height: 100%;
            border-radius: 99px;
            transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.4s;
            position: absolute;
            z-index: 2;
        }

        .bar-ghost {
            position: absolute;
            height: 100%;
            top: 0;
            border-radius: 99px;
            z-index: 1;
        }
        .positive-ghost {
            background: repeating-linear-gradient(
                -45deg,
                rgba(34, 197, 94, 0.1),
                rgba(34, 197, 94, 0.1) 4px,
                rgba(34, 197, 94, 0) 4px,
                rgba(34, 197, 94, 0) 8px
            );
        }
        .negative-ghost {
            background: repeating-linear-gradient(
                -45deg,
                rgba(239, 68, 68, 0.1),
                rgba(239, 68, 68, 0.1) 4px,
                rgba(239, 68, 68, 0) 4px,
                rgba(239, 68, 68, 0) 8px
            );
        }

      `}</style>
    </div>
  );
}
