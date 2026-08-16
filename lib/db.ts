import { ClipboardRoom } from './types';
import { Redis } from '@upstash/redis';

// Use the KV_ env vars that Vercel's Upstash integration injects
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// In-memory cache for fast repeated reads within the same serverless invocation
const memoryStore = new Map<string, ClipboardRoom>();

export async function getClipboard(slug: string): Promise<ClipboardRoom | null> {
  const normalizedSlug = slug.toLowerCase().trim();

  // 1. Memory cache (within same invocation)
  if (memoryStore.has(normalizedSlug)) {
    return memoryStore.get(normalizedSlug)!;
  }

  // 2. Redis (persistent, cross-invocation)
  try {
    const raw = await redis.get<ClipboardRoom>(`clip:${normalizedSlug}`);
    if (raw) {
      memoryStore.set(normalizedSlug, raw);
      return raw;
    }
  } catch (e) {
    console.error('Failed reading from Redis:', e);
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

  // Save to Redis with 30-day TTL
  try {
    await redis.set(`clip:${normalizedSlug}`, updatedRoom, { ex: 60 * 60 * 24 * 30 });
  } catch (e) {
    console.error('Failed writing to Redis:', e);
  }

  return updatedRoom;
}

export async function deleteClipboard(slug: string): Promise<boolean> {
  const normalizedSlug = slug.toLowerCase().trim();

  // Remove from memory cache
  memoryStore.delete(normalizedSlug);

  // Remove from Redis
  try {
    await redis.del(`clip:${normalizedSlug}`);
  } catch (e) {
    console.error('Failed deleting from Redis:', e);
  }

  return true;
}
