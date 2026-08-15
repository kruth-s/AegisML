'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  ClipboardPaste,
  Trash2,
  Share2,
  Clock,
  Code,
  FileText,
  Sparkles,
  Link as LinkIcon,
  Eye,
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
    <div className="w-full flex flex-col glass-card rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900/90 border-b border-slate-800">
        {/* Left Status & Type Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200 uppercase tracking-wide">
              {slug}
            </span>
          </div>

          <span className="text-slate-600">|</span>

          {/* Detected Format Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300">
            {detectedType === 'url' && <LinkIcon className="w-3 h-3 text-cyan-400" />}
            {detectedType === 'json' && <Code className="w-3 h-3 text-emerald-400" />}
            {detectedType === 'code' && <Code className="w-3 h-3 text-purple-400" />}
            {detectedType === 'text' && <FileText className="w-3 h-3 text-indigo-400" />}
            <span className="uppercase">{detectedType}</span>
          </div>

          {/* Save Status Indicator */}
          <span className="text-xs font-medium text-slate-400">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-all hover:scale-105"
            title="Paste text from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Paste</span>
          </button>

          {/* Copy All Button */}
          <button
            onClick={handleCopyAll}
            disabled={!content}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
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
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 rounded-lg transition-colors"
            title="Clear clipboard"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative min-h-[360px] sm:min-h-[440px] flex flex-col bg-slate-950/60">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Paste or type text here... Anyone accessing this room URL will see updates live in real-time."
          className="w-full h-full min-h-[360px] sm:min-h-[440px] p-5 bg-transparent text-slate-100 placeholder:text-slate-600 font-mono text-sm sm:text-base leading-relaxed focus:outline-none resize-y"
          spellCheck="false"
        />

        {!content && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 text-center text-slate-600">
            <Sparkles className="w-10 h-10 mb-3 text-slate-700 animate-pulse" />
            <p className="text-sm font-medium text-slate-400">Clipboard is currently empty</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Start typing, paste from clipboard, or scan QR code on another device to sync text immediately.
            </p>
          </div>
        )}
      </div>

      {/* Editor Footer / Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-slate-900/90 border-t border-slate-800 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span>
            Characters: <strong className="text-slate-200">{charCount}</strong>
          </span>
          <span>
            Words: <strong className="text-slate-200">{wordCount}</strong>
          </span>
          <span>
            Lines: <strong className="text-slate-200">{lineCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-slate-500">
              Updated: {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onOpenQR}
            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-sans font-semibold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share / QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
