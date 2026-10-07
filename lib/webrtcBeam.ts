'use client';

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const CHUNK_SIZE = 64 * 1024; // 64 KB chunks for high throughput
export const BUFFER_THRESHOLD = 1024 * 1024; // 1 MB buffer threshold

export interface BeamProgress {
  state: 'idle' | 'connecting' | 'transferring' | 'completed' | 'error';
  filename: string;
  totalBytes: number;
  transferredBytes: number;
  percentage: number;
  speedMBps: number;
  etaSeconds: number;
  error?: string;
  blobUrl?: string;
}

export interface BeamFileMetadata {
  filename: string;
  size: number;
  mimeType: string;
  totalChunks: number;
}

/**
 * High-speed WebRTC sender streaming chunks with backpressure
 */
export async function sendFileOverDataChannel(
  file: File,
  dataChannel: RTCDataChannel,
  onProgress: (progress: BeamProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    dataChannel.binaryType = 'arraybuffer';
    dataChannel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let offset = 0;
    let transferredBytes = 0;
    let lastTime = Date.now();
    let lastTransferredBytes = 0;
    let currentSpeed = 0;

    // Send metadata header
    const header: BeamFileMetadata = {
      filename: file.name,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
    };

    try {
      dataChannel.send(JSON.stringify({ type: 'HEADER', ...header }));
    } catch (e: any) {
      reject(new Error(`Failed to send header: ${e.message}`));
      return;
    }

    const updateTelemetry = () => {
      const now = Date.now();
      const timeDiff = (now - lastTime) / 1000;
      if (timeDiff >= 0.25) {
        const bytesDiff = transferredBytes - lastTransferredBytes;
        const instantSpeed = bytesDiff / timeDiff / (1024 * 1024); // MB/s
        currentSpeed = currentSpeed === 0 ? instantSpeed : currentSpeed * 0.7 + instantSpeed * 0.3;
        lastTime = now;
        lastTransferredBytes = transferredBytes;
      }

      const remainingBytes = file.size - transferredBytes;
      const etaSeconds =
        currentSpeed > 0 ? Math.max(0, Math.round(remainingBytes / (currentSpeed * 1024 * 1024))) : 0;

      onProgress({
        state: 'transferring',
        filename: file.name,
        totalBytes: file.size,
        transferredBytes,
        percentage: Math.min(100, Math.round((transferredBytes / file.size) * 100)),
        speedMBps: Math.round(currentSpeed * 10) / 10,
        etaSeconds,
      });
    };

    const readAndSendNextChunk = () => {
      if (dataChannel.readyState !== 'open') {
        reject(new Error('Data channel closed unexpectedly'));
        return;
      }

      while (offset < file.size) {
        // Apply backpressure if buffer is full
        if (dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
          dataChannel.onbufferedamountlow = () => {
            dataChannel.onbufferedamountlow = null;
            readAndSendNextChunk();
          };
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const reader = new FileReader();

        reader.onload = (e) => {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) return;

          try {
            dataChannel.send(buffer);
            transferredBytes += buffer.byteLength;
            updateTelemetry();
            readAndSendNextChunk();
          } catch (err: any) {
            reject(err);
          }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(slice);

        offset += CHUNK_SIZE;
        return; // wait for FileReader onload
      }

      // All chunks dispatched
      dataChannel.send(JSON.stringify({ type: 'DONE' }));

      onProgress({
        state: 'completed',
        filename: file.name,
        totalBytes: file.size,
        transferredBytes: file.size,
        percentage: 100,
        speedMBps: currentSpeed,
        etaSeconds: 0,
      });

      resolve();
    };

    readAndSendNextChunk();
  });
}
