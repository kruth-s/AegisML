import { broadcastToRoom } from './events';
import { Redis } from '@upstash/redis';

// Lazily initialize Redis if credentials are provided
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export interface P2PSignalMessage {
  id: string;
  slug: string;
  fromDeviceId: string;
  fromDeviceName: string;
  fromDeviceType?: string;
  toDeviceId: string;
  signalType: 'offer' | 'answer' | 'ice' | 'reject' | 'cancel' | 'relay_ready';
  data: any; // SDP offer/answer, ICE candidate, or file metadata
  timestamp: number;
}

// In-memory queue of pending signals: toDeviceId -> P2PSignalMessage[]
const pendingSignals = new Map<string, P2PSignalMessage[]>();

// Maximum age of a signal before expiry (60 seconds)
const SIGNAL_TTL_MS = 60000;

export async function sendP2PSignal(signal: Omit<P2PSignalMessage, 'id' | 'timestamp'>): Promise<P2PSignalMessage> {
  const fullSignal: P2PSignalMessage = {
    ...signal,
    id: `sig_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`,
    timestamp: Date.now(),
  };

  const normalizedSlug = signal.slug.toLowerCase().trim();

  // 1. Instantly push via Server-Sent Events (<10ms)
  broadcastToRoom(normalizedSlug, {
    type: 'p2p_signal',
    ...fullSignal,
  });

  // 2. Buffer in memory for target device
  if (!pendingSignals.has(signal.toDeviceId)) {
    pendingSignals.set(signal.toDeviceId, []);
  }
  const queue = pendingSignals.get(signal.toDeviceId)!;
  queue.push(fullSignal);

  // Prune expired
  const now = Date.now();
  const filtered = queue.filter((s) => now - s.timestamp < SIGNAL_TTL_MS);
  pendingSignals.set(signal.toDeviceId, filtered);

  // 3. Optional Redis buffer
  if (redis) {
    try {
      const redisKey = `p2p_sig:${signal.toDeviceId}`;
      await redis.lpush(redisKey, JSON.stringify(fullSignal));
      await redis.expire(redisKey, 60);
    } catch (e) {
      // Non-critical Redis error
    }
  }

  return fullSignal;
}

export async function getPendingSignals(deviceId: string): Promise<P2PSignalMessage[]> {
  const now = Date.now();
  let results: P2PSignalMessage[] = [];

  // Memory queue
  const queue = pendingSignals.get(deviceId);
  if (queue && queue.length > 0) {
    results = [...queue];
    pendingSignals.delete(deviceId); // Consume on read
  }

  // Redis fallback if empty
  if (results.length === 0 && redis) {
    try {
      const redisKey = `p2p_sig:${deviceId}`;
      const items = await redis.lrange<string[]>(redisKey, 0, -1);
      if (items && items.length > 0) {
        results = items.map((it) => (typeof it === 'string' ? JSON.parse(it) : it));
        await redis.del(redisKey);
      }
    } catch (e) {}
  }

  return results.filter((s) => now - s.timestamp < SIGNAL_TTL_MS);
}

export async function broadcastSignal(
  slug: string,
  signal: {
    fromDeviceId: string;
    fromDeviceName: string;
    toDeviceId?: string;
    signalType: P2PSignalMessage['signalType'];
    data: any;
  }
) {
  return sendP2PSignal({
    slug,
    fromDeviceId: signal.fromDeviceId,
    fromDeviceName: signal.fromDeviceName,
    toDeviceId: signal.toDeviceId || 'all',
    signalType: signal.signalType,
    data: signal.data,
  });
}
