'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderProps {
  slug: string;
  onUploaded?: () => void;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  slug,
  onUploaded,
  onShowToast,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      onShowToast?.(
        err?.message?.includes('Permission')
          ? 'Microphone permission denied'
          : 'Could not access microphone',
        'error'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
  };

  const uploadVoiceNoteDirectly = async (targetFile: File) => {
    const fd = new FormData();
    fd.append('file', targetFile);
    const directRes = await fetch(`/api/clip/${slug}/files/upload`, {
      method: 'POST',
      body: fd,
    });
    const directJson = await directRes.json();
    if (!directJson.success) throw new Error(directJson.error || 'Direct upload failed');
    return directJson.data;
  };

  const uploadVoiceNote = async () => {
    if (!audioBlob) return;
    setIsUploading(true);

    try {
      const extension = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const now = new Date();
      const filename = `Voice_Note_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.${extension}`;
      const file = new File([audioBlob], filename, { type: audioBlob.type });

      // 1. Get upload signature
      const signRes = await fetch(`/api/clip/${slug}/files/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, contentType: file.type, size: file.size }),
      });
      const signData = await signRes.json();

      // If Cloudinary is not configured or server requests direct upload
      if (!signData.success || signData.useDirectUpload || !signData.data?.uploadUrl) {
        await uploadVoiceNoteDirectly(file);
      } else {
        try {
          const { apiKey, timestamp, signature, folder, uploadUrl } = signData.data;

          // 2. Upload to Cloudinary
          const fd = new FormData();
          fd.append('file', file);
          fd.append('api_key', apiKey);
          fd.append('timestamp', String(timestamp));
          fd.append('signature', signature);
          fd.append('folder', folder);

          const uploadRes = await fetch(uploadUrl, { method: 'POST', body: fd });
          const uploadJson = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadJson.error?.message || 'Upload failed');

          // 3. Save completed file metadata
          const completeRes = await fetch(`/api/clip/${slug}/files/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uploadJson),
          });
          const completeJson = await completeRes.json();
          if (!completeJson.success) throw new Error(completeJson.error || 'Failed to save voice note');
        } catch (cloudErr: any) {
          console.warn('Cloudinary upload failed or disabled, falling back to direct server drop:', cloudErr);
          await uploadVoiceNoteDirectly(file);
        }
      }

      onShowToast?.('Voice note dropped into room!', 'success');
      cancelRecording();
      if (onUploaded) onUploaded();
    } catch (e: any) {
      console.error('Voice upload error:', e);
      onShowToast?.(e.message || 'Failed to upload voice note', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center">
      <AnimatePresence mode="wait">
        {!isRecording && !audioBlob ? (
          /* Idle: 1-Tap Record Button */
          <motion.button
            key="idle"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            type="button"
            onClick={startRecording}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition-colors hover:text-white shrink-0"
            title="Record and drop a voice memo"
          >
            <Mic className="w-4 h-4 text-rose-400" />
            <span>Voice Drop</span>
          </motion.button>
        ) : isRecording ? (
          /* Active Recording State */
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>

            <span className="font-bold">{formatSeconds(duration)}</span>

            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={stopRecording}
                className="p-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                title="Stop recording"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>

              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                title="Discard"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* Preview & Send State */
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800"
          >
            {audioUrl && (
              <audio src={audioUrl} controls className="h-8 w-44 sm:w-56 rounded-lg" />
            )}

            <button
              type="button"
              onClick={uploadVoiceNote}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? 'Dropping...' : 'Drop Audio'}</span>
            </button>

            <button
              type="button"
              onClick={cancelRecording}
              disabled={isUploading}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors"
              title="Discard"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
