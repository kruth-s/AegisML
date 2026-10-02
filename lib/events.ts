// In-memory pub/sub event broadcaster for Server-Sent Events (SSE)
type RoomListener = (data: any) => void;

// Map of normalized slug -> Set of active SSE listeners
const roomListeners = new Map<string, Set<RoomListener>>();

export function subscribeToRoom(slug: string, listener: RoomListener): () => void {
  const normalizedSlug = slug.toLowerCase().trim();

  if (!roomListeners.has(normalizedSlug)) {
    roomListeners.set(normalizedSlug, new Set());
  }

  const listeners = roomListeners.get(normalizedSlug)!;
  listeners.add(listener);

  // Return unsubscribe callback
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      roomListeners.delete(normalizedSlug);
    }
  };
}

export function broadcastToRoom(slug: string, data: any): void {
  const normalizedSlug = slug.toLowerCase().trim();
  const listeners = roomListeners.get(normalizedSlug);

  if (listeners && listeners.size > 0) {
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (err) {
        console.error('SSE listener error:', err);
      }
    }
  }
}
