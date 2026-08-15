'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clipboard, QrCode, Plus, ArrowRight, Zap, RefreshCw } from 'lucide-react';

interface NavbarProps {
  currentRoom?: string;
  onOpenQR?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoom, onOpenQR, isSyncing }) => {
  const [joinSlug, setJoinSlug] = useState('');
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinSlug.trim()) return;
    const clean = joinSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    router.push(`/clip/${clean}`);
    setJoinSlug('');
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Clipboard className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
              ClipBin<span className="text-indigo-400">.live</span>
            </span>
            <span className="text-[10px] font-medium text-slate-400 -mt-1 tracking-wider uppercase">
              Cross-Device Clipboard
            </span>
          </div>
        </Link>

        {/* Quick Room Join Bar */}
        <form onSubmit={handleJoin} className="hidden md:flex items-center relative max-w-xs w-full">
          <input
            type="text"
            placeholder="Join room code or name..."
            value={joinSlug}
            onChange={(e) => setJoinSlug(e.target.value)}
            className="w-full py-1.5 pl-3 pr-8 rounded-lg glass-input text-xs placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            className="absolute right-1 p-1 text-slate-400 hover:text-indigo-400 transition-colors"
            title="Join Room"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isSyncing !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-400">
              <RefreshCw className={`w-3 h-3 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Live Sync'}</span>
            </div>
          )}

          {currentRoom && onOpenQR && (
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold transition-all hover:scale-105"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Pair Mobile</span>
            </button>
          )}

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>New Room</span>
          </button>

          {/* Vercel Badge */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[10px] text-emerald-400 font-mono">
            <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
            Vercel Ready
          </div>
        </div>
      </div>
    </header>
  );
};
