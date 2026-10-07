'use client';

import React, { useState, useRef } from 'react';
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
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Other available devices in room
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
                    Direct P2P File Beam
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400">
                    AirDrop
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Browser-to-Browser • 0 Byte Server Storage
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

          {/* Modal Content */}
          <div className="p-5 sm:p-6 flex flex-col gap-5 max-h-[82vh] overflow-y-auto">
            {/* 1. INCOMING REQUEST DIALOG */}
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

                {/* File Details Card */}
                <div className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3.5 text-left">
                  <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0">
                    <File className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">
                      {incomingOffer.fileMeta.name}
                    </div>
                    <div className="text-xs font-mono text-zinc-400 mt-0.5">
                      {formatBytes(incomingOffer.fileMeta.size)} • Unlimited P2P Speed
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
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

            {/* 2. ACTIVE TRANSFER SCREEN (Circular Ring & Speedometer) */}
            {isTransferring && activeProgress && (
              <div className="flex flex-col items-center gap-5 py-2">
                {/* Circular Progress Ring */}
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

                  {/* Percentage in center */}
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

                {/* File Header */}
                <div className="text-center">
                  <h4 className="text-sm sm:text-base font-bold text-white truncate max-w-sm">
                    {activeProgress.filename}
                  </h4>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    {formatBytes(activeProgress.transferredBytes)} of{' '}
                    {formatBytes(activeProgress.totalBytes)}
                  </p>
                </div>

                {/* 3 Telemetry Cards */}
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

                {/* Transfer Completion Controls */}
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
                      className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}

                {/* Cancel Button */}
                {activeProgress.state !== 'completed' && (
                  <button
                    onClick={onCancelBeam}
                    className="text-xs text-rose-400 hover:text-rose-300 font-mono mt-2"
                  >
                    Cancel Transfer
                  </button>
                )}
              </div>
            )}

            {/* 3. INITIATE TRANSFER SCREEN (Picker) */}
            {!incomingOffer && !isTransferring && (
              <>
                {/* Peer Selection */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    1. Select Target Peer Device
                  </label>

                  {peerDevices.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-center">
                      <AlertCircle className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                      <p className="text-xs text-zinc-300 font-semibold">
                        No other devices in this room yet
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Open this room link on another phone or laptop to beam files directly.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {peerDevices.map((dev) => {
                        const isChosen =
                          targetDevice?.deviceId === dev.deviceId ||
                          (!targetDevice && peerDevices[0]?.deviceId === dev.deviceId);

                        return (
                          <div
                            key={dev.deviceId}
                            onClick={() => onSelectTargetDevice(dev)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isChosen
                                ? 'bg-zinc-900 border-[#ff5a1f] ring-1 ring-[#ff5a1f]/40'
                                : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: `${dev.color}30`, color: dev.color }}
                              >
                                {getDeviceIcon(dev.deviceType)}
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {dev.deviceName}
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
                                  <span>{dev.browser}</span>
                                  {dev.countryFlag && <span>{dev.countryFlag}</span>}
                                  {dev.isSameNetwork && (
                                    <span className="text-emerald-400 font-semibold">
                                      • Same WiFi
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isChosen ? 'border-[#ff5a1f] bg-[#ff5a1f]' : 'border-zinc-700'
                              }`}
                            >
                              {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* File Dropzone */}
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                    2. Select Any Large File (Unlimited Size)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
                      selectedFile
                        ? 'border-emerald-500/50 bg-emerald-500/5'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/40'
                    }`}
                  >
                    {selectedFile ? (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                          <File className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white truncate max-w-xs">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                            {formatBytes(selectedFile.size)} • Ready to Beam
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 text-indigo-400 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-200">
                            Drop file here or click to browse
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                            Supports 500MB, 1GB, 2GB, 5GB+ files
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Initiate Beam Button */}
                <button
                  onClick={handleInitiate}
                  disabled={!selectedFile || peerDevices.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs font-bold shadow-lg shadow-[#ff5a1f]/25 disabled:opacity-40 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>
                    Beam File Directly to{' '}
                    {targetDevice?.deviceName || peerDevices[0]?.deviceName || 'Peer'}
                  </span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
