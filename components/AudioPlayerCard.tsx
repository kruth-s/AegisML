'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Trash2, Mic, Volume2 } from 'lucide-react';

interface AudioPlayerCardProps {
  id: string;
  url: string;
  filename: string;
  size: number;
  createdAt: string;
  onDelete: (id: string) => void;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export const AudioPlayerCard: React.FC<AudioPlayerCardProps> = ({
  id,
  url,
  filename,
  size,
  createdAt,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Generate pseudo-waveform bars based on filename hash
  const barHeights = [40, 65, 30, 80, 55, 95, 45, 70, 85, 40, 60, 90, 75, 50, 65, 80, 35, 70];

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all shadow-sm">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span className="truncate max-w-[200px] sm:max-w-xs">{filename}</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-[10px] text-rose-400 font-mono font-medium">
                Voice Memo
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {formatBytes(size)} • {new Date(createdAt).toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={url}
            download={filename}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Download audio"
          >
            <Download className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => onDelete(id)}
            className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            title="Delete memo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Player Bar & Waveform */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
        {/* Play / Pause Button */}
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#ff5a1f]/20 hover:scale-105 transition-all"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Animated Waveform Visualization */}
        <div className="flex-1 flex items-center gap-1 h-8 px-2 overflow-hidden">
          {barHeights.map((h, i) => {
            const progress = duration > 0 ? (currentTime / duration) * barHeights.length : 0;
            const isPassed = i <= progress;

            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isPassed ? 'bg-[#ff5a1f]' : 'bg-zinc-800'
                } ${isPlaying ? 'animate-pulse' : ''}`}
                style={{
                  height: `${isPlaying ? Math.max(20, (h * (0.8 + Math.random() * 0.4))) : h}%`,
                }}
              />
            );
          })}
        </div>

        {/* Timestamp */}
        <span className="font-mono text-xs text-zinc-400 shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Scrubber slider */}
      <input
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={handleSeek}
        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#ff5a1f]"
      />
    </div>
  );
};
