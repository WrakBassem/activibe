"use client";

import { useEffect, useState } from "react";

interface BossEncounter {
  encounter_id: string;
  name: string;
  user_email: string;
  current_health: number;
  max_health: number;
  is_active: boolean;
}

export default function BossesAdmin() {
  const [encounters, setEncounters] = useState<BossEncounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmKillId, setConfirmKillId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/bosses");
      const json = await res.json();
      if (json.success) setEncounters(json.data);
    } catch (err) {
      console.error("Failed to fetch bosses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateHealth = async (encounter: BossEncounter, newHealth: number) => {
    setUpdatingId(encounter.encounter_id);
    setConfirmKillId(null);
    try {
      const res = await fetch("/api/admin/bosses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            encounter_id: encounter.encounter_id, 
            current_health: newHealth,
            is_active: newHealth > 0
        })
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <div>Scanning battlefield telemetry...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <span className="text-4xl text-red-500">☠️</span> Threat Monitor
        </h1>
        <p className="text-gray-500">Track active entity incursions across the userbase and deploy countermeasures.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {encounters.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 text-center py-24 text-gray-500 font-mono tracking-widest uppercase border border-dashed border-white/5 rounded-3xl bg-black/20">
                  <span className="text-3xl block mb-2 text-green-500 opacity-50">🛡️</span>
                  System Secure. No active threats detected.
              </div>
          ) : (
              encounters.map(enc => {
                  const hpPercent = Math.max(0, Math.min(100, Math.round((enc.current_health / enc.max_health) * 100)));
                  const isCritical = hpPercent < 20;
                  const isUpdating = updatingId === enc.encounter_id;

                  return (
                      <div key={enc.encounter_id} className={`admin-card overflow-hidden relative transition-all duration-500
                          ${isUpdating ? 'opacity-50 grayscale' : 'hover:border-red-500/30'}
                          ${isCritical ? 'border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.1)]' : 'border-white/5'}
                      `}>
                          
                          {/* Threat level indicator */}
                          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mt-6 -mr-6 opacity-20 pointer-events-none transition-colors
                              ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-red-500/20'}
                          `}></div>

                          <div className="p-5 flex flex-col h-full">
                              <div className="flex justify-between items-start mb-4">
                                  <div>
                                      <div className="text-[10px] text-red-500 uppercase tracking-widest font-bold mb-1">Target Entity</div>
                                      <h3 className="font-black text-xl tracking-tighter uppercase text-gray-200 drop-shadow-md">{enc.name}</h3>
                                  </div>
                                  <div className="text-right">
                                      <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Operative</div>
                                      <div className="text-xs font-bold text-gray-300 truncate max-w-[120px]">{enc.user_email}</div>
                                  </div>
                              </div>

                              <div className="flex-grow">
                                  {/* Holographic HP Bar */}
                                  <div className="mt-4 mb-2">
                                      <div className="flex justify-between text-[10px] font-mono mb-1 uppercase tracking-widest text-gray-500">
                                          <span>Integrity</span>
                                          <span className={isCritical ? 'text-red-400 font-bold' : ''}>
                                              {enc.current_health} <span className="opacity-50 text-[8px]">/ {enc.max_health}</span>
                                          </span>
                                      </div>
                                      
                                      <div className="h-4 bg-black border border-white/10 rounded overflow-hidden relative">
                                          {/* Background tracking grid */}
                                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_9px,rgba(255,255,255,0.05)_10px)] bg-[length:10px_100%]"></div>
                                          
                                          {/* Actual Bar */}
                                          <div 
                                              className={`h-full relative transition-all duration-1000 ease-out flex items-center justify-end overflow-hidden
                                                  ${isCritical ? 'bg-gradient-to-r from-red-600 to-red-500' : 'bg-gradient-to-r from-red-900 to-red-600'}
                                              `}
                                              style={{ width: `${hpPercent}%` }}
                                          >
                                              {/* Scanning line effect inside bar */}
                                              <div className="absolute top-0 bottom-0 left-0 w-[50px] bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[100%] animate-[scan_2s_infinite]"></div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-[8px] text-gray-600 font-mono italic flex justify-between">
                                      <span>T_ID: {enc.encounter_id.split('-')[0]}</span>
                                      {isCritical && <span className="text-red-500/80 animate-pulse">CRITICAL DAMAGE WARNING</span>}
                                  </div>
                              </div>

                              {/* Operations Panel */}
                              <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                                  {confirmKillId === enc.encounter_id ? (
                                      <div className="flex-1 flex gap-1 animate-in fade-in zoom-in-95">
                                          <button 
                                              onClick={() => updateHealth(enc, 0)}
                                              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded transition-colors shadow-[0_0_10px_rgba(220,38,38,0.3)]"
                                          >
                                              Confirm Strike
                                          </button>
                                          <button 
                                              onClick={() => setConfirmKillId(null)}
                                              className="bg-black border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded px-3 text-[10px] transition-colors"
                                          >
                                              ✕
                                          </button>
                                      </div>
                                  ) : (
                                      <>
                                          <button 
                                              onClick={() => updateHealth(enc, Math.min(enc.max_health, enc.current_health + 100))}
                                              className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded py-2 text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-1"
                                          >
                                              <span className="text-[12px]">+</span> Med Injection
                                          </button>
                                          <button 
                                              onClick={() => setConfirmKillId(enc.encounter_id)}
                                              className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded py-2 text-[10px] uppercase font-bold tracking-widest transition-colors flex items-center justify-center gap-1"
                                          >
                                              <span className="text-[12px]">🎯</span> Orbital Strike
                                          </button>
                                      </>
                                  )}
                              </div>
                          </div>
                      </div>
                  );
              })
          )}
      </div>
      
      {encounters.length > 0 && (
          <div className="mt-8 p-4 bg-yellow-500/5 text-yellow-500/50 text-[10px] italic border border-yellow-500/10 rounded-xl flex items-center justify-center gap-2">
              <span className="text-base">⚠️</span> Note: Ordering an Orbital Strike will instantly reduce integrity to 0 and archive the encounter as a "Defeat" for the Operative.
          </div>
      )}
    </div>
  );
}
