'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Send,
  PenTool,
  Highlighter,
  Eraser,
  Sparkles,
  Loader2,
  Undo2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DoodleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDropDoodle: (file: File) => Promise<void>;
  slug?: string;
}

const COLORS = [
  { name: 'Orange', hex: '#ff5a1f' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Rose', hex: '#f43f5e' },
];

const STROKE_SIZES = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Bold', value: 8 },
];

type ToolType = 'pen' | 'highlighter' | 'eraser';

export const DoodleModal: React.FC<DoodleModalProps> = ({
  isOpen,
  onClose,
  onDropDoodle,
  slug,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<ToolType>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#ff5a1f');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Undo history stack
  const historyRef = useRef<ImageData[]>([]);

  // Initialize canvas with high-DPI
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // Fill with sleek dark background
    ctx.fillStyle = '#0c0f17';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw subtle grid dots
    ctx.fillStyle = '#1c2230';
    const dotSpacing = 24;
    for (let x = dotSpacing / 2; x < rect.width; x += dotSpacing) {
      for (let y = dotSpacing / 2; y < rect.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Save initial state to history
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Short delay to ensure container DOM is ready
      const t = setTimeout(initCanvas, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen, initCanvas]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) initCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, initCanvas]);

  // Get pointer coordinates relative to canvas
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 4;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColor + '55'; // 33% alpha
      ctx.lineWidth = strokeWidth * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();

    // Push new snapshot to undo stack (max 15 snapshots)
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 15) {
      historyRef.current.shift();
    }
  };

  // Undo last stroke
  const handleUndo = () => {
    if (historyRef.current.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyRef.current.pop(); // Remove current
    const previous = historyRef.current[historyRef.current.length - 1];
    if (previous) {
      ctx.putImageData(previous, 0, 0);
    }
    if (historyRef.current.length <= 1) {
      setHasDrawn(false);
    }
  };

  // Clear Canvas
  const handleClear = () => {
    initCanvas();
  };

  // Convert canvas to File and drop into room
  const handleSend = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsUploading(true);
    try {
      // Export as PNG blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );

      if (!blob) throw new Error('Failed to create doodle image');

      const timestamp = new Date()
        .toLocaleTimeString('en-US', { hour12: false })
        .replace(/:/g, '');
      const doodleFile = new File([blob], `sketch-${timestamp}.png`, {
        type: 'image/png',
      });

      await onDropDoodle(doodleFile);
      onClose();
    } catch (err) {
      console.error('Doodle upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none touch-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-4xl h-[92vh] sm:h-[86vh] bg-[#0c0f17] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-zinc-950/90 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[#ff5a1f]">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Sketch to Drop</span>
                  <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-zinc-850 border border-zinc-700 text-[10px] font-mono text-zinc-300">
                    Live Whiteboard
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 hidden sm:block">
                  Draw a diagram, signature, or note to beam instantly to all devices
                </p>
              </div>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyRef.current.length <= 1}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 border border-zinc-800 transition-colors"
                title="Undo last stroke"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
                title="Clear canvas"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors ml-1"
                aria-label="Close whiteboard"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Interactive Whiteboard Canvas Area */}
          <div
            ref={containerRef}
            className="flex-1 w-full min-h-0 relative bg-[#0c0f17] overflow-hidden cursor-crosshair"
          >
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="absolute inset-0 w-full h-full touch-none"
            />
          </div>

          {/* Bottom Floating Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-zinc-950/95 border-t border-zinc-800 shrink-0">
            {/* Tools & Stroke Width */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Tool Buttons */}
              <button
                type="button"
                onClick={() => setTool('pen')}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  tool === 'pen'
                    ? 'bg-[#ff5a1f] text-white border-[#ff5a1f] shadow-md shadow-[#ff5a1f]/20'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
                title="Pen Tool"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pen</span>
              </button>

              <button
                type="button"
                onClick={() => setTool('highlighter')}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  tool === 'highlighter'
                    ? 'bg-[#ff5a1f] text-white border-[#ff5a1f] shadow-md shadow-[#ff5a1f]/20'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
                title="Highlighter"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Marker</span>
              </button>

              <button
                type="button"
                onClick={() => setTool('eraser')}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  tool === 'eraser'
                    ? 'bg-[#ff5a1f] text-white border-[#ff5a1f] shadow-md shadow-[#ff5a1f]/20'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
                title="Eraser"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Eraser</span>
              </button>

              <div className="h-5 w-px bg-zinc-800 mx-1 hidden sm:block" />

              {/* Stroke Size Selector */}
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                {STROKE_SIZES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setStrokeWidth(s.value)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                      strokeWidth === s.value
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            {tool !== 'eraser' && (
              <div className="flex items-center gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setSelectedColor(c.hex)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      selectedColor === c.hex
                        ? 'scale-125 border-white shadow-lg'
                        : 'border-transparent hover:scale-110 opacity-75 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Drop / Submit Button */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleSend}
                disabled={isUploading || !hasDrawn}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5a1f]/20 hover:scale-[1.02] disabled:opacity-40"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dropping...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Drop to Room</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
