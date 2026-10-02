'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import {
  Camera,
  ScanText,
  Zap,
  Shield,
  Smartphone,
  ArrowRight,
  Sparkles,
  Wifi,
  QrCode,
  FileCode2,
  Terminal,
  ExternalLink,
  Cpu,
  Layers,
  CheckCircle2,
  Mic,
} from 'lucide-react';

export default function SolutionsPage() {
  const router = useRouter();

  const handleCreateRoom = async () => {
    try {
      const res = await fetch('/api/clip', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data?.slug) {
        router.push(`/clip/${data.data.slug}`);
      }
    } catch {
      const fallback = `clip-${Math.random().toString(36).substring(2, 8)}`;
      router.push(`/clip/${fallback}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#111111] text-zinc-100 font-sans selection:bg-[#ff5a1f]/30 selection:text-[#ff5a1f]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col items-center text-center">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] h-[350px] bg-[#ff5a1f]/10 blur-[150px] rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5a1f]/10 border border-[#ff5a1f]/30 text-[#ff5a1f] text-xs font-mono font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Engineered Solutions</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[1.05]">
          Built to Eliminate <br />
          <span className="text-[#ff5a1f]">Cross-Device Friction</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base sm:text-lg text-zinc-400 leading-relaxed">
          Stop emailing screenshots to yourself, fighting Bluetooth AirDrop dropouts, or
          cluttering WhatsApp chats. The Drop provides instant, zero-login bridges between your
          phone, laptop, and desktop.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleCreateRoom}
            className="px-6 py-3.5 rounded-2xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-sm sm:text-base font-bold flex items-center gap-2 shadow-lg shadow-[#ff5a1f]/20 hover:scale-[1.02] transition-all"
          >
            <span>Launch Instant Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            href="/"
            className="px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm sm:text-base font-semibold transition-colors"
          >
            Explore 3D Globe
          </Link>
        </div>
      </section>

      {/* Main Solution Feature: Camera Snap-to-Drop & In-Browser OCR */}
      <section id="snap-ocr" className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#ff5a1f]/10 blur-[100px] pointer-events-none rounded-full" />

          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Left Narrative */}
            <div className="flex-1 flex flex-col items-start text-left gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 text-[#ff5a1f] text-xs font-mono font-bold uppercase">
                <Camera className="w-3.5 h-3.5" />
                <span>Featured Solution</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                Camera Snap-to-Drop & <br />
                <span className="text-[#ff5a1f]">In-Browser OCR Extractor</span>
              </h2>

              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
                Taking a photo of a whiteboard, receipt, tracking label, or book on your phone to
                use on your laptop used to take minutes of manual steps. With The Drop:
              </p>

              {/* The Old Way vs The Drop */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 font-mono text-xs">
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-850 flex flex-col gap-2">
                  <span className="text-rose-400 font-bold uppercase tracking-wider">
                    ✕ The Old Frustrating Way
                  </span>
                  <ul className="text-zinc-500 space-y-1.5 leading-relaxed">
                    <li>• Self-message on WhatsApp (compresses image).</li>
                    <li>• Wait 4 mins for iCloud/Google Photos sync.</li>
                    <li>• Manually type code or text from image.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-[#ff5a1f]/10 border border-[#ff5a1f]/30 flex flex-col gap-2">
                  <span className="text-[#ff5a1f] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>The Drop Solution</span>
                  </span>
                  <ul className="text-zinc-300 space-y-1.5 leading-relaxed">
                    <li>• Tap <strong className="text-white">&quot;Snap to Drop&quot;</strong> on phone camera.</li>
                    <li>• Pops up full-resolution on your laptop.</li>
                    <li>• 1-click <strong className="text-white">OCR text extraction</strong> into clipboard.</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  onClick={handleCreateRoom}
                  className="px-5 py-2.5 rounded-xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-[#ff5a1f]/20 transition-all hover:scale-[1.02]"
                >
                  <Camera className="w-4 h-4" />
                  <span>Try Snap-to-Drop Now</span>
                </button>
              </div>
            </div>

            {/* Right Visual Interactive Mockup */}
            <div className="w-full lg:w-[420px] rounded-2xl bg-zinc-950 border border-zinc-800 p-5 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-zinc-200">
                    ROOM #STUDY-SYNC
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Live WebAssembly OCR</span>
              </div>

              {/* Sample Photo Preview */}
              <div className="relative rounded-xl bg-zinc-900 border border-zinc-850 p-3 overflow-hidden flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#ff5a1f]" />
                    <span>Whiteboard_Notes.jpg</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">1.8 MB • Full Res</span>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 font-mono text-[11px] text-zinc-400 leading-relaxed">
                  <p className="text-emerald-400 font-semibold mb-1">
                    ✓ Recognized Text (1-click copied):
                  </p>
                  <code>
                    export const API_URL = &quot;https://api.thedrop.app/v1&quot;;
                    <br />
                    curl -s -X POST /api/clip -d &quot;payload&quot;
                  </code>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <div className="px-3 py-1 rounded-lg bg-[#ff5a1f]/15 border border-[#ff5a1f]/30 text-[#ff5a1f] text-[11px] font-bold flex items-center gap-1.5">
                    <ScanText className="w-3 h-3" />
                    <span>OCR Extracted in 0.8s</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 font-mono text-center">
                Runs 100% locally in your browser. Images are never processed by external AI servers.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Pillars Solution Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
            Everything You Need For Frictionless Sharing
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2">
            Designed for developers, designers, and power users who work across multiple devices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Solution Pillar 1 */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Sub-50ms Real-Time Push (SSE)</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              No 2.5-second polling delay. Server-Sent Events stream keystrokes and drops
              instantaneously between screens like a collaborative document with 80% fewer server requests.
            </p>
            <div className="mt-auto pt-2 flex items-center gap-2 text-xs font-mono text-amber-400">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Zero-lag live streaming</span>
            </div>
          </div>

          {/* Solution Pillar 2: Voice Drop */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">1-Tap Voice Memo Drop</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Hold the mic button on mobile to speak an idea, audio note, or reminder. Appears
              instantly on your desktop as an interactive audio waveform card with scrub and play.
            </p>
            <div className="mt-auto pt-2 flex items-center gap-2 text-xs font-mono text-rose-400">
              <Mic className="w-3.5 h-3.5" />
              <span>Instant audio waveform</span>
            </div>
          </div>

          {/* Solution Pillar 3: Mobile QR */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Mobile QR & Same-WiFi Radar</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Open on your desktop, point your phone camera at the QR code, and you are in the same
              room instantly. Auto-detects devices sharing the same local WiFi router.
            </p>
            <div className="mt-auto pt-2 flex items-center gap-2 text-xs font-mono text-indigo-400">
              <Wifi className="w-3.5 h-3.5" />
              <span>Zero-pairing required</span>
            </div>
          </div>

          {/* Solution Pillar 4: Code & .env */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileCode2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Smart Code & .env Intelligence</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Auto-detects TypeScript, Python, JSON, SQL, and .env files. Automatically masks
              sensitive API keys with toggleable eyes, and formats code with 1 click.
            </p>
            <div className="mt-auto pt-2 flex items-center gap-2 text-xs font-mono text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Secret auto-masking</span>
            </div>
          </div>

          {/* Solution Pillar 5: Smart Link */}
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ff5a1f]/10 border border-[#ff5a1f]/20 text-[#ff5a1f] flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white">Smart Link Unfurl & Micro QR</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Paste YouTube, GitHub, or Figma links and see them unfurl into rich cards with
              thumbnails, titles, and individual micro QR codes for instant mobile jumping.
            </p>
            <div className="mt-auto pt-2 flex items-center gap-2 text-xs font-mono text-[#ff5a1f]">
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Multi-link vertical stack</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-center">
        <div className="p-8 sm:p-10 rounded-3xl bg-zinc-950 border border-zinc-800 flex flex-col items-center gap-4">
          <h3 className="text-2xl sm:text-3xl font-black text-white uppercase">
            Ready to Drop across your devices?
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
            No registration, no cookies, no tracking. Create a room in 1 second.
          </p>
          <button
            onClick={handleCreateRoom}
            className="mt-2 px-7 py-3 rounded-2xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-sm font-bold shadow-lg shadow-[#ff5a1f]/25 hover:scale-105 transition-all"
          >
            Launch Room Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-6 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-zinc-500 font-mono">
          THE DROP • Universal Cross-Device Clipboard & Camera Drop
        </div>
      </footer>
    </div>
  );
}
