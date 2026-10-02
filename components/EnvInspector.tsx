'use client';

import React, { useState, useMemo } from 'react';
import { EnvVariable } from '@/lib/types';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  Search,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown,
} from 'lucide-react';

interface EnvInspectorProps {
  envVars: EnvVariable[];
  rawText: string;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onSwitchToEdit: () => void;
}

export const EnvInspector: React.FC<EnvInspectorProps> = ({
  envVars,
  rawText,
  onShowToast,
  onSwitchToEdit,
}) => {
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [revealAll, setRevealAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSorted, setIsSorted] = useState(false);

  // Filter and sort items
  const filteredVars = useMemo(() => {
    let list = envVars.filter((v) => !v.comment); // only active vars

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (v) => v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q)
      );
    }

    if (isSorted) {
      list = [...list].sort((a, b) => a.key.localeCompare(b.key));
    }

    return list;
  }, [envVars, searchQuery, isSorted]);

  const totalVars = envVars.filter((v) => !v.comment).length;
  const secretCount = envVars.filter((v) => v.isSecret).length;

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleRevealAll = () => {
    const next = !revealAll;
    setRevealAll(next);
    const updated: Record<string, boolean> = {};
    envVars.forEach((v) => {
      if (v.key) updated[v.key] = next;
    });
    setRevealedKeys(updated);
  };

  const handleCopyValue = async (val: string, key: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(`val_${key}`);
      onShowToast(`Copied value for ${key}`, 'success');
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      onShowToast('Failed to copy value', 'error');
    }
  };

  const handleCopyPair = async (pair: string, key: string) => {
    try {
      await navigator.clipboard.writeText(pair);
      setCopiedKey(`pair_${key}`);
      onShowToast(`Copied ${key}=...`, 'success');
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      onShowToast('Failed to copy', 'error');
    }
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      onShowToast('Copied entire .env configuration', 'success');
    } catch {
      onShowToast('Failed to copy .env', 'error');
    }
  };

  const handleDownloadEnv = () => {
    try {
      const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = '.env';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onShowToast('Downloaded .env file', 'success');
    } catch {
      onShowToast('Failed to download .env file', 'error');
    }
  };

  return (
    <div className="flex flex-col bg-zinc-950/80 rounded-xl border border-zinc-800/80 overflow-hidden font-sans">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-zinc-900/60 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-xs font-semibold">
            <KeyRound className="w-3.5 h-3.5" />
            <span>.ENV INSPECTOR</span>
          </div>

          <span className="text-xs text-zinc-400 font-mono">
            <strong className="text-zinc-200">{totalVars}</strong> variables
            {secretCount > 0 && (
              <span className="ml-2 text-rose-400">
                ({secretCount} secrets auto-masked)
              </span>
            )}
          </span>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {secretCount > 0 && (
            <button
              onClick={toggleRevealAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
              title={revealAll ? 'Mask all secret values' : 'Reveal all secret values'}
            >
              {revealAll ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Mask Secrets</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reveal Secrets</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setIsSorted((s) => !s)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isSorted
                ? 'bg-[#ff5a1f]/20 border-[#ff5a1f]/40 text-[#ff5a1f]'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Sort A-Z"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDownloadEnv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
            title="Download as .env"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Export .env</span>
          </button>

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy .env</span>
          </button>
        </div>
      </div>

      {/* Search Input Filter */}
      {totalVars > 4 && (
        <div className="px-5 py-2.5 bg-zinc-950/40 border-b border-zinc-800/60 flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter keys or values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
      )}

      {/* Variables List */}
      <div className="divide-y divide-zinc-800/60 max-h-[500px] overflow-y-auto">
        {filteredVars.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 font-mono">
            No environment variables match &quot;{searchQuery}&quot;
          </div>
        ) : (
          filteredVars.map((v) => {
            const isRevealed = revealAll || revealedKeys[v.key];
            const displayValue = v.isSecret && !isRevealed ? '••••••••••••••••' : v.value;

            return (
              <div
                key={v.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 hover:bg-zinc-900/40 transition-colors group"
              >
                {/* Left: Key & Security Tag */}
                <div className="flex items-center gap-2.5 min-w-[200px] sm:max-w-[40%]">
                  {v.isSecret ? (
                    <span title="Sensitive secret key">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    </span>
                  ) : (
                    <span title="Standard environment variable">
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    </span>
                  )}

                  <span className="font-mono text-xs font-bold text-emerald-400 tracking-wide break-all">
                    {v.key}
                  </span>
                </div>

                {/* Center / Right: Value Display & Secret Toggle */}
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-1 min-w-0">
                  <div
                    className={`font-mono text-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800/90 break-all select-all flex-1 sm:max-w-md ${
                      v.isSecret && !isRevealed ? 'text-zinc-500 tracking-wider' : 'text-zinc-200'
                    }`}
                  >
                    {displayValue || <span className="text-zinc-600 italic">(empty)</span>}
                  </div>

                  {/* Actions for this row */}
                  <div className="flex items-center gap-1 shrink-0">
                    {v.isSecret && (
                      <button
                        onClick={() => toggleReveal(v.key)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                        title={isRevealed ? 'Mask secret' : 'Reveal secret'}
                      >
                        {isRevealed ? (
                          <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyValue(v.value, v.key)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Copy value"
                    >
                      {copiedKey === `val_${v.key}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Switcher */}
      <div className="px-5 py-2.5 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 font-mono">
        <span>Click any value to select or copy</span>
        <button
          onClick={onSwitchToEdit}
          className="text-zinc-400 hover:text-[#ff5a1f] underline transition-colors"
        >
          Switch to Raw Editor
        </button>
      </div>
    </div>
  );
};
