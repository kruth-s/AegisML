'use client';

import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';
import {
  ScanText,
  Copy,
  Check,
  X,
  Sparkles,
  ClipboardPaste,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  onInsertIntoClipboard?: (text: string) => void;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const OcrModal: React.FC<OcrModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName,
  onInsertIntoClipboard,
  onShowToast,
}) => {
  const [extractedText, setExtractedText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-scan on modal open or user click
  const runOCR = async () => {
    setIsScanning(true);
    setProgress(0);
    setProgressStatus('Initializing OCR engine...');
    setError(null);

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
            setProgressStatus(`Extracting text... ${Math.round(m.progress * 100)}%`);
          } else {
            setProgressStatus(m.status);
          }
        },
      });

      const ret = await worker.recognize(imageUrl);
      await worker.terminate();

      const text = ret.data.text.trim();
      setExtractedText(text);
      setHasScanned(true);

      if (!text) {
        onShowToast?.('No readable text detected in this image', 'info');
      } else {
        onShowToast?.('Text extracted successfully!', 'success');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err?.message || 'Failed to extract text from image');
      onShowToast?.('OCR scan failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      onShowToast?.('Extracted text copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast?.('Failed to copy', 'error');
    }
  };

  const handleInsert = () => {
    if (!extractedText) return;
    onInsertIntoClipboard?.(extractedText);
    onShowToast?.('Inserted into room clipboard!', 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/80 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 text-[#ff5a1f]">
                <ScanText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Image Text Extractor (OCR)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-mono">
                    In-Browser
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 truncate max-w-sm">
                  {imageName || 'Extracting text from photo'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
            {/* Image Preview Thumbnail */}
            <div className="relative w-full min-h-[180px] sm:h-52 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
              {((imageName || '').toLowerCase().endsWith('.pdf') || imageUrl.toLowerCase().includes('.pdf')) ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <FileText className="w-10 h-10 text-rose-400 mb-2" />
                  <span className="text-white font-bold text-sm">PDF Document</span>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    In-browser OCR runs on raster photos (PNG, JPG, WebP). To view or copy text from this PDF, use the View button or open it in a tab.
                  </p>
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>Open PDF in Tab</span>
                  </a>
                </div>
              ) : (
                <>
                  <img
                    src={imageUrl}
                    alt="Source preview"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {!hasScanned && !isScanning && (
                    <button
                      onClick={runOCR}
                      className="absolute z-10 px-5 py-2.5 rounded-2xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white font-bold text-sm shadow-xl shadow-[#ff5a1f]/30 flex items-center gap-2 hover:scale-105 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Start OCR Scan</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Scanning Progress */}
            {isScanning && (
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-[#ff5a1f] animate-spin" />
                    <span>{progressStatus}</span>
                  </span>
                  <span className="font-bold text-[#ff5a1f]">{progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#ff5a1f] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Extracted Text Area */}
            {hasScanned && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recognized Text ({extractedText.length} characters)</span>
                  </span>
                  <button
                    onClick={runOCR}
                    className="text-xs text-[#ff5a1f] hover:underline"
                  >
                    Re-scan
                  </button>
                </div>

                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  placeholder="No readable text found."
                  className="w-full h-40 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono text-xs sm:text-sm leading-relaxed focus:outline-none focus:border-[#ff5a1f]/60 resize-y"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between gap-3">
            <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
              Runs 100% locally on your device via Web Workers
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Close
              </button>

              {hasScanned && extractedText && (
                <>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>

                  {onInsertIntoClipboard && (
                    <button
                      onClick={handleInsert}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5a1f]/20 hover:scale-[1.02]"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Paste to Room</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
