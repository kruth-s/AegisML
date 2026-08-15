import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClipBin.live — Modern Cross-Device Online Clipboard',
  description: 'Instantly paste and share text, code snippets, and notes across all your devices in real-time. Zero sign-up, instant QR pairing, Vercel optimized.',
  keywords: ['online clipboard', 'cross device clipboard', 'share text online', 'pastebin', 'realtime clipboard', 'vercel pastebin'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-mesh min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white antialiased">
        {children}
      </body>
    </html>
  );
}
