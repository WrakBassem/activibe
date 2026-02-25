"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/user/role");
        const data = await res.json();
        if (!data.isAdmin) {
          router.push("/");
        } else {
          setIsAdmin(true);
        }
      } catch (err) {
        router.push("/");
      }
    }
    checkAdmin();
  }, [router]);

  if (isAdmin === null) {
    return <div className="p-8 text-center text-gray-500">Checking Authorization...</div>;
  }

  const tabs = [
    { name: "Overview", path: "/admin", icon: "📊" },
    { name: "Users", path: "/admin/users", icon: "👥" },
    { name: "Items", path: "/admin/items", icon: "📦" },
    { name: "Events", path: "/admin/events", icon: "🕶️" },
    { name: "Bosses", path: "/admin/bosses", icon: "👹" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar / Topnav */}
      <div className="flex border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="px-6 py-4 border-r border-white/10">
          <Link href="/" className="text-xl font-black tracking-tighter hover:text-purple-500 transition-colors">
            🛡️ ACTIVIBE <span className="text-xs text-gray-500 font-normal ml-1">ADMIN</span>
          </Link>
        </div>
        <nav className="flex items-center px-4 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              href={tab.path}
              className={`px-6 py-4 flex items-center gap-2 text-sm font-bold transition-all border-b-2 whitespace-nowrap
                ${pathname === tab.path 
                  ? "border-purple-500 text-white bg-purple-500/5" 
                  : "border-transparent text-gray-500 hover:text-gray-300"}`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {children}
      </main>

      <style jsx global>{`
        .admin-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          overflow: hidden;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-table th {
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #6b7280;
        }
        .admin-table td {
          padding: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.875rem;
        }
        .admin-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .btn-primary {
          background: #8b5cf6;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .btn-primary:hover {
          background: #7c3aed;
          transform: translateY(-1px);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #d1d5db;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.875rem;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
