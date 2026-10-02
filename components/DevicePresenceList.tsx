'use client';

import React, { useState } from 'react';
import { DevicePresence } from '@/lib/types';
import {
  Monitor,
  Smartphone,
  Tablet,
  Radio,
  Share2,
  Check,
  Circle,
  Wifi,
  Globe2,
  Cpu,
  Copy,
  MapPin,
  ShieldCheck,
  Battery,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DevicePresenceListProps {
  devices: DevicePresence[];
  currentDeviceId?: string;
  onOpenQR?: () => void;
  roomSlug: string;
}

export const DevicePresenceList: React.FC<DevicePresenceListProps> = ({
  devices,
  currentDeviceId,
  onOpenQR,
  roomSlug,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DevicePresence | null>(null);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleCopyIp = async (ip: string) => {
    try {
      await navigator.clipboard.writeText(ip);
      setCopiedIp(ip);
      setTimeout(() => setCopiedIp(null), 1800);
    } catch {}
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'tablet':
        return <Tablet className="w-3.5 h-3.5" />;
      default:
        return <Monitor className="w-3.5 h-3.5" />;
    }
  };

  const activeCount = devices.length;

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Live Radar Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-zinc-950 border border-zinc-800 shrink-0">
            <span className="absolute w-5 h-5 rounded-full bg-emerald-500/20 animate-ping" />
            <Radio className="w-4 h-4 text-emerald-400 relative z-10" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                Live Device Radar
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-medium text-emerald-400">
                {activeCount} {activeCount === 1 ? 'device online' : 'devices connected'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Connected peers in room{' '}
              <span className="font-mono text-[#ff5a1f] font-semibold">{roomSlug}</span> •
              Click any device pill to inspect IP, location, and network telemetry
            </p>
          </div>
        </div>

        {/* Right: Quick Connect Other Device */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
            title="Copy room link to open on another device"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Share Link</span>
              </>
            )}
          </button>

          {onOpenQR && (
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ff5a1f]/10 border border-[#ff5a1f]/30 hover:bg-[#ff5a1f]/20 text-[#ff5a1f] text-xs font-semibold transition-colors"
              title="Scan QR on phone or tablet"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Scan to Pair</span>
            </button>
          )}
        </div>
      </div>

      {/* Connected Devices Pills */}
      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-2.5">
        <AnimatePresence>
          {devices.map((device) => {
            const isSelf = device.deviceId === currentDeviceId;
            const isSelected = selectedDevice?.deviceId === device.deviceId;

            return (
              <motion.div
                key={device.deviceId}
                initial={{ opacity: 0, scale: 0.9, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                onClick={() => setSelectedDevice(isSelected ? null : device)}
                className={`relative group cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono transition-all ${
                  isSelected
                    ? 'bg-zinc-900 border-[#ff5a1f] text-white shadow-lg ring-1 ring-[#ff5a1f]/50'
                    : isSelf
                    ? 'bg-zinc-950/90 border-zinc-700 text-white shadow-sm ring-1 ring-white/10 hover:border-zinc-500'
                    : 'bg-zinc-950/70 border-zinc-800 text-zinc-300 hover:border-zinc-750 hover:bg-zinc-900'
                }`}
              >
                {/* Glowing Device Color Dot */}
                <span
                  className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                  style={{
                    backgroundColor: device.color || '#ff5a1f',
                    boxShadow: `0 0 8px ${device.color || '#ff5a1f'}80`,
                  }}
                />

                {/* Device Icon */}
                <span className="text-zinc-400 group-hover:text-zinc-200 transition-colors">
                  {getDeviceIcon(device.deviceType)}
                </span>

                {/* Device Name */}
                <span className="font-semibold truncate max-w-[140px] sm:max-w-[180px]">
                  {device.deviceName}
                </span>

                {/* Country Flag if available from Vercel Geo */}
                {device.countryFlag && (
                  <span className="text-sm leading-none" title={device.country || 'Location'}>
                    {device.countryFlag}
                  </span>
                )}

                {/* Same WiFi Badge */}
                {device.isSameNetwork && (
                  <span
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold"
                    title="This device shares the same public IP / WiFi network"
                  >
                    <Wifi className="w-2.5 h-2.5" />
                    <span>Same WiFi</span>
                  </span>
                )}

                {/* Self Badge */}
                {isSelf && (
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-sans font-semibold">
                    You
                  </span>
                )}

                {/* IP Badge Preview */}
                {device.ip && (
                  <span className="hidden md:inline text-[10px] text-zinc-500 font-mono">
                    [{device.ip === '127.0.0.1' ? 'Localhost' : device.ip}]
                  </span>
                )}

                {/* Micro Online Dot */}
                <Circle className="w-1.5 h-1.5 fill-emerald-400 text-emerald-400 shrink-0 ml-0.5" />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {devices.length === 0 && (
          <span className="text-xs font-mono text-zinc-500 py-1">
            Detecting device presence...
          </span>
        )}
      </div>

      {/* Selected Device Rich Telemetry & Diagnostics Card */}
      {selectedDevice && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3.5 p-4 bg-zinc-950/95 rounded-xl border border-zinc-800 text-xs font-mono shadow-2xl relative overflow-hidden"
        >
          {/* Subtle Accent Glow */}
          <div
            className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 pointer-events-none rounded-full"
            style={{ backgroundColor: selectedDevice.color || '#ff5a1f' }}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: selectedDevice.color,
                  boxShadow: `0 0 10px ${selectedDevice.color}`,
                }}
              />
              <span className="text-zinc-100 font-bold text-sm">
                {selectedDevice.deviceName}
              </span>
              {selectedDevice.deviceId === currentDeviceId && (
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-sans font-semibold">
                  Current Session (You)
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedDevice(null)}
              className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
            >
              Close
            </button>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-zinc-300">
            {/* 1. IP Address */}
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>IP Address</span>
              </span>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="font-bold text-zinc-100 font-mono break-all text-xs">
                  {selectedDevice.ip || '127.0.0.1'}
                </span>
                {selectedDevice.ip && (
                  <button
                    onClick={() => handleCopyIp(selectedDevice.ip!)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Copy IP"
                  >
                    {copiedIp === selectedDevice.ip ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 2. Geolocation (Vercel Edge) */}
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>Location (Vercel Geo)</span>
              </span>
              <div className="font-semibold text-zinc-100 flex items-center gap-1.5 mt-0.5">
                {selectedDevice.countryFlag && <span>{selectedDevice.countryFlag}</span>}
                <span>
                  {selectedDevice.city
                    ? `${selectedDevice.city}${selectedDevice.region ? `, ${selectedDevice.region}` : ''} (${selectedDevice.country})`
                    : selectedDevice.country
                    ? `${selectedDevice.country}`
                    : 'Localhost / Dev Network'}
                </span>
              </div>
            </div>

            {/* 3. Network Environment */}
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Network Status</span>
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {selectedDevice.isSameNetwork ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Same WiFi / Local NAT</span>
                  </span>
                ) : (
                  <span className="text-zinc-400">
                    {selectedDevice.connectionType
                      ? `${selectedDevice.connectionType} Network`
                      : 'Active Connection'}
                  </span>
                )}
              </div>
            </div>

            {/* 4. Hardware & Screen */}
            <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Device Telemetry</span>
              </span>
              <div className="text-zinc-300 text-[11px] mt-0.5 space-y-0.5">
                {selectedDevice.screenResolution && (
                  <div>Display: <strong className="text-zinc-100">{selectedDevice.screenResolution}</strong></div>
                )}
                {selectedDevice.battery && (
                  <div className="flex items-center gap-1">
                    <Battery className="w-3 h-3 text-emerald-400" />
                    <span>Battery: {selectedDevice.battery}</span>
                  </div>
                )}
                <div>OS / Browser: <span className="text-zinc-400">{selectedDevice.os} • {selectedDevice.browser}</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
