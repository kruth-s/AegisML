'use client';

import React, { useState } from 'react';

interface FileUploadProps {
  slug: string;
  onUploaded?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ slug, onUploaded }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setIsUploading(true);
    try {
      // 1. Request signature and upload params from server
      const signRes = await fetch(`/api/clip/${slug}/files/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      const signData = await signRes.json();
      if (!signData.success) throw new Error(signData.error || 'Failed to get upload signature');

      const { cloudName, apiKey, timestamp, signature, folder, uploadUrl } = signData.data;

      // 2. Upload file directly to Cloudinary
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', apiKey);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);

      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error?.message || 'Upload failed');

      // 3. Notify server to save metadata
      const completeRes = await fetch(`/api/clip/${slug}/files/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadJson),
      });
      const completeJson = await completeRes.json();
      if (!completeJson.success) throw new Error(completeJson.error || 'Failed to save file metadata');

      if (onUploaded) onUploaded();
    } catch (e: any) {
      setError(e.message || 'Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.currentTarget.value = '';
  };

  return (
    <div className="w-full">
      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-medium cursor-pointer hover:bg-zinc-800">
        <input type="file" onChange={onChange} className="hidden" />
        <span className="text-sm">Upload File</span>
        {isUploading && <span className="text-xs text-zinc-400">Uploading…</span>}
      </label>
      {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
    </div>
  );
};

export default FileUpload;
