'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { DevicePresence } from '@/lib/types';
import {
  RTC_CONFIG,
  BeamProgress,
  BeamFileMetadata,
  sendFileOverDataChannel,
} from '@/lib/webrtcBeam';
import { P2PSignalMessage } from '@/lib/p2pSignaling';

interface UseWebRTCBeamProps {
  slug: string;
  clientDevice: DevicePresence | null;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export function useWebRTCBeam({ slug, clientDevice, onShowToast }: UseWebRTCBeamProps) {
  // Modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetDevice, setTargetDevice] = useState<DevicePresence | null>(null);

  // Transfer states
  const [sendProgress, setSendProgress] = useState<BeamProgress | null>(null);
  const [receiveProgress, setReceiveProgress] = useState<BeamProgress | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<{
    signalId: string;
    fromDeviceId: string;
    fromDeviceName: string;
    fromDeviceType?: string;
    fileMeta: { name: string; size: number; type: string };
    offerSdp: RTCSessionDescriptionInit;
  } | null>(null);

  // SendAnywhere-style 6-Digit Key & Relay states
  const [relayActiveCode, setRelayActiveCode] = useState<string | null>(null);
  const [isRelayUploading, setIsRelayUploading] = useState(false);
  const [incomingRelay, setIncomingRelay] = useState<{
    code: string;
    filename: string;
    size: number;
    senderDeviceName: string;
  } | null>(null);

  // Active Peer Connection and Data Channel refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const activePeerIdRef = useRef<string | null>(null);
  const receivedChunksRef = useRef<ArrayBuffer[]>([]);
  const currentReceivingMetaRef = useRef<BeamFileMetadata | null>(null);
  const currentSendingFileRef = useRef<File | null>(null);

  // Send a signal via API
  const sendSignal = useCallback(
    async (
      toDeviceId: string,
      signalType: 'offer' | 'answer' | 'ice' | 'reject' | 'cancel',
      data: any
    ) => {
      if (!clientDevice) return;
      try {
        await fetch(`/api/clip/${slug}/signal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromDeviceId: clientDevice.deviceId,
            fromDeviceName: clientDevice.deviceName,
            fromDeviceType: clientDevice.deviceType,
            toDeviceId,
            signalType,
            data,
          }),
        });
      } catch (e) {
        console.error('Failed to send P2P signal:', e);
      }
    },
    [clientDevice, slug]
  );

  // Cleanup active connection
  const cleanupConnection = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    activePeerIdRef.current = null;
  }, []);

  // Handle incoming signaling messages
  const handleSignal = useCallback(
    async (signal: P2PSignalMessage) => {
      if (!clientDevice || signal.toDeviceId !== clientDevice.deviceId) return;

      const { signalType, fromDeviceId, fromDeviceName, fromDeviceType, data } = signal;

      // 1. INCOMING OFFER: Remote device wants to beam a file
      if (signalType === 'offer') {
        const { offerSdp, fileMeta } = data;
        setIncomingOffer({
          signalId: signal.id,
          fromDeviceId,
          fromDeviceName,
          fromDeviceType,
          fileMeta,
          offerSdp,
        });
        setIsModalOpen(true);
        onShowToast?.(`⚡ ${fromDeviceName} wants to beam "${fileMeta.name}"`, 'info');
      }

      // 2. INCOMING ANSWER: Remote device accepted our beam
      else if (signalType === 'answer') {
        const { answerSdp } = data;
        if (pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answerSdp));
          } catch (e: any) {
            console.error('Failed setting remote description answer:', e);
          }
        }
      }

      // 3. INCOMING ICE CANDIDATE
      else if (signalType === 'ice') {
        const { candidate } = data;
        if (pcRef.current && candidate) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding received ICE candidate:', e);
          }
        }
      }

      // 4. REJECT OR CANCEL
      else if (signalType === 'reject') {
        onShowToast?.(`${fromDeviceName} declined the file transfer`, 'info');
        cleanupConnection();
        setSendProgress((prev) => (prev ? { ...prev, state: 'error', error: 'Declined by peer' } : null));
      } else if (signalType === 'cancel') {
        cleanupConnection();
        setIncomingOffer(null);
        setReceiveProgress(null);
        onShowToast?.('Transfer cancelled by sender', 'info');
      } else if (signalType === 'relay_ready') {
        const { code, filename, size, senderDeviceName } = data;
        onShowToast?.(`🔢 ${senderDeviceName} shared "${filename}" (Code: ${code})`, 'info');
        setIncomingRelay({
          code,
          filename,
          size,
          senderDeviceName,
        });
      }
    },
    [clientDevice, cleanupConnection, onShowToast]
  );

  // Poll for pending signals periodically as fallback if SSE is delayed
  useEffect(() => {
    if (!clientDevice) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/clip/${slug}/signal?deviceId=${clientDevice.deviceId}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          for (const sig of json.data) {
            handleSignal(sig);
          }
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [clientDevice, slug, handleSignal]);

  // Initiate sending file to chosen device
  const startSendFile = useCallback(
    async (target: DevicePresence, file: File) => {
      if (!clientDevice) return;
      cleanupConnection();

      currentSendingFileRef.current = file;
      setTargetDevice(target);
      setIsModalOpen(true);
      setSendProgress({
        state: 'connecting',
        filename: file.name,
        totalBytes: file.size,
        transferredBytes: 0,
        percentage: 0,
        speedMBps: 0,
        etaSeconds: 0,
      });

      try {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;
        activePeerIdRef.current = target.deviceId;

        // Collect and send ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal(target.deviceId, 'ice', { candidate: event.candidate });
          }
        };

        // Create reliable DataChannel
        const dc = pc.createDataChannel('fileTransfer', {
          ordered: true,
        });
        dataChannelRef.current = dc;

        // Create SDP Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send Offer + File Meta to remote peer
        await sendSignal(target.deviceId, 'offer', {
          offerSdp: offer,
          fileMeta: {
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
          },
        });

        // When data channel opens, begin high-speed stream
        dc.onopen = async () => {
          onShowToast?.(`⚡ Connected to ${target.deviceName}! Beaming at local Wi-Fi speed...`, 'success');
          try {
            await sendFileOverDataChannel(file, dc, (prog) => {
              setSendProgress(prog);
            });
            onShowToast?.(`⚡ Beamed "${file.name}" to ${target.deviceName}!`, 'success');
          } catch (e: any) {
            setSendProgress((prev) =>
              prev ? { ...prev, state: 'error', error: e.message } : null
            );
            onShowToast?.(`Transfer interrupted: ${e.message}`, 'error');
          }
        };

        dc.onerror = (e) => {
          console.error('DataChannel error:', e);
          setSendProgress((prev) => (prev ? { ...prev, state: 'error', error: 'Connection error' } : null));
        };
      } catch (err: any) {
        console.error('Failed to initiate P2P beam:', err);
        setSendProgress({
          state: 'error',
          filename: file.name,
          totalBytes: file.size,
          transferredBytes: 0,
          percentage: 0,
          speedMBps: 0,
          etaSeconds: 0,
          error: err.message || 'Failed to start WebRTC session',
        });
      }
    },
    [clientDevice, cleanupConnection, sendSignal, onShowToast]
  );

  // Accept incoming beam
  const acceptIncomingBeam = useCallback(async () => {
    if (!incomingOffer || !clientDevice) return;
    const { fromDeviceId, offerSdp, fileMeta } = incomingOffer;

    cleanupConnection();
    receivedChunksRef.current = [];
    currentReceivingMetaRef.current = null;

    setReceiveProgress({
      state: 'connecting',
      filename: fileMeta.name,
      totalBytes: fileMeta.size,
      transferredBytes: 0,
      percentage: 0,
      speedMBps: 0,
      etaSeconds: 0,
    });

    try {
      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      activePeerIdRef.current = fromDeviceId;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(fromDeviceId, 'ice', { candidate: event.candidate });
        }
      };

      let bytesReceived = 0;
      let lastTime = Date.now();
      let lastBytes = 0;
      let currentSpeed = 0;

      // Handle remote incoming DataChannel
      pc.ondatachannel = (event) => {
        const dc = event.channel;
        dataChannelRef.current = dc;
        dc.binaryType = 'arraybuffer';

        dc.onmessage = (msgEvent) => {
          // Check for JSON message (HEADER or DONE)
          if (typeof msgEvent.data === 'string') {
            try {
              const msg = JSON.parse(msgEvent.data);
              if (msg.type === 'HEADER') {
                currentReceivingMetaRef.current = msg;
                setReceiveProgress({
                  state: 'transferring',
                  filename: msg.filename,
                  totalBytes: msg.size,
                  transferredBytes: 0,
                  percentage: 0,
                  speedMBps: 0,
                  etaSeconds: 0,
                });
              } else if (msg.type === 'DONE') {
                // Assembly complete!
                const resolvedFilename = currentReceivingMetaRef.current?.filename || fileMeta.name;
                const resolvedMime = currentReceivingMetaRef.current?.mimeType || fileMeta.type || 'application/octet-stream';
                const resolvedSize = currentReceivingMetaRef.current?.size || fileMeta.size;

                const blob = new Blob(receivedChunksRef.current, {
                  type: resolvedMime,
                });
                const blobUrl = URL.createObjectURL(blob);

                // Auto-trigger browser download for receiver
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = resolvedFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                setReceiveProgress({
                  state: 'completed',
                  filename: resolvedFilename,
                  totalBytes: resolvedSize,
                  transferredBytes: resolvedSize,
                  percentage: 100,
                  speedMBps: currentSpeed,
                  etaSeconds: 0,
                  blobUrl,
                });

                onShowToast?.(`⚡ Received & saved "${resolvedFilename}"!`, 'success');
              }
            } catch (e) {
              console.error('Error parsing data channel string message:', e);
            }
          }
          // Binary chunk received
          else if (msgEvent.data instanceof ArrayBuffer) {
            receivedChunksRef.current.push(msgEvent.data);
            bytesReceived += msgEvent.data.byteLength;

            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff >= 0.25) {
              const bytesDiff = bytesReceived - lastBytes;
              const instantSpeed = bytesDiff / timeDiff / (1024 * 1024);
              currentSpeed = currentSpeed === 0 ? instantSpeed : currentSpeed * 0.7 + instantSpeed * 0.3;
              lastTime = now;
              lastBytes = bytesReceived;
            }

            const total = fileMeta.size;
            const remaining = total - bytesReceived;
            const eta = currentSpeed > 0 ? Math.max(0, Math.round(remaining / (currentSpeed * 1024 * 1024))) : 0;

            setReceiveProgress({
              state: 'transferring',
              filename: fileMeta.name,
              totalBytes: total,
              transferredBytes: bytesReceived,
              percentage: Math.min(100, Math.round((bytesReceived / total) * 100)),
              speedMBps: Math.round(currentSpeed * 10) / 10,
              etaSeconds: eta,
            });
          }
        };
      };

      // Set Remote Offer & Create Answer
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send Answer back
      await sendSignal(fromDeviceId, 'answer', { answerSdp: answer });
    } catch (err: any) {
      console.error('Failed accepting incoming beam:', err);
      setReceiveProgress((prev) => (prev ? { ...prev, state: 'error', error: err.message } : null));
    }
  }, [incomingOffer, clientDevice, cleanupConnection, sendSignal, onShowToast]);

  // Reject incoming beam
  const rejectIncomingBeam = useCallback(async () => {
    if (!incomingOffer) return;
    await sendSignal(incomingOffer.fromDeviceId, 'reject', {});
    setIncomingOffer(null);
    setIsModalOpen(false);
  }, [incomingOffer, sendSignal]);

  // Cancel ongoing transfer
  const cancelTransfer = useCallback(async () => {
    if (activePeerIdRef.current) {
      await sendSignal(activePeerIdRef.current, 'cancel', {});
    }
    cleanupConnection();
    setSendProgress(null);
    setReceiveProgress(null);
    setIncomingOffer(null);
    setIsModalOpen(false);
  }, [cleanupConnection, sendSignal]);

  // Send file via SendAnywhere-style 6-Digit Key Relay
  const startRelaySend = useCallback(
    async (file: File) => {
      if (!clientDevice) return null;
      setIsRelayUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('senderDeviceId', clientDevice.deviceId);
        fd.append('senderDeviceName', clientDevice.deviceName);

        const res = await fetch(`/api/clip/${slug}/relay`, {
          method: 'POST',
          body: fd,
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to start relay');

        setRelayActiveCode(json.data.code);
        onShowToast?.(`⚡ 6-Digit Key generated: ${json.data.code}`, 'success');
        return json.data.code as string;
      } catch (e: any) {
        onShowToast?.(e.message || 'Relay upload error', 'error');
        return null;
      } finally {
        setIsRelayUploading(false);
      }
    },
    [clientDevice, slug, onShowToast]
  );

  // Download file by 6-Digit Key
  const receiveByRelayCode = useCallback(
    async (code: string) => {
      const clean = code.replace(/\s+/g, '');
      if (!clean) return false;
      try {
        const res = await fetch(`/api/clip/${slug}/relay?code=${clean}`);
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || 'Invalid or expired 6-digit key');
        }

        let filename = 'downloaded_file';
        const disposition = res.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
          if (match && match[1]) filename = decodeURIComponent(match[1]);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        onShowToast?.(`⚡ Downloaded "${filename}" via 6-digit key!`, 'success');
        return true;
      } catch (e: any) {
        onShowToast?.(e.message || 'Failed to download file', 'error');
        return false;
      }
    },
    [slug, onShowToast]
  );

  // Instant switch from WebRTC to 6-Digit Relay if peer is slow to accept or blocked by NAT
  const switchToRelay = useCallback(async () => {
    if (!currentSendingFileRef.current) return null;
    cleanupConnection();
    setSendProgress(null);
    return startRelaySend(currentSendingFileRef.current);
  }, [cleanupConnection, startRelaySend]);

  return {
    isModalOpen,
    setIsModalOpen,
    targetDevice,
    setTargetDevice,
    sendProgress,
    receiveProgress,
    incomingOffer,
    incomingRelay,
    relayActiveCode,
    isRelayUploading,
    startSendFile,
    acceptIncomingBeam,
    rejectIncomingBeam,
    cancelTransfer,
    handleSignal,
    startRelaySend,
    receiveByRelayCode,
    switchToRelay,
  };
}
