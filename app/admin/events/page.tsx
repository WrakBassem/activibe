"use client";

import { useEffect, useState } from "react";

interface Item {
  id: string;
  name: string;
  price: number;
}

interface SmugglerEvent {
  id: string;
  user_email: string;
  user_id: string;
  item_1_id: string;
  item_1_discount_price: number;
  item_2_id: string;
  item_2_discount_price: number;
  expires_at: string;
}

export default function EventsAdmin() {
  const [events, setEvents] = useState<SmugglerEvent[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<{id: string, email: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create / Update State
  const [processing, setProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetUserIds, setTargetUserIds] = useState<string[]>([]);
  const [durationHours, setDurationHours] = useState(24);
  const [formItem1Id, setFormItem1Id] = useState("");
  const [formItem1Price, setFormItem1Price] = useState(0);
  const [formItem2Id, setFormItem2Id] = useState("");
  const [formItem2Price, setFormItem2Price] = useState(0);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [evRes, itRes, usRes] = await Promise.all([
          fetch("/api/admin/events"),
          fetch("/api/admin/items"),
          fetch("/api/admin/users")
      ]);
      const evJson = await evRes.json();
      const itJson = await itRes.json();
      const usJson = await usRes.json();
      
      if (evJson.success) setEvents(evJson.data);
      if (usJson.success) setUsers(usJson.data);
      if (itJson.success) {
          const validItems = itJson.data.filter((i: any) => i.is_purchasable || ['smoke_bomb', 'time_turner'].includes(i.id));
          setItems(validItems);
          
          if (validItems.length >= 2 && !formItem1Id) {
              setFormItem1Id(validItems[0].id);
              setFormItem1Price(Math.round(validItems[0].price * 0.6));
              setFormItem2Id(validItems[1].id);
              setFormItem2Price(Math.round(validItems[1].price * 0.6));
          }
      }
    } catch (err) {
      console.error("Failed to fetch event data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSmartFill = () => {
      if (items.length < 2) return;
      const picked = [...items].sort(() => 0.5 - Math.random()).slice(0, 2);
      setFormItem1Id(picked[0].id);
      setFormItem1Price(Math.round(picked[0].price * 0.6));
      setFormItem2Id(picked[1].id);
      setFormItem2Price(Math.round(picked[1].price * 0.6));
  };

  const startEdit = (event: SmugglerEvent) => {
      setEditingId(event.id);
      setFormItem1Id(event.item_1_id);
      setFormItem1Price(event.item_1_discount_price);
      setFormItem2Id(event.item_2_id);
      setFormItem2Price(event.item_2_discount_price);
      setRevokingId(null);
  };

  const cancelEdit = () => {
      setEditingId(null);
      handleSmartFill();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      if (editingId) {
          const res = await fetch("/api/admin/events", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  event_id: editingId,
                  item_1_id: formItem1Id,
                  item_1_discount_price: formItem1Price,
                  item_2_id: formItem2Id,
                  item_2_discount_price: formItem2Price
              })
          });
          const json = await res.json();
          if (json.success) {
              setEditingId(null);
              fetchData();
          } else {
              alert(json.error || "Failed to update event");
          }
      } else {
          if (targetUserIds.length === 0) {
              alert("Please select at least one target user.");
              setProcessing(false);
              return;
          }
          const res = await fetch("/api/admin/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                targetUserIds,
                durationHours,
                item1: { id: formItem1Id, price: formItem1Price },
                item2: { id: formItem2Id, price: formItem2Price }
            })
          });
          const json = await res.json();
          if (json.success) {
            setTargetUserIds([]);
            fetchData();
          } else {
            alert(json.error || "Failed to spawn rift");
          }
      }
    } catch (err) {
      alert("Error processing request");
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (eventId: string) => {
      try {
          const res = await fetch(`/api/admin/events?id=${eventId}`, { method: "DELETE" });
          const json = await res.json();
          if (json.success) {
              setRevokingId(null);
              fetchData();
          } else {
              alert(json.error || "Failed to collapse rift");
          }
      } catch (err) {
          console.error(err);
      }
  };

  if (loading) return <div>Initializing Radar...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <span className="text-4xl text-purple-500 animate-pulse">🌀</span> The Dispatch Hub
        </h1>
        <p className="text-gray-500">Rip open temporary Black Market rifts for specific operatives.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        {/* Terminal Form */}
        <div className="xl:col-span-1">
          <div className={`admin-card p-6 border transition-colors duration-500 ${editingId ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]' : 'border-white/5'}`}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2">
                    {editingId ? <><span className="text-purple-500">▶</span> Rift Modification</> : <><span className="text-purple-500">▶</span> Rift Initiation</>}
                </h2>
                {!editingId && (
                    <button type="button" onClick={handleSmartFill} className="text-[10px] text-purple-400 font-bold uppercase hover:text-purple-300 transition-colors">
                        [Auto-Roll]
                    </button>
                )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {!editingId && (
                  <>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5">
                    <div className="flex justify-between mb-2">
                      <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Target Coordinates</label>
                      <button 
                        type="button" 
                        onClick={() => {
                          if (targetUserIds.length === users.length) setTargetUserIds([]);
                          else setTargetUserIds(users.map(u => u.id));
                        }}
                        className="text-[10px] text-gray-400 uppercase hover:text-white transition-colors"
                      >
                        {targetUserIds.length === users.length && users.length > 0 ? '[Clear]' : '[All]'}
                      </button>
                    </div>
                    <div className="w-full bg-[#0a0a0a] border border-white/5 rounded-lg p-2 max-h-[140px] overflow-y-auto space-y-1">
                      {users.map(u => (
                        <label key={u.id} className="flex items-center gap-3 p-1.5 hover:bg-purple-500/10 rounded cursor-pointer transition-colors group">
                          <input 
                            type="checkbox" 
                            className="accent-purple-500 w-3 h-3 rounded bg-black border-white/20"
                            checked={targetUserIds.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) setTargetUserIds([...targetUserIds, u.id]);
                              else setTargetUserIds(targetUserIds.filter(id => id !== u.id));
                            }}
                          />
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold transition-colors ${targetUserIds.includes(u.id) ? 'text-purple-400' : 'text-gray-300 group-hover:text-white'}`}>{u.email}</span>
                          </div>
                        </label>
                      ))}
                      {users.length === 0 && <div className="p-2 text-xs text-gray-500 text-center italic">No coordinates available.</div>}
                    </div>
                  </div>
                  <div className="bg-black/50 p-3 rounded-lg border border-white/5 flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Stability (Hours)</label>
                      <input 
                        type="number"
                        min="1" max="168"
                        className="w-20 bg-black border border-white/10 rounded p-1 text-xs text-right text-purple-400 font-mono"
                        value={durationHours}
                        onChange={e => setDurationHours(parseInt(e.target.value) || 24)}
                      />
                  </div>
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4"></div>
                  </>
              )}
              
              <div className="bg-gradient-to-br from-purple-900/20 to-black p-4 rounded-xl border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-3 border-b border-purple-500/20 pb-2">
                       <span className="text-purple-500 text-xs">01</span>
                      <label className="text-[10px] uppercase font-bold text-purple-400 tracking-widest">Payload Alpha</label>
                  </div>
                  <select 
                      className="w-full bg-black border border-white/10 rounded p-2 text-xs mb-3 text-gray-300 font-bold"
                      value={formItem1Id}
                      onChange={e => setFormItem1Id(e.target.value)}
                  >
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} (Base: {i.price}G)</option>)}
                  </select>
                  <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Override Price</label>
                      <div className="flex items-center gap-2">
                          <input 
                              type="number"
                              className="w-20 bg-black border border-yellow-500/30 text-yellow-500 rounded p-1 text-xs text-right font-mono"
                              value={formItem1Price}
                              onChange={e => setFormItem1Price(parseInt(e.target.value) || 0)}
                          />
                          <span className="text-[10px] text-yellow-500">G</span>
                      </div>
                  </div>
              </div>

              <div className="bg-gradient-to-br from-purple-900/10 to-black p-4 rounded-xl border border-purple-500/10">
                  <div className="flex items-center gap-2 mb-3 border-b border-purple-500/10 pb-2">
                       <span className="text-purple-500/50 text-xs">02</span>
                      <label className="text-[10px] uppercase font-bold text-purple-400/80 tracking-widest">Payload Beta</label>
                  </div>
                  <select 
                      className="w-full bg-black border border-white/10 rounded p-2 text-xs mb-3 text-gray-300 font-bold"
                      value={formItem2Id}
                      onChange={e => setFormItem2Id(e.target.value)}
                  >
                      {items.map(i => <option key={i.id} value={i.id}>{i.name} (Base: {i.price}G)</option>)}
                  </select>
                  <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-bold text-gray-500">Override Price</label>
                      <div className="flex items-center gap-2">
                          <input 
                              type="number"
                              className="w-20 bg-black border border-yellow-500/30 text-yellow-500 rounded p-1 text-xs text-right font-mono"
                              value={formItem2Price}
                              onChange={e => setFormItem2Price(parseInt(e.target.value) || 0)}
                          />
                          <span className="text-[10px] text-yellow-500">G</span>
                      </div>
                  </div>
              </div>

              <div className="pt-4 flex gap-2">
                  {editingId && (
                      <button 
                        type="button"
                        onClick={cancelEdit}
                        className="flex-1 btn-secondary text-[10px] uppercase tracking-widest"
                      >
                          Abort
                      </button>
                  )}
                  <button 
                    type="submit"
                    disabled={processing}
                    className="flex-1 btn-primary bg-purple-600 hover:bg-purple-500 text-white border-none uppercase tracking-widest text-[10px] py-3 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  >
                    {processing ? "Executing..." : editingId ? "Upload Sequence" : "Tear Rift"}
                  </button>
              </div>
            </form>
          </div>
        </div>

        {/* Active Spawns Radar */}
        <div className="xl:col-span-2">
          <div className="admin-card border-none bg-transparent">
            <h3 className="font-bold font-mono tracking-widest uppercase text-gray-500 mb-4 p-2 border-b border-white/5">Active Rifts</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.length === 0 ? (
                  <div className="md:col-span-2 text-center py-16 text-gray-600 italic border border-dashed border-white/10 rounded-2xl">
                    Radar is clear. No active Smuggler rifts detected.
                  </div>
                ) : (
                  events.map((event) => {
                    const diff = new Date(event.expires_at).getTime() - new Date().getTime();
                    const hours = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
                    const isEditing = editingId === event.id;
                    const isRevoking = revokingId === event.id;
                    
                    return (
                      <div key={event.id} className={`p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group
                          ${isEditing ? 'bg-purple-900/20 border-purple-500/50 scale-[1.02] shadow-[0_0_20px_rgba(168,85,247,0.15)] z-10' : 'bg-[#111] border-white/5 hover:border-white/20'}
                      `}>
                          
                          {/* Animated Rift background element */}
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse group-hover:bg-purple-500/20 transition-colors"></div>

                          {/* Time Badge */}
                          <div className="absolute top-4 right-4">
                                <span className={`px-2 py-1 rounded text-[9px] font-black tracking-widest font-mono uppercase border
                                    ${hours < 2 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}
                                >
                                    {hours}h left
                                </span>
                          </div>

                          {/* Target user */}
                          <div className="mb-4">
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">Target</div>
                              <div className="font-bold text-sm truncate">{event.user_email}</div>
                          </div>

                          <div className="w-full h-px bg-white/5 my-3"></div>

                          {/* Payload */}
                          <div className="space-y-2 mb-6">
                              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">Payload Details</div>
                              <div className="flex items-center justify-between text-xs bg-black/40 p-2 rounded border border-white/5">
                                  <span className="text-purple-400 capitalize font-bold">{event.item_1_id.replace(/_/g, ' ')}</span>
                                  <span className="text-yellow-500 font-mono">{event.item_1_discount_price}G</span>
                              </div>
                              <div className="flex items-center justify-between text-xs bg-black/40 p-2 rounded border border-white/5">
                                  <span className="text-purple-400 capitalize font-bold">{event.item_2_id.replace(/_/g, ' ')}</span>
                                  <span className="text-yellow-500 font-mono">{event.item_2_discount_price}G</span>
                              </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                                {/* Inline Confimation for Revoke */}
                                {isRevoking ? (
                                    <div className="flex-1 flex gap-1 animate-in fade-in zoom-in-95">
                                        <button 
                                            onClick={() => handleRevoke(event.id)}
                                            className="flex-1 bg-red-600 hover:bg-red-500 text-white border-none rounded-lg text-[10px] uppercase tracking-widest font-black transition-colors"
                                        >
                                            Confirm Collapse
                                        </button>
                                        <button 
                                            onClick={() => setRevokingId(null)}
                                            className="btn-secondary text-[10px] px-3 transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => startEdit(event)}
                                            className="flex-1 btn-secondary text-[10px] uppercase font-bold tracking-widest bg-white/5 hover:bg-white/10"
                                        >
                                            Modify
                                        </button>
                                        <button 
                                            onClick={() => setRevokingId(event.id)}
                                            className="flex-1 btn-secondary text-[10px] uppercase font-bold tracking-widest text-red-500/70 hover:text-red-500 hover:bg-red-500/10 border-transparent hover:border-red-500/20"
                                        >
                                            Collapse Rift
                                        </button>
                                    </>
                                )}
                          </div>
                      </div>
                    );
                  })
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
