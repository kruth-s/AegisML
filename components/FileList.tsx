'use client';

import React from 'react';
import { FileItem } from '@/lib/types';
import { Link, Copy, Download } from 'lucide-react';

interface FileListProps {
  files?: FileItem[];
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export const FileList: React.FC<FileListProps> = ({ files }) => {
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
                onClick={() => { navigator.clipboard.writeText(f.url); }}
                className="px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-2"
                title="Copy file URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;
