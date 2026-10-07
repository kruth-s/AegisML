import { Redis } from '@upstash/redis';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Ephemeral Relay Store for SendAnywhere-style 6-digit Key File Transfers
 * Backed by Redis (for distributed Vercel serverless functions) & local memory fallback.
 * Zero permanent server storage: keys and buffers expire in 15 minutes.
 */

export interface RelayTransferItem {
  code: string;
  slug: string;
  filename: string;
  size: number;
  contentType: string;
  buffer?: Buffer;
  base64Data?: string;
  url?: string;
  senderDeviceId?: string;
  senderDeviceName?: string;
  createdAt: number;
  expiresAt: number;
  downloadCount: number;
}

// Lazily initialize Redis if credentials are provided
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// Configure Cloudinary if credentials are provided
const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// In-memory global store across requests in same process
declare global {
  var __relayTransfers: Map<string, RelayTransferItem> | undefined;
}

if (!global.__relayTransfers) {
  global.__relayTransfers = new Map<string, RelayTransferItem>();
}

const transfers = global.__relayTransfers;

// Clean up local expired items every 60 seconds
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
async function generate6DigitCode(): Promise<string> {
  let code = '';
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    attempts++;
    code = Math.floor(100000 + Math.random() * 900000).toString();
    if (transfers.has(code)) continue;

    if (redis) {
      const redisCheck = await redis.exists(`relay:${code}`);
      if (redisCheck) continue;
    }

    exists = false;
  }

  return code;
}

/**
 * Create a new ephemeral relay transfer
 */
export async function createRelayTransfer(params: {
  slug: string;
  filename: string;
  size: number;
  contentType: string;
  buffer: Buffer;
  senderDeviceId?: string;
  senderDeviceName?: string;
}): Promise<RelayTransferItem> {
  const code = await generate6DigitCode();
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes TTL

  let fileUrl: string | undefined;
  let base64Data: string | undefined;

  // 1. If Cloudinary is configured, upload to Cloudinary ephemeral folder
  if (hasCloudinary) {
    try {
      const uploadRes: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `the-drop/relay/${params.slug}`,
            resource_type: 'auto',
            public_id: `relay_${code}_${Date.now()}`,
          },
          (err, result) => {
            if (err) reject(err);
            else resolve(result);
          }
        );
        stream.end(params.buffer);
      });
      fileUrl = uploadRes.secure_url || uploadRes.url;
    } catch (cloudErr) {
      console.warn('Cloudinary relay upload failed, using buffer fallback:', cloudErr);
    }
  }

  // 2. Fallback to base64 buffer for distributed Redis storage (if under 10MB)
  if (!fileUrl && params.size <= 8 * 1024 * 1024) {
    base64Data = params.buffer.toString('base64');
  }

  const item: RelayTransferItem = {
    code,
    slug: params.slug,
    filename: params.filename,
    size: params.size,
    contentType: params.contentType || 'application/octet-stream',
    buffer: params.buffer,
    base64Data,
    url: fileUrl,
    senderDeviceId: params.senderDeviceId,
    senderDeviceName: params.senderDeviceName || 'Peer Device',
    createdAt: now,
    expiresAt,
    downloadCount: 0,
  };

  // Save to local memory
  transfers.set(code, item);

  // Save to Redis for Vercel serverless cross-instance consistency
  if (redis) {
    try {
      const redisPayload: Omit<RelayTransferItem, 'buffer'> = {
        code: item.code,
        slug: item.slug,
        filename: item.filename,
        size: item.size,
        contentType: item.contentType,
        url: item.url,
        base64Data: item.base64Data,
        senderDeviceId: item.senderDeviceId,
        senderDeviceName: item.senderDeviceName,
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        downloadCount: item.downloadCount,
      };

      await redis.set(`relay:${code}`, JSON.stringify(redisPayload), { ex: 900 });
    } catch (e) {
      console.error('Failed writing relay item to Redis:', e);
    }
  }

  return item;
}

/**
 * Retrieve a transfer by 6-digit code
 */
export async function getRelayTransfer(code: string): Promise<RelayTransferItem | null> {
  const cleanCode = code.replace(/\s+/g, '');

  // 1. Check local memory
  const localItem = transfers.get(cleanCode);
  if (localItem && Date.now() <= localItem.expiresAt) {
    return localItem;
  }

  // 2. Check Redis (crucial for Vercel lambdas)
  if (redis) {
    try {
      const raw = await redis.get(`relay:${cleanCode}`);
      if (raw) {
        const parsed: RelayTransferItem = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Date.now() <= parsed.expiresAt) {
          transfers.set(cleanCode, parsed);
          return parsed;
        } else {
          await redis.del(`relay:${cleanCode}`);
        }
      }
    } catch (e) {
      console.error('Failed reading relay item from Redis:', e);
    }
  }

  return null;
}

/**
 * Remove a transfer
 */
export async function deleteRelayTransfer(code: string): Promise<boolean> {
  const cleanCode = code.replace(/\s+/g, '');
  transfers.delete(cleanCode);
  if (redis) {
    try {
      await redis.del(`relay:${cleanCode}`);
    } catch (e) {}
  }
  return true;
}
