'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Zap,
  Wifi,
  Monitor,
  Smartphone,
  Tablet,
  Download,
  CheckCircle2,
  AlertCircle,
  File,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  Clock,
  Activity,
  Upload,
  KeyRound,
  Radio,
  Copy,
  Check,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DevicePresence } from '@/lib/types';
import { BeamProgress } from '@/lib/webrtcBeam';

interface P2PBeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DevicePresence[];
  currentDeviceId?: string;
  targetDevice: DevicePresence | null;
  onSelectTargetDevice: (device: DevicePresence) => void;
  sendProgress: BeamProgress | null;
  receiveProgress: BeamProgress | null;
  incomingOffer: {
    fromDeviceName: string;
    fromDeviceType?: string;
    fileMeta: { name: string; size: number; type: string };
  } | null;
  onStartBeam: (target: DevicePresence, file: File) => void;
  onAcceptBeam: () => void;
  onRejectBeam: () => void;
  onCancelBeam: () => void;
  // SendAnywhere-style 6-Digit Key additions
  relayActiveCode?: string | null;
  isRelayUploading?: boolean;
  incomingRelay?: {
    code: string;
    filename: string;
    size: number;
    senderDeviceName: string;
  } | null;
  onStartRelaySend?: (file: File) => Promise<string | null>;
  onReceiveByRelayCode?: (code: string) => Promise<boolean>;
  onSwitchToRelay?: () => Promise<string | null>;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export const P2PBeamModal: React.FC<P2PBeamModalProps> = ({
  isOpen,
  onClose,
  devices,
  currentDeviceId,
  targetDevice,
  onSelectTargetDevice,
  sendProgress,
  receiveProgress,
  incomingOffer,
  onStartBeam,
  onAcceptBeam,
  onRejectBeam,
  onCancelBeam,
  relayActiveCode,
  isRelayUploading = false,
  incomingRelay,
  onStartRelaySend,
  onReceiveByRelayCode,
  onSwitchToRelay,
}) => {
  const [activeTab, setActiveTab] = useState<'beam' | 'code'>('beam');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [isReceivingCode, setIsReceivingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [waitingElapsed, setWaitingElapsed] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const relayFileInputRef = useRef<HTMLInputElement>(null);

  // Track time spent in 'connecting' state
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (sendProgress?.state === 'connecting') {
      setWaitingElapsed(0);
      timer = setInterval(() => {
        setWaitingElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setWaitingElapsed(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sendProgress?.state]);

  if (!isOpen) return null;

  const peerDevices = devices.filter((d) => d.deviceId !== currentDeviceId);
  const activeProgress = sendProgress || receiveProgress;
  const isTransferring = activeProgress && activeProgress.state !== 'idle';

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleInitiate = () => {
    if (!targetDevice && peerDevices.length > 0) {
      onSelectTargetDevice(peerDevices[0]);
    }
    const chosen = targetDevice || peerDevices[0];
    if (chosen && selectedFile) {
      onStartBeam(chosen, selectedFile);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = codeInput.trim().replace(/\s+/g, '');
    if (clean.length < 6 || !onReceiveByRelayCode) return;
    setIsReceivingCode(true);
    try {
      const ok = await onReceiveByRelayCode(clean);
      if (ok) {
        setCodeInput('');
      }
    } finally {
      setIsReceivingCode(false);
    }
  };

  const handleGenerateRelayCode = async () => {
    if (!selectedFile || !onStartRelaySend) return;
    await onStartRelaySend(selectedFile);
    setActiveTab('code');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Circular progress calculations
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const percentage = activeProgress?.percentage || 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-zinc-900/90 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#ff5a1f]/10 border border-[#ff5a1f]/30 text-[#ff5a1f] flex items-center justify-center">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    Fast Direct File Transfer
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400">
                    SendAnywhere
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Direct P2P or 6-Digit Stream Relay • 0 Permanent Disk Storage
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (isTransferring) onCancelBeam();
                onClose();
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          {!isTransferring && !incomingOffer && (
            <div className="px-5 pt-3 pb-0 flex items-center gap-2 border-b border-zinc-900 bg-zinc-950">
              <button
                type="button"
                onClick={() => setActiveTab('beam')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'beam'
                    ? 'border-[#ff5a1f] text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5 fill-current text-[#ff5a1f]" />
                <span>⚡ Direct Device Beam</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-all ${
                  activeTab === 'code'
                    ? 'border-[#ff5a1f] text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>🔢 6-Digit Key (SendAnywhere)</span>
              </button>
            </div>
          )}

          {/* Modal Content */}
          <div className="p-5 sm:p-6 flex flex-col gap-5 max-h-[82vh] overflow-y-auto">
            {/* 1. INCOMING DIRECT OFFER ALERT */}
            {incomingOffer && !isTransferring && (
              <div className="flex flex-col gap-4 text-center items-center py-2 animate-in fade-in duration-200">
                <div className="relative">
                  <div className="w-16 h-16 rounded-3xl bg-[#ff5a1f]/15 border border-[#ff5a1f]/40 flex items-center justify-center text-[#ff5a1f]">
                    <Zap className="w-8 h-8 fill-current animate-pulse" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                  </span>
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-bold text-white">
                    Incoming File Beam!
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    <span className="text-[#ff5a1f] font-semibold">
                      {incomingOffer.fromDeviceName}
                    </span>{' '}
                    wants to beam a file directly to this device over local Wi-Fi.
                  </p>
                </div>

                <div className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3.5 text-left">
                  <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                    <File className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">
                      {incomingOffer.fileMeta.name}
                    </div>
                    <div className="text-xs font-mono text-zinc-400 mt-0.5">
                      {formatBytes(incomingOffer.fileMeta.size)} • High-Speed Direct Stream
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full mt-2">
                  <button
                    onClick={onRejectBeam}
                    className="flex-1 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={onAcceptBeam}
                    className="flex-1 py-3 rounded-2xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs font-bold shadow-lg shadow-[#ff5a1f]/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Accept & Receive</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. INCOMING 6-DIGIT BROADCAST BANNER */}
            {incomingRelay && !isTransferring && !incomingOffer && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{incomingRelay.senderDeviceName} shared a file</span>
                  </div>
                  <p className="text-xs text-white truncate font-medium mt-0.5">
                    {incomingRelay.filename} ({formatBytes(incomingRelay.size)})
                  </p>
                  <p className="text-[11px] font-mono text-amber-400/80 mt-0.5">
                    Code: <strong className="text-white text-xs">{incomingRelay.code}</strong>
                  </p>
                </div>
                <button
                  onClick={() => onReceiveByRelayCode?.(incomingRelay.code)}
                  className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shrink-0 transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            )}

            {/* 3. ACTIVE TRANSFER: WAITING FOR PEER TO ACCEPT (Not Stuck at 0%) */}
            {isTransferring && activeProgress && activeProgress.state === 'connecting' && (
              <div className="flex flex-col items-center gap-5 py-4 text-center">
                <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-zinc-900 border border-zinc-800">
                  <span className="absolute inset-0 rounded-full bg-[#ff5a1f]/10 animate-ping" />
                  <Radio className="w-12 h-12 text-[#ff5a1f] relative z-10 animate-pulse" />
                </div>

                <div>
                  <h4 className="text-base sm:text-lg font-bold text-white">
                    Connecting to {targetDevice?.deviceName || 'Peer'}...
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    Waiting for <span className="text-[#ff5a1f] font-semibold">{targetDevice?.deviceName || 'the other device'}</span> to tap <strong>"Accept & Receive"</strong> on their screen ({waitingElapsed}s).
                  </p>
                </div>

                {/* Instant Relay Switch (Never get stuck) */}
                <div className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Taking too long? (Firewall / NAT)</span>
                    <span className="font-mono text-emerald-400">Instant Solution</span>
                  </div>

                  {onSwitchToRelay && (
                    <button
                      type="button"
                      onClick={async () => {
                        const code = await onSwitchToRelay();
                        if (code) setActiveTab('code');
                      }}
                      disabled={isRelayUploading}
                      className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50"
                    >
                      {isRelayUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Preparing Instant Relay...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4 fill-current" />
                          <span>Switch to Instant 6-Digit Relay</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <button
                  onClick={onCancelBeam}
                  className="text-xs font-mono text-rose-400 hover:text-rose-300 underline underline-offset-4 transition-colors"
                >
                  Cancel Transfer
                </button>
              </div>
            )}

            {/* 4. ACTIVE TRANSFER: STREAMING CHUNKS (Circular Speedometer Ring) */}
            {isTransferring && activeProgress && activeProgress.state !== 'connecting' && (
              <div className="flex flex-col items-center gap-5 py-2">
                <div className="relative flex items-center justify-center">
                  <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      className="text-zinc-800"
                      strokeWidth="10"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke="url(#beamGradient)"
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-150"
                    />
                    <defs>
                      <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ff5a1f" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    {activeProgress.state === 'completed' ? (
                      <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                    ) : (
                      <>
                        <span className="text-3xl font-black font-mono text-white tracking-tight">
                          {activeProgress.percentage}%
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mt-0.5">
                          {sendProgress ? 'Beaming' : 'Receiving'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="text-sm sm:text-base font-bold text-white truncate max-w-sm">
                    {activeProgress.filename}
                  </h4>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    {formatBytes(activeProgress.transferredBytes)} of{' '}
                    {formatBytes(activeProgress.totalBytes)}
                  </p>
                </div>

                {/* Telemetry Cards */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col items-center text-center">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                      <Activity className="w-3 h-3 text-[#ff5a1f]" />
                      <span>Speed</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-1">
                      {activeProgress.state === 'completed'
                        ? 'Done'
                        : `${activeProgress.speedMBps} MB/s`}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col items-center text-center">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>Est. Time</span>
                    </div>
                    <span className="text-sm sm:text-base font-bold font-mono text-zinc-200 mt-1">
                      {activeProgress.state === 'completed'
                        ? '0s'
                        : activeProgress.etaSeconds > 0
                        ? `${activeProgress.etaSeconds}s`
                        : '...'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col items-center text-center">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Server Store</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold font-mono text-zinc-200 mt-1">
                      0 Bytes
                    </span>
                  </div>
                </div>

                {activeProgress.state === 'completed' && (
                  <div className="flex items-center gap-3 w-full mt-2">
                    {receiveProgress?.blobUrl && (
                      <a
                        href={receiveProgress.blobUrl}
                        download={activeProgress.filename}
                        className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Save File</span>
                      </a>
                    )}
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}

                {activeProgress.state === 'transferring' && (
                  <button
                    onClick={onCancelBeam}
                    className="text-xs font-mono text-rose-400 hover:text-rose-300 transition-colors mt-2"
                  >
                    Cancel Transfer
                  </button>
                )}
              </div>
            )}

            {/* 5. TAB 1: DIRECT BEAM SETUP (When idle) */}
            {activeTab === 'beam' && !isTransferring && !incomingOffer && (
              <div className="flex flex-col gap-4">
                {/* Target Peer Selection */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-2">
                    1. Select Target Device on Radar
                  </label>
                  {peerDevices.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-center">
                      <p className="text-xs text-zinc-400">
                        No other devices detected in this room yet.
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Scan the QR code or switch to the <strong>6-Digit Key tab</strong> to transfer without waiting for peers!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {peerDevices.map((d) => {
                        const isSelected = targetDevice?.deviceId === d.deviceId;
                        return (
                          <button
                            key={d.deviceId}
                            type="button"
                            onClick={() => onSelectTargetDevice(d)}
                            className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                              isSelected
                                ? 'bg-[#ff5a1f]/15 border-[#ff5a1f] text-white shadow-md'
                                : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${d.color}25`, color: d.color }}
                            >
                              {getDeviceIcon(d.deviceType)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold truncate">
                                {d.deviceName}
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate font-mono">
                                {d.browser} • {d.os}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[#ff5a1f] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* File Dropzone */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-2">
                    2. Select Large File (500MB – 2GB+)
                  </label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      selectedFile
                        ? 'border-[#ff5a1f] bg-[#ff5a1f]/5'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <File className="w-8 h-8 text-[#ff5a1f]" />
                        <span className="text-sm font-bold text-white max-w-xs truncate">
                          {selectedFile.name}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {formatBytes(selectedFile.size)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-zinc-500" />
                        <div>
                          <p className="text-xs font-semibold text-zinc-200">
                            Click to browse or drop file here
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Any size • Streamed direct over local Wi-Fi
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Initiate Button */}
                <button
                  type="button"
                  disabled={!selectedFile || peerDevices.length === 0}
                  onClick={handleInitiate}
                  className="w-full py-3.5 rounded-2xl bg-[#ff5a1f] hover:bg-[#ff6d36] disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-[#ff5a1f]/20 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    Beam Directly to{' '}
                    {targetDevice?.deviceName || peerDevices[0]?.deviceName || 'Device'}
                  </span>
                </button>
              </div>
            )}

            {/* 6. TAB 2: SENDANYWHERE 6-DIGIT KEY (Always 100% Reliable) */}
            {activeTab === 'code' && !isTransferring && !incomingOffer && (
              <div className="flex flex-col gap-6">
                {/* Active Generated Code Display */}
                {relayActiveCode && (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center text-center gap-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                      Your 6-Digit Transfer Key
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl sm:text-5xl font-black font-mono tracking-widest text-white">
                        {relayActiveCode.slice(0, 3)} {relayActiveCode.slice(3)}
                      </span>
                      <button
                        onClick={() => handleCopyCode(relayActiveCode)}
                        className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                        title="Copy code"
                      >
                        {copiedCode ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Enter these 6 digits on any phone, laptop, or tablet in this room to start streaming immediately. Key expires in 15 minutes.
                    </p>
                  </div>
                )}

                {/* Section A: Receive with 6-Digit Key */}
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>Receive File (Enter 6 Digits)</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">Instant</span>
                  </div>

                  <form onSubmit={handleCodeSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={7}
                      placeholder="e.g. 581 294"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm font-mono text-center tracking-widest text-white focus:outline-none focus:border-amber-400 transition-colors uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-600"
                    />
                    <button
                      type="submit"
                      disabled={codeInput.trim().replace(/\s+/g, '').length < 6 || isReceivingCode}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5"
                    >
                      {isReceivingCode ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Receive</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Section B: Send File & Generate 6-Digit Key */}
                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-3">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Send File with 6-Digit Key</span>
                  </span>

                  <div
                    onClick={() => relayFileInputRef.current?.click()}
                    className="p-4 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-center cursor-pointer transition-colors"
                  >
                    <input
                      ref={relayFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {selectedFile ? (
                      <div className="text-xs text-white font-bold truncate">
                        Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400">
                        Click to select any file to generate a 6-digit key
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!selectedFile || isRelayUploading}
                    onClick={handleGenerateRelayCode}
                    className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {isRelayUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating Key...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Generate 6-Digit Key (SendAnywhere)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default P2PBeamModal;
