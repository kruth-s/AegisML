'use client';

import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';

interface ClipEditorProps {
  slug: string;
  initialContent: string;
  onSave: (content: string) => void;
  isSaving: boolean;
  lastUpdated?: string;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onOpenQR: () => void;
}

export const ClipEditor: React.FC<ClipEditorProps> = ({
  slug,
  initialContent,
  onSave,
  isSaving,
  lastUpdated,
  onShowToast,
  onOpenQR,
}) => {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);
  const [detectedType, setDetectedType] = useState<'text' | 'json' | 'url' | 'code'>('text');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync internal state when server content changes externally
  useEffect(() => {
    if (initialContent !== content && document.activeElement !== textareaRef.current) {
      setContent(initialContent);
    }
  }, [initialContent]);

  // Detect format
  useEffect(() => {
    const trimmed = content.trim();
    if (!trimmed) {
      setDetectedType('text');
      return;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setDetectedType('url');
    } else if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        JSON.parse(trimmed);
        setDetectedType('json');
      } catch (e) {
        setDetectedType('code');
      }
    } else if (trimmed.includes('function') || trimmed.includes('const ') || trimmed.includes('<html')) {
      setDetectedType('code');
    } else {
      setDetectedType('text');
    }
  }, [content]);

  // Handle typing & auto-save trigger
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    onSave(val);
  };

  // Copy All to Browser Clipboard
  const handleCopyAll = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      onShowToast('Copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      onShowToast('Failed to copy text', 'error');
    }
  };

  // Paste directly from Browser Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const newContent = content ? `${content}\n${text}` : text;
        setContent(newContent);
        onSave(newContent);
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
    setContent('');
    onSave('');
    onShowToast('Clipboard cleared', 'info');
  };

  // Stats
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content ? content.split('\n').length : 1;

  return (
    <div className="w-full flex flex-col bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-zinc-950/90 border-b border-zinc-800/80">
        {/* Left Status & Type Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wide">
              {slug}
            </span>
          </div>

          <span className="text-zinc-700">|</span>

          {/* Detected Format Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
            {detectedType === 'url' && <LinkIcon className="w-3 h-3 text-cyan-400" />}
            {detectedType === 'json' && <Code className="w-3 h-3 text-emerald-400" />}
            {detectedType === 'code' && <Code className="w-3 h-3 text-indigo-400" />}
            {detectedType === 'text' && <FileText className="w-3 h-3 text-zinc-400" />}
            <span className="uppercase">{detectedType}</span>
          </div>

          {/* Save Status Indicator */}
          <span className="text-xs font-mono">
            {isSaving ? (
              <span className="text-amber-400 animate-pulse">Saving...</span>
            ) : (
              <span className="text-emerald-400">● Synced</span>
            )}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Paste Button */}
          <button
            onClick={handlePasteFromClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-colors"
            title="Paste text from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
            <span>Paste</span>
          </button>

          {/* Copy All Button */}
          <button
            onClick={handleCopyAll}
            disabled={!content}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 disabled:opacity-40 text-xs font-bold shadow-sm transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
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
            title="Clear clipboard"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative min-h-[380px] sm:min-h-[460px] flex flex-col bg-zinc-950/70">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Paste or type text here... Anyone accessing this room URL will see updates live in real-time."
          className="w-full h-full min-h-[380px] sm:min-h-[460px] p-5 sm:p-6 bg-transparent text-zinc-100 placeholder:text-zinc-600 font-mono text-sm sm:text-base leading-relaxed focus:outline-none resize-y"
          spellCheck="false"
        />

        {!content && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 text-center text-zinc-600">
            <Sparkles className="w-9 h-9 mb-3 text-zinc-700 animate-pulse" />
            <p className="text-sm font-semibold text-zinc-400 font-sans">Clipboard is currently empty</p>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 font-sans">
              Start typing, paste from clipboard, or scan QR code on another device to sync text immediately.
            </p>
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

