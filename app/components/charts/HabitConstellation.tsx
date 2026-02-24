"use client";

import React, { useEffect, useState, useRef } from "react";

type Node = {
  id: string;
  group: number;
  value: number; // Defines size
};

type Link = {
  source: string;
  target: string;
  value: number; // Defines thickness/opacity
};

export function HabitConstellation() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);

  // Math for circular static layout
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    async function fetchConstellations() {
      try {
        const res = await fetch("/api/analytics/constellations");
        const json = await res.json();
        
        if (json.success && json.data.nodes.length > 0) {
          const n = json.data.nodes as Node[];
          const l = json.data.links as Link[];
          
          // Sort nodes by value (largest in center/first)
          n.sort((a, b) => b.value - a.value);
          
          setNodes(n);
          setLinks(l);

          // Calculate a simple circular layout inside a 400x400 SVG box
          const centerX = 200;
          const centerY = 200;
          const radius = 120;
          const posMap: Record<string, { x: number; y: number }> = {};
          
          n.forEach((node, index) => {
            if (index === 0) {
                // The most frequent habit goes right in the middle
                posMap[node.id] = { x: centerX, y: centerY };
            } else {
                // Distribute the rest in a circle
                const angle = (index / (n.length - 1)) * 2 * Math.PI;
                posMap[node.id] = {
                  x: centerX + radius * Math.cos(angle),
                  y: centerY + radius * Math.sin(angle),
                };
            }
          });
          
          setPositions(posMap);
        }
      } catch (err) {
        console.error("Failed to fetch constellations", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchConstellations();
  }, []);

  if (loading) return null;
  if (nodes.length === 0) return null;

  // Determine max values for scaling
  const maxNodeValue = Math.max(...nodes.map(n => n.value), 1);
  const maxLinkValue = Math.max(...links.map(l => l.value), 1);

  return (
    <div className="constellation-container">
      <div className="header">
        <h3 className="section-title flex items-center gap-2">
          <span className="icon">🌌</span> Habit Constellation
        </h3>
        <p className="subtitle">Habits bound by glowing lines are your "Success Co-occurrences" — they frequently happen together on your best days.</p>
      </div>

      <div className="svg-wrapper">
        <svg viewBox="0 0 400 400" className="constellation-svg">
          {/* Draw Links (Lines) */}
          {links.map((link, i) => {
            const sourcePos = positions[link.source];
            const targetPos = positions[link.target];
            if (!sourcePos || !targetPos) return null;
            
            // Opacity and thickness based on how strongly they correlate comparing to max
            const strength = link.value / maxLinkValue;
            
            return (
              <line
                key={`link-${i}`}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#8b5cf6"
                strokeWidth={1 + strength * 4}
                strokeOpacity={0.2 + strength * 0.6}
                className="constellation-link"
              />
            );
          })}

          {/* Draw Nodes (Stars) */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;
            
            const size = 6 + (node.value / maxNodeValue) * 12; // Radius between 6 and 18

            return (
              <g key={node.id} className="constellation-node group">
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size}
                  fill="#ffffff"
                  stroke="#4f46e5"
                  strokeWidth="2"
                  className="star transition-all duration-300 group-hover:fill-indigo-400 group-hover:scale-125 origin-center"
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                />
                
                {/* Node Label */}
                <text
                  x={pos.x}
                  y={pos.y + size + 16}
                  textAnchor="middle"
                  fill="currentColor"
                  fontSize="10"
                  fontWeight="600"
                  className="star-label opacity-70 group-hover:opacity-100 dark:text-gray-300 text-gray-700 pointer-events-none"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <style jsx>{`
        .constellation-container {
            background: linear-gradient(180deg, rgba(17,24,39,0.95) 0%, rgba(31,41,55,0.95) 100%);
            border-radius: 20px;
            padding: 1.5rem;
            margin-top: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.05);
            position: relative;
            overflow: hidden;
        }
        @media (prefers-color-scheme: light) {
            .constellation-container {
                background: linear-gradient(180deg, #111827 0%, #1f2937 100%); /* Forcing dark theme for space vibe */
            }
        }

        /* Twinkling background stars effect */
        .constellation-container::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: 
                radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)),
                radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)),
                radial-gradient(1.5px 1.5px at 90px 40px, #ffffff, rgba(0,0,0,0));
            background-repeat: repeat;
            background-size: 100px 100px;
            opacity: 0.2;
            animation: twinkle 4s infinite linear alternate;
        }
        @keyframes twinkle {
            0% { opacity: 0.1; }
            100% { opacity: 0.3; }
        }

        .header { position: relative; z-index: 2; margin-bottom: 1rem; }
        .section-title { color: #f9fafb !important; font-size: 1.15rem; font-weight: 800; margin: 0 0 0.5rem 0; }
        .subtitle { color: #9ca3af; font-size: 0.85rem; margin: 0; line-height: 1.5; }
        
        .svg-wrapper {
            position: relative;
            z-index: 2;
            width: 100%;
            height: auto;
            max-width: 400px;
            margin: 0 auto;
        }

        .constellation-svg {
            width: 100%;
            height: 100%;
            overflow: visible;
        }

        .constellation-link {
            transition: stroke-opacity 0.3s, stroke-width 0.3s;
        }
        
        .constellation-node circle {
            filter: drop-shadow(0 0 4px rgba(79, 70, 229, 0.6)) drop-shadow(0 0 12px rgba(79, 70, 229, 0.4));
            cursor: crosshair;
        }
        .constellation-node:hover circle {
            filter: drop-shadow(0 0 6px rgba(129, 140, 248, 0.8)) drop-shadow(0 0 16px rgba(129, 140, 248, 0.6));
        }
        
        .star-label {
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            transition: all 0.2s;
        }
      `}</style>
    </div>
  );
}
