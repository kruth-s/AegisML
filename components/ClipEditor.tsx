'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Copy,
  Check,
  ClipboardPaste,
  Trash2,
  Share2,
  Code,
  FileText,
  Sparkles,
  Link as LinkIcon,
  Eye,
  KeyRound,
  FileCode2,
  ExternalLink,
  Flame,
  Clock,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  detectContent,
  formatJsonText,
  SupportedLanguage,
  CodeDetectionResult,
} from '@/lib/codeDetector';
import { CodeViewer } from './CodeViewer';
import { EnvInspector } from './EnvInspector';
import { LinkPreviewCard } from './LinkPreviewCard';

export interface RemoteTypist {
  name: string;
  color: string;
}

interface ClipEditorProps {
  slug: string;
  initialContent: string;
  onSave: (content: string) => void;
  isSaving: boolean;
  lastUpdated?: string;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onOpenQR: () => void;
  remoteTypingUser?: RemoteTypist | null;
  // Ephemeral Self-Destruct / Burn Controls
  burnMode?: 'burn_on_copy' | 'timer' | null;
  burnExpiresAt?: number | null;
  burnAuthorDeviceId?: string;
  currentDeviceId?: string;
  isBurned?: boolean;
  onSetBurnMode?: (mode: 'burn_on_copy' | 'timer' | null, seconds?: number) => void;
  onTriggerBurn?: () => void;
  // Multi-Clip Stack Auto-Push
  onPushToStack?: (text: string) => void;
}

export const ClipEditor: React.FC<ClipEditorProps> = ({
  slug,
  initialContent,
  onSave,
  isSaving,
  lastUpdated,
  onShowToast,
  onOpenQR,
  remoteTypingUser,
  burnMode,
  burnExpiresAt,
  burnAuthorDeviceId,
  currentDeviceId,
  isBurned = false,
  onSetBurnMode,
  onTriggerBurn,
  onPushToStack,
}) => {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [overrideLang, setOverrideLang] = useState<SupportedLanguage | null>(null);
  const [isBurnMenuOpen, setIsBurnMenuOpen] = useState(false);
  const [isShredding, setIsShredding] = useState(false);
  const [countdownStr, setCountdownStr] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastLocalTypingTimeRef = useRef<number>(0);
  const burnMenuRef = useRef<HTMLDivElement>(null);

  // Sync internal state when server content changes externally
  useEffect(() => {
    if (initialContent !== content) {
      const isActivelyTypingLocally = Date.now() - lastLocalTypingTimeRef.current < 350;
      if (!isActivelyTypingLocally) {
        setContent(initialContent);
      }
    }
  }, [initialContent]);

  // Close burn menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (burnMenuRef.current && !burnMenuRef.current.contains(e.target as Node)) {
        setIsBurnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ticking countdown timer when burnMode === 'timer'
  useEffect(() => {
    if (burnMode !== 'timer' || !burnExpiresAt) {
      setCountdownStr('');
      return;
    }

    const updateTimer = () => {
      const remainingSec = Math.max(0, Math.floor((burnExpiresAt - Date.now()) / 1000));
      if (remainingSec <= 0) {
        setCountdownStr('00:00');
        if (content && onTriggerBurn) {
          triggerShredAnimation();
          onTriggerBurn();
        }
      } else {
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        setCountdownStr(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [burnMode, burnExpiresAt, content, onTriggerBurn]);

  // Digital paper shredder animation trigger
  const triggerShredAnimation = () => {
    setIsShredding(true);
    setTimeout(() => {
      setIsShredding(false);
      setContent('');
    }, 1100);
  };

  // Content intelligence: auto-detect language & payload kind
  const detection: CodeDetectionResult = useMemo(() => {
    return detectContent(content);
  }, [content]);

  // Current active language (auto-detected or manually chosen)
  const currentLanguage: SupportedLanguage = overrideLang || detection.language;

  // Handle typing & auto-save trigger
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    lastLocalTypingTimeRef.current = Date.now();
    setContent(val);
    onSave(val);
  };

  // Handle manual paste event to auto-stash previous text to stack
  const handlePasteEvent = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && content && content.trim() && content.trim() !== pastedText.trim()) {
      onPushToStack?.(content.trim());
      onShowToast('Previous clip pushed to History Stack (#1)', 'info');
    }
  };

  // Prettify / Format content
  const handleFormat = () => {
    if (detection.kind === 'json') {
      const { formatted, success } = formatJsonText(content);
      if (success) {
        setContent(formatted);
        onSave(formatted);
        onShowToast('JSON formatted cleanly', 'success');
      } else {
        onShowToast('Invalid JSON structure', 'error');
      }
    } else if (detection.kind === 'env') {
      const lines = content.split('\n');
      const comments = lines.filter((l) => l.trim().startsWith('#'));
      const vars = lines.filter((l) => l.trim() && !l.trim().startsWith('#')).sort();
      const cleaned = [...comments, ...(comments.length > 0 && vars.length > 0 ? [''] : []), ...vars].join('\n');
      setContent(cleaned);
      onSave(cleaned);
      onShowToast('.env variables sorted A-Z', 'success');
    }
  };

  // Copy All to Browser Clipboard (triggers Burn-on-Copy if armed)
  const handleCopyAll = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onShowToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);

      // Trigger Burn-on-Copy self-destruct if armed
      if (burnMode === 'burn_on_copy') {
        triggerShredAnimation();
        onTriggerBurn?.();
        onShowToast('🔥 Content burned & erased from room!', 'info');
      }
    } catch (err) {
      onShowToast('Failed to copy text', 'error');
    }
  };

  // Paste directly from Browser Clipboard with auto-stacking
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (content && content.trim() && content.trim() !== text.trim()) {
          onPushToStack?.(content.trim());
          onShowToast('Previous clip pushed to History Stack (#1)', 'info');
        }
        setContent(text);
        onSave(text);
        onShowToast('Pasted from clipboard!', 'success');
      } else {
        onShowToast('Clipboard is empty', 'info');
      }
    } catch (err) {
      onShowToast('Please allow clipboard access or use Ctrl+V to paste', 'info');
    }
  };

  // Clear text
  const handleClear = () => {
    if (!content) return;
    onPushToStack?.(content);
    setContent('');
    onSave('');
    onShowToast('Clipboard cleared', 'info');
  };

  // Stats
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content ? content.split('\n').length : 1;

  const isRichPreviewAvailable =
    content.trim().length > 0 &&
    (detection.kind === 'env' ||
      detection.kind === 'code' ||
      detection.kind === 'json' ||
      detection.kind === 'url' ||
      (detection.urls && detection.urls.length > 0) ||
      detection.kind === 'markdown');

  const isBurnArmed = burnMode === 'burn_on_copy' || burnMode === 'timer';

  return (
    <div
      className={`w-full flex flex-col bg-zinc-900/90 rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all ${
        isBurnArmed
          ? 'border-rose-500/50 shadow-rose-500/10'
          : 'border-zinc-800'
      }`}
    >
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 sm:px-5 py-3 sm:py-3.5 bg-zinc-950/90 border-b border-zinc-800/80">
        {/* Left Status & Type Indicator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wide">
              {slug}
            </span>
          </div>

          {/* Remote Device Live Typing Badge */}
          {remoteTypingUser && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold animate-pulse border shadow-md"
              style={{
                backgroundColor: `${remoteTypingUser.color}20`,
                borderColor: `${remoteTypingUser.color}90`,
                color: remoteTypingUser.color,
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: remoteTypingUser.color }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: remoteTypingUser.color }}
                />
              </span>
              <span>{remoteTypingUser.name} typing live...</span>
            </div>
          )}

          {/* Detected Format Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            {detection.kind === 'url' && <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />}
            {detection.kind === 'json' && <Code className="w-3.5 h-3.5 text-emerald-400" />}
            {detection.kind === 'code' && <Code className="w-3.5 h-3.5 text-indigo-400" />}
            {detection.kind === 'env' && <KeyRound className="w-3.5 h-3.5 text-amber-400" />}
            {detection.kind === 'markdown' && <FileCode2 className="w-3.5 h-3.5 text-purple-400" />}
            {detection.kind === 'text' && <FileText className="w-3.5 h-3.5 text-zinc-400" />}

            <span className="font-semibold text-zinc-200 uppercase">
              {detection.displayName}
            </span>

            {detection.kind === 'env' && detection.secretCount ? (
              <span className="text-[10px] text-rose-400 font-bold ml-0.5">
                • {detection.secretCount} secrets
              </span>
            ) : null}
          </div>

          {/* Mode Switcher Tabs */}
          {isRichPreviewAvailable && (
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 ml-1">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'edit'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Raw Text
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'preview'
                    ? 'bg-[#ff5a1f] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-[#ff5a1f]'
                }`}
              >
                {detection.kind === 'url' ? (
                  <>
                    <ExternalLink className="w-3 h-3" />
                    <span>Smart Card Preview</span>
                  </>
                ) : detection.kind === 'env' ? (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>.env View</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Syntax Preview</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Format Button if JSON or ENV */}
          {(detection.kind === 'json' || detection.kind === 'env') && (
            <button
              onClick={handleFormat}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-amber-300 border border-zinc-700/80 text-xs font-medium transition-colors"
              title={detection.kind === 'json' ? 'Prettify JSON' : 'Sort .env keys'}
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">
                {detection.kind === 'json' ? 'Prettify JSON' : 'Sort A-Z'}
              </span>
            </button>
          )}

          {/* Ephemeral Mode Dropdown (Burn-on-Copy / Self-Destruct Timer) */}
          <div className="relative" ref={burnMenuRef}>
            <button
              type="button"
              onClick={() => setIsBurnMenuOpen(!isBurnMenuOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                burnMode === 'burn_on_copy'
                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-400 shadow-sm shadow-rose-500/20'
                  : burnMode === 'timer'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-400'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
              title="Configure self-destruct or burn-on-copy protection"
            >
              {burnMode === 'burn_on_copy' ? (
                <>
                  <Flame className="w-3.5 h-3.5 fill-current animate-pulse text-rose-400" />
                  <span>Burn on Copy</span>
                </>
              ) : burnMode === 'timer' ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono">{countdownStr || 'Timer'}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>🛡️ Ephemeral</span>
                </>
              )}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Burn Mode Selector Popover */}
            {isBurnMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-900">
                  Self-Destruct Modes
                </div>

                <button
                  onClick={() => {
                    onSetBurnMode?.(null);
                    setIsBurnMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                    !burnMode ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span>Off (Persistent Sync)</span>
                  {!burnMode && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                <button
                  onClick={() => {
                    onSetBurnMode?.('burn_on_copy');
                    setIsBurnMenuOpen(false);
                    onShowToast('🔥 Burn After 1 Copy armed!', 'success');
                  }}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors text-left ${
                    burnMode === 'burn_on_copy'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Burn After 1 Copy</span>
                  </span>
                  {burnMode === 'burn_on_copy' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </button>

                <div className="px-2.5 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-t border-zinc-900 mt-1">
                  Countdown Timers
                </div>

                <div className="grid grid-cols-2 gap-1 px-1">
                  <button
                    onClick={() => {
                      onSetBurnMode?.('timer', 60);
                      setIsBurnMenuOpen(false);
                      onShowToast('⏱️ 1 Min Self-Destruct armed!', 'success');
                    }}
                    className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-zinc-300 text-center"
                  >
                    1 Min
                  </button>
                  <button
                    onClick={() => {
                      onSetBurnMode?.('timer', 300);
                      setIsBurnMenuOpen(false);
                      onShowToast('⏱️ 5 Mins Self-Destruct armed!', 'success');
                    }}
                    className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-zinc-300 text-center"
                  >
                    5 Mins
                  </button>
                  <button
                    onClick={() => {
                      onSetBurnMode?.('timer', 900);
                      setIsBurnMenuOpen(false);
                      onShowToast('⏱️ 15 Mins Self-Destruct armed!', 'success');
                    }}
                    className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-zinc-300 text-center"
                  >
                    15 Mins
                  </button>
                  <button
                    onClick={() => {
                      onSetBurnMode?.('timer', 3600);
                      setIsBurnMenuOpen(false);
                      onShowToast('⏱️ 1 Hour Self-Destruct armed!', 'success');
                    }}
                    className="px-2 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-zinc-300 text-center"
                  >
                    1 Hour
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Paste Button */}
          <button
            onClick={handlePasteFromClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-colors"
            title="Paste text from clipboard (auto-pushes previous text to history stack)"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
            <span>Paste</span>
          </button>

          {/* Copy All Button */}
          <button
            onClick={handleCopyAll}
            disabled={!content}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-40 ${
              burnMode === 'burn_on_copy'
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
                : 'bg-zinc-100 hover:bg-white text-zinc-950'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : burnMode === 'burn_on_copy' ? (
              <>
                <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>Copy & Burn</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All</span>
              </>
            )}
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            disabled={!content}
            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 disabled:opacity-30 rounded-xl transition-colors"
            title="Clear clipboard (saves copy to stack)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Burn / Ephemeral Warning Banner */}
      {burnMode === 'burn_on_copy' && content && (
        <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-rose-300 font-mono">
            <Flame className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
            <span>
              <strong>Burn-on-Copy Armed:</strong> This secret will self-destruct and permanently erase the moment another device copies it.
            </span>
          </div>
          <button
            onClick={() => onSetBurnMode?.(null)}
            className="text-[11px] text-zinc-400 hover:text-white underline shrink-0"
          >
            Disarm
          </button>
        </div>
      )}

      {burnMode === 'timer' && burnExpiresAt && content && (
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-mono">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Self-Destruct Timer Active:</strong> Permanent shred in{' '}
              <strong className="text-white bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 font-mono">
                {countdownStr}
              </strong>
            </span>
          </div>
          <button
            onClick={() => onSetBurnMode?.(null)}
            className="text-[11px] text-zinc-400 hover:text-white underline shrink-0"
          >
            Disarm
          </button>
        </div>
      )}

      {/* Main View Area: Edit vs Preview Mode vs Digital Paper Shredder */}
      <div className="relative min-h-[380px] sm:min-h-[460px] flex flex-col bg-zinc-950/70">
        {/* DIGITAL PAPER SHREDDER ANIMATION OVERLAY */}
        {isShredding && (
          <div className="absolute inset-0 z-40 bg-zinc-950 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 grid grid-cols-12 gap-0.5 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, opacity: 1 }}
                  animate={{
                    y: [0, i % 2 === 0 ? 80 : 160, 400],
                    opacity: [1, 0.7, 0],
                    filter: 'blur(4px)',
                  }}
                  transition={{ duration: 0.9, delay: i * 0.04 }}
                  className="h-full bg-zinc-900 border-x border-zinc-950"
                />
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="relative z-50 flex flex-col items-center text-center p-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-lg shadow-rose-500/20">
                <Flame className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Executing Digital Shredder...
              </h3>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                Purging secrets from room, Redis, and all peer screens.
              </p>
            </motion.div>
          </div>
        )}

        {/* Burned / Empty Confirmed State */}
        {isBurned && !content && !isShredding && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-400 mb-3">
              <Flame className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">
              Content Securely Shredded & Purged
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm mt-1">
              Self-destruct executed. The secret was permanently erased from the server, Redis, and all connected devices.
            </p>
            <button
              onClick={() => {
                if (textareaRef.current) textareaRef.current.focus();
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
            >
              Start New Safe Clip
            </button>
          </div>
        )}

        {/* Normal Content Mode */}
        {(!isBurned || content) && activeTab === 'preview' && isRichPreviewAvailable && (
          <div className="p-3 sm:p-5">
            {detection.urls && detection.urls.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2 border-b border-zinc-800">
                  <span className="font-bold text-white text-sm flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-[#ff5a1f]" />
                    <span>
                      {detection.urls.length} Smart Link {detection.urls.length === 1 ? 'Preview' : 'Previews'}
                    </span>
                  </span>
                  <button
                    onClick={() => setActiveTab('edit')}
                    className="text-xs text-[#ff5a1f] hover:underline font-mono transition-colors"
                  >
                    Edit Raw Links
                  </button>
                </div>
                <div className="flex flex-col gap-4">
                  {detection.urls.map((u) => (
                    <LinkPreviewCard key={u} url={u} onShowToast={onShowToast} />
                  ))}
                </div>
              </div>
            ) : detection.kind === 'env' ? (
              <EnvInspector
                envVars={detection.envVars || []}
                rawText={content}
                onShowToast={onShowToast}
                onSwitchToEdit={() => setActiveTab('edit')}
              />
            ) : (
              <CodeViewer
                code={content}
                language={currentLanguage}
                onLanguageChange={(l) => setOverrideLang(l)}
                onFormat={handleFormat}
                canFormat={detection.kind === 'json'}
                onShowToast={onShowToast}
                onSwitchToEdit={() => setActiveTab('edit')}
              />
            )}
          </div>
        )}

        {(!isBurned || content) && activeTab === 'edit' && (
          <div className="relative flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              onPaste={handlePasteEvent}
              placeholder="Paste or type text, URLs, code, or secrets here... Anyone accessing this room will see updates live in real-time."
              className="w-full flex-1 min-h-[240px] sm:min-h-[300px] p-5 sm:p-6 bg-transparent text-zinc-100 placeholder:text-zinc-600 font-mono text-sm sm:text-base leading-relaxed focus:outline-none resize-y"
              spellCheck="false"
            />

            {/* Smart URL preview cards stacked cleanly below */}
            {detection.urls && detection.urls.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950/90 flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="font-semibold text-zinc-200 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#ff5a1f]" />
                    <span>
                      {detection.urls.length === 1
                        ? 'Smart Link Preview'
                        : `${detection.urls.length} Smart Link Previews (Stacked)`}
                    </span>
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Scan any QR code with your phone camera to open that link
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {detection.urls.map((u) => (
                    <LinkPreviewCard key={u} url={u} onShowToast={onShowToast} />
                  ))}
                </div>
              </div>
            )}

            {!content && !isBurned && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 text-center text-zinc-600">
                <Sparkles className="w-9 h-9 mb-3 text-zinc-700 animate-pulse" />
                <p className="text-sm font-semibold text-zinc-400 font-sans">
                  Clipboard is currently empty
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 font-sans">
                  Start typing, paste passwords, links, or code. Use Ephemeral Mode to auto-burn sensitive tokens!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Footer / Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-zinc-950/90 border-t border-zinc-800/80 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-4">
          <span>
            Characters: <strong className="text-zinc-200">{charCount}</strong>
          </span>
          <span>
            Words: <strong className="text-zinc-200">{wordCount}</strong>
          </span>
          <span>
            Lines: <strong className="text-zinc-200">{lineCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-zinc-500">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onOpenQR}
            className="flex items-center gap-1.5 text-zinc-300 hover:text-white font-sans font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Share / QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClipEditor;
