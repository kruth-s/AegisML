'use client';

import React, { useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  ScanText,
  Image as ImageIcon,
  Film,
  Music,
  FileCode,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem } from '@/lib/types';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileItem | null;
  onExtractOcr?: (file: { url: string; name: string }) => void;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function isPdf(file?: FileItem | null): boolean {
  if (!file) return false;
  const name = (file.filename || '').toLowerCase();
  const cType = (file.contentType || '').toLowerCase();
  const url = (file.url || '').toLowerCase();
  return name.endsWith('.pdf') || cType === 'application/pdf' || url.includes('.pdf');
}

export function isImage(file?: FileItem | null): boolean {
  if (!file) return false;
  if (isPdf(file)) return false;
  const name = (file.filename || '').toLowerCase();
  const cType = (file.contentType || '').toLowerCase();
  const url = (file.url || '').toLowerCase();

  if (cType.includes('image') || /^(png|jpe?g|webp|gif|svg|bmp|tiff|heic)$/i.test(cType)) return true;
  if (/\.(jpe?g|png|webp|gif|svg|bmp|tiff|heic)$/i.test(name)) return true;
  if (name.includes('screenshot') || name.includes('snap') || name.includes('photo') || name.startsWith('img_')) return true;
  if (url.startsWith('data:image/') || (url.includes('/image/upload/') && !url.includes('.pdf'))) return true;
  return false;
}

export function isVideo(file?: FileItem | null): boolean {
  if (!file) return false;
  const name = (file.filename || '').toLowerCase();
  const cType = (file.contentType || '').toLowerCase();
  return (
    cType.includes('video') ||
    /\.(mp4|webm|mov|mkv|avi)$/i.test(name) ||
    file.url.includes('/video/upload/')
  );
}

export function isAudio(file?: FileItem | null): boolean {
  if (!file) return false;
  const name = (file.filename || '').toLowerCase();
  const cType = (file.contentType || '').toLowerCase();
  return (
    cType.includes('audio') ||
    /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(name) ||
    file.url.startsWith('data:audio/')
  );
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  file,
  onExtractOcr,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const pdf = isPdf(file);
  const img = isImage(file);
  const video = isVideo(file);
  const audio = isAudio(file);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-zinc-900/90 border-b border-zinc-800 shrink-0">
            {/* File Icon & Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                {pdf && <FileText className="w-5 h-5 text-rose-400" />}
                {img && <ImageIcon className="w-5 h-5 text-cyan-400" />}
                {video && <Film className="w-5 h-5 text-purple-400" />}
                {audio && <Music className="w-5 h-5 text-emerald-400" />}
                {!pdf && !img && !video && !audio && <FileCode className="w-5 h-5 text-indigo-400" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-md">
                    {file.filename}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-300 uppercase shrink-0">
                    {pdf ? 'PDF Document' : img ? 'Image' : video ? 'Video' : audio ? 'Audio' : 'File'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {formatBytes(file.size)} • Uploaded {new Date(file.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Extract Text for Images */}
              {img && onExtractOcr && (
                <button
                  onClick={() => {
                    onClose();
                    onExtractOcr({ url: file.url, name: file.filename });
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5a1f]/10 hover:bg-[#ff5a1f]/20 border border-[#ff5a1f]/30 text-[#ff5a1f] text-xs font-semibold transition-all hover:scale-105"
                  title="Extract text using in-browser OCR"
                >
                  <ScanText className="w-3.5 h-3.5" />
                  <span>Extract OCR</span>
                </button>
              )}

              {/* Direct Link / Open in New Tab */}
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-colors"
                title="Open raw file in a new tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Open Tab</span>
              </a>

              {/* Download */}
              <a
                href={file.url}
                download={file.filename}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-sm"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors ml-1"
                aria-label="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Preview Body */}
          <div className="flex-1 w-full h-full min-h-0 bg-zinc-950 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden">
            {pdf && (
              <div className="w-full h-full flex flex-col rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-inner">
                {/* Fallback Notice for Mobile */}
                <div className="sm:hidden px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>Viewing PDF</span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#ff5a1f] font-semibold underline flex items-center gap-1"
                  >
                    Full View <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <iframe
                  src={`${file.url}#toolbar=1&navpanes=0`}
                  className="w-full h-full border-none bg-white rounded-b-2xl"
                  title={file.filename}
                />
              </div>
            )}

            {img && (
              <div className="w-full h-full flex flex-col items-center justify-center p-2 overflow-auto">
                <img
                  src={file.url}
                  alt={file.filename}
                  className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl border border-zinc-850"
                />
              </div>
            )}

            {video && (
              <div className="w-full h-full flex items-center justify-center p-2">
                <video
                  src={file.url}
                  controls
                  autoPlay
                  className="max-h-full max-w-full rounded-2xl shadow-2xl border border-zinc-800 bg-black"
                />
              </div>
            )}

            {audio && (
              <div className="w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col items-center gap-4">
                <Music className="w-12 h-12 text-emerald-400 animate-pulse" />
                <div className="text-center">
                  <h4 className="font-bold text-white text-base">{file.filename}</h4>
                  <p className="text-xs text-zinc-500 font-mono mt-1">{formatBytes(file.size)}</p>
                </div>
                <audio src={file.url} controls className="w-full mt-2" />
              </div>
            )}

            {!pdf && !img && !video && !audio && (
              <div className="text-center p-8 max-w-md flex flex-col items-center gap-4 bg-zinc-900/60 rounded-3xl border border-zinc-800">
                <div className="w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-indigo-400">
                  <FileCode className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">{file.filename}</h4>
                  <p className="text-xs text-zinc-400">
                    Preview is not supported directly in-browser for this file format.
                  </p>
                </div>
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  download={file.filename}
                  className="px-5 py-2.5 rounded-xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#ff5a1f]/20 transition-all hover:scale-105"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Open File</span>
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
