import { DevicePresence } from './types';
import { Redis } from '@upstash/redis';

// Lazily initialize Redis if credentials are provided
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

// In-memory fallback presence store: roomSlug -> Map<deviceId, DevicePresence>
const memoryPresence = new Map<string, Map<string, DevicePresence>>();

// Heartbeat timeout in ms (devices with no update in 12s are pruned)
const PRESENCE_TTL_MS = 12000;

export async function recordPresence(
  slug: string,
  device: Omit<DevicePresence, 'lastSeen'>
): Promise<DevicePresence[]> {
  const normalizedSlug = slug.toLowerCase().trim();
  const now = Date.now();

  const fullDevice: DevicePresence = {
    ...device,
    lastSeen: now,
  };

  // 1. Update In-Memory
  if (!memoryPresence.has(normalizedSlug)) {
    memoryPresence.set(normalizedSlug, new Map());
  }
  const roomMap = memoryPresence.get(normalizedSlug)!;
  roomMap.set(device.deviceId, fullDevice);

  // Prune expired in memory
  for (const [id, dev] of roomMap.entries()) {
    if (now - dev.lastSeen > PRESENCE_TTL_MS) {
      roomMap.delete(id);
    }
  }

  // 2. Redis sync if available
  if (redis) {
    try {
      const redisKey = `presence:${normalizedSlug}`;
      await redis.hset(redisKey, { [device.deviceId]: JSON.stringify(fullDevice) });
      await redis.expire(redisKey, 30); // 30s expiry on room presence hash
    } catch (e) {
      console.error('Failed saving presence to Redis:', e);
    }
  }

  return getActivePresence(normalizedSlug);
}

export async function getActivePresence(slug: string): Promise<DevicePresence[]> {
  const normalizedSlug = slug.toLowerCase().trim();
  const now = Date.now();
  let rawList: DevicePresence[] = [];

  // Try Redis first if available
  if (redis) {
    try {
      const redisKey = `presence:${normalizedSlug}`;
      const records = await redis.hgetall<Record<string, string | DevicePresence>>(redisKey);
      if (records && Object.keys(records).length > 0) {
        const active: DevicePresence[] = [];
        const expiredKeys: string[] = [];

        for (const [deviceId, val] of Object.entries(records)) {
          const dev: DevicePresence = typeof val === 'string' ? JSON.parse(val) : val;
          if (now - dev.lastSeen <= PRESENCE_TTL_MS) {
            active.push(dev);
          } else {
            expiredKeys.push(deviceId);
          }
        }

        // Clean up expired from Redis async
        if (expiredKeys.length > 0) {
          redis.hdel(redisKey, ...expiredKeys).catch(() => {});
        }

        rawList = active;
      }
    } catch (e) {
      console.error('Failed reading presence from Redis, falling back to memory:', e);
    }
  }

  // Fallback to memory if Redis is empty or unavailable
  if (rawList.length === 0) {
    const roomMap = memoryPresence.get(normalizedSlug);
    if (roomMap) {
      for (const [id, dev] of roomMap.entries()) {
        if (now - dev.lastSeen <= PRESENCE_TTL_MS) {
          rawList.push(dev);
        } else {
          roomMap.delete(id);
        }
      }
    }
  }

  // Calculate "Same Network / Same WiFi" flag if devices share the same public IP
  const ipCounts: Record<string, number> = {};
  for (const dev of rawList) {
    if (dev.ip && dev.ip !== '127.0.0.1' && dev.ip !== '::1' && !dev.ip.startsWith('localhost')) {
      ipCounts[dev.ip] = (ipCounts[dev.ip] || 0) + 1;
    }
  }

  const result = rawList.map((dev) => ({
    ...dev,
    isSameNetwork: !!(dev.ip && ipCounts[dev.ip] > 1),
  }));

  return result.sort((a, b) => b.lastSeen - a.lastSeen);
}

export async function removePresence(slug: string, deviceId: string): Promise<void> {
  const normalizedSlug = slug.toLowerCase().trim();
  const roomMap = memoryPresence.get(normalizedSlug);
  if (roomMap) {
    roomMap.delete(deviceId);
  }

  if (redis) {
    try {
      await redis.hdel(`presence:${normalizedSlug}`, deviceId);
    } catch (e) {
      console.error('Failed removing presence from Redis:', e);
    }
  }
}
