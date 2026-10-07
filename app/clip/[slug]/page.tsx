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
import { DevicePresenceList } from '@/components/DevicePresenceList';
import { P2PBeamModal } from '@/components/P2PBeamModal';
import { useWebRTCBeam } from '@/hooks/useWebRTCBeam';
import { ClipboardRoom, ClipItem, DevicePresence } from '@/lib/types';
import { getClientDeviceInfo, getBatteryStatus } from '@/lib/device';
import { ArrowLeft, RefreshCw, Smartphone, Zap } from 'lucide-react';
import Link from 'next/link';

export default function ClipRoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || 'default';

  const [roomData, setRoomData] = useState<ClipboardRoom | null>(null);
  const [mainContent, setMainContent] = useState('');
  const [snippets, setSnippets] = useState<ClipItem[]>([]);
  const [devices, setDevices] = useState<DevicePresence[]>([]);
  const [clientDevice, setClientDevice] = useState<Omit<DevicePresence, 'lastSeen'> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSseActive, setIsSseActive] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [pageUrl, setPageUrl] = useState('');

  const [remoteTypingUser, setRemoteTypingUser] = useState<{ name: string; color: string } | null>(null);

  const clientDeviceRef = useRef<Omit<DevicePresence, 'lastSeen'> | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLivePushTimeRef = useRef<number>(0);
  const livePushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLiveValRef = useRef<string | null>(null);
  const remoteTypingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Direct WebRTC P2P Beam Hook (Zero-Server Browser AirDrop)
  const fullClientDevice = clientDevice ? { ...clientDevice, lastSeen: Date.now() } : null;
  const {
    isModalOpen: isBeamModalOpen,
    setIsModalOpen: setIsBeamModalOpen,
    targetDevice: beamTargetDevice,
    setTargetDevice: setBeamTargetDevice,
    sendProgress: beamSendProgress,
    receiveProgress: beamReceiveProgress,
    incomingOffer: beamIncomingOffer,
    startSendFile: startBeamSendFile,
    acceptIncomingBeam,
    rejectIncomingBeam,
    cancelTransfer: cancelBeamTransfer,
    handleSignal: handleP2PSignal,
  } = useWebRTCBeam({
    slug,
    clientDevice: fullClientDevice,
    onShowToast: addToast,
  });

  const handleP2PSignalRef = useRef(handleP2PSignal);
  useEffect(() => {
    handleP2PSignalRef.current = handleP2PSignal;
  }, [handleP2PSignal]);

  // Initialize client device and URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageUrl(window.location.href);
      const devInfo = getClientDeviceInfo();
      clientDeviceRef.current = devInfo;
      setClientDevice(devInfo);

      // Async fetch battery if supported
      getBatteryStatus().then((battery) => {
        if (battery) {
          setClientDevice((prev) => {
            const next = prev ? { ...prev, battery } : prev;
            clientDeviceRef.current = next;
            return next;
          });
        }
      });

      // Save to recent rooms list in localStorage
      try {
        const saved = localStorage.getItem('the_drop_recent_rooms') || localStorage.getItem('clipbin_recent_rooms');
        const list: string[] = saved ? JSON.parse(saved) : [];
        if (!list.includes(slug)) {
          const updated = [slug, ...list.filter((s) => s !== slug)].slice(0, 10);
          localStorage.setItem('the_drop_recent_rooms', JSON.stringify(updated));
        }
      } catch (e) {}
    }
  }, [slug]);

  // Device Presence Heartbeat
  const sendPresenceHeartbeat = useCallback(async () => {
    if (!clientDevice) return;
    try {
      const res = await fetch(`/api/clip/${slug}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: clientDevice }),
      });
      const data = await res.json();
      if (data.success && data.data?.devices) {
        setDevices(data.data.devices);
      }
    } catch (e) {
      // silent fail on network hiccups
    }
  }, [clientDevice, slug]);

  // Periodic heartbeat every 3.5s + cleanup on unmount/unload
  useEffect(() => {
    if (!clientDevice) return;

    sendPresenceHeartbeat();
    const interval = setInterval(sendPresenceHeartbeat, 3500);

    const handleBeforeUnload = () => {
      if (clientDevice) {
        navigator.sendBeacon?.(`/api/clip/${slug}/presence?deviceId=${clientDevice.deviceId}`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (clientDevice) {
        fetch(`/api/clip/${slug}/presence?deviceId=${clientDevice.deviceId}`, {
          method: 'DELETE',
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [clientDevice, sendPresenceHeartbeat, slug]);

  // Fetch current data from server
  const fetchRoomData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setIsSyncing(true);
      try {
        const res = await fetch(`/api/clip/${slug}`);
        const data = await res.json();
        if (data.success && data.data) {
          const serverRoom: ClipboardRoom = data.data;
          setRoomData((prev) => {
            const mergedFiles =
              serverRoom.files && serverRoom.files.length > 0
                ? serverRoom.files
                : (prev?.files && prev.files.length > 0 ? prev.files : serverRoom.files || []);

            return {
              ...serverRoom,
              files: mergedFiles,
            };
          });

          if (!isTypingRef.current) {
            setMainContent(serverRoom.mainContent || '');
          }
          setSnippets(serverRoom.snippets || []);
          if (serverRoom.activeDevices) {
            setDevices(serverRoom.activeDevices);
          }
        }
      } catch (e) {
        console.error('Failed syncing clipboard data:', e);
      } finally {
        if (!isSilent) setIsSyncing(false);
      }
    },
    [slug]
  );

  // Initial fetch + SSE Live Stream (<50ms push) + 10s relaxed backup poll
  useEffect(() => {
    fetchRoomData();

    // 1. Connect real-time Server-Sent Events (SSE) stream
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/clip/${slug}/stream`);

      es.addEventListener('connected', (e: MessageEvent) => {
        setIsSseActive(true);
        try {
          const payload = JSON.parse(e.data);
          if (payload.room) {
            setRoomData((prev) => {
              const mergedFiles =
                payload.room.files && payload.room.files.length > 0
                  ? payload.room.files
                  : (prev?.files && prev.files.length > 0 ? prev.files : payload.room.files || []);

              return {
                ...payload.room,
                files: mergedFiles,
              };
            });

            if (!isTypingRef.current) {
              setMainContent(payload.room.mainContent || '');
            }
            setSnippets(payload.room.snippets || []);
          }
        } catch {}
      });

      es.addEventListener('live_typing', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          const currentDev = clientDeviceRef.current || (typeof window !== 'undefined' ? getClientDeviceInfo() : null);
          const myId = currentDev?.deviceId;

          // If update came from local device/tab, ignore
          if (payload.senderDeviceId && myId && payload.senderDeviceId === myId) {
            return;
          }

          if (typeof payload.mainContent === 'string') {
            // Reflect remote keystroke immediately
            if (!isTypingRef.current) {
              setMainContent(payload.mainContent);
            }
          }

          const remoteName = payload.senderDeviceName || 'Connected Peer';
          const remoteColor = payload.senderColor || '#10b981';
          setRemoteTypingUser({ name: remoteName, color: remoteColor });

          if (remoteTypingTimerRef.current) clearTimeout(remoteTypingTimerRef.current);
          remoteTypingTimerRef.current = setTimeout(() => {
            setRemoteTypingUser(null);
          }, 2000);
        } catch (err) {
          console.error('SSE live_typing parse error:', err);
        }
      });

      es.addEventListener('update', (e: MessageEvent) => {
        try {
          const updated: ClipboardRoom = JSON.parse(e.data);
          setRoomData((prev) => {
            const mergedFiles =
              updated.files && updated.files.length > 0
                ? updated.files
                : (prev?.files && prev.files.length > 0 ? prev.files : updated.files || []);

            return {
              ...updated,
              files: mergedFiles,
            };
          });

          // Update editor content instantly if local user is not actively typing
          if (!isTypingRef.current) {
            setMainContent(updated.mainContent || '');
          }
          setSnippets(updated.snippets || []);
        } catch (err) {
          console.error('SSE update parse error:', err);
        }
      });

      // P2P WebRTC Direct Beam Signal Handler (<10ms low latency)
      es.addEventListener('p2p_signal', (e: MessageEvent) => {
        try {
          const sig = JSON.parse(e.data);
          handleP2PSignalRef.current(sig);
        } catch (err) {
          console.error('SSE p2p_signal parse error:', err);
        }
      });

      es.onerror = () => {
        setIsSseActive(false);
      };
    } catch (e) {
      console.error('SSE init error:', e);
    }

    // 2. Relaxed backup poll every 10s (reduced requests by 80%)
    const backupInterval = setInterval(() => {
      fetchRoomData(true);
    }, 10000);

    return () => {
      clearInterval(backupInterval);
      if (es) es.close();
    };
  }, [fetchRoomData, slug]);

  // Fast sub-50ms live typing push
  const pushLiveTyping = async (text: string) => {
    try {
      const dev = clientDeviceRef.current || (typeof window !== 'undefined' ? getClientDeviceInfo() : null);
      const devId = dev?.deviceId || (typeof window !== 'undefined' ? sessionStorage.getItem('the_drop_device_id') : 'peer');
      const devName = dev?.deviceName || 'Peer Device';
      const devColor = dev?.color || '#10b981';

      await fetch(`/api/clip/${slug}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainContent: text,
          senderDeviceId: devId,
          senderDeviceName: devName,
          senderColor: devColor,
        }),
      });
    } catch {}
  };

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
    }
  };

  // Ultra-responsive typing sync: 50ms leading/trailing push & debounced 600ms DB persist
  const handleMainContentChange = (val: string) => {
    setMainContent(val);
    isTypingRef.current = true;
    pendingLiveValRef.current = val;

    // Reset local typing lock 350ms after user pauses
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 350);

    // 1. Sub-50ms instant live broadcast to all connected devices
    const now = Date.now();
    const timeSinceLast = now - lastLivePushTimeRef.current;

    if (timeSinceLast >= 50) {
      lastLivePushTimeRef.current = now;
      pushLiveTyping(val);
    } else {
      if (livePushTimerRef.current) clearTimeout(livePushTimerRef.current);
      livePushTimerRef.current = setTimeout(() => {
        lastLivePushTimeRef.current = Date.now();
        pushLiveTyping(pendingLiveValRef.current ?? val);
      }, 50 - timeSinceLast);
    }

    // 2. Background persistent DB save (debounced 600ms)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persistRoomState(val, snippets);
    }, 600);
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
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden flex flex-col justify-between bg-zinc-950 text-zinc-100 font-sans relative">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[500px] h-[350px] bg-[#ff5a1f]/10 blur-[140px] rounded-full pointer-events-none -z-10" />

      <Navbar currentRoom={slug} onOpenQR={() => setIsQRModalOpen(true)} isSyncing={isSyncing} />

      <main className="flex-1 max-w-5xl sm:max-w-6xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-8 flex flex-col gap-3.5 sm:gap-6">
        {/* Navigation Breadcrumb & Room Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white flex flex-wrap items-center gap-2">
                <span className="text-zinc-400 font-medium">Room:</span>
                <span className="font-mono text-[#ff5a1f]">{slug}</span>
                {remoteTypingUser && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold border shadow-sm animate-pulse"
                    style={{
                      backgroundColor: `${remoteTypingUser.color}25`,
                      borderColor: `${remoteTypingUser.color}80`,
                      color: remoteTypingUser.color,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: remoteTypingUser.color }}
                    />
                    <span>{remoteTypingUser.name} typing live...</span>
                  </span>
                )}
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
                Share this room URL or scan QR code to access clipboard live across devices.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => fetchRoomData()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs font-mono transition-colors"
              title="Sync manually"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#ff5a1f] ${isSyncing ? 'animate-spin' : ''}`} />
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

        {/* Live Device Presence Indicator Radar */}
        <DevicePresenceList
          devices={devices}
          currentDeviceId={clientDevice?.deviceId}
          onOpenQR={() => setIsQRModalOpen(true)}
          roomSlug={slug}
          onBeamDevice={(dev) => {
            setBeamTargetDevice(dev);
            setIsBeamModalOpen(true);
          }}
          onOpenP2P={() => setIsBeamModalOpen(true)}
        />

        {/* Main Editor Component with Code & .env Auto-detection & Syntax Highlighting */}
        <ClipEditor
          slug={slug}
          initialContent={mainContent}
          onSave={handleMainContentChange}
          isSaving={isSaving}
          lastUpdated={roomData?.updatedAt}
          onShowToast={addToast}
          onOpenQR={() => setIsQRModalOpen(true)}
          remoteTypingUser={remoteTypingUser}
        />

        <div className="w-full max-w-5xl flex flex-col gap-3">
          <FileUpload
            slug={slug}
            onUploaded={() => fetchRoomData()}
            onShowToast={addToast}
            onOpenP2P={() => setIsBeamModalOpen(true)}
          />

          {/* File listing with in-browser OCR */}
          <FileList
            files={roomData?.files}
            slug={slug}
            onDeleted={(deletedId) => {
              if (deletedId) {
                setRoomData((prev) =>
                  prev ? { ...prev, files: (prev.files || []).filter((f) => f.id !== deletedId) } : prev
                );
              }
              fetchRoomData(true);
            }}
            onInsertIntoClipboard={(text) => {
              const nextContent = mainContent ? `${mainContent}\n\n${text}` : text;
              handleMainContentChange(nextContent);
            }}
            onShowToast={addToast}
          />
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
          Connected to Room <code className="text-[#ff5a1f]">{slug}</code> • Live Peer Radar & Real-time Sync
        </div>
      </footer>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        url={pageUrl}
        roomSlug={slug}
      />

      {/* P2P Zero-Server WebRTC Beam Modal */}
      <P2PBeamModal
        isOpen={isBeamModalOpen}
        onClose={() => setIsBeamModalOpen(false)}
        devices={devices}
        currentDeviceId={clientDevice?.deviceId}
        targetDevice={beamTargetDevice}
        onSelectTargetDevice={setBeamTargetDevice}
        sendProgress={beamSendProgress}
        receiveProgress={beamReceiveProgress}
        incomingOffer={beamIncomingOffer}
        onStartBeam={startBeamSendFile}
        onAcceptBeam={acceptIncomingBeam}
        onRejectBeam={rejectIncomingBeam}
        onCancelBeam={cancelBeamTransfer}
      />

      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
