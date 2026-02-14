"use client";

import { useState, useEffect } from "react";
import "../daily/daily.css"; // Reuse existing styles
import { useRouter } from "next/navigation";

type Item = {
  id: number;
  title: string;
  type: "habit" | "task";
  frequency_days: number[];
  target_time: string | null;
  duration_minutes: number;
  priority: "none" | "low" | "medium" | "high";
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

export default function ManagePage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Item State
  const [newItem, setNewItem] = useState<{
    title: string;
    type: "habit" | "task";
    frequency_type: "daily" | "weekdays" | "custom" | "specific_date";
    custom_days: number[];
    target_time: string;
    duration_minutes: number;
    priority: "none" | "low" | "medium" | "high";
    start_date: string;
    end_date: string;
    specific_date: string;
    is_active: boolean;
  }>({
    title: "",
    type: "habit",
    frequency_type: "daily",
    custom_days: [0, 1, 2, 3, 4, 5, 6],
    target_time: "",
    duration_minutes: 0,
    priority: "none",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    specific_date: "",
    is_active: true,
  });

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      if (data.success) {
        setItems(data.data.map((item: any) => ({
          ...item,
          frequency_days: typeof item.frequency_days === 'string'
            ? JSON.parse(item.frequency_days)
            : (item.frequency_days || [])
        })));
      }
    } catch (err) {
      console.error("Failed to fetch items", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await fetch(`/api/items/${id}`, { method: "DELETE" });
      setItems(items.filter((i) => i.id !== id));
    } catch (err) {
      alert("Failed to delete item");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title) return;
    setIsSubmitting(true);

    let frequency_days: number[] = newItem.custom_days;
    let start = newItem.start_date;
    let end = newItem.end_date;

    if (newItem.frequency_type === "daily") frequency_days = [0, 1, 2, 3, 4, 5, 6];
    if (newItem.frequency_type === "weekdays") frequency_days = [1, 2, 3, 4, 5];
    
    // Specific Date Logic
    if (newItem.frequency_type === "specific_date") {
      if (!newItem.specific_date) {
        alert("Please select a date");
        setIsSubmitting(false);
        return;
      }
      start = newItem.specific_date;
      end = newItem.specific_date;
      // Frequency must include the day of that specific date to show up
      const dayIndex = new Date(newItem.specific_date).getDay();
      frequency_days = [dayIndex]; 
    }

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newItem.title,
          type: newItem.type,
          frequency_days: frequency_days,
          target_time: newItem.target_time,
          duration_minutes: newItem.duration_minutes,
          priority: newItem.priority,
          start_date: start || null,
          end_date: end || null,
          is_active: newItem.is_active
        }),
      });
      const data = await res.json();
      if (data.success) {
        setItems([data.data, ...items]);
        // Reset form
        setNewItem({
          title: "",
          type: "habit",
          frequency_type: "daily",
          custom_days: [0, 1, 2, 3, 4, 5, 6],
          target_time: "",
          duration_minutes: 0,
          priority: "none",
          start_date: new Date().toISOString().split('T')[0],
          end_date: "",
          specific_date: "",
          is_active: true
        });
      }
    } catch (err) {
      alert("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    const current = newItem.custom_days;
    let next;
    if (current.includes(dayIndex)) {
      next = current.filter((d) => d !== dayIndex);
    } else {
      next = [...current, dayIndex].sort();
    }
    setNewItem({ ...newItem, custom_days: next, frequency_type: 'custom' });
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      case "low": return "#3b82f6";
      default: return "#9ca3af";
    }
  };

  return (
    <div className="daily-container">
      <header className="daily-header" style={{ position: 'relative' }}>
        <button 
          onClick={() => router.push("/daily")} 
          style={{ position: 'absolute', left: 0, top: 0, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--foreground)' }}
        >
          ←
        </button>
        <h1 className="daily-title">Manage Items</h1>
        <p className="daily-date">Habits & Routines</p>
      </header>

      {/* ADD NEW FORM */}
      <form onSubmit={handleAdd} className="question-card" style={{ marginBottom: "2rem" }}>
        <h3 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1rem" }}>Add New</h3>
        
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <select 
            value={newItem.type}
            onChange={(e) => setNewItem({ ...newItem, type: e.target.value as "habit" | "task" })}
            className="slider-input"
            style={{ height: "40px", flex: 1, padding: "0 0.5rem", minWidth: "80px" }}
          >
            <option value="habit">Habit</option>
            <option value="task">Task</option>
          </select>
          <input
            type="text"
            placeholder="Title (e.g. Read 10 pages)"
            value={newItem.title}
            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            className="slider-input"
            style={{ height: "40px", flex: 3, padding: "0 0.5rem", background: "var(--background)", border: "1px solid #ccc" }}
            required
          />
        </div>

        {/* DETAILS ROW 1: Time & Duration */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
           <input
            type="time"
            value={newItem.target_time}
            onChange={(e) => setNewItem({ ...newItem, target_time: e.target.value })}
            className="slider-input"
            style={{ height: "40px", flex: 1, minWidth: "110px", padding: "0 0.5rem", color: "var(--foreground)" }}
          />
           <input
            type="number"
            placeholder="Mins"
            value={newItem.duration_minutes || ""}
            onChange={(e) => setNewItem({ ...newItem, duration_minutes: parseInt(e.target.value) || 0 })}
            className="slider-input"
            style={{ height: "40px", flex: 1, minWidth: "70px", padding: "0 0.5rem", color: "var(--foreground)" }}
          />
          <select 
            value={newItem.priority}
            onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
            className="slider-input"
            style={{ height: "40px", flex: 1.5, minWidth: "120px", padding: "0 0.5rem" }}
          >
            <option value="none">No Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* FREQUENCY */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ fontSize: "0.85rem", display: "block", marginBottom: "0.5rem", color: "#6b7280" }}>Frequency & Range</label>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className={`value-button ${newItem.frequency_type === 'daily' ? 'selected' : ''}`} onClick={() => setNewItem({ ...newItem, frequency_type: 'daily' })} style={{ fontSize: "0.8rem", padding: "0.25rem" }}>Daily</button>
            <button type="button" className={`value-button ${newItem.frequency_type === 'weekdays' ? 'selected' : ''}`} onClick={() => setNewItem({ ...newItem, frequency_type: 'weekdays' })} style={{ fontSize: "0.8rem", padding: "0.25rem" }}>Weekdays</button>
             <button type="button" className={`value-button ${newItem.frequency_type === 'custom' ? 'selected' : ''}`} onClick={() => setNewItem({ ...newItem, frequency_type: 'custom' })} style={{ fontSize: "0.8rem", padding: "0.25rem" }}>Custom</button>
             <button type="button" className={`value-button ${newItem.frequency_type === 'specific_date' ? 'selected' : ''}`} onClick={() => setNewItem({ ...newItem, frequency_type: 'specific_date' })} style={{ fontSize: "0.8rem", padding: "0.25rem" }}>Specific Date</button>
          </div>
          
          {/* Custom Days Selector */}
          {newItem.frequency_type === 'custom' && (
            <div style={{ display: "flex", gap: "0.25rem", justifyContent: "space-between", marginBottom: "1rem" }}>
              {DAYS.map((d, i) => (
                <button key={d} type="button" className={`value-button ${newItem.custom_days.includes(i) ? 'selected' : ''}`} style={{ fontSize: "0.75rem", padding: "0", height: "36px" }} onClick={() => toggleDay(i)}>{d}</button>
              ))}
            </div>
          )}

          {/* Date Range Inputs */}
          {newItem.frequency_type === 'specific_date' ? (
             <div style={{ marginTop: "0.5rem" }}>
               <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Select Date</label>
               <input type="date" value={newItem.specific_date} onChange={(e) => setNewItem({ ...newItem, specific_date: e.target.value })} className="slider-input" style={{ height: "40px", padding: "0 0.5rem", color: "var(--foreground)" }} required />
             </div>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>Start Date</label>
                <input type="date" value={newItem.start_date} onChange={(e) => setNewItem({ ...newItem, start_date: e.target.value })} className="slider-input" style={{ height: "40px", padding: "0 0.5rem", color: "var(--foreground)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "#6b7280" }}>End Date (Optional)</label>
                <input type="date" value={newItem.end_date} onChange={(e) => setNewItem({ ...newItem, end_date: e.target.value })} className="slider-input" style={{ height: "40px", padding: "0 0.5rem", color: "var(--foreground)" }} />
              </div>
            </div>
          )}
        </div>

        {/* Active Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#6b7280" }}>
           <input 
             type="checkbox" 
             checked={newItem.is_active} 
             onChange={(e) => setNewItem({ ...newItem, is_active: e.target.checked })} 
             style={{ width: "16px", height: "16px" }}
           />
           <label>Item is Active</label>
        </div>

        <button type="submit" className="submit-button active" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Item"}
        </button>
      </form>

      {/* LIST */}
      <div className="questions-container" style={{ gap: "0.75rem" }}>
        {loading ? <p style={{textAlign: "center"}}>Loading...</p> : items.map((item) => (
          <div key={item.id} className="question-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", opacity: item.is_active ? 1 : 0.6 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{item.type === "habit" ? "✅" : "📋"}</span>
              <div>
                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  {item.title}
                  {item.priority !== 'none' && (
                     <span style={{ 
                       fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", 
                       fontWeight: 700, backgroundColor: getPriorityColor(item.priority), color: "white" 
                     }}>
                       {item.priority.toUpperCase()}
                     </span>
                  )}
                  {!item.is_active && <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", background: "#9ca3af", color: "white" }}>INACTIVE</span>}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {item.target_time ? item.target_time : "Anytime"} 
                  {item.duration_minutes > 0 && ` • ${item.duration_minutes}m`}
                  {` • ${item.frequency_days.length === 7 && !item.start_date ? "Every Day" : "Custom/Dated"}`}
                </div>
                {/* Date Range Display */}
                {(item.start_date || item.end_date) && (
                   <div style={{ fontSize: "0.7rem", color: "#3b82f6", marginTop: "2px" }}>
                     {item.start_date ? new Date(item.start_date).toLocaleDateString() : "Start"} 
                     {item.end_date ? ` - ${new Date(item.end_date).toLocaleDateString()}` : " -> Forever"}
                   </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => handleDelete(item.id)}
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.5rem", fontSize: "1.2rem" }}
              aria-label="Delete"
            >
              ✕
            </button>
          </div>
        ))}

        {items.length === 0 && !loading && (
          <p style={{ textAlign: "center", color: "#6b7280" }}>No items yet. Add one above!</p>
        )}
      </div>
    </div>
  );
}
