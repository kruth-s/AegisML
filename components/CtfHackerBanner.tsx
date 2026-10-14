'use client';

import React, { useEffect } from 'react';
import { Lock } from 'lucide-react';
import { decodeVaultCipher } from '@/lib/privateVault';

interface CtfHackerBannerProps {
  slug: string;
  isPrivate?: boolean;
  ctfCipher?: string;
  privateWords?: [string, string, string] | string[];
}

export function CtfHackerBanner({
  slug,
  isPrivate,
  ctfCipher,
  privateWords,
}: CtfHackerBannerProps) {
  // Derive words from prop or cipher
  const words =
    privateWords && privateWords.length === 3
      ? privateWords
      : ctfCipher
      ? decodeVaultCipher(ctfCipher)
      : [];

  useEffect(() => {
    if (!isPrivate || !ctfCipher) return;

    // Log stylized CTF puzzle message to DevTools console
    console.log(
      '%c=======================================================\n' +
        '  [THE-DROP] PRIVATE VAULT SECURITY GRID ACTIVE\n' +
        '=======================================================\n' +
        `• Target Room: /clip/${slug}\n` +
        `• Vault Cipher (Base64): ${ctfCipher}\n` +
        '• Clue Location: Inspect DOM node #vault-ctf-node attributes!\n' +
        '• Quick Terminal Hack: Run `window.__DROP_CTF__.decrypt()` in this console!\n' +
        '=======================================================',
      'color: #00ff66; background: #050508; font-family: monospace; font-size: 11px; padding: 4px; border: 1px solid #00ff66;'
    );

    // Expose CTF console helper
    if (typeof window !== 'undefined') {
      (window as any).__DROP_CTF__ = {
        room: slug,
        cipher: ctfCipher,
        decrypt: () => {
          console.log('%c🔓 Vault Key Phrases Decrypted:', 'color: #00e5ff; font-weight: bold;');
          console.table(words.map((w, idx) => ({ 'Key Index': idx + 1, 'Secret Phrase': w })));
          return words;
        },
        hint: () =>
          'Inspect the DOM elements for [data-vault-word-*] or inspect #vault-ctf-node.',
      };
    }
  }, [isPrivate, ctfCipher, slug, words]);

  if (!isPrivate) return null;

  return (
    <>
      {/* 1. HIDDEN IN DOM FOR HACKERS (CTF CHALLENGE DOM ELEMENT) */}
      <div
        id="vault-ctf-node"
        style={{ display: 'none' }}
        data-vault-status="active"
        data-vault-room={slug}
        data-vault-cipher={ctfCipher || ''}
        data-vault-word-1={words[0] || ''}
        data-vault-word-2={words[1] || ''}
        data-vault-word-3={words[2] || ''}
        data-ctf-flag={`FLAG{${words.join('_')}}`}
        data-ctf-hacker-message="Good catch, hacker! You found the hidden 3 words in the DOM tree."
        aria-hidden="true"
      />

      {/* 2. SLEEK LOCK + VAULT BADGE (HOVER ONLY TOOLTIP, NO MODAL ON CLICK) */}
      <div className="relative group inline-flex items-center">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono select-none cursor-default shadow-sm shadow-emerald-500/10 transition-colors group-hover:bg-emerald-500/15">
          <Lock className="w-3.5 h-3.5" />
          <span className="font-semibold tracking-wide">Vault</span>
        </div>

        {/* Hover Tooltip */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 hidden group-hover:flex items-center px-2.5 py-1 rounded-lg bg-zinc-900 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 whitespace-nowrap shadow-xl pointer-events-none z-50 animate-fade-in">
          Private Vault Room
        </div>
      </div>
    </>
  );
}
