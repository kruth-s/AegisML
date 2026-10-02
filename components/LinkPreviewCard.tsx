'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ExternalLink,
  Copy,
  Check,
  Globe,
  QrCode,
  Share2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LinkMetadata {
  url: string;
  title: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  domain: string;
  type?: 'youtube' | 'github' | 'twitter' | 'figma' | 'article' | 'website';
}

interface LinkPreviewCardProps {
  url: string;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url, onShowToast }) => {
  const [meta, setMeta] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showLargeQR, setShowLargeQR] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    async function fetchMetadata() {
      try {
        const res = await fetch(`/api/unfurl?url=${encodeURIComponent(url.trim())}`);
        const json = await res.json();
        if (!isCancelled && json.success && json.data) {
          setMeta(json.data);
        }
      } catch (e) {
        // Fallback to domain if network fails
        if (!isCancelled) {
          try {
            const parsed = new URL(url);
            setMeta({
              url,
              title: parsed.hostname,
              domain: parsed.hostname,
              favicon: `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`,
            });
          } catch {}
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      fetchMetadata();
    } else {
      setLoading(false);
    }

    return () => {
      isCancelled = true;
    };
  }, [url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onShowToast?.('Link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onShowToast?.('Failed to copy link', 'error');
    }
  };

  const domain = meta?.domain || (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'link';
    }
  })();

  return (
    <div className="w-full rounded-2xl bg-zinc-950/90 border border-zinc-800 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-xs font-mono text-zinc-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#ff5a1f]" />
          <span className="font-bold text-white tracking-wide uppercase">Smart Link Preview</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400 truncate max-w-[200px]">{domain}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowLargeQR(!showLargeQR)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
              showLargeQR
                ? 'bg-[#ff5a1f]/20 border-[#ff5a1f]/40 text-[#ff5a1f]'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:text-white'
            }`}
            title="Scan QR on mobile"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Copy link URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start">
        {/* Left: Thumbnail (if present) or Large Icon */}
        {meta?.image ? (
          <div className="w-full md:w-56 h-36 md:h-32 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 shrink-0 relative group">
            <img
              src={meta.image}
              alt={meta.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Hide broken images
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : null}

        {/* Center: Title, Description, Meta & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch gap-2.5">
          <div>
            {/* Favicon & Site Name */}
            <div className="flex items-center gap-2 mb-1.5">
              {meta?.favicon ? (
                <img
                  src={meta.favicon}
                  alt=""
                  className="w-4 h-4 rounded-sm object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wide">
                {meta?.siteName || domain}
              </span>
            </div>

            {/* Title */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base sm:text-lg font-bold text-white hover:text-[#ff5a1f] transition-colors line-clamp-2 leading-snug"
            >
              {loading ? (
                <div className="h-6 w-3/4 bg-zinc-800 rounded animate-pulse" />
              ) : (
                meta?.title || url
              )}
            </a>

            {/* Description */}
            <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
              {loading ? (
                <div className="h-4 w-full bg-zinc-850 rounded animate-pulse mt-1" />
              ) : (
                meta?.description || url
              )}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5a1f]/20 hover:scale-[1.02]"
            >
              <span>Open on this Device</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 text-xs font-medium transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Micro QR Code for Phone Camera Instant Jump */}
        <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-zinc-300/40 shrink-0 self-center shadow-lg">
          <QRCodeSVG
            value={url}
            size={90}
            level="M"
            includeMargin={false}
          />
          <span className="text-[10px] font-sans font-bold text-zinc-800 mt-1.5 tracking-tight text-center">
            Scan to Open
          </span>
        </div>
      </div>

      {/* Expandable Large QR Modal / Panel */}
      <AnimatePresence>
        {showLargeQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 bg-zinc-900/90 border-t border-zinc-800 flex flex-col items-center text-center gap-3"
          >
            <p className="text-xs font-mono text-zinc-300">
              Point your phone camera at this QR code to jump straight to the link:
            </p>
            <div className="p-4 bg-white rounded-2xl shadow-2xl">
              <QRCodeSVG
                value={url}
                size={180}
                level="Q"
                includeMargin={false}
              />
            </div>
            <p className="text-[11px] font-mono text-zinc-500 break-all max-w-md">
              {url}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
