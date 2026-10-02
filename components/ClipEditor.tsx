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
} from 'lucide-react';
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
}) => {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [overrideLang, setOverrideLang] = useState<SupportedLanguage | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastLocalTypingTimeRef = useRef<number>(0);

  // Sync internal state when server content changes externally
  useEffect(() => {
    if (initialContent !== content) {
      // Check if user on this current device is actively typing right this millisecond
      const isActivelyTypingLocally = Date.now() - lastLocalTypingTimeRef.current < 350;
      if (!isActivelyTypingLocally) {
        setContent(initialContent);
      }
    }
  }, [initialContent]);

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
      // Sort and clean .env lines
      const lines = content.split('\n');
      const comments = lines.filter((l) => l.trim().startsWith('#'));
      const vars = lines.filter((l) => l.trim() && !l.trim().startsWith('#')).sort();
      const cleaned = [...comments, ...(comments.length > 0 && vars.length > 0 ? [''] : []), ...vars].join('\n');
      setContent(cleaned);
      onSave(cleaned);
      onShowToast('.env variables sorted A-Z', 'success');
    }
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

  const isRichPreviewAvailable =
    content.trim().length > 0 &&
    (detection.kind === 'env' ||
      detection.kind === 'code' ||
      detection.kind === 'json' ||
      detection.kind === 'url' ||
      (detection.urls && detection.urls.length > 0) ||
      detection.kind === 'markdown');

  return (
    <div className="w-full flex flex-col bg-zinc-900/90 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-xl">
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

          {/* Remote Device Live Typing Badge (Google Docs style) */}
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

          {/* Detected Format Badge with quick action */}
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

          {/* Mode Switcher Tabs (Edit vs Syntax / Inspector / Smart Card) */}
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

          {/* Save Status Indicator */}
          <span className="text-xs font-mono hidden sm:inline">
            {isSaving ? (
              <span className="text-amber-400 animate-pulse">Saving...</span>
            ) : (
              <span className="text-emerald-400">● Synced</span>
            )}
          </span>
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

      {/* Suggestion Banner when .env is detected while in Raw Edit */}
      {activeTab === 'edit' && detection.kind === 'env' && (
        <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-mono">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>
              <strong>Environment config detected!</strong> Mask API keys and inspect variables
              safely.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('preview')}
            className="px-2.5 py-1 rounded bg-amber-400 text-zinc-950 font-bold hover:bg-amber-300 transition-colors"
          >
            Open .env Inspector
          </button>
        </div>
      )}

      {/* Main View Area: Edit vs Preview Mode */}
      <div className="relative min-h-[380px] sm:min-h-[460px] flex flex-col bg-zinc-950/70">
        {activeTab === 'preview' && isRichPreviewAvailable ? (
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
                onLanguageChange={(lang) => setOverrideLang(lang)}
                onFormat={handleFormat}
                canFormat={detection.kind === 'json'}
                onShowToast={onShowToast}
                onSwitchToEdit={() => setActiveTab('edit')}
              />
            )}
          </div>
        ) : (
          <div className="relative flex flex-col flex-1">
            {/* Google Docs Floating Live Collaborator Pill */}
            {remoteTypingUser && (
              <div
                className="absolute top-4 right-5 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md border animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
                style={{
                  backgroundColor: '#18181bee',
                  borderColor: `${remoteTypingUser.color}80`,
                  boxShadow: `0 4px 20px -2px ${remoteTypingUser.color}40`,
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
                <span
                  className="text-xs font-mono font-bold tracking-tight"
                  style={{ color: remoteTypingUser.color }}
                >
                  {remoteTypingUser.name}
                </span>
                <span className="text-[11px] text-zinc-300 font-mono">is typing live...</span>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleChange}
              placeholder="Paste or type text, URLs, code, or .env files here... Anyone accessing this room URL will see updates live in real-time."
              className="w-full flex-1 min-h-[220px] sm:min-h-[280px] p-5 sm:p-6 bg-transparent text-zinc-100 placeholder:text-zinc-600 font-mono text-sm sm:text-base leading-relaxed focus:outline-none resize-y"
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

            {!content && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 text-center text-zinc-600">
                <Sparkles className="w-9 h-9 mb-3 text-zinc-700 animate-pulse" />
                <p className="text-sm font-semibold text-zinc-400 font-sans">
                  Clipboard is currently empty
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 font-sans">
                  Start typing, paste links (YouTube, GitHub, Figma), code, or scan the QR code on another device.
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
