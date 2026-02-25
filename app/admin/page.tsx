"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  totalUsers: number;
  totalGold: number;
  activeBosses: number;
  activeSmugglers: number;
}

export default function AdminOverview() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await fetch("/api/admin/overview");
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (err) {
        console.error("Failed to fetch overview", err);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Compiling Analytics...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Analytics Overview</h1>
        <p className="text-gray-500">High-level telemetry on the platform's engagement and economy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="admin-card p-6 flex flex-col justify-between">
            <div>
                <div className="text-4xl mb-2">👥</div>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Users</div>
            </div>
            <div className="text-4xl font-black mt-4">{data.totalUsers.toLocaleString()}</div>
        </div>

        <div className="admin-card p-6 flex flex-col justify-between border-yellow-500/20 bg-yellow-500/5">
            <div>
                <div className="text-4xl mb-2">🪙</div>
                <div className="text-sm font-bold text-yellow-500/70 uppercase tracking-widest">Global Economy</div>
            </div>
            <div className="text-4xl font-black mt-4 text-yellow-500">{data.totalGold.toLocaleString()} <span className="text-xl">G</span></div>
        </div>

        <div className="admin-card p-6 flex flex-col justify-between border-red-500/20 bg-red-500/5">
            <div>
                <div className="text-4xl mb-2">👹</div>
                <div className="text-sm font-bold text-red-500/70 uppercase tracking-widest">Active Bosses</div>
            </div>
            <div className="text-4xl font-black mt-4 text-red-500">{data.activeBosses.toLocaleString()}</div>
            <p className="text-[10px] text-gray-500 mt-2">Adversaries currently engaged in combat.</p>
        </div>

        <div className="admin-card p-6 flex flex-col justify-between border-purple-500/20 bg-purple-500/5">
            <div>
                <div className="text-4xl mb-2">🕶️</div>
                <div className="text-sm font-bold text-purple-500/70 uppercase tracking-widest">Live Smugglers</div>
            </div>
            <div className="text-4xl font-black mt-4 text-purple-400">{data.activeSmugglers.toLocaleString()}</div>
            <p className="text-[10px] text-gray-500 mt-2">Temporary black markets active right now.</p>
        </div>

      </div>

      <div className="mt-12 p-6 admin-card bg-black/20">
          <h2 className="text-xl font-bold mb-4">Command Center Active</h2>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
              Use the navigation tabs above to dive into specific systems. The <strong>Users</strong> tab now supports 
              direct Gold and XP injections for rewarding engaged members. The <strong>Items</strong> tab controls the global 
              shop economy, and <strong>Bosses / Events</strong> give you manual override capabilities over dynamic gameplay features.
          </p>
      </div>
    </div>
  );
}
