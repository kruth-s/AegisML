# ClipBin.live — Cross-Device Online Clipboard

A modern, real-time, cross-device online clipboard built with **Next.js 14**, **Tailwind CSS**, and optimized for **Vercel** serverless deployment.

## Features

- ⚡ **Instant Cross-Device Sync**: Create a room URL (e.g. `/clip/my-room`) or generate a 6-character code. Text updates live across all connected devices.
- 📱 **Mobile QR Pairing**: Click **Pair Mobile QR** on desktop and scan with your phone camera to open the room on mobile instantly.
- 📋 **One-Click Clipboard**: Instant "Paste from Clipboard" and "Copy All" buttons with toast notifications.
- 🔍 **Format Detection**: Auto-detects Plain Text, URLs, JSON schemas, and Code snippets.
- 📊 **Live Stats**: Line count, word count, character count, and live auto-save indicators.
- 📦 **Multi-Snippet Manager**: Store multiple distinct clip cards inside a single room.
- 🚀 **Vercel Ready**: Zero-config local storage fallback + optional Upstash Redis / Vercel KV REST integration.

## Getting Started

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the project into Vercel.
3. (Optional for persistent serverless storage across edge regions) Attach a **Vercel KV** or **Upstash Redis** store in your Vercel Dashboard project settings.
