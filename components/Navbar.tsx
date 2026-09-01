'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Plus,
  ArrowRight,
  Home,
  Clock,
  QrCode,
  FolderKanban,
  Zap,
  Shield,
  Layers,
  Search,
} from 'lucide-react';

interface NavbarProps {
  currentRoom?: string;
  onOpenQR?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoom, onOpenQR, isSyncing }) => {
  const [joinSlug, setJoinSlug] = useState('');
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Read recent rooms for dashboard dropdown
  useEffect(() => {
    try {
      const saved = localStorage.getItem('the_drop_recent_rooms') || localStorage.getItem('clipbin_recent_rooms');
      if (saved) {
        setRecentRooms(JSON.parse(saved));
      }
    } catch (e) { }
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDashboardOpen(false);
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinSlug.trim()) return;
    const clean = joinSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    router.push(`/clip/${clean}`);
    setJoinSlug('');
    setIsDashboardOpen(false);
  };

  const handleCreateNew = async () => {
    try {
      const res = await fetch('/api/clip', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.slug) {
        router.push(`/clip/${data.data.slug}`);
      }
    } catch (e) {
      const fallback = `clip-${Math.random().toString(36).substring(2, 8)}`;
      router.push(`/clip/${fallback}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-[#111111] text-zinc-100 select-none">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">

        {/* Left: Brand Logo & Wordmark (Cloudflare Style) */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          {/* Vibrant Orange Cloud Logo */}
          <div className="w-8 h-6 flex items-center justify-center text-[#ff5a1f] group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 48 32" fill="currentColor" className="w-full h-full">
              <path d="M37.5 12C36.8 5.4 31.2 0.2 24.4 0.2c-5.4 0-10.1 3.2-12.2 7.8C5.4 8.7 0 14.5 0 21.4 0 27.2 4.8 32 10.6 32h26.9c5.8 0 10.5-4.7 10.5-10.5 0-5.3-4-9.7-9.3-10.4l-1.2-.1z" />
            </svg>
          </div>
          <span className="font-extrabold tracking-[0.2em] text-sm text-white uppercase group-hover:text-zinc-200 transition-colors">
            THE DROP
          </span>
        </Link>

        {/* Center: Navigation Links (Clean text without arrows) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs lg:text-sm font-medium text-zinc-200 relative">
          {/* Products Dropdown */}
          <div className="relative group">
            <button
              onClick={() => setActiveMenu(activeMenu === 'products' ? null : 'products')}
              className="hover:text-[#ff5a1f] transition-colors py-2"
            >
              <span>Products</span>
            </button>

            {activeMenu === 'products' && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#0d1017] border border-zinc-800 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <Link
                  href="/"
                  onClick={() => setActiveMenu(null)}
                  className="p-2.5 rounded-xl hover:bg-zinc-900/80 transition-colors flex items-start gap-3 text-left"
                >
                  <div className="p-1.5 rounded-lg bg-[#ff5a1f]/10 text-[#ff5a1f]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Universal Clipboard</div>
                    <div className="text-[11px] text-zinc-400">Sync text & code across all devices live.</div>
                  </div>
                </Link>

                <div
                  onClick={() => {
                    handleCreateNew();
                    setActiveMenu(null);
                  }}
                  className="p-2.5 rounded-xl hover:bg-zinc-900/80 transition-colors flex items-start gap-3 text-left cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">File Dropper</div>
                    <div className="text-[11px] text-zinc-400">Direct cloud asset sharing without login.</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Solutions Dropdown */}
          <div className="relative group">
            <button
              onClick={() => setActiveMenu(activeMenu === 'solutions' ? null : 'solutions')}
              className="hover:text-[#ff5a1f] transition-colors py-2"
            >
              <span>Solutions</span>
            </button>

            {activeMenu === 'solutions' && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#0d1017] border border-zinc-800 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2.5 rounded-xl hover:bg-zinc-900/80 transition-colors flex items-start gap-3 text-left">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Mobile QR Pairing</div>
                    <div className="text-[11px] text-zinc-400">Scan from camera to paste 2FA & links.</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl hover:bg-zinc-900/80 transition-colors flex items-start gap-3 text-left">
                  <div className="p-1.5 rounded-lg bg-[#ff5a1f]/10 text-[#ff5a1f]">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Zero Account Privacy</div>
                    <div className="text-[11px] text-zinc-400">Ephemeral room memory, no cookies.</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resources Dropdown */}
          <div className="relative group">
            <button
              onClick={() => setActiveMenu(activeMenu === 'resources' ? null : 'resources')}
              className="hover:text-[#ff5a1f] transition-colors py-2"
            >
              <span>Resources</span>
            </button>

            {activeMenu === 'resources' && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-[#0d1017] border border-zinc-800 rounded-2xl shadow-2xl p-3 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <Link
                  href="/api/clip/status"
                  onClick={() => setActiveMenu(null)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                >
                  Edge Network Status
                </Link>
                <Link
                  href="https://github.com"
                  target="_blank"
                  onClick={() => setActiveMenu(null)}
                  className="px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                >
                  GitHub Repository
                </Link>
              </div>
            )}
          </div>

        </nav>

        {/* Right: Cloudflare-Style Action Buttons */}
        <div className="flex items-center gap-3.5 shrink-0" ref={dropdownRef}>
          {/* Wanna Create a room Link */}
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 text-xs text-[#ff5a1f] hover:text-[#ff7a45] font-semibold transition-colors pr-1"
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#ff5a1f]" />
            <span> Create New Room</span>
          </button>

          {/* Dashboard Button (Pill style with Recent Rooms Dropdown) */}
          <div className="relative">
            <button
              onClick={() => setIsDashboardOpen(!isDashboardOpen)}
              className="px-3.5 sm:px-4 py-1.5 rounded-full border border-zinc-700 hover:border-zinc-500 bg-transparent text-xs text-zinc-100 font-medium hover:bg-zinc-900 transition-all flex items-center gap-1.5"
            >
              <span>Dashboard</span>
              {currentRoom && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            {/* Dashboard Rooms Dropdown Menu */}
            {isDashboardOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-[#0c0f17] border border-zinc-800 rounded-2xl shadow-2xl p-3 flex flex-col gap-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-[#ff5a1f]" />
                    Project Rooms
                  </span>
                </div>

                {/* Quick Jump Input */}
                <form onSubmit={handleJoin} className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Switch room code..."
                    value={joinSlug}
                    onChange={(e) => setJoinSlug(e.target.value)}
                    className="w-full py-1.5 pl-8 pr-7 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[#ff5a1f] font-mono"
                  />
                  <button type="submit" className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-200">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Home & Recent Rooms */}
                <div className="flex flex-col gap-1 border-t border-zinc-900 pt-2">
                  <Link
                    href="/"
                    onClick={() => setIsDashboardOpen(false)}
                    className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 transition-colors"
                  >
                    <Home className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Home Workspace</span>
                  </Link>

                  {recentRooms.length > 0 && (
                    <div className="mt-1">
                      <span className="px-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        Recent Rooms
                      </span>
                      <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                        {recentRooms.map((room) => (
                          <button
                            key={room}
                            onClick={() => {
                              router.push(`/clip/${room}`);
                              setIsDashboardOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-mono flex items-center justify-between transition-colors ${currentRoom === room
                              ? 'bg-[#ff5a1f]/15 text-[#ff7a45] font-semibold border border-[#ff5a1f]/30'
                              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                              }`}
                          >
                            <span className="truncate">{room}</span>
                            {currentRoom === room && <span className="text-[10px] text-[#ff5a1f] font-sans">Active</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    handleCreateNew();
                    setIsDashboardOpen(false);
                  }}
                  className="w-full py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#ff5a1f]" />
                  <span>Create New Room</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
