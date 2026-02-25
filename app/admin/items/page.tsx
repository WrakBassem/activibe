"use client";

import { useEffect, useState } from "react";

interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  price: number;
  is_purchasable: boolean;
  category: string;
}

export default function ItemsAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);

  // New Item State
  const [isCreating, setIsCreating] = useState(false);
  const [newItem, setNewItem] = useState<Partial<Item>>({
      id: '', name: '', description: '', icon: '✨', rarity: 'common', price: 100, is_purchasable: true, category: 'consumable'
  });

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/items");
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (err) {
      console.error("Failed to fetch items", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleUpdate = async (e: React.FormEvent, itemData: Partial<Item>, isNew: boolean) => {
    e.preventDefault();
    setSaving(true);
    
    // In a real app we'd have a POST for create and PUT for update, but admin/items handles both via POST
    try {
      const res = await fetch("/api/admin/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData)
      });
      const json = await res.json();
      if (json.success) {
        setEditingItem(null);
        setIsCreating(false);
        fetchItems();
      } else {
        alert(json.error || "Failed to save item blueprint");
      }
    } catch (err) {
      alert("Error saving item blueprint");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Accessing Armory Database...</div>;

  return (
    <div>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <span className="text-4xl">⚔️</span> The Armory
          </h1>
          <p className="text-gray-500 max-w-2xl text-sm">Design item blueprints, configure drop rates, and set Black Market economy pricing.</p>
        </div>
        <button 
            onClick={() => setIsCreating(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
            <span>+</span> Forge Blueprint
        </button>
      </div>

      {(editingItem || isCreating) && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form 
            onSubmit={(e) => handleUpdate(e, isCreating ? newItem : editingItem!, isCreating)} 
            className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden"
          >
            {/* Holographic accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>
            
            <h2 className="text-2xl font-black mb-1 flex items-center gap-3">
                {isCreating ? 'Initialize Blueprint' : 'Modify Hologram'}
            </h2>
            <p className="text-xs text-gray-500 mb-6 font-mono border-b border-white/5 pb-4">
                {isCreating ? 'AWAITING_INPUT' : `ID: ${editingItem?.id}`}
            </p>
            
            <div className="space-y-5">
              
              {isCreating && (
                  <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-1">
                        <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Icon</label>
                        <input 
                          type="text" required
                          className="w-full bg-black border border-white/10 rounded-xl p-3 text-center text-xl"
                          value={newItem.icon}
                          onChange={e => setNewItem({...newItem, icon: e.target.value})}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] uppercase font-bold text-purple-400 block mb-1">Internal ID</label>
                        <input 
                          type="text" required
                          placeholder="e.g. mystic_potion"
                          className="w-full bg-black border border-purple-500/30 font-mono text-purple-400 rounded-xl p-3 text-sm focus:border-purple-500 transition-colors placeholder:text-purple-900"
                          value={newItem.id}
                          onChange={e => setNewItem({...newItem, id: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                        />
                      </div>
                  </div>
              )}

              {isCreating && (
                 <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Display Name</label>
                    <input 
                      type="text" required
                      className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm font-bold"
                      value={newItem.name}
                      onChange={e => setNewItem({...newItem, name: e.target.value})}
                    />
                 </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Description Specs</label>
                <textarea 
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm text-gray-300 focus:border-white/30 transition-colors"
                  rows={3}
                  required
                  value={isCreating ? newItem.description : editingItem?.description}
                  onChange={e => isCreating ? setNewItem({...newItem, description: e.target.value}) : setEditingItem({...editingItem!, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-yellow-500 block mb-1">Value (Gold)</label>
                  <input 
                    type="number" required min="0"
                    className="w-full bg-black border border-yellow-500/30 text-yellow-500 rounded-xl p-3 text-sm font-bold"
                    value={isCreating ? newItem.price : editingItem?.price}
                    onChange={e => isCreating ? setNewItem({...newItem, price: parseInt(e.target.value) || 0}) : setEditingItem({...editingItem!, price: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Category</label>
                  <select 
                    className="w-full bg-black border border-white/10 text-gray-300 rounded-xl p-3 text-sm"
                    value={isCreating ? (newItem.category || 'consumable') : (editingItem?.category || 'consumable')}
                    onChange={e => isCreating ? setNewItem({...newItem, category: e.target.value}) : setEditingItem({...editingItem!, category: e.target.value})}
                  >
                    <option value="consumable">Consumable</option>
                    <option value="combat_gear">Combat Gear</option>
                    <option value="cosmetic">Cosmetic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Rarity Class</label>
                  <select 
                    className="w-full bg-black border border-white/10 text-gray-300 rounded-xl p-3 text-sm"
                    value={isCreating ? newItem.rarity : editingItem?.rarity}
                    onChange={e => isCreating ? setNewItem({...newItem, rarity: e.target.value}) : setEditingItem({...editingItem!, rarity: e.target.value})}
                  >
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-green-500 block mb-1">Shop Status</label>
                  <select 
                    className="w-full bg-black border border-white/10 text-gray-300 rounded-xl p-3 text-sm"
                    value={isCreating ? (newItem.is_purchasable ? "true" : "false") : (editingItem?.is_purchasable ? "true" : "false")}
                    onChange={e => {
                        const val = e.target.value === "true";
                        isCreating ? setNewItem({...newItem, is_purchasable: val}) : setEditingItem({...editingItem!, is_purchasable: val})
                    }}
                  >
                    <option value="true">Active Listing</option>
                    <option value="false">Hidden / Vaulted</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                type="button"
                onClick={() => { setEditingItem(null); setIsCreating(false); }}
                className="flex-1 btn-secondary"
              >
                Abort
              </button>
              <button 
                type="submit"
                disabled={saving || (isCreating && !newItem.id)}
                className="flex-1 btn-primary tracking-widest uppercase text-[10px]"
              >
                {saving ? "Synthesizing..." : "Compile Blueprint"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Item Blueprint Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
             <div key={item.id} className="admin-card group hover:border-purple-500/50 transition-colors cursor-pointer relative overflow-hidden" onClick={() => setEditingItem(item)}>
                 
                 {/* Rarity Glow */}
                 <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mt-10 -mr-10 opacity-10 group-hover:opacity-30 transition-opacity
                    ${item.rarity === 'legendary' ? 'bg-yellow-500' : item.rarity === 'epic' ? 'bg-purple-500' : 'bg-blue-500'}
                 `}></div>

                 <div className="p-6">
                     <div className="flex justify-between items-start mb-4">
                         <div className="text-4xl filter drop-shadow hover:scale-110 transition-transform">{item.icon}</div>
                         <div className="flex flex-col items-end gap-2">
                            {item.is_purchasable ? (
                                <div className="text-[9px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Active Listing</div>
                            ) : (
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">Vaulted</div>
                            )}
                            <div className="text-sm font-black font-mono text-yellow-500 flex items-center gap-1">
                                {item.price} <span className="text-[10px]">GOLD</span>
                            </div>
                         </div>
                     </div>
                     
                     <h3 className="text-lg font-bold mb-1 group-hover:text-purple-400 transition-colors">{item.name}</h3>
                     <div className="flex items-center gap-2 mb-3">
                         <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-sm bg-black/50
                            ${item.rarity === 'legendary' ? 'text-yellow-500' : item.rarity === 'epic' ? 'text-purple-500' : 'text-blue-500'}`}>
                            {item.rarity}
                         </span>
                         <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                             {(item.category || 'consumable').replace('_', ' ')}
                         </span>
                     </div>
                     
                     <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                         {item.description}
                     </p>
                 </div>
             </div>
          ))}

          {/* New Item Card Area */}
          <div 
            onClick={() => setIsCreating(true)}
            className="admin-card border-dashed border-2 border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors cursor-pointer flex flex-col items-center justify-center p-8 text-center min-h-[220px]"
          >
              <div className="text-4xl text-gray-600 mb-4">+</div>
              <h3 className="font-bold text-gray-400">Initialize New Blueprint</h3>
              <p className="text-xs text-gray-600 mt-2">Add a new item to the database.</p>
          </div>
      </div>

    </div>
  );
}
