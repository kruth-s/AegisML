'use client';

import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, KeyRound, Lock, Terminal, ArrowRight, X, AlertTriangle } from 'lucide-react';

interface PrivateRoomChallengeModalProps {
  isOpen: boolean;
  slug: string;
  options: string[]; // 6 shuffled phrases
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export function PrivateRoomChallengeModal({
  isOpen,
  slug,
  options,
  onClose,
  onSuccess,
}: PrivateRoomChallengeModalProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShake, setIsShake] = useState(false);
  const [showCtfClue, setShowCtfClue] = useState(false);

  if (!isOpen) return null;

  const toggleWord = (word: string) => {
    setErrorMessage(null);
    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter((w) => w !== word));
    } else {
      if (selectedWords.length >= 3) {
        // If already selected 3, replace the first one or alert
        setSelectedWords([...selectedWords.slice(1), word]);
      } else {
        setSelectedWords([...selectedWords, word]);
      }
    }
  };

  const handleVerify = async () => {
    if (selectedWords.length !== 3) {
      setErrorMessage('Please select exactly 3 phrases to verify.');
      triggerShake();
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/clip/${encodeURIComponent(slug)}/private`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          words: selectedWords,
        }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        // Save in sessionStorage as backup for the session
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`vault_token_${slug}`, data.token);
        }
        onSuccess(data.token);
      } else {
        setErrorMessage(data.error || 'Incorrect phrases. Access denied.');
        triggerShake();
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Verification failed. Please try again.');
      triggerShake();
    } finally {
      setIsVerifying(false);
    }
  };

  const triggerShake = () => {
    setIsShake(true);
    setTimeout(() => setIsShake(false), 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-lg bg-[#0d0d11] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] text-zinc-100 transition-all ${
          isShake ? 'animate-bounce' : ''
        }`}
        style={{
          boxShadow: '0 0 40px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                Private Vault Auth
              </span>
              <span className="text-xs font-mono text-zinc-500">/{slug}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
              Select 3 Secret Phrases
            </h2>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          This room is protected by an Anime Cryptographic Vault. Choose the 3 correct character
          names (all from the <strong className="text-amber-400">same anime series</strong>) to decrypt and enter.
        </p>

        {/* Selected Phrases Pills */}
        <div className="mb-5 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider mr-1">
              Selected ({selectedWords.length}/3):
            </span>
            {selectedWords.length === 0 ? (
              <span className="text-xs text-zinc-600 italic">No phrases chosen yet</span>
            ) : (
              selectedWords.map((word) => (
                <span
                  key={word}
                  onClick={() => toggleWord(word)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-medium cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 transition-colors"
                >
                  {word}
                  <X className="w-3 h-3" />
                </span>
              ))
            )}
          </div>
          {selectedWords.length > 0 && (
            <button
              onClick={() => setSelectedWords([])}
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 underline ml-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* 6 Random Phrases Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          {options.map((phrase) => {
            const isSelected = selectedWords.includes(phrase);
            return (
              <button
                key={phrase}
                type="button"
                onClick={() => toggleWord(phrase)}
                className={`py-3 px-3.5 rounded-2xl text-center font-mono text-sm sm:text-base font-semibold tracking-wide transition-all border ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'bg-zinc-900/60 hover:bg-zinc-800/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                {phrase}
              </button>
            );
          })}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying || selectedWords.length !== 3}
            className={`flex-1 py-3 px-5 rounded-2xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
              selectedWords.length === 3
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 cursor-pointer hover:scale-[1.02]'
                : 'bg-zinc-800/50 text-zinc-500 border border-zinc-800 cursor-not-allowed'
            }`}
          >
            {isVerifying ? (
              <span>Verifying phrases...</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Verify & Unlock Room</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Hacker / CTF Hint Accordion */}
        <div className="mt-5 pt-4 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => setShowCtfClue(!showCtfClue)}
            className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-amber-400/90 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showCtfClue ? 'Hide CTF Hacker Clue' : 'Hint: Think like a Hacker (CTF)'}</span>
          </button>

          {showCtfClue && (
            <div className="mt-2.5 p-3 rounded-xl bg-black/60 border border-zinc-800 font-mono text-[11px] text-zinc-400 space-y-1">
              <p className="text-amber-400/90 font-semibold">🔍 CTF Reconnaissance Hint:</p>
              <p>
                The 3 secret phrases are embedded into the page landing DOM and DevTools Console.
              </p>
              <p className="text-zinc-500">
                Check DevTools elements: <code className="text-zinc-300">#vault-ctf-node</code> or inspect attributes <code className="text-zinc-300">data-vault-word-*</code>!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
