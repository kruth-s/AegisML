'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Prism from 'prismjs';
// Safely load additional Prism languages
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';

import { SupportedLanguage } from '@/lib/codeDetector';
import {
  Copy,
  Check,
  WrapText,
  Sparkles,
  Code2,
  ChevronDown,
  Edit3,
} from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  onFormat?: () => void;
  canFormat?: boolean;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onSwitchToEdit: () => void;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  json: 'JSON',
  bash: 'Bash / Shell',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  markdown: 'Markdown',
  yaml: 'YAML',
  plaintext: 'Plain Text',
};

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language,
  onLanguageChange,
  onFormat,
  canFormat,
  onShowToast,
  onSwitchToEdit,
}) => {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Map supported language to prism grammar key
  const prismLang = useMemo(() => {
    switch (language) {
      case 'typescript':
        return 'typescript';
      case 'javascript':
        return 'javascript';
      case 'python':
        return 'python';
      case 'json':
        return 'json';
      case 'bash':
        return 'bash';
      case 'sql':
        return 'sql';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'markdown':
        return 'markdown';
      default:
        return 'plaintext';
    }
  }, [language]);

  // Syntax highlight code via Prism
  const highlightedCode = useMemo(() => {
    if (!code) return '';
    try {
      const grammar = Prism.languages[prismLang] || Prism.languages.plaintext;
      return Prism.highlight(code, grammar, prismLang);
    } catch (e) {
      return code;
    }
  }, [code, prismLang]);

  const lines = useMemo(() => {
    return code.split('\n');
  }, [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onShowToast('Copied code to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast('Failed to copy code', 'error');
    }
  };

  return (
    <div className="flex flex-col bg-zinc-950 rounded-xl border border-zinc-800/80 overflow-hidden font-mono text-xs sm:text-sm">
      {/* Code Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-[#ff5a1f]" />
              <span>{LANGUAGE_LABELS[language] || language}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 text-xs max-h-60 overflow-y-auto">
                {(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((langKey) => (
                  <button
                    key={langKey}
                    onClick={() => {
                      onLanguageChange?.(langKey);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between transition-colors ${
                      language === langKey ? 'text-[#ff5a1f] font-bold bg-zinc-800/50' : 'text-zinc-300'
                    }`}
                  >
                    <span>{LANGUAGE_LABELS[langKey]}</span>
                    {language === langKey && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-zinc-500 text-xs">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {canFormat && (
            <button
              onClick={onFormat}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-zinc-700 text-xs transition-colors"
              title="Prettify formatting"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Format</span>
            </button>
          )}

          <button
            onClick={() => setWrapLines(!wrapLines)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              wrapLines
                ? 'bg-[#ff5a1f]/20 border-[#ff5a1f]/40 text-[#ff5a1f]'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title={wrapLines ? 'Disable line wrap' : 'Enable line wrap'}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-sans text-xs font-bold transition-all shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={onSwitchToEdit}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition-colors font-sans"
            title="Edit raw code"
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </div>

      {/* Code Body with Line Numbers */}
      <div className="relative overflow-x-auto max-h-[550px] overflow-y-auto flex bg-[#0c0c0c] p-4">
        {/* Line Numbers Gutter */}
        <div
          className="select-none pr-4 text-right text-zinc-600 font-mono text-xs leading-relaxed border-r border-zinc-800/70 shrink-0"
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div key={i} className="h-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Syntax Highlighted Content */}
        <pre
          className={`flex-1 pl-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto ${
            wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
          }`}
        >
          <code
            className={`language-${prismLang}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>

      {/* Prism Theme Styling Overrides */}
      <style jsx global>{`
        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
          color: #71717a;
          font-style: italic;
        }
        .token.punctuation {
          color: #a1a1aa;
        }
        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
          color: #f59e0b;
        }
        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
          color: #34d399;
        }
        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
          color: #38bdf8;
        }
        .token.atrule,
        .token.attr-value,
        .token.keyword {
          color: #ff5a1f;
          font-weight: 600;
        }
        .token.function,
        .token.class-name {
          color: #818cf8;
        }
        .token.regex,
        .token.important,
        .token.variable {
          color: #f43f5e;
        }
      `}</style>
    </div>
  );
};
