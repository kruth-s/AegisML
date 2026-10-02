'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { VoiceRecorder } from './VoiceRecorder';

interface FileUploadProps {
  slug: string;
  onUploaded?: () => void;
  onShowToast?: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ slug, onUploaded, onShowToast }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDirectly = async (targetFile: File) => {
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

  const handleFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);
    try {
      // 1. Request signature and upload params from server
      const signRes = await fetch(`/api/clip/${slug}/files/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      const signData = await signRes.json();

      // If Cloudinary is not configured or server requests direct upload, use direct server route
      if (!signData.success || signData.useDirectUpload || !signData.data?.uploadUrl) {
        await uploadDirectly(file);
      } else {
        try {
          const { apiKey, timestamp, signature, folder, uploadUrl } = signData.data;

          // 2. Upload file directly to Cloudinary
          const fd = new FormData();
          fd.append('file', file);
          fd.append('api_key', apiKey);
          fd.append('timestamp', String(timestamp));
          fd.append('signature', signature);
          fd.append('folder', folder);

          const uploadRes = await fetch(uploadUrl, { method: 'POST', body: fd });
          const uploadJson = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadJson.error?.message || 'Cloudinary upload rejected');

          // 3. Notify server to save metadata
          const completeRes = await fetch(`/api/clip/${slug}/files/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uploadJson),
          });
          const completeJson = await completeRes.json();
          if (!completeJson.success) throw new Error(completeJson.error || 'Failed to save file metadata');
        } catch (cloudErr: any) {
          console.warn('Cloudinary upload failed or disabled, falling back to direct server drop:', cloudErr);
          // Seamless fallback so the user experience never breaks
          await uploadDirectly(file);
        }
      }

      onShowToast?.(`Dropped "${file.name}" into room!`, 'success');
      if (onUploaded) onUploaded();
    } catch (e: any) {
      console.error('File upload error:', e);
      onShowToast?.(e.message || 'Upload error', 'error');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  const onCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.currentTarget.value = '';
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.currentTarget.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`w-full rounded-2xl border transition-all p-4 bg-zinc-900/60 backdrop-blur-xl ${
        isDragOver
          ? 'border-[#ff5a1f] bg-[#ff5a1f]/5 ring-2 ring-[#ff5a1f]/30'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onCameraChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileChange}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left Information */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-10 h-10 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-[#ff5a1f] animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5 text-indigo-400" />
            )}
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Instant Drop Zone</span>
              <span className="hidden sm:inline px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                Full Res
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isUploading
                ? uploadStatus
                : 'Snap a photo on phone or drag files to sync live between devices.'}
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-stretch sm:justify-end">
          {/* Snap to Drop (Direct Camera on Mobile) */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#ff5a1f] hover:bg-[#ff6d36] text-white text-xs font-bold transition-all shadow-md shadow-[#ff5a1f]/20 hover:scale-[1.02] disabled:opacity-50"
            title="Open phone camera directly to snap & drop"
          >
            <Camera className="w-4 h-4" />
            <span>Snap to Drop</span>
          </button>

          {/* 1-Tap Voice Memo Drop */}
          <VoiceRecorder slug={slug} onUploaded={onUploaded} onShowToast={onShowToast} />

          {/* Standard File Upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Upload File</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
