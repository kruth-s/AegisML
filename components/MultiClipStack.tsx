'use client';

import React, { useState } from 'react';
import { ClipItem } from '@/lib/types';
import {
  Copy,
  Check,
  ArrowUpRight,
  Trash2,
  Pin,
  ExternalLink,
  Code2,
  KeyRound,
  FileText,
  Link as LinkIcon,
  Layers,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MultiClipStackProps {
  stack: ClipItem[];
  onPromoteToEditor: (content: string) => void;
  onDeleteClip: (id: string) => void;
  onTogglePin?: (id: string) => void;
  onClearStack?: () => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

function detectCategory(text: string): { label: string; icon: React.ReactNode; color: string } {
  const trimmed = text.trim();
  if (/^(https?:\/\/[^\s]+)$/i.test(trimmed)) {
    return {
      label: 'URL Link',
      icon: <LinkIcon className="w-3.5 h-3.5" />,
      color: '#38bdf8', // sky
    };
  }
  if (
    /(API[_-]?KEY|SECRET|TOKEN|BEARER|PASSWORD|PRIVATE_KEY|sk_[a-z0-9_-]+)/i.test(trimmed) ||
    /^[A-Za-z0-9_-]{32,}$/.test(trimmed)
  ) {
    return {
      label: 'Secret Key',
      icon: <KeyRound className="w-3.5 h-3.5" />,
      color: '#f59e0b', // amber
    };
  }
  if (
    /^(const|let|var|function|import|export|class|def|<[a-z]|SELECT|UPDATE|DELETE|\{|\})/m.test(trimmed) ||
    trimmed.includes('=>')
  ) {
    return {
      label: 'Code',
      icon: <Code2 className="w-3.5 h-3.5" />,
      color: '#a855f7', // purple
    };
  }
  return {
    label: 'Text',
    icon: <FileText className="w-3.5 h-3.5" />,
    color: '#10b981', // emerald
  };
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return 'recently';
  }
}

export const MultiClipStack: React.FC<MultiClipStackProps> = ({
  stack,
  onPromoteToEditor,
  onDeleteClip,
  onTogglePin,
  onClearStack,
  onShowToast,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (stack.length === 0) return null;

  const handleCopySingle = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      onShowToast('Copied from Stack!', 'success');
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      onShowToast('Failed to copy', 'error');
    }
  };

  const handleMergeCopyAll = async () => {
    try {
      const merged = stack
        .map((item, idx) => `/* --- Clip #${idx + 1} --- */\n${item.content}`)
        .join('\n\n');
      await navigator.clipboard.writeText(merged);
      onShowToast(`Merged & copied ${stack.length} clips!`, 'success');
    } catch {
      onShowToast('Failed to copy all clips', 'error');
    }
  };

  return (
    <div className="w-full bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-md flex flex-col gap-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
            Multi-Clip History Stack
          </span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300 font-bold">
            {stack.length} {stack.length === 1 ? 'clip' : 'clips'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMergeCopyAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-all hover:scale-[1.02]"
            title="Merge all clips in stack into one and copy to clipboard"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>📑 Copy All Merged</span>
          </button>

          {onClearStack && stack.length > 0 && (
            <button
              type="button"
              onClick={onClearStack}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-zinc-400 text-xs transition-colors"
              title="Clear all clips from stack"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scrollable Stack Cards */}
      <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <AnimatePresence>
          {stack.map((item, index) => {
            const meta = detectCategory(item.content);
            const isCopied = copiedId === item.id;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.15 }}
                className="w-60 sm:w-64 shrink-0 p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 flex flex-col justify-between gap-2.5 transition-all group"
              >
                {/* Card Top: Category Badge & Time */}
                <div className="flex items-center justify-between gap-1.5">
                  <div
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                    style={{
                      backgroundColor: `${meta.color}18`,
                      color: meta.color,
                      border: `1px solid ${meta.color}40`,
                    }}
                  >
                    {meta.icon}
                    <span>{item.category?.toUpperCase() || meta.label}</span>
                  </div>

                  <span className="text-[10px] font-mono text-zinc-500">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>

                {/* Content Snippet Preview */}
                <div
                  onClick={() => onPromoteToEditor(item.content)}
                  className="cursor-pointer text-xs font-mono text-zinc-300 line-clamp-3 bg-zinc-900/60 p-2 rounded-lg border border-zinc-900 group-hover:border-zinc-800 transition-colors select-none"
                  title="Click to load into main editor"
                >
                  {item.content}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => handleCopySingle(item.id, item.content)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                    }`}
                    title="1-Tap Copy"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPromoteToEditor(item.content)}
                      className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                      title="Promote to Main Editor"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteClip(item.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Remove from stack"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MultiClipStack;
