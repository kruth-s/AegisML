import { ClipboardRoom } from './types';
import { Redis } from '@upstash/redis';

// Lazily initialize Redis if credentials are provided
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// In-memory cache for fast repeated reads
const memoryStore = new Map<string, ClipboardRoom>();

export async function getClipboard(slug: string): Promise<ClipboardRoom | null> {
  const normalizedSlug = slug.toLowerCase().trim();

  // 1. Memory cache
  if (memoryStore.has(normalizedSlug)) {
    return memoryStore.get(normalizedSlug)!;
  }

  // 2. Redis (persistent, cross-invocation)
  if (redis) {
    try {
      const raw = await redis.get<ClipboardRoom>(`clip:${normalizedSlug}`);
      if (raw) {
        memoryStore.set(normalizedSlug, raw);
        return raw;
      }
    } catch (e) {
      console.error('Failed reading from Redis:', e);
    }
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

  // Save to memory cache
  memoryStore.set(normalizedSlug, updatedRoom);

  // Save to Redis with 30-day TTL if available
  if (redis) {
    try {
      await redis.set(`clip:${normalizedSlug}`, updatedRoom, { ex: 60 * 60 * 24 * 30 });
    } catch (e) {
      console.error('Failed writing to Redis:', e);
    }
  }

  return updatedRoom;
}

export async function deleteClipboard(slug: string): Promise<boolean> {
  const normalizedSlug = slug.toLowerCase().trim();

  // Remove from memory cache
  memoryStore.delete(normalizedSlug);

  // Remove from Redis
  if (redis) {
    try {
      await redis.del(`clip:${normalizedSlug}`);
    } catch (e) {
      console.error('Failed deleting from Redis:', e);
    }
  }

  return true;
}
