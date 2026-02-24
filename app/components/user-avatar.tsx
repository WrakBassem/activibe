'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export function UserAvatar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTitle, setActiveTitle] = useState<{ title: string; icon: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || '??';

  const fetchTitle = async () => {
      try {
          const res = await fetch('/api/achievements');
          const json = await res.json();
          if (json.success && json.data) {
              const equipped = json.data.find((a: any) => a.is_equipped);
              if (equipped) {
                  setActiveTitle({ title: equipped.title, icon: equipped.icon });
              } else {
                  setActiveTitle(null);
              }
          }
      } catch (e) {}
  };

  useEffect(() => {
    if (user) fetchTitle();

    const handleTitleChange = () => fetchTitle();
    window.addEventListener('titleEquipped', handleTitleChange);

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('titleEquipped', handleTitleChange);
    };
  }, [dropdownRef, user]);

  if (!user) return null;

  return (
    <div className="relative flex flex-col items-center" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold border border-indigo-200 transition-all hover:bg-indigo-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
      >
        {user.image ? (
            <img src={user.image} alt={user.name || 'User'} className="w-10 h-10 rounded-full object-cover" />
        ) : (
            <span>{initials}</span>
        )}
      </button>

      {/* Equipped Title Display */}
      {activeTitle && (
          <div className="absolute top-11 whitespace-nowrap bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full border border-yellow-500/30 font-bold text-[0.65rem] text-yellow-400 opacity-90 shadow-lg pointer-events-none">
              {activeTitle.icon} {activeTitle.title}
          </div>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            <div className="px-4 py-2 border-b border-gray-100">
               <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
               <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <Link href="/coach" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" onClick={() => setIsOpen(false)}>
              🧠 AI Coach
            </Link>
             <Link href="/daily" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" onClick={() => setIsOpen(false)}>
              📅 Daily Logs
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-medium"
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
