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
  input_type: 'boolean' | 'emoji_5' | 'scale_0_5' | 'scale_0_10';
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  boolean: '✅ Checkbox',
  emoji_5: '😊 Emoji (5)',
  scale_0_5: '🔢 Scale 0-5',
  scale_0_10: '📊 Scale 0-10',
};

type MetricField = {
  id: string;
  metric_id: string;
  name: string;
  label: string;
  field_type: 'int' | 'boolean' | 'scale_0_5' | 'text';
  active: boolean;
  sort_order: number;
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
          max-height: 90vh; overflow-y: auto;
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
  const [metricFields, setMetricFields] = useState<Record<string, MetricField[]>>({});
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"Axis" | "Metric" | "Cycle" | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Field Modal State
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [fieldModalMetricId, setFieldModalMetricId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<MetricField | null>(null);
  const [fieldForm, setFieldForm] = useState({ name: '', label: '', field_type: 'int' as MetricField['field_type'] });

  // Cycle Form State
  const [cycleWeights, setCycleWeights] = useState<Record<string, number>>({});

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

  // Fetch fields for a specific metric (on demand)
  const fetchFieldsForMetric = async (metricId: string) => {
    try {
      const res = await fetch(`/api/metrics/${metricId}/fields`);
      const data = await res.json();
      if (data.success) {
        setMetricFields(prev => ({ ...prev, [metricId]: data.data }));
      }
    } catch (e) {
      console.error('Failed to fetch fields', e);
    }
  };

  const toggleExpandMetric = (metricId: string) => {
    if (expandedMetric === metricId) {
      setExpandedMetric(null);
    } else {
      setExpandedMetric(metricId);
      if (!metricFields[metricId]) fetchFieldsForMetric(metricId);
    }
  };

  const openFieldModal = (metricId: string, field?: MetricField) => {
    setFieldModalMetricId(metricId);
    setEditingField(field || null);
    setFieldForm(field ? { name: field.name, label: field.label, field_type: field.field_type } : { name: '', label: '', field_type: 'int' });
    setFieldModalOpen(true);
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldModalMetricId) return;
    const method = editingField ? 'PUT' : 'POST';
    const body = editingField
      ? { field_id: editingField.id, ...fieldForm }
      : fieldForm;
    const res = await fetch(`/api/metrics/${fieldModalMetricId}/fields`, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.ok) {
      setFieldModalOpen(false);
      fetchFieldsForMetric(fieldModalMetricId);
    } else {
      const err = await res.json();
      alert(`Error: ${err.error}`);
    }
  };

  const handleToggleField = async (metricId: string, field: MetricField) => {
    setMetricFields(prev => ({
      ...prev,
      [metricId]: (prev[metricId] || []).map(f => f.id === field.id ? { ...f, active: !f.active } : f)
    }));
    await fetch(`/api/metrics/${metricId}/fields`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ field_id: field.id, active: !field.active }),
    });
  };

  const handleDeleteField = async (metricId: string, fieldId: string) => {
    if (!confirm('Delete this field? Historical data will be lost.')) return;
    const res = await fetch(`/api/metrics/${metricId}/fields?field_id=${fieldId}`, { method: 'DELETE' });
    if (res.ok) fetchFieldsForMetric(metricId);
  };

  const FIELD_TYPE_LABELS: Record<MetricField['field_type'], string> = {
    int: 'Integer (0+)',
    boolean: 'Boolean (Yes/No)',
    scale_0_5: 'Scale (0–5)',
    text: 'Text',
  };

  const openModal = (type: "Axis" | "Metric" | "Cycle", item?: any) => {
      setModalType(type);
      setEditingItem(item || null);
      
      // Reset/Init weights for Cycle modal
      if(type === 'Cycle') {
          const newWeights: Record<string, number> = {};
          // Initialize with 0 for all axes
          axes.forEach(a => newWeights[a.id] = 0);
          
          if (item && item.weights) {
              // Pre-fill from existing weights
              item.weights.forEach((w: any) => {
                  if(w.axis_id) newWeights[w.axis_id] = w.weight_percentage;
              });
          }
          setCycleWeights(newWeights);
      }
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
            if (!data.input_type) data.input_type = 'boolean';
            // Maintain active status if editing, else default to true
            if (!editingItem) data.active = true;
       }
      if (modalType === "Axis") {
           // Maintain active status if editing, else default to true
           if (!editingItem) data.active = true;
      }
      if (modalType === 'Cycle') {
            // Format weights for API
            const weightsArray = Object.entries(cycleWeights).map(([axisId, weight]) => ({
                axis_id: axisId,
                weight_percentage: weight
            }));
            
            data.weights = weightsArray;
       }

      // If editing, include ID
      if (editingItem) {
          data.id = editingItem.id;
      }

      const endpoint = modalType === "Axis" ? "/api/axes" : modalType === "Metric" ? "/api/metrics" : "/api/cycles";
      const method = editingItem ? "PUT" : "POST";

      try {
          const res = await fetch(endpoint, {
              method: method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(data),
          });
          if(res.ok) {
              setModalOpen(false);
              fetchAll(); // Refresh data
          } else {
              const err = await res.json();
              alert(`Error: ${err.error || 'Failed to save'}`);
          }
      } catch(err) {
          console.error(err);
          alert('An unexpected error occurred');
      }
  };

  // ... (Toggle handler remains) ...
  const handleToggleAxis = async (id: string, current: boolean) => {
      // Optimistic update
      setAxes(axes.map(a => a.id === id ? { ...a, active: !current } : a));
      
      try {
          await fetch("/api/axes", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, active: !current }),
          });
      } catch (err) {
          console.error("Failed to toggle axis", err);
          fetchAll(); // Revert on error
      }
  };

  const handleToggleMetric = async (id: string, current: boolean) => {
      // Optimistic update
      setMetrics(metrics.map(m => m.id === id ? { ...m, active: !current } : m));
      
      try {
          await fetch("/api/metrics", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, active: !current }),
          });
      } catch (err) {
          console.error("Failed to toggle metric", err);
          fetchAll(); // Revert on error
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
                <button className="create-btn" onClick={() => openModal("Axis")}>+ New Axis</button>
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
                            <button className="edit-btn" onClick={() => openModal("Axis", axis)}>Edit</button>
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
                <button className="create-btn" onClick={() => openModal("Metric")}>+ New Metric</button>
            </div>
            <div className="grid gap-4">
                {axes.map(axis => {
                    const axisMetrics = metrics.filter(m => m.axis_id === axis.id);
                    if(axisMetrics.length === 0) return null;
                    return (
                        <div key={axis.id} className="axis-group">
                            <h3 className="axis-title">{axis.name}</h3>
                            {axisMetrics.map(metric => (
                                <div key={metric.id} style={{ marginBottom: '8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                  {/* Metric Row */}
                                  <div className="item-card small" style={{ margin: 0, borderRadius: 0, border: 'none', opacity: metric.active === false ? 0.5 : 1 }}>
                                      <div className="item-info" style={{ flex: 1 }}>
                                          <span className="item-name">{metric.name}</span>
                                          <span className="item-meta">Max: {metric.max_points}pts • Lvl {metric.difficulty_level} • {INPUT_TYPE_LABELS[metric.input_type] || INPUT_TYPE_LABELS.boolean}</span>
                                      </div>
                                      <div className="item-actions">
                                          <label className="switch" style={{ transform: 'scale(0.8)', marginRight: '10px', verticalAlign: 'middle', marginTop: '-4px' }}>
                                              <input 
                                                  type="checkbox" 
                                                  checked={metric.active !== false} 
                                                  onChange={() => handleToggleMetric(metric.id, metric.active !== false)}
                                              />
                                              <span className="slider round"></span>
                                          </label>
                                          <button
                                            onClick={() => toggleExpandMetric(metric.id)}
                                            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}
                                          >
                                            {expandedMetric === metric.id ? '▲ Fields' : '▼ Fields'}
                                            {metricFields[metric.id] ? ` (${metricFields[metric.id].length})` : ''}
                                          </button>
                                          <button className="edit-btn" onClick={() => openModal("Metric", metric)}>Edit</button>
                                      </div>
                                  </div>
                                  {/* Fields Sub-Panel */}
                                  {expandedMetric === metric.id && (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>SUB-FIELDS</span>
                                        <button onClick={() => openFieldModal(metric.id)}
                                          style={{ fontSize: '12px', background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                                        >+ Add Field</button>
                                      </div>
                                      {(metricFields[metric.id] || []).length === 0 ? (
                                        <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '8px 0' }}>No fields yet. Click "+ Add Field" to start.</p>
                                      ) : (
                                        <div style={{ display: 'grid', gap: '6px' }}>
                                          {(metricFields[metric.id] || []).map(field => (
                                            <div key={field.id} style={{
                                              display: 'flex', alignItems: 'center', gap: '8px',
                                              background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '8px 12px',
                                              opacity: field.active ? 1 : 0.45,
                                            }}>
                                              <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>{field.label || field.name}</span>
                                                <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>{FIELD_TYPE_LABELS[field.field_type]}</span>
                                                <span style={{ fontSize: '10px', color: '#4b5563', marginLeft: '6px', fontFamily: 'monospace' }}>{field.name}</span>
                                              </div>
                                              <label title="Active/Inactive" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px', fontSize: '11px', color: '#9ca3af' }}>
                                                <input type="checkbox" checked={field.active} onChange={() => handleToggleField(metric.id, field)} style={{ cursor: 'pointer' }} />
                                                {field.active ? 'Active' : 'Inactive'}
                                              </label>
                                              <button onClick={() => openFieldModal(metric.id, field)}
                                                style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
                                              <button onClick={() => handleDeleteField(metric.id, field.id)}
                                                style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
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
                <button className="create-btn" onClick={() => openModal("Cycle")}>+ New Cycle</button>
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
                        <div>
                            <div className="weights-preview mb-2">
                                <span className="text-xs text-gray-400 block mb-1">Weights:</span>
                                <div className="flex gap-2 flex-wrap">
                                    {cycle.weights?.map(w => (
                                        <span key={w.axis_id} className="weight-tag">
                                            {w.axis_name || axes.find(a => a.id === w.axis_id)?.name || 'Axis'}: {w.weight_percentage}%
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="text-right">
                                <button className="edit-btn" onClick={() => openModal("Cycle", cycle)}>Edit</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* --- FIELD MODAL --- */}
        {fieldModalOpen && (
          <Modal title={editingField ? 'Edit Field' : 'Add Sub-Field'} onClose={() => setFieldModalOpen(false)}>
            <form onSubmit={handleSaveField} className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Field Key (no spaces, e.g. listening_minutes)</label>
                <input
                  className="input" required
                  placeholder="e.g. listening_minutes"
                  value={fieldForm.name}
                  onChange={e => setFieldForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Display Label</label>
                <input
                  className="input" required
                  placeholder="e.g. Listening (minutes)"
                  value={fieldForm.label}
                  onChange={e => setFieldForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Field Type</label>
                <select
                  className="input"
                  value={fieldForm.field_type}
                  onChange={e => setFieldForm(f => ({ ...f, field_type: e.target.value as MetricField['field_type'] }))}
                >
                  <option value="int">Integer (0+)</option>
                  <option value="boolean">Boolean (Yes / No)</option>
                  <option value="scale_0_5">Scale (0 – 5)</option>
                  <option value="text">Text (notes)</option>
                </select>
              </div>
              <button type="submit" className="create-btn" style={{ marginTop: '0.5rem' }}>
                {editingField ? 'Save Changes' : 'Add Field'}
              </button>
            </form>
          </Modal>
        )}

        {/* --- MODALS --- */}
        {modalOpen && (
            <Modal title={`${editingItem ? 'Edit' : 'Create'} ${modalType}`} onClose={() => setModalOpen(false)}>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    {modalType === "Axis" && (
                        <>
                            <input name="name" defaultValue={editingItem?.name} placeholder="Axis Name (e.g. Academic)" required className="input" />
                            <input name="description" defaultValue={editingItem?.description} placeholder="Description (optional)" className="input" />
                        </>
                    )}
                    {modalType === "Metric" && (
                        <>
                            <input name="name" defaultValue={editingItem?.name} placeholder="Metric Name (e.g. Deep Study)" required className="input" />
                            <select name="axis_id" defaultValue={editingItem?.axis_id} required className="input">
                                <option value="">Select Axis</option>
                                {axes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <select name="input_type" defaultValue={editingItem?.input_type || 'boolean'} className="input">
                                <option value="boolean">✅ Checkbox (Done / Not Done)</option>
                                <option value="emoji_5">😊 Emoji Scale (5 faces)</option>
                                <option value="scale_0_5">🔢 Numeric Scale (0-5)</option>
                                <option value="scale_0_10">📊 Numeric Scale (0-10)</option>
                            </select>
                            <input name="max_points" defaultValue={editingItem?.max_points} type="number" placeholder="Max Points (e.g. 10)" required className="input" />
                            <input name="difficulty_level" defaultValue={editingItem?.difficulty_level} type="number" min="1" max="5" placeholder="Difficulty (1-5)" required className="input" />
                        </>
                    )}
                    {modalType === "Cycle" && (
                        <>
                            <input name="name" defaultValue={editingItem?.name} placeholder="Cycle Name (e.g. Exam Prep)" required className="input" />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">Start Date</label>
                                    <input 
                                        name="start_date" 
                                        type="date" 
                                        defaultValue={editingItem?.start_date ? new Date(editingItem.start_date).toISOString().split('T')[0] : ''} 
                                        required 
                                        className="input" 
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block mb-1">End Date</label>
                                    <input 
                                        name="end_date" 
                                        type="date" 
                                        defaultValue={editingItem?.end_date ? new Date(editingItem.end_date).toISOString().split('T')[0] : ''}
                                        required 
                                        className="input" 
                                    />
                                </div>
                            </div>
                            
                            <div className="weights-section mt-2">
                                <h4 className="text-sm font-semibold mb-2">Axis Weights (%)</h4>
                                <div className="grid gap-2">
                                    {axes.filter(a => a.active).map(axis => (
                                        <div key={axis.id} className="flex items-center justify-between bg-gray-50 p-2 rounded dark:bg-zinc-800">
                                            <span className="text-sm">{axis.name}</span>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="100" 
                                                value={cycleWeights[axis.id] || 0}
                                                onChange={(e) => setCycleWeights({...cycleWeights, [axis.id]: parseInt(e.target.value) || 0})}
                                                className="w-20 p-1 border rounded text-right"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-right mt-1 text-xs text-gray-500">
                                    Total: {Object.values(cycleWeights).reduce((a, b) => a + b, 0)}%
                                </div>
                            </div>
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
