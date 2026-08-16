'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Toast, ToastMessage } from '@/components/Toast';
import {
  Clipboard,
  Zap,
  Smartphone,
  ArrowRight,
  Globe,
  Clock,
  Code2,
  Terminal,
  ChevronRight,
  ClipboardPaste,
} from 'lucide-react';

export default function HomePage() {
  const [customRoom, setCustomRoom] = useState('');
  const [quickText, setQuickText] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [recentRooms, setRecentRooms] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
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
        if (quickText.trim()) {
          try {
            await fetch(`/api/clip/${data.data.slug}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content: quickText }),
            });
          } catch (err) {}
        }
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
      addToast('Please enter a project room name or code', 'error');
      return;
    }
    const clean = customRoom.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    router.push(`/clip/${clean}`);
  };

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setQuickText(text);
        addToast('Pasted from clipboard', 'success');
      }
    } catch (e) {
      addToast('Please press Ctrl+V to paste into workspace', 'info');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-12">
        {/* Minimal Hero Header - NO BADGES */}
        <div className="flex flex-col items-center text-center gap-4 max-w-2xl mx-auto pt-2">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Cross-Device <span className="text-zinc-400">Clipboard</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-md leading-relaxed">
            Instant real-time text and snippet sync across devices. Zero sign-ups, zero passwords.
          </p>
        </div>

        {/* Central Workspace Card */}
        <div className="w-full max-w-2xl mx-auto bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-zinc-950/90 border-b border-zinc-800/80 text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-300">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span className="font-medium">Quick Drop Workspace</span>
            </div>

            <button
              onClick={handleQuickPaste}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] flex items-center gap-1.5 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
              <span>Paste Clipboard</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 flex flex-col gap-3 bg-zinc-950/40">
            <textarea
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="Paste or type text here to drop immediately into a room..."
              className="w-full h-32 p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 font-mono text-xs sm:text-sm focus:outline-none focus:border-zinc-700 resize-none transition-colors"
            />

            <form onSubmit={handleOpenCustom} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter room name (e.g. dev-notes)..."
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder:text-zinc-500 text-xs font-mono focus:outline-none focus:border-zinc-700"
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>Open Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleCreateRandom}
                  disabled={isGenerating}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium flex items-center gap-1 transition-colors shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isGenerating ? 'Creating...' : 'Short Code'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Recent Rooms */}
        {recentRooms.length > 0 && (
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Recent Rooms</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentRooms.slice(0, 5).map((slug) => (
                <button
                  key={slug}
                  onClick={() => router.push(`/clip/${slug}`)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-2 transition-colors"
                >
                  <Clipboard className="w-3 h-3 text-indigo-400" />
                  <span>{slug}</span>
                  <ChevronRight className="w-3 h-3 text-zinc-600" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dark Feature Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full pt-2">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Realtime Sync</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Updates sync live across all connected windows and mobile screens.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-2">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-200">QR Camera Pair</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Scan desktop screen QR code with smartphone to pair instantly.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-2">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Auto Format</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Detects JSON, code, URLs, and plain text with live line metrics.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-5 text-center text-xs text-zinc-500 font-mono">
        ClipBin — Real-time cross-device clipboard engine
      </footer>

      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}

