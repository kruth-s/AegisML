'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clipboard,
  QrCode,
  Plus,
  ArrowRight,
  ChevronDown,
  Clock,
  Home,
  FolderKanban,
  Search,
} from 'lucide-react';

interface NavbarProps {
  currentRoom?: string;
  onOpenQR?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoom, onOpenQR, isSyncing }) => {
  const [joinSlug, setJoinSlug] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Read recent rooms for dropdown
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clipbin_recent_rooms');
      if (saved) {
        setRecentRooms(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
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
    setIsDropdownOpen(false);
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
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand & Project Dropdown */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all text-left"
          >
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm">
              <Clipboard className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5">
              ClipBin
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono">
                {currentRoom ? currentRoom : 'main'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} />
            </span>
          </button>

          {/* Project & Room Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-3 flex flex-col gap-3 z-50">
              <div className="flex items-center justify-between px-1 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
                  Select Project Room
                </span>
              </div>

              {/* Room Search / Quick Jump */}
              <form onSubmit={handleJoin} className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Switch room code..."
                  value={joinSlug}
                  onChange={(e) => setJoinSlug(e.target.value)}
                  className="w-full py-1.5 pl-8 pr-7 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 font-mono"
                />
                <button type="submit" className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-200">
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Home & Recent Rooms */}
              <div className="flex flex-col gap-1 border-t border-zinc-900 pt-2">
                <Link
                  href="/"
                  onClick={() => setIsDropdownOpen(false)}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Main Workspace</span>
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
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left font-mono flex items-center justify-between transition-colors ${
                            currentRoom === room
                              ? 'bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20'
                              : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                          }`}
                        >
                          <span className="truncate">{room}</span>
                          {currentRoom === room && <span className="text-[10px] text-indigo-400 font-sans">Active</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <button
                onClick={() => {
                  handleCreateNew();
                  setIsDropdownOpen(false);
                }}
                className="w-full py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Create New Room</span>
              </button>
            </div>
          )}
        </div>

        {/* Minimal Right Actions */}
        <div className="flex items-center gap-2">
          {currentRoom && onOpenQR && (
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">QR Pair</span>
            </button>
          )}

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Room</span>
          </button>
        </div>
      </div>
    </header>
  );
};

