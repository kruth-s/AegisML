'use client';

import React, { useState } from 'react';
import { ClipItem } from '@/lib/types';
import { Plus, Copy, Check, Trash2 } from 'lucide-react';

interface SnippetsListProps {
  snippets: ClipItem[];
  onAddSnippet: (content: string, title?: string) => void;
  onDeleteSnippet: (id: string) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SnippetsList: React.FC<SnippetsListProps> = ({
  snippets,
  onAddSnippet,
  onDeleteSnippet,
  onShowToast,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    onAddSnippet(newContent.trim(), newTitle.trim() || undefined);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
    onShowToast('Snippet added!', 'success');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onShowToast('Snippet copied!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>Saved Clips & Snippets</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 text-xs font-mono border border-zinc-800">
              {snippets.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-500">Keep multiple distinct code snippets, links, or notes in this room.</p>
        </div>

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Snippet</span>
          </button>
        )}
      </div>

      {/* Add New Snippet Form */}
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 flex flex-col gap-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wide">New Snippet</span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-zinc-500 hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            placeholder="Title (optional, e.g. WiFi Password, React Component...)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 text-xs font-mono focus:outline-none focus:border-zinc-700"
          />
          <textarea
            placeholder="Snippet text or code..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 text-xs font-mono min-h-[100px] focus:outline-none focus:border-zinc-700"
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold shadow-sm"
            >
              Save Snippet
            </button>
          </div>
        </form>
      )}

      {/* Snippet Grid */}
      {snippets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snippets.map((item) => (
            <div
              key={item.id}
              className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 flex flex-col justify-between gap-3 shadow-sm hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-zinc-100 truncate">
                    {item.title || 'Untitled Snippet'}
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(item.id, item.content)}
                      className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Copy Snippet"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onDeleteSnippet(item.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Delete Snippet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs overflow-x-auto max-h-36 whitespace-pre-wrap break-all">
                  {item.content}
                </pre>
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                <span>{item.content.length} chars</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center text-zinc-500 text-xs">
            No extra snippets saved in this room yet. Click <strong className="text-zinc-300 font-semibold">Add Snippet</strong> above to keep multiple items organized.
          </div>
        )
      )}
    </div>
  );
};

