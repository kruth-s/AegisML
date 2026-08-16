'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toast, ToastMessage } from '@/components/Toast';
import { Navbar } from '@/components/Navbar';
import {
  Zap,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const [customRoom, setCustomRoom] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

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
      addToast('Please enter a room name', 'error');
      return;
    }
    const clean = customRoom.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    router.push(`/clip/${clean}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center relative p-4 sm:p-6 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      {/* Main Centered Content */}
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-8 sm:gap-12">
        {/* Bold Centered Hero Header */}
        <div className="flex flex-col items-center text-center gap-3 sm:gap-4 max-w-3xl mx-auto">
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-none">
            Cross-Device <br />
            <span className="text-zinc-500 font-extrabold">Clipboard</span>
          </h1>

          <p className="text-sm sm:text-xl text-zinc-400 font-normal max-w-lg leading-relaxed">
            Enter a room name or generate a short code to start syncing text across all your devices in real-time.
          </p>
        </div>

        {/* Action Form Card */}
        <div className="w-full max-w-2xl sm:max-w-3xl bg-zinc-900/90 border border-zinc-800 rounded-3xl p-3.5 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
          <form onSubmit={handleOpenCustom} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Enter room name (e.g. my-desk)..."
              value={customRoom}
              onChange={(e) => setCustomRoom(e.target.value)}
              className="flex-1 px-5 sm:px-6 py-4 sm:py-4.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-base sm:text-lg font-mono focus:outline-none focus:border-zinc-600 transition-colors"
            />

            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                className="px-6 sm:px-7 py-4 sm:py-4.5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg"
              >
                <span>Open Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCreateRandom}
                disabled={isGenerating}
                className="px-5 sm:px-6 py-4 sm:py-4.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 text-sm sm:text-base font-semibold flex items-center justify-center gap-2 transition-colors shrink-0"
                title="Generate instant short code"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{isGenerating ? 'Creating...' : 'Short Code'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      <Toast toasts={toasts} onClose={removeToast} />
      </div>
    </div>
  );
}





