'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Toast, ToastMessage } from '@/components/Toast';
import { Navbar } from '@/components/Navbar';
import {
  Zap,
  ArrowRight,
} from 'lucide-react';

// Dynamic import with SSR disabled for Three.js Canvas
const GlobeScene = dynamic(() => import('@/components/Globe'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-56 h-56 rounded-full border border-zinc-800 bg-zinc-950/40 animate-pulse flex items-center justify-center">
        <span className="text-xs font-mono text-zinc-600">Loading 3D Globe...</span>
      </div>
    </div>
  ),
});

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
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col justify-between bg-[#111111] text-zinc-100 font-sans selection:bg-[#ff5a1f]/30 selection:text-[#ff5a1f]">
      <Navbar />

      {/* Cloudflare-style Globe Hero Section */}
      <section className="relative flex-1 min-h-[calc(100vh-80px)] w-full max-w-[100vw] overflow-hidden flex flex-col items-center justify-start pt-2 sm:pt-4 px-4 sm:px-6">
        {/* Subtle background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] h-[350px] bg-[#ff5a1f]/10 blur-[140px] rounded-full pointer-events-none -z-10" />

        <div className="relative z-30 pointer-events-none mx-auto flex max-w-6xl flex-col items-center text-center px-2">
          {/* Small brand statement */}
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.45em] text-neutral-500 sm:text-xs"
            style={{fontFamily: 'var(--font-display), sans-serif' }}
          >
            In The Night
          </div>

          {/* Main headline */}
          <h1 className="font-black uppercase leading-[0.88] tracking-[-0.035em] max-w-full" style={{ fontFamily: 'var(--font-display), sans-serif' }}>
            <span className="block text-[clamp(2.5rem,8.5vw,7.5rem)] text-white">
              DROP
            </span>

            <span className="relative z-10 block text-[clamp(2.8rem,9.5vw,8.5rem)] text-[#ff5a1f]">
              THE
            </span>

            <span className="relative z-20 block text-[clamp(2.3rem,9.6vw,9.5rem)] text-white">
              UNIVERSE
            </span>
          </h1>

          {/* Small supporting line */}
          <p className="mt-4 sm:mt-7 max-w-md text-xs leading-5 text-neutral-500 sm:text-base">
            One room. Every device.
            <span className="text-neutral-300"> Everything in sync.</span>
          </p>
        </div>

        {/* 3D Dotted Rotating & Draggable Globe Canvas */}
        <div className="absolute left-1/2 top-[125px] sm:top-[95px] h-[340px] w-[340px] sm:h-[500px] sm:w-[500px] lg:h-[580px] lg:w-[580px] -translate-x-1/2 pointer-events-auto z-10 max-w-[95vw] overflow-hidden">
          <GlobeScene />
        </div>

        {/* Action Form Card */}
        <div className="relative sm:absolute sm:right-6 sm:bottom-8 w-full sm:w-[32rem] max-w-[95vw] sm:max-w-[90vw] mx-auto z-20 bg-zinc-900/95 border border-zinc-800 hover:border-zinc-700 rounded-3xl sm:rounded-[2rem] p-2.5 sm:p-2 shadow-2xl backdrop-blur-xl mt-auto mb-6 sm:mb-0 transition-all">
          <form onSubmit={handleOpenCustom} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full">
            <input
              type="text"
              placeholder="Enter room name"
              value={customRoom}
              onChange={(e) => setCustomRoom(e.target.value)}
              className="flex-1 px-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-base sm:text-lg font-medium tracking-[0.02em] focus:outline-none focus:border-[#ff5a1f]/70 transition-colors"
              style={{ fontFamily: 'var(--font-display), sans-serif' }}
            />

            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-base sm:text-lg font-semibold tracking-[0.02em] transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-[#ff5a1f]/20 hover:scale-[1.02]"
              style={{ fontFamily: 'var(--font-display), sans-serif' }}
            >
              <span>Open room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
