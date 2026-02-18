"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// --- Types ---
type Axis = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
};

type Metric = {
  id: string;
  axis_id: string;
  axis_name?: string;
  name: string;
  rule_description?: string;
  max_points: number;
  difficulty_level: number;
  active: boolean;
};

type Cycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  weights?: { axis_id: string; weight_percentage: number; axis_name?: string }[];
};

// --- Components ---

function Tabs({
  activeTab,
  onTabChange,
  tabs,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: string[];
}) {
  return (
    <div className="tabs-container">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`tab-button ${activeTab === tab ? "active" : ""}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
      <style jsx>{`
        .tabs-container {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5rem;
        }
        .tab-button {
          padding: 0.5rem 1rem;
          border: none;
          background: none;
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s;
          border-radius: 6px;
        }
        .tab-button.active {
          color: #6366f1;
          background: #e0e7ff;
        }
        .tab-button:hover:not(.active) {
            background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}

// --- Modal Component ---
function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 50;
        }
        .modal-content {
          background: white; padding: 1.5rem; border-radius: 12px; width: 90%; max-width: 500px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }
         @media (prefers-color-scheme: dark) {
            .modal-content { background: #1f1f1f; color: white; }
        }
        .modal-header { display: flex; justify-content: space-between; margin-bottom: 1rem; }
        .modal-header h3 { margin: 0; font-size: 1.25rem; }
        .modal-header button { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #888; }
      `}</style>
    </div>
  );
}

// --- Main Page ---

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Axes");
  
  // Data States
  const [axes, setAxes] = useState<Axis[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"Axis" | "Metric" | "Cycle" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null); // For edit mode

  // Loading/Error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Data
  async function fetchAll() {
      try {
        const [axesRes, metricsRes, cyclesRes] = await Promise.all([
          fetch("/api/axes"),
          fetch("/api/metrics"),
          fetch("/api/cycles"),
        ]);

        const axesData = await axesRes.json();
        const metricsData = await metricsRes.json();
        const cyclesData = await cyclesRes.json();

        if (axesData.success) setAxes(axesData.data);
        if (metricsData.success) setMetrics(metricsData.data);
        if (cyclesData.success) setCycles(cyclesData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreateModal = (type: "Axis" | "Metric" | "Cycle") => {
      setModalType(type);
      setEditingItem(null);
      setModalOpen(true);
  };
   
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const data: any = Object.fromEntries(formData.entries());
      
      // Additional formatting
      if (modalType === "Metric") {
           data.max_points = parseInt(data.max_points);
           data.difficulty_level = parseInt(data.difficulty_level);
           data.active = true;
      }
      if (modalType === "Axis") {
           data.active = true;
      }

      const endpoint = modalType === "Axis" ? "/api/axes" : modalType === "Metric" ? "/api/metrics" : "/api/cycles";
      
      try {
          const res = await fetch(endpoint, {
              method: "POST", // Edit logic would use PUT and include ID
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
          });
          if(res.ok) {
              setModalOpen(false);
              fetchAll(); // Refresh data
          }
      } catch(err) {
          console.error(err);
      }
  };

  // --- Handlers (Stubs for now, implementing real logic next step) ---
  const handleToggleAxis = async (id: string, current: boolean) => {
      // Optimistic update
      setAxes(axes.map(a => a.id === id ? { ...a, active: !current } : a));
      
      try {
          // Find axis to get other fields
          const axis = axes.find(a => a.id === id);
          if(!axis) return;

          await fetch("/api/axes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, active: !current }),
          });
      } catch (err) {
          console.error("Failed to toggle axis", err);
          // Revert on error would go here
      }
  };


  if (loading) return <div className="p-8 text-center text-gray-500">Loading Configuration...</div>;

  return (
    <div className="settings-container">
      <header className="settings-header">
        <button onClick={() => router.back()} className="back-btn">← Back</button>
        <h1 className="settings-title">System Configuration</h1>
      </header>

      <Tabs 
        tabs={["Axes", "Metrics", "Cycles"]} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <main>
        {activeTab === "Axes" && (
          <div className="tab-content">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Strategic Axes</h2>
                <button className="create-btn" onClick={() => openCreateModal("Axis")}>+ New Axis</button>
            </div>
            
            <div className="grid gap-4">
                {axes.map(axis => (
                    <div key={axis.id} className={`item-card ${!axis.active ? 'opacity-50' : ''}`}>
                        <div className="item-info">
                            <span className="item-name">{axis.name}</span>
                            <span className="item-desc">{axis.description || "No description"}</span>
                        </div>
                        <div className="item-actions">
                             <label className="switch">
                                <input 
                                    type="checkbox" 
                                    checked={axis.active} 
                                    onChange={() => handleToggleAxis(axis.id, axis.active)}
                                />
                                <span className="slider round"></span>
                            </label>
                            <button className="edit-btn">Edit</button>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === "Metrics" && (
          <div className="tab-content">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Performance Metrics</h2>
                <button className="create-btn" onClick={() => openCreateModal("Metric")}>+ New Metric</button>
            </div>
            <div className="grid gap-4">
                {/* Group by Axis */}
                {axes.map(axis => {
                    const axisMetrics = metrics.filter(m => m.axis_id === axis.id);
                    if(axisMetrics.length === 0) return null;
                    
                    return (
                        <div key={axis.id} className="axis-group">
                            <h3 className="axis-title">{axis.name}</h3>
                            {axisMetrics.map(metric => (
                                <div key={metric.id} className="item-card small">
                                    <div className="item-info">
                                        <span className="item-name">{metric.name}</span>
                                        <span className="item-meta">Max: {metric.max_points}pts • Lvl {metric.difficulty_level}</span>
                                    </div>
                                    <div className="item-actions">
                                        <button className="edit-btn">Edit</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
          </div>
        )}

         {activeTab === "Cycles" && (
          <div className="tab-content">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Priority Cycles</h2>
                {/* Cycles are complex, maybe simple list for now */}
                <button className="create-btn" onClick={() => alert("Complex flow required for Cycles. Use Setup Script for now or implement full wizard.")}>+ New Cycle</button>
            </div>
            <div className="grid gap-4">
                {cycles.map(cycle => (
                    <div key={cycle.id} className="item-card">
                        <div className="item-info">
                            <span className="item-name">{cycle.name}</span>
                            <span className="item-desc">
                                {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="weights-preview">
                            <span className="text-xs text-gray-400">Weights:</span>
                            <div className="flex gap-2 flex-wrap">
                                {cycle.weights?.map(w => (
                                    <span key={w.axis_id} className="weight-tag">
                                        {w.axis_name || axes.find(a => a.id === w.axis_id)?.name || 'Axis'}: {w.weight_percentage}%
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* --- MODALS --- */}
        {modalOpen && (
            <Modal title={`Create ${modalType}`} onClose={() => setModalOpen(false)}>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    {modalType === "Axis" && (
                        <>
                            <input name="name" placeholder="Axis Name (e.g. Academic)" required className="input" />
                            <input name="description" placeholder="Description (optional)" className="input" />
                        </>
                    )}
                    {modalType === "Metric" && (
                        <>
                            <input name="name" placeholder="Metric Name (e.g. Deep Study)" required className="input" />
                            <select name="axis_id" required className="input">
                                <option value="">Select Axis</option>
                                {axes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <input name="max_points" type="number" placeholder="Max Points (e.g. 10)" required className="input" />
                            <input name="difficulty_level" type="number" min="1" max="5" placeholder="Difficulty (1-5)" required className="input" />
                        </>
                    )}
                    <button type="submit" className="create-btn w-full mt-2">Save</button>
                </form>
            </Modal>
        )}

      </main>

      <style jsx>{`
        .settings-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .settings-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .back-btn {
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            font-size: 0.9rem;
        }
        .settings-title {
            font-size: 1.5rem;
            font-weight: 700;
        }
        
        /* Cards */
        .item-card {
            background: white;
            border: 1px solid #e5e7eb;
            padding: 1rem;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .item-card.small {
            padding: 0.75rem;
            background: #f9fafb;
        }
        .item-info {
            display: flex;
            flex-direction: column;
        }
        .item-name {
            font-weight: 600;
            color: #111827;
        }
        .item-desc, .item-meta {
            font-size: 0.85rem;
            color: #6b7280;
        }
        .axis-group {
            margin-top: 1rem;
            border-left: 3px solid #6366f1;
            padding-left: 1rem;
        }
        .axis-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: #6366f1;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Buttons */
        .create-btn {
            background: #6366f1;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.9rem;
            cursor: pointer;
        }
        .create-btn:hover { background: #4f46e5; }
        
        .input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.95rem;
        }
        @media (prefers-color-scheme: dark) {
            .input { background: #333; border-color: #555; color: white; }
        }
        .edit-btn {
            background: none;
            border: 1px solid #e5e7eb;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.8rem;
            cursor: pointer;
            color: #4b5563;
        }

        /* Switch */
        .switch {
            position: relative;
            display: inline-block;
            width: 36px;
            height: 20px;
            margin-right: 0.75rem;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 34px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #22c55e;
        }
        input:checked + .slider:before {
            transform: translateX(16px);
        }

        .weight-tag {
            background: #eef2ff;
            color: #4f46e5;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        
        @media (prefers-color-scheme: dark) {
            .settings-container { color: #fff; }
            .item-card { background: #111; border-color: #333; }
            .item-card.small { background: #1a1a1a; }
            .item-name { color: #fff; }
            .edit-btn { color: #ccc; border-color: #444; }
            .back-btn { color: #bbb; }
        }
      `}</style>
    </div>
  );
}
