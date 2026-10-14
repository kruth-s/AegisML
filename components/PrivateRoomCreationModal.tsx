'use client';

import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Terminal, ArrowRight, Sparkles, X } from 'lucide-react';

interface PrivateRoomCreationModalProps {
  isOpen: boolean;
  slug: string;
  words: [string, string, string] | string[];
  isUpgraded?: boolean;
  onClose: () => void;
  onEnter: () => void;
}

export function PrivateRoomCreationModal({
  isOpen,
  slug,
  words,
  isUpgraded,
  onClose,
  onEnter,
}: PrivateRoomCreationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const phraseString = words.join(' · ');

  const handleCopy = () => {
    navigator.clipboard.writeText(words.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#0c0d12] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] text-zinc-100"
        style={{
          boxShadow: '0 0 45px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {isUpgraded ? 'Room Upgraded to Private' : 'Private Vault Created'}
              </span>
              <span className="text-xs font-mono text-zinc-500">/{slug}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
              Your 3 Secret Key Phrases
            </h2>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          {isUpgraded
            ? 'All existing clips, snippets, and files in this room have been preserved and shielded with Private Vault security.'
            : 'Your private room has been initialized. Anyone accessing this room will need to pick these 3 secret phrases.'}
        </p>

        {/* The 3 Secret Words Display */}
        <div className="mb-6 p-4 rounded-2xl bg-zinc-950/80 border border-emerald-500/30 shadow-inner">
          <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-400/80 mb-3 flex items-center justify-between">
            <span>Room Key Characters:</span>
            <span className="text-zinc-500">Same Anime Series · 4-6 letters</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {words.map((word, idx) => (
              <div
                key={word}
                className="py-3 px-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center text-emerald-300 font-mono text-base sm:text-lg font-bold tracking-wider shadow-sm"
              >
                <div className="text-[9px] text-emerald-500/60 uppercase font-sans mb-0.5">
                  Word {idx + 1}
                </div>
                {word}
              </div>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-mono font-medium flex items-center justify-center gap-2 border border-zinc-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Copied Phrases to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy 3 Key Phrases ({phraseString})</span>
              </>
            )}
          </button>
        </div>

        {/* CTF Hacker Note */}
        <div className="mb-6 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs font-mono text-zinc-400 flex items-start gap-3">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-zinc-200 font-semibold">CTF Hacker Easter Egg:</span>
            <p className="text-[11px] text-zinc-400 leading-normal">
              These 3 words are also hidden right inside the room landing page like a Capture The Flag
              puzzle. You or your peers can inspect the DOM or console to uncover them anytime!
            </p>
          </div>
        </div>

        {/* Enter Room Button */}
        <button
          onClick={onEnter}
          className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 hover:scale-[1.02]"
        >
          <span>Enter Private Room Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
