/**
 * Ephemeral In-Memory Relay Store for SendAnywhere-style 6-digit Key File Transfers
 * Zero permanent server storage: files are kept in RAM only during active transfer (max 15 mins)
 */

export interface RelayTransferItem {
  code: string;
  slug: string;
  filename: string;
  size: number;
  contentType: string;
  buffer: Buffer;
  senderDeviceId?: string;
  senderDeviceName?: string;
  createdAt: number;
  expiresAt: number;
  downloadCount: number;
}

// In-memory global store across requests in this Node process
declare global {
  var __relayTransfers: Map<string, RelayTransferItem> | undefined;
}

if (!global.__relayTransfers) {
  global.__relayTransfers = new Map<string, RelayTransferItem>();
}

const transfers = global.__relayTransfers;

// Clean up expired items every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [code, item] of transfers.entries()) {
    if (now > item.expiresAt) {
      transfers.delete(code);
    }
  }
}, 60000);

/**
 * Generate a random 6-digit numerical code (e.g. 749 203)
 */
function generate6DigitCode(): string {
  let code = '';
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (transfers.has(code));
  return code;
}

/**
 * Create a new ephemeral relay transfer
 */
export function createRelayTransfer(params: {
  slug: string;
  filename: string;
  size: number;
  contentType: string;
  buffer: Buffer;
  senderDeviceId?: string;
  senderDeviceName?: string;
}): RelayTransferItem {
  const code = generate6DigitCode();
  const now = Date.now();
  const item: RelayTransferItem = {
    code,
    slug: params.slug,
    filename: params.filename,
    size: params.size,
    contentType: params.contentType || 'application/octet-stream',
    buffer: params.buffer,
    senderDeviceId: params.senderDeviceId,
    senderDeviceName: params.senderDeviceName || 'Peer Device',
    createdAt: now,
    expiresAt: now + 15 * 60 * 1000, // 15 minutes TTL
    downloadCount: 0,
  };

  transfers.set(code, item);
  return item;
}

/**
 * Retrieve a transfer by 6-digit code
 */
export function getRelayTransfer(code: string): RelayTransferItem | null {
  const cleanCode = code.replace(/\s+/g, '');
  const item = transfers.get(cleanCode);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    transfers.delete(cleanCode);
    return null;
  }
  return item;
}

/**
 * Remove a transfer
 */
export function deleteRelayTransfer(code: string): boolean {
  const cleanCode = code.replace(/\s+/g, '');
  return transfers.delete(cleanCode);
}
