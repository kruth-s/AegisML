'use client';

import React, { useState } from 'react';
import { FileItem } from '@/lib/types';
import { Download, Trash2, ScanText, FileText, Eye, Image as ImageIcon } from 'lucide-react';
import { OcrModal } from './OcrModal';
import { AudioPlayerCard } from './AudioPlayerCard';
import { FilePreviewModal, isPdf, isImage, isAudio } from './FilePreviewModal';

interface FileListProps {
  files?: FileItem[];
  slug?: string;
  onDeleted?: (fileId?: string) => void;
  onInsertIntoClipboard?: (text: string) => void;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  slug,
  onDeleted,
  onInsertIntoClipboard,
  onShowToast,
}) => {
  const [selectedOcrImage, setSelectedOcrImage] = useState<{ url: string; name: string } | null>(
    null
  );
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<FileItem | null>(null);

  const handleDeleteFile = async (fileId: string, filename?: string) => {
    if (!confirm(`Delete ${filename ? `"${filename}"` : 'this file'}?`)) return;
    try {
      const targetSlug =
        slug ||
        (typeof window !== 'undefined'
          ? window.location.pathname.split('/').pop()
          : '');
      if (!targetSlug) throw new Error('Room slug not found');
      const res = await fetch(`/api/clip/${targetSlug}/files/${fileId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      onShowToast?.('File removed from room', 'info');
      onDeleted && onDeleted(fileId);
    } catch (e: any) {
      onShowToast?.(e.message || 'Failed to delete file', 'error');
    }
  };

  if (!files || files.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-850 text-center text-zinc-500 text-xs font-mono">
        No files, voice notes, or photos dropped in this room yet.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>Dropped Files & Audio Memos</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            {files.length}
          </span>
        </h3>
        <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
          Full resolution sync & interactive audio player
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {files.map((f) => {
          const audio = isAudio(f);
          const img = isImage(f);
          const pdf = isPdf(f);

          if (audio) {
            return (
              <AudioPlayerCard
                key={f.id}
                id={f.id}
                url={f.url}
                filename={f.filename}
                size={f.size}
                createdAt={f.createdAt}
                onDelete={() => handleDeleteFile(f.id, f.filename)}
              />
            );
          }

          return (
            <div
              key={f.id}
              className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm"
            >
              {/* Left Details & Thumbnail */}
              <div className="flex items-center gap-3 min-w-0">
                {pdf ? (
                  <div
                    onClick={() => setSelectedPreviewFile(f)}
                    className="w-12 h-12 rounded-xl bg-rose-950/40 border border-rose-500/30 flex flex-col items-center justify-center shrink-0 text-rose-400 cursor-pointer hover:border-rose-500/60 hover:scale-105 transition-all"
                    title="Click to view PDF"
                  >
                    <FileText className="w-5 h-5 text-rose-400" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-rose-300 mt-0.5">
                      PDF
                    </span>
                  </div>
                ) : img ? (
                  <div
                    onClick={() => setSelectedPreviewFile(f)}
                    className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:border-zinc-750 hover:scale-105 transition-all"
                    title="Click to view full image"
                  >
                    <img
                      src={f.url}
                      alt={f.filename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => setSelectedPreviewFile(f)}
                    className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-400 cursor-pointer hover:border-zinc-750 hover:scale-105 transition-all"
                    title="Click to view file"
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div
                    onClick={() => setSelectedPreviewFile(f)}
                    className="text-sm font-semibold text-zinc-100 truncate max-w-xs sm:max-w-md cursor-pointer hover:text-white hover:underline transition-colors"
                    title="Click to view"
                  >
                    {f.filename}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    {formatBytes(f.size)} • {new Date(f.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Right Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 ml-auto sm:ml-0">
                {/* View Button */}
                <button
                  type="button"
                  onClick={() => setSelectedPreviewFile(f)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-600 text-xs font-semibold transition-all shadow-sm"
                  title="View / Preview file"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View</span>
                </button>

                {/* In-Browser OCR Button strictly for Photos/Images */}
                {img && (
                  <button
                    type="button"
                    onClick={() => setSelectedOcrImage({ url: f.url, name: f.filename })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5a1f]/10 hover:bg-[#ff5a1f]/20 border border-[#ff5a1f]/30 text-[#ff5a1f] text-xs font-semibold transition-all hover:scale-[1.02]"
                    title="Extract text or code from image"
                  >
                    <ScanText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Extract Text (OCR)</span>
                    <span className="sm:hidden">OCR</span>
                  </button>
                )}

                {/* Open / Download */}
                <a
                  href={f.url}
                  download={f.filename}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                {/* Delete */}
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Delete "${f.filename}"?`)) return;
                    try {
                      const targetSlug =
                        slug ||
                        (typeof window !== 'undefined'
                          ? window.location.pathname.split('/').pop()
                          : '');
                      if (!targetSlug) throw new Error('Room slug not found');
                      const res = await fetch(`/api/clip/${targetSlug}/files/${f.id}`, {
                        method: 'DELETE',
                      });
                      const json = await res.json();
                      if (!json.success) throw new Error(json.error || 'Delete failed');
                      onShowToast?.('File removed from room', 'info');
                      onDeleted && onDeleted(f.id);
                    } catch (e: any) {
                      onShowToast?.(e.message || 'Failed to delete file', 'error');
                    }
                  }}
                  className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full File Preview Modal */}
      {selectedPreviewFile && (
        <FilePreviewModal
          isOpen={!!selectedPreviewFile}
          onClose={() => setSelectedPreviewFile(null)}
          file={selectedPreviewFile}
          onExtractOcr={(img) => setSelectedOcrImage(img)}
        />
      )}

      {/* OCR Modal */}
      {selectedOcrImage && (
        <OcrModal
          isOpen={!!selectedOcrImage}
          onClose={() => setSelectedOcrImage(null)}
          imageUrl={selectedOcrImage.url}
          imageName={selectedOcrImage.name}
          onInsertIntoClipboard={onInsertIntoClipboard}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};

export default FileList;
