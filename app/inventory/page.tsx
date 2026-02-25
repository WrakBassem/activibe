"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import "./inventory.css";

// Assuming we get this from the API
interface Item {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
    effect_type: string;
    effect_value: number;
}

interface InventoryItem extends Item {
    quantity: number;
}

interface ActiveBuff extends Item {
    buff_id: string;
    expires_at: string;
}

export default function InventoryPage() {
    const router = useRouter();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>([]);
    const [loading, setLoading] = useState(true);
    const [consuming, setConsuming] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const fetchInventory = async () => {
        try {
            const res = await fetch("/api/inventory", { cache: 'no-store' });
            const data = await res.json();
            if (data.success) {
                setInventory(data.data.inventory);
                setActiveBuffs(data.data.activeBuffs);
            }
        } catch (err) {
            console.error("Error fetching inventory:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleConsume = async (itemId: string) => {
        setConsuming(itemId);
        setMessage(null);
        try {
            const res = await fetch("/api/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId })
            });
            const data = await res.json();
            
            if (data.success) {
                setMessage(`✅ ${data.message}`);
                
                if (data.trigger_action === 'edit_yesterday') {
                    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
                    setTimeout(() => {
                        router.push(`/daily?date=${yesterday}`);
                    }, 1500);
                } else {
                    // Refresh data
                    await fetchInventory();
                }
            } else {
                setMessage(`❌ ${data.error}`);
            }
        } catch (err) {
            setMessage("❌ Failed to consume item.");
        } finally {
            setConsuming(null);
        }
    };

    if (loading) return (
        <div className="inventory-container">
            <div className="loading-spinner"></div>
            <p>Gathering your loot...</p>
        </div>
    );

    return (
        <div className="inventory-container">
            <header className="inventory-header">
                <div>
                    <h1 className="inventory-title">Your Bag</h1>
                    <p className="inventory-subtitle">Manage your powerful artifacts and active buffs.</p>
                </div>
                <Link href="/" className="back-link">← Dashboard</Link>
            </header>

            {message && (
                <div className="message-toast fade-in">{message}</div>
            )}

            <div className="inventory-layout">
                {/* Active Buffs Section */}
                <div className="buffs-section">
                    <h2 className="section-title">✨ Active Buffs</h2>
                    {activeBuffs.length === 0 ? (
                        <p className="empty-state">No active buffs.</p>
                    ) : (
                        <div className="buff-list">
                            {activeBuffs.map(buff => (
                                <div key={buff.buff_id} className={`buff-card rarity-${buff.rarity}`}>
                                    <div className="buff-icon">{buff.icon}</div>
                                    <div className="buff-info">
                                        <h4>{buff.name}</h4>
                                        <p>Expires: {new Date(buff.expires_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Inventory Bag Section */}
                <div className="bag-section">
                    <h2 className="section-title">🎒 Inventory</h2>
                    {inventory.length === 0 ? (
                        <div className="empty-box">
                            <span className="empty-icon">🕸️</span>
                            <p>Your bag is empty. Earn a Perfect Daily Score (100) to find loot drops!</p>
                        </div>
                    ) : (
                        <div className="item-grid">
                            {inventory.map(item => (
                                <div key={item.id} className={`item-card rarity-${item.rarity}`}>
                                    <div className="item-quantity">x{item.quantity}</div>
                                    <div className="item-icon-wrapper">
                                        <span className="item-icon">{item.icon}</span>
                                    </div>
                                    <h3 className="item-name">{item.name}</h3>
                                    <p className="item-desc">{item.description}</p>
                                    <button 
                                        className="consume-btn"
                                        onClick={() => handleConsume(item.id)}
                                        disabled={consuming === item.id}
                                    >
                                        {consuming === item.id ? 'Using...' : 'Consume'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
