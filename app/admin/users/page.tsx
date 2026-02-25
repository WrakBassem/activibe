"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  gold: number;
  created_at: string;
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Grant Modal State
  const [grantingUser, setGrantingUser] = useState<User | null>(null);
  const [rewardType, setRewardType] = useState<"gold" | "xp">("gold");
  const [grantAmount, setGrantAmount] = useState<number>(0);
  const [granting, setGranting] = useState(false);

  // Role Confirm State (to replace native confirm)
  const [confirmRoleUser, setConfirmRoleUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success) setUsers(json.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    
    setUpdatingId(user.id);
    setConfirmRoleUser(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: user.id, newRole })
      });
      const json = await res.json();
      if (json.success) {
        fetchUsers();
      } else {
        alert(json.error || "Failed to update role");
      }
    } catch (err) {
      alert("Error updating role");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!grantingUser || grantAmount <= 0) return;

      setGranting(true);
      try {
        const res = await fetch("/api/admin/users/grant", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: grantingUser.id, rewardType, amount: grantAmount })
        });
        const json = await res.json();
        if (json.success) {
            setGrantingUser(null);
            fetchUsers();
        } else {
            alert(json.error || "Failed to grant reward");
        }
      } catch (err) {
          alert("Error granting reward");
      } finally {
          setGranting(false);
      }
  };

  if (loading) return <div>Accessing Dossiers...</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
            <span className="text-4xl">🗂️</span> The Dossiers
        </h1>
        <p className="text-gray-500">Monitor active operatives, adjust clearance levels, and authorize asset transfers.</p>
      </div>

      {grantingUser && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleGrant} className="bg-[#0a0a0a] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(234,179,8,0.15)] relative overflow-hidden">
            {/* Asset Transfer Holographic Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
            
            <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏦</span>
                <h2 className="text-2xl font-black">Asset Transfer</h2>
            </div>
            <p className="text-[10px] text-gray-500 mb-6 font-mono border-b border-white/5 pb-4 break-all uppercase tracking-widest">
                TARGET: {grantingUser.email}
            </p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Asset Class</label>
                  <select 
                    className="w-full bg-black border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500/50 transition-colors"
                    value={rewardType}
                    onChange={e => setRewardType(e.target.value as "gold" | "xp")}
                  >
                    <option value="gold">🪙 Gold (Economy)</option>
                    <option value="xp">✨ XP (Leveling)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Injection Amount</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    className={`w-full bg-black rounded-xl p-3 text-sm font-bold transition-colors
                        ${rewardType === 'gold' ? 'border border-yellow-500/30 text-yellow-500 focus:border-yellow-500' : 'border border-blue-500/30 text-blue-500 focus:border-blue-500'}
                    `}
                    value={grantAmount || ""}
                    onChange={e => setGrantAmount(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                type="button"
                onClick={() => setGrantingUser(null)}
                className="flex-1 btn-secondary text-[10px] uppercase tracking-widest"
              >
                Abort
              </button>
              <button 
                type="submit"
                disabled={granting || grantAmount <= 0}
                className="flex-1 btn-primary text-[10px] uppercase tracking-widest bg-yellow-500 text-black hover:bg-yellow-400 border-none"
              >
                {granting ? "Processing..." : "Authorize Transfer"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {users.map((user) => (
            <div key={user.id} className="admin-card p-4 hover:border-white/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Profile Info */}
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                        {user.role === 'admin' ? '🛡️' : '👤'}
                    </div>
                    <div>
                        <div className="font-bold flex items-center gap-2">
                            {user.email}
                            {user.role === 'admin' && (
                                <span className="text-[9px] uppercase tracking-widest bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded">Overseer</span>
                            )}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {user.id}</div>
                    </div>
                </div>

                {/* Vertical Divider (Desktop) */}
                <div className="hidden md:block w-px h-10 bg-white/5 mx-2"></div>

                {/* Stats */}
                <div className="flex items-center gap-6 justify-between md:justify-end flex-1 md:flex-none">
                    <div className="text-right">
                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Clearance</div>
                        <div className="font-mono text-sm">Lv. {user.level}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Experience</div>
                        <div className="font-mono text-sm text-blue-400">{user.xp.toLocaleString()}</div>
                    </div>
                    <div className="text-right min-w-[80px]">
                        <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Assets</div>
                        <div className="font-mono text-sm text-yellow-500 flex items-center justify-end gap-1">
                            {user.gold.toLocaleString()} <span className="text-[10px]">G</span>
                        </div>
                    </div>
                </div>

                {/* Vertical Divider (Desktop) */}
                <div className="hidden md:block w-px h-10 bg-white/5 mx-2"></div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {/* Inline Confirmation for Role Toggle */}
                    {confirmRoleUser?.id === user.id ? (
                        <div className="flex gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                            <button 
                                onClick={() => toggleRole(user)}
                                disabled={updatingId === user.id}
                                className={`text-[10px] uppercase font-bold tracking-widest px-4 py-2 rounded-lg transition-colors border
                                    ${user.role === 'admin' 
                                        ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/30' 
                                        : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/30'}
                                `}
                            >
                                {updatingId === user.id ? 'Processing...' : `Confirm ${user.role === 'admin' ? 'Demotion' : 'Promotion'}`}
                            </button>
                            <button 
                                onClick={() => setConfirmRoleUser(null)}
                                className="btn-secondary text-[10px] px-3 py-2"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={() => setGrantingUser(user)}
                                className="h-10 px-4 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 transition-colors flex items-center gap-2"
                                title="Transfer Assets"
                            >
                                <span>🏦</span>
                                <span className="text-[10px] uppercase font-bold tracking-widest hidden md:inline">Transfer</span>
                            </button>
                            
                            <button 
                                onClick={() => setConfirmRoleUser(user)}
                                className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors flex items-center gap-2"
                                title={user.role === 'admin' ? 'Revoke Overseer Status' : 'Grant Overseer Status'}
                            >
                                <span>{user.role === 'admin' ? '🔻' : '🛡️'}</span>
                                <span className="text-[10px] uppercase font-bold tracking-widest hidden md:inline">Clearance</span>
                            </button>
                        </>
                    )}
                </div>

            </div>
        ))}
        {users.length === 0 && (
            <div className="text-center py-12 text-gray-600 italic border border-dashed border-white/10 rounded-2xl">
                No operatives found in the database.
            </div>
        )}
      </div>
    </div>
  );
}
