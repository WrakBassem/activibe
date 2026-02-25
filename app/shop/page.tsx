'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ShopItem {
    id: string;
    name: string;
    description: string;
    effect_type: string;
    icon: string;
    rarity: string;
    price: number;
    category: 'consumable' | 'combat_gear' | 'cosmetic' | string;
}

interface Passive {
    item_id: string;
    stacks: number;
    name: string;
}

export default function BlackMarket() {
    const router = useRouter();
    const [gold, setGold] = useState(0);
    const [items, setItems] = useState<ShopItem[]>([]);
    const [passives, setPassives] = useState<Passive[]>([]);
    const [smugglerEvent, setSmugglerEvent] = useState<any>(null);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [purchasingId, setPurchasingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<'consumable' | 'combat_gear' | 'cosmetic'>('consumable');

    useEffect(() => {
        fetchShopData();
        fetchSmugglerData();
    }, []);

    useEffect(() => {
        if (!smugglerEvent?.expires_at) return;

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(smugglerEvent.expires_at).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setSmugglerEvent(null);
                clearInterval(timer);
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${h}h ${m}m ${s}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, [smugglerEvent]);

    const fetchSmugglerData = async () => {
        try {
            const res = await fetch('/api/shop/smuggler');
            const json = await res.json();
            if (json.success && json.active) {
                setSmugglerEvent(json.event);
            }
        } catch (err) {
            console.error("Smuggler fetch failed", err);
        }
    };

    const fetchShopData = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/shop');
            const json = await res.json();
            if (json.success) {
                setGold(json.data.gold);
                setItems(json.data.items);
                setPassives(json.data.passives);
            } else {
                setError(json.error || 'Failed to load shop');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (item: ShopItem, isSmugglerItem = false) => {
        const actualPrice = isSmugglerItem ? 
            (smugglerEvent.item_1_id === item.id ? smugglerEvent.item_1_discount_price : smugglerEvent.item_2_discount_price) 
            : item.price;

        if (gold < actualPrice) {
            setError("Not enough Gold.");
            setTimeout(() => setError(null), 3000);
            return;
        }

        setError(null);
        setSuccessMessage(null);
        setPurchasingId(item.id);

        try {
            const res = await fetch('/api/shop/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    item_id: item.id,
                    smuggler_event_id: isSmugglerItem ? smugglerEvent.id : undefined
                })
            });
            const json = await res.json();

            if (json.success) {
                setSuccessMessage(json.message);
                setGold(prev => prev - actualPrice);
                // Refresh passives to update gear state
                fetchShopData(); 
            } else {
                setError(json.error || 'Purchase failed');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setPurchasingId(null);
            setTimeout(() => setSuccessMessage(null), 4000);
            setTimeout(() => setError(null), 4000);
        }
    };

    const isMaxStacks = (item: ShopItem): boolean => {
        if (item.category !== 'combat_gear' && item.category !== 'cosmetic') return false;
        
        const passive = passives.find(p => p.item_id === item.id);
        const currentStacks = passive?.stacks || 0;
        
        let maxStacks = 1;
        if (item.name === 'Iron Will Plating') maxStacks = 3;
        if (item.name === 'Focus Gauntlets') maxStacks = 2;

        return currentStacks >= maxStacks;
    };

    const getStacksDisplay = (item: ShopItem): string => {
        if (item.category !== 'combat_gear' && item.category !== 'cosmetic') return '';
        const passive = passives.find(p => p.item_id === item.id);
        const currentStacks = passive?.stacks || 0;
        
        let maxStacks = 1;
        if (item.name === 'Iron Will Plating') maxStacks = 3;
        if (item.name === 'Focus Gauntlets') maxStacks = 2;

        return `(${currentStacks}/${maxStacks})`;
    };

    const renderItems = (category: string) => {
        const categoryItems = items.filter(i => i.category === category);

        if (categoryItems.length === 0) {
            return <div className="text-gray-500 italic py-8 text-center">No items available in this category.</div>;
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryItems.map(item => {
                    const maxedOut = isMaxStacks(item);
                    return (
                        <div key={item.id} className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-5 relative overflow-hidden group hover:border-yellow-500/50 transition-all">
                            {/* Rarity Glow */}
                            <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl rounded-full opacity-20 transition-opacity group-hover:opacity-40 pointer-events-none 
                                ${item.rarity === 'common' ? 'bg-gray-400' : 
                                  item.rarity === 'rare' ? 'bg-blue-500' : 
                                  item.rarity === 'epic' ? 'bg-purple-500' : 'bg-yellow-500'}`} 
                            />

                            <div className="flex justify-between items-start mb-4">
                                <span className="text-4xl">{item.icon}</span>
                                <div className="flex items-center space-x-1 bg-black/40 px-3 py-1 rounded-full border border-yellow-500/30">
                                    <span className="text-yellow-400 font-bold">{item.price}</span>
                                    <span className="text-xs text-yellow-500/80 uppercase">Gold</span>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-100 flex items-center justify-between">
                                {item.name}
                                {item.category !== 'consumable' && (
                                    <span className="text-xs font-mono text-gray-400 ml-2">{getStacksDisplay(item)}</span>
                                )}
                            </h3>
                            <p className="text-sm text-gray-400 mt-2 mb-6 h-16 line-clamp-3 leading-relaxed">
                                {item.description}
                            </p>

                            <button
                                onClick={() => handlePurchase(item)}
                                disabled={maxedOut || gold < item.price || purchasingId === item.id}
                                className={`w-full py-3 rounded-lg font-bold tracking-wide transition-all
                                    ${maxedOut ? 'bg-gray-700 text-gray-500 cursor-not-allowed' :
                                      gold < item.price ? 'bg-red-900/30 text-red-400 border border-red-900/50 cursor-not-allowed' :
                                      purchasingId === item.id ? 'bg-yellow-600 animate-pulse text-white' :
                                      'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black shadow-lg shadow-yellow-900/20'
                                    }`}
                            >
                                {maxedOut ? 'Sold Out / Maxed' : 
                                 purchasingId === item.id ? 'Purchasing...' : 
                                 gold < item.price ? 'Insufficient Gold' : 'Acquire'}
                            </button>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <span className="text-6xl mb-4">🪙</span>
                    <h2 className="text-2xl font-bold text-yellow-500/80 tracking-widest uppercase">Accessing the Syndicate...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-yellow-500/30">
            {/* Nav */}
            <nav className="border-b border-gray-800/50 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-8">
                            <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center">
                                <span>← Back</span>
                            </Link>
                            <h1 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-400">
                                THE BLACK MARKET
                            </h1>
                        </div>
                        <div className="flex items-center bg-black/60 px-5 py-2 rounded-full border border-yellow-500/20 shadow-inner shadow-black">
                            <span className="mr-2 text-xl">🪙</span>
                            <span className="font-mono text-xl font-bold text-yellow-400 tracking-wider w-16 text-right">
                                {gold}
                            </span>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                
                {/* Header Section */}
                <div className="mb-12 text-center">
                    <h2 className="text-4xl font-bold mb-4 text-gray-200">What do you seek?</h2>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                        Power comes at a price. Spend your <span className="text-yellow-500/80">Focus Coins</span> here to tilt the odds in your favor against your daily adversaries.
                    </p>
                </div>

                {/* The Smuggler's Stash */}
                {smugglerEvent && (
                    <div className="mb-16 bg-gradient-to-br from-purple-900/40 to-indigo-900/30 border-2 border-purple-500/40 rounded-3xl p-8 relative overflow-hidden shadow-2xl shadow-purple-500/10">
                        {/* Background Decoration */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full" />
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
                        
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-purple-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded tracking-widest">Limited Event</span>
                                        <span className="text-purple-400 text-sm font-bold">The Smuggler's Stash</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-white tracking-tight">Rare Cuts & Exclusive Gear</h3>
                                </div>
                                <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 px-6 py-3 rounded-2xl flex flex-col items-center">
                                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-1">Disappears in</span>
                                    <span className="text-2xl font-mono font-bold text-white tracking-tighter">{timeLeft}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[1, 2].map((num) => {
                                    const itemId = num === 1 ? smugglerEvent.item_1_id : smugglerEvent.item_2_id;
                                    const itemName = num === 1 ? smugglerEvent.item_1_name : smugglerEvent.item_2_name;
                                    const itemDesc = num === 1 ? smugglerEvent.item_1_description : smugglerEvent.item_2_description;
                                    const itemIcon = num === 1 ? smugglerEvent.item_1_icon : smugglerEvent.item_2_icon;
                                    const itemRarity = num === 1 ? smugglerEvent.item_1_rarity : smugglerEvent.item_2_rarity;
                                    const basePrice = num === 1 ? smugglerEvent.item_1_base_price : smugglerEvent.item_2_base_price;
                                    const discPrice = num === 1 ? smugglerEvent.item_1_discount_price : smugglerEvent.item_2_discount_price;

                                    const itemObj = { id: itemId, name: itemName, category: itemName === 'The Smoke Bomb' || itemName === 'The Time Turner' ? 'consumable' : 'unknown' } as any;
                                    const maxed = isMaxStacks(itemObj);

                                    return (
                                        <div key={itemId} className="bg-black/60 border border-white/10 rounded-2xl p-6 flex items-center gap-6 group hover:border-purple-500/50 transition-all">
                                            <div className={`text-5xl p-4 bg-gray-900 rounded-2xl shadow-inner border border-white/5 
                                                ${itemRarity === 'legendary' ? 'shadow-yellow-500/20' : 'shadow-purple-500/20'}`}>
                                                {itemIcon}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-xl font-bold text-white">{itemName}</h4>
                                                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mt-0.5">{itemRarity}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500 line-through font-mono">{basePrice} G</p>
                                                        <p className="text-lg font-black text-yellow-400 font-mono leading-none">{discPrice} G</p>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-400 mt-3 mb-4 line-clamp-2 leading-snug">{itemDesc}</p>
                                                <button
                                                    onClick={() => handlePurchase({ id: itemId, name: itemName, price: discPrice, category: itemObj.category } as any, true)}
                                                    disabled={maxed || gold < discPrice || purchasingId === itemId}
                                                    className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all
                                                        ${maxed ? 'bg-gray-800 text-gray-500 cursor-not-allowed' :
                                                          gold < discPrice ? 'bg-red-900/20 text-red-500 border border-red-900/50 cursor-not-allowed' :
                                                          purchasingId === itemId ? 'bg-purple-600 animate-pulse text-white' :
                                                          'bg-white text-black hover:bg-purple-500 hover:text-white shadow-xl shadow-black/50'
                                                        }`}
                                                >
                                                    {maxed ? 'Max Stacks' : purchasingId === itemId ? 'Securing...' : gold < discPrice ? 'Broke' : 'Claim Stash'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Messages */}
                {error && (
                    <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg text-center animate-pulse">
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div className="mb-8 p-4 bg-green-900/20 border border-green-500/50 text-green-400 rounded-lg text-center animate-pulse">
                        {successMessage}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex justify-center space-x-2 md:space-x-8 mb-12 border-b border-gray-800 pb-px">
                    {[
                        { id: 'consumable', label: 'Tactical (Consumables)' },
                        { id: 'combat_gear', label: 'Combat Gear (Passives)' },
                        { id: 'cosmetic', label: 'The Flex Tier (Cosmetics)' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'consumable' | 'combat_gear' | 'cosmetic')}
                            className={`pb-4 px-2 tracking-wide font-medium transition-colors border-b-2 
                                ${activeTab === tab.id 
                                    ? 'border-yellow-500 text-yellow-400' 
                                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Shelves */}
                <div className="min-h-[400px]">
                    {renderItems(activeTab)}
                </div>

            </main>
        </div>
    );
}
