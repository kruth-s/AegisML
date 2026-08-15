import { ClipboardRoom } from './types';
import fs from 'fs';
import path from 'path';

// Memory cache for hyper-fast response
const memoryStore = new Map<string, ClipboardRoom>();

// Local cache directory fallback
const LOCAL_CACHE_DIR = path.join(process.cwd(), '.clip_cache');

function ensureCacheDir() {
  try {
    if (!fs.existsSync(LOCAL_CACHE_DIR)) {
      fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });
    }
  } catch (e) {
    // Ignore error if read-only filesystem (e.g. Vercel serverless without KV)
  }
}

function getLocalFile(slug: string): ClipboardRoom | null {
  try {
    const filePath = path.join(LOCAL_CACHE_DIR, `${slug}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as ClipboardRoom;
    }
  } catch (e) {
    // Ignore read errors
  }
  return null;
}

function saveLocalFile(slug: string, room: ClipboardRoom) {
  try {
    ensureCacheDir();
    const filePath = path.join(LOCAL_CACHE_DIR, `${slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(room, null, 2), 'utf-8');
  } catch (e) {
    // Ignore write errors on read-only serverless filesystems
  }
}

// Check for Upstash Redis / Vercel KV environment variables
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisCommand(command: string[]): Promise<any> {
  if (!redisUrl || !redisToken) return null;
  try {
    const res = await fetch(`${redisUrl}/${command.map(encodeURIComponent).join('/')}`, {
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.result;
  } catch (err) {
    console.error('Redis fetch error:', err);
    return null;
  }
}

export async function getClipboard(slug: string): Promise<ClipboardRoom | null> {
  const normalizedSlug = slug.toLowerCase().trim();

  // 1. Try Redis if configured
  if (redisUrl && redisToken) {
    try {
      const raw = await redisCommand(['GET', `clip:${normalizedSlug}`]);
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        // Update local memory cache
        memoryStore.set(normalizedSlug, parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Failed reading from Redis:', e);
    }
  }

  // 2. Memory cache check
  if (memoryStore.has(normalizedSlug)) {
    return memoryStore.get(normalizedSlug)!;
  }

  // 3. Disk cache check
  const localRoom = getLocalFile(normalizedSlug);
  if (localRoom) {
    memoryStore.set(normalizedSlug, localRoom);
    return localRoom;
  }

  return null;
}

export async function saveClipboard(slug: string, data: Partial<ClipboardRoom>): Promise<ClipboardRoom> {
  const normalizedSlug = slug.toLowerCase().trim();
  const existing = (await getClipboard(normalizedSlug)) || {
    slug: normalizedSlug,
    mainContent: '',
    snippets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    views: 0,
  };

  const updatedRoom: ClipboardRoom = {
    ...existing,
    ...data,
    slug: normalizedSlug,
    updatedAt: new Date().toISOString(),
  };

  // Save to Memory
  memoryStore.set(normalizedSlug, updatedRoom);

  // Save to Disk Cache (Local dev)
  saveLocalFile(normalizedSlug, updatedRoom);

  // Save to Redis (Vercel Production if env vars present)
  if (redisUrl && redisToken) {
    try {
      await redisCommand(['SET', `clip:${normalizedSlug}`, JSON.stringify(updatedRoom)]);
    } catch (e) {
      console.error('Failed writing to Redis:', e);
    }
  }

  return updatedRoom;
}

export async function deleteClipboard(slug: string): Promise<boolean> {
  const normalizedSlug = slug.toLowerCase().trim();
  memoryStore.delete(normalizedSlug);

  try {
    const filePath = path.join(LOCAL_CACHE_DIR, `${normalizedSlug}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {}

  if (redisUrl && redisToken) {
    try {
      await redisCommand(['DEL', `clip:${normalizedSlug}`]);
    } catch (e) {}
  }

  return true;
}
