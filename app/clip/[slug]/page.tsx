'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ClipEditor } from '@/components/ClipEditor';
import { SnippetsList } from '@/components/SnippetsList';
import { QRCodeModal } from '@/components/QRCodeModal';
import { FileUpload } from '@/components/FileUpload';
import { FileList } from '@/components/FileList';
import { Toast, ToastMessage } from '@/components/Toast';
import { ClipboardRoom, ClipItem } from '@/lib/types';
import { ArrowLeft, RefreshCw, Smartphone } from 'lucide-react';
import Link from 'next/link';

export default function ClipRoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || 'default';

  const [roomData, setRoomData] = useState<ClipboardRoom | null>(null);
  const [mainContent, setMainContent] = useState('');
  const [snippets, setSnippets] = useState<ClipItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pageUrl, setPageUrl] = useState('');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Set Page URL on mount for QR code
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);

      // Save to recent rooms list in localStorage
      try {
        const saved = localStorage.getItem('clipbin_recent_rooms');
        const list: string[] = saved ? JSON.parse(saved) : [];
        if (!list.includes(slug)) {
          const updated = [slug, ...list.filter((s) => s !== slug)].slice(0, 10);
          localStorage.setItem('clipbin_recent_rooms', JSON.stringify(updated));
        }
      } catch (e) {}
    }
  }, [slug]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch current data from server
  const fetchRoomData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsSyncing(true);
      try {
        const res = await fetch(`/api/clip/${slug}`);
        const data = await res.json();
        if (data.success && data.data) {
          const serverRoom: ClipboardRoom = data.data;
          setRoomData(serverRoom);

          if (!isTypingRef.current) {
            setMainContent(serverRoom.mainContent || '');
          }
          setSnippets(serverRoom.snippets || []);
        }
      } catch (e) {
        console.error('Failed syncing clipboard data:', e);
      } finally {
        if (!isSilent) setIsSyncing(false);
      }
    },
    [slug]
  );

  // Initial fetch + Auto polling every 2.5s
  useEffect(() => {
    fetchRoomData();
    const interval = setInterval(() => {
      fetchRoomData(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [fetchRoomData]);

  // Save updated room state to server
  const persistRoomState = async (newMainContent: string, newSnippets: ClipItem[]) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/clip/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainContent: newMainContent,
          snippets: newSnippets,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRoomData(data.data);
      }
    } catch (e) {
      console.error('Error saving clip room:', e);
    } finally {
      setIsSaving(false);
      isTypingRef.current = false;
    }
  };

  // Editor content change handler with 400ms debounce
  const handleMainContentChange = (val: string) => {
    setMainContent(val);
    isTypingRef.current = true;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistRoomState(val, snippets);
    }, 400);
  };

  // Add new snippet card
  const handleAddSnippet = (content: string, title?: string) => {
    const newItem: ClipItem = {
      id: Math.random().toString(36).substring(2, 9),
      content,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...snippets];
    setSnippets(updated);
    persistRoomState(mainContent, updated);
  };

  // Delete snippet card
  const handleDeleteSnippet = (id: string) => {
    const updated = snippets.filter((s) => s.id !== id);
    setSnippets(updated);
    persistRoomState(mainContent, updated);
    addToast('Snippet removed', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 font-sans relative">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none -z-10" />

      <Navbar currentRoom={slug} onOpenQR={() => setIsQRModalOpen(true)} isSyncing={isSyncing} />

      <main className="flex-1 max-w-5xl sm:max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        {/* Navigation Breadcrumb & Room Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span className="text-zinc-400 font-medium">Room:</span>
                <span className="font-mono text-indigo-400">{slug}</span>
              </h1>
              <p className="text-xs text-zinc-500">
                Share this room URL or scan QR code to access clipboard live across devices.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRoomData()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs font-mono transition-colors"
              title="Sync manually"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsQRModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile QR Code</span>
            </button>
          </div>
        </div>

        {/* Main Editor Component */}
        <ClipEditor
          slug={slug}
          initialContent={mainContent}
          onSave={handleMainContentChange}
          isSaving={isSaving}
          lastUpdated={roomData?.updatedAt}
          onShowToast={addToast}
          onOpenQR={() => setIsQRModalOpen(true)}
        />

        <div className="w-full max-w-5xl">
          <FileUpload slug={slug} onUploaded={() => fetchRoomData()} />

          {/* File listing */}
          <FileList files={roomData?.files} slug={slug} onDeleted={() => fetchRoomData()} />
        </div>

        {/* Additional Snippets List Component */}
        <SnippetsList
          snippets={snippets}
          onAddSnippet={handleAddSnippet}
          onDeleteSnippet={handleDeleteSnippet}
          onShowToast={addToast}
        />
      </main>

      {/* Sleek Dark Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-5">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-zinc-500 font-mono">
          Connected to Room <code className="text-indigo-400">{slug}</code> • Real-time Cross-Device Sync
        </div>
      </footer>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        url={pageUrl}
        roomSlug={slug}
      />

      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}

