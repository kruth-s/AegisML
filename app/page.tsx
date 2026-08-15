'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Toast, ToastMessage } from '@/components/Toast';
import {
  Clipboard,
  Zap,
  Smartphone,
  ShieldCheck,
  Share2,
  ArrowRight,
  Sparkles,
  Lock,
  Globe,
  Clock,
} from 'lucide-react';

export default function HomePage() {
  const [customRoom, setCustomRoom] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Read recent rooms from localStorage
    try {
      const saved = localStorage.getItem('clipbin_recent_rooms');
      if (saved) {
        setRecentRooms(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCreateRandom = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/clip', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.slug) {
        router.push(`/clip/${data.data.slug}`);
      }
    } catch (e) {
      const fallback = `clip-${Math.random().toString(36).substring(2, 8)}`;
      router.push(`/clip/${fallback}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoom.trim()) {
      addToast('Please enter a room name or code', 'error');
      return;
    }
    const clean = customRoom.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    router.push(`/clip/${clean}`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto pt-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instant Cross-Device Sync • Vercel Ready</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Your Online Clipboard,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-300">
              Synced Everywhere
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Paste text on your laptop, access it on your phone instantly. No logins, no auth, zero friction. Scan QR code or visit your room code from any browser.
          </p>

          {/* Quick Action Box */}
          <div className="w-full max-w-xl glass-card p-4 sm:p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-4 mt-2">
            <form onSubmit={handleOpenCustom} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter custom room name (e.g. my-desk)..."
                  value={customRoom}
                  onChange={(e) => setCustomRoom(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl glass-input text-sm focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <span>Go to Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Need a fast temporary room?</span>
              <button
                onClick={handleCreateRandom}
                disabled={isGenerating}
                className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Creating...' : 'Create Random Short Code'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Rooms if available */}
        {recentRooms.length > 0 && (
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recently Visited Clipboard Rooms</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentRooms.slice(0, 6).map((slug) => (
                <button
                  key={slug}
                  onClick={() => router.push(`/clip/${slug}`)}
                  className="px-3 py-1.5 rounded-xl glass-card hover:bg-slate-800/80 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2 transition-all hover:scale-105"
                >
                  <Clipboard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{slug}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800/80 flex flex-col gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Cross-Device Realtime Sync</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Edit text on one device and watch it sync automatically to any other browser connected to your room.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800/80 flex flex-col gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 w-fit">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Instant QR Code Pairing</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Open the QR modal on your PC screen and scan it with your phone's camera to pair immediately without typing URLs.
            </p>
          </div>

          <div className="glass-card glass-card-hover p-6 rounded-3xl border border-slate-800/80 flex flex-col gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Vercel & Serverless Ready</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Designed for zero-latency serverless execution on Vercel with optional Redis key-value storage.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          ClipBin.live — Fast, frictionless online clipboard for multi-device workflows.
        </div>
      </footer>

      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
