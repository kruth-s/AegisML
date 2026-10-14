'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Toast, ToastMessage } from '@/components/Toast';
import { Navbar } from '@/components/Navbar';
import { PrivateRoomChallengeModal } from '@/components/PrivateRoomChallengeModal';
import { PrivateRoomCreationModal } from '@/components/PrivateRoomCreationModal';
import {
  Zap,
  ArrowRight,
  Lock,
  ShieldAlert,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  X,
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
  const [privateRoom, setPrivateRoom] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoadingNormal, setIsLoadingNormal] = useState(false);
  const [isLoadingPrivate, setIsLoadingPrivate] = useState(false);

  // Private challenge state (for existing private rooms)
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeSlug, setChallengeSlug] = useState('');
  const [challengeOptions, setChallengeOptions] = useState<string[]>([]);

  // Private creation state (for newly created or upgraded rooms)
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');
  const [createdWords, setCreatedWords] = useState<string[]>([]);
  const [isUpgradedRoom, setIsUpgradedRoom] = useState(false);

  // Privacy notice modal (when private room is typed in the normal box)
  const [showPrivacyWarningModal, setShowPrivacyWarningModal] = useState(false);
  const [privacyWarningRoom, setPrivacyWarningRoom] = useState('');
  const [privacyWarningOptions, setPrivacyWarningOptions] = useState<string[]>([]);

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

  // NORMAL ROOM SUBMISSION (with Private Room Check)
  const handleOpenCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoom.trim()) {
      addToast('Please enter a room name', 'error');
      return;
    }
    const clean = customRoom.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setIsLoadingNormal(true);

    try {
      const res = await fetch(`/api/clip/${clean}/private`);
      const data = await res.json();

      // If this room is marked private, show requested privacy alert
      if (data.success && data.isPrivate) {
        setPrivacyWarningRoom(clean);
        setPrivacyWarningOptions(data.options || []);
        setShowPrivacyWarningModal(true);
        return;
      }

      // Otherwise it's a regular room -> enter directly
      router.push(`/clip/${clean}`);
    } catch (e) {
      router.push(`/clip/${clean}`);
    } finally {
      setIsLoadingNormal(false);
    }
  };

  // PRIVATE ROOM SUBMISSION (Create or Unlock)
  const handleOpenPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateRoom.trim()) {
      addToast('Please enter a private room name', 'error');
      return;
    }
    const clean = privateRoom.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    setIsLoadingPrivate(true);

    try {
      // 1. Check if room exists and is already private
      const checkRes = await fetch(`/api/clip/${clean}/private`);
      const checkData = await checkRes.json();

      if (checkData.success && checkData.isPrivate) {
        // Room already exists as private -> prompt for the 3 secret phrases!
        setChallengeSlug(clean);
        setChallengeOptions(checkData.options || []);
        setShowChallengeModal(true);
        return;
      }

      // 2. Either doesn't exist or exists as a normal room -> create or upgrade to private!
      const createRes = await fetch(`/api/clip/${clean}/private`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_or_upgrade' }),
      });
      const createData = await createRes.json();

      if (createData.success && createData.words) {
        if (createData.token && typeof window !== 'undefined') {
          sessionStorage.setItem(`vault_token_${clean}`, createData.token);
        }
        setCreatedSlug(clean);
        setCreatedWords(createData.words);
        setIsUpgradedRoom(Boolean(createData.upgraded));
        setShowCreationModal(true);
      } else {
        addToast(createData.error || 'Failed to initialize private room', 'error');
      }
    } catch (e: any) {
      addToast('Error setting up private room', 'error');
    } finally {
      setIsLoadingPrivate(false);
    }
  };

  // Challenge succeeded -> navigate to room
  const handleChallengeSuccess = (token: string) => {
    setShowChallengeModal(false);
    router.push(`/clip/${challengeSlug}`);
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col justify-between bg-[#111111] text-zinc-100 font-sans selection:bg-[#ff5a1f]/30 selection:text-[#ff5a1f]">
      <Navbar />

      {/* Cloudflare-style Globe Hero Section */}
      <section className="relative flex-1 min-h-[calc(100dvh-56px)] sm:min-h-[calc(100vh-80px)] w-full max-w-[100vw] overflow-hidden flex flex-col items-center justify-start pt-1 sm:pt-4 pb-6 sm:pb-8 px-3 sm:px-6">
        {/* Subtle background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] h-[350px] bg-[#ff5a1f]/10 blur-[140px] rounded-full pointer-events-none -z-10" />

        {/* Hero Content Wrapper containing Headline + 3D Globe */}
        <div className="relative w-full max-w-6xl h-[440px] sm:h-auto flex flex-col items-center text-center px-2 pt-1 sm:pt-2">
          {/* Small brand statement */}
          <div
            className="mb-1 sm:mb-2 text-[10px] font-semibold uppercase tracking-[0.45em] text-neutral-500 sm:text-xs"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            In The Night
          </div>

          {/* Main headline */}
          <h1
            className="relative z-30 font-black uppercase leading-[0.88] tracking-[-0.035em] max-w-full pointer-events-none"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            <span className="block text-[clamp(3.1rem,11.5vw,7.5rem)] text-white">DROP</span>

            <span className="relative z-10 block text-[clamp(3.4rem,12.5vw,8.5rem)] text-[#ff5a1f]">
              THE
            </span>

            <span className="relative z-20 block text-[clamp(2.6rem,10.2vw,9.5rem)] text-white">
              UNIVERSE
            </span>
          </h1>

          {/* Small supporting line */}
          <p className="relative z-30 pointer-events-none mt-2 sm:mt-7 max-w-md text-xs leading-snug sm:leading-5 text-neutral-500 sm:text-base">
            One room. Every device.
            <span className="text-neutral-300"> Everything in sync.</span>
          </p>

          {/* 3D Dotted Rotating & Draggable Globe Canvas */}
          <div className="absolute left-1/2 top-[65px] sm:top-[95px] h-[375px] w-[375px] sm:h-[500px] sm:w-[500px] lg:h-[580px] lg:w-[580px] -translate-x-1/2 pointer-events-auto z-10 max-w-[98vw] overflow-hidden">
            <GlobeScene />
          </div>
        </div>

        {/* =========================================================================
            BOTTOM ACTION CARDS: LEFT (PRIVATE ROOM) & RIGHT (NORMAL ROOM)
            ========================================================================= */}
        <div className="w-full max-w-6xl flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 mt-6 sm:mt-auto sm:mb-2 z-30 pointer-events-none">
          {/* 1. NEW BOX: LEFT BOTTOM - OPEN PRIVATE ROOM */}
          <div className="pointer-events-auto w-full sm:w-[26rem] lg:w-[29rem] bg-zinc-900/95 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl sm:rounded-[2rem] p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl transition-all shadow-[0_10px_35px_rgba(16,185,129,0.08)]">
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-display), sans-serif' }}
                >
                  Open Private room
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
                3-Phrase CTF Lock
              </span>
            </div>

            <form
              onSubmit={handleOpenPrivate}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full"
            >
              <input
                type="text"
                placeholder="Private room name"
                value={privateRoom}
                onChange={(e) => setPrivateRoom(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-sm font-medium tracking-[0.02em] focus:outline-none focus:border-emerald-500/70 transition-colors"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              />

              <button
                type="submit"
                disabled={isLoadingPrivate}
                className="px-4 py-2.5 rounded-xl sm:rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs sm:text-sm font-bold tracking-[0.02em] transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] cursor-pointer"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isLoadingPrivate ? 'Opening...' : 'Open Private room'}</span>
              </button>
            </form>
          </div>

          {/* 2. EXISTING BOX: RIGHT BOTTOM - NORMAL ROOM */}
          <div className="pointer-events-auto w-full sm:w-[26rem] lg:w-[29rem] bg-zinc-900/95 border border-zinc-800 hover:border-zinc-700 rounded-2xl sm:rounded-[2rem] p-2.5 sm:p-3 shadow-2xl backdrop-blur-xl transition-all">
            <div className="flex items-center justify-between px-2 pt-1 pb-2">
              <span
                className="text-xs font-semibold uppercase tracking-wider text-neutral-400"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                Standard Room
              </span>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
                Instant Access
              </span>
            </div>

            <form
              onSubmit={handleOpenCustom}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full"
            >
              <input
                type="text"
                placeholder="Enter room name"
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-sm font-medium tracking-[0.02em] focus:outline-none focus:border-[#ff5a1f]/70 transition-colors"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              />

              <button
                type="submit"
                disabled={isLoadingNormal}
                className="px-4 py-2.5 rounded-xl sm:rounded-2xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs sm:text-sm font-semibold tracking-[0.02em] transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-[#ff5a1f]/20 hover:scale-[1.02] cursor-pointer"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                <span>{isLoadingNormal ? 'Checking...' : 'Open room'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MODALS & ALERTS
          ========================================================================= */}

      {/* 1. Privacy Warning Modal (when a private room is entered in standard room box) */}
      {showPrivacyWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0e0e13] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-zinc-100">
            <button
              onClick={() => setShowPrivacyWarningModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2">Privacy Lock Detected</h3>

            <p className="text-sm text-zinc-300 leading-relaxed mb-6">
              This is a <strong className="text-amber-400">Private Room</strong>. Please use the{' '}
              <strong className="text-emerald-400">Open Private Room</strong> option and ensure you
              have the <strong className="text-white">3 Secret Phrases</strong> ready to access
              content.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setShowPrivacyWarningModal(false);
                  setChallengeSlug(privacyWarningRoom);
                  setChallengeOptions(privacyWarningOptions);
                  setShowChallengeModal(true);
                }}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Enter 3 Secret Phrases Now</span>
              </button>

              <button
                onClick={() => setShowPrivacyWarningModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Challenge Modal (choose 3 correct phrases out of 6) */}
      <PrivateRoomChallengeModal
        isOpen={showChallengeModal}
        slug={challengeSlug}
        options={challengeOptions}
        onClose={() => setShowChallengeModal(false)}
        onSuccess={handleChallengeSuccess}
      />

      {/* 3. Creation / Upgrade Modal (shows the 3 secret phrases & CTF easter egg info) */}
      <PrivateRoomCreationModal
        isOpen={showCreationModal}
        slug={createdSlug}
        words={createdWords}
        isUpgraded={isUpgradedRoom}
        onClose={() => setShowCreationModal(false)}
        onEnter={() => {
          setShowCreationModal(false);
          router.push(`/clip/${createdSlug}`);
        }}
      />

      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
