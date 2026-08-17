import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Drop',
  description: 'Instantly paste and share text, code snippets, and notes across all your devices in real-time. Zero sign-up, instant QR pairing.',
  keywords: ['online clipboard', 'cross device clipboard', 'share text online', 'pastebin', 'realtime clipboard', 'the drop'],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-grid-pattern min-h-screen flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 antialiased font-sans text-zinc-100">
        {children}
      </body>
    </html>
  );
}
