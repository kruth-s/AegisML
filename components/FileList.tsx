'use client';

import React from 'react';
import { FileItem } from '@/lib/types';
import { Download } from 'lucide-react';

interface FileListProps {
  files?: FileItem[];
  slug?: string;
  onDeleted?: () => void;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export const FileList: React.FC<FileListProps> = ({ files, slug, onDeleted }) => {
  if (!files || files.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center text-zinc-500 text-xs">
        No files uploaded in this room yet.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 mt-4">
      <h3 className="text-sm font-bold text-white">Files</h3>
      <div className="grid grid-cols-1 gap-2">
        {files.map((f) => (
          <div key={f.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-100 truncate">{f.filename}</div>
                <div className="text-xs text-zinc-500">{formatBytes(f.size)} • {new Date(f.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a href={f.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-2">
                <Download className="w-3.5 h-3.5" />
                <span>Open</span>
              </a>

              <button
                onClick={async () => {
                  if (!confirm('Delete this file? This cannot be undone.')) return;
                  try {
                    const targetSlug = slug || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : '');
                    if (!targetSlug) throw new Error('Room slug not found');
                    const res = await fetch(`/api/clip/${targetSlug}/files/${f.id}`, { method: 'DELETE' });
                    const json = await res.json();
                    if (!json.success) throw new Error(json.error || 'Delete failed');
                    onDeleted && onDeleted();
                    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('clip-file-deleted'));
                  } catch (e) {
                    console.error(e);
                    alert((e as any).message || 'Failed to delete file');
                  }
                }}
                className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-2"
                title="Delete file"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;
