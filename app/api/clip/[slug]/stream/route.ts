import { NextRequest } from 'next/server';
import { subscribeToRoom } from '@/lib/events';
import { getClipboard } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  if (!slug) {
    return new Response('Slug required', { status: 400 });
  }

  const normalizedSlug = slug.toLowerCase().trim();
  const encoder = new TextEncoder();

  // Create real-time Server-Sent Events stream
  const stream = new ReadableStream({
    async start(controller) {
      // 1. Send initial connected event + initial room state
      try {
        const initialRoom = await getClipboard(normalizedSlug);
        controller.enqueue(
          encoder.encode(
            `event: connected\ndata: ${JSON.stringify({
              connected: true,
              room: initialRoom,
            })}\n\n`
          )
        );
      } catch {
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ connected: true })}\n\n`)
        );
      }

      // 2. Subscribe to room changes (<50ms push)
      const unsubscribe = subscribeToRoom(normalizedSlug, (payload) => {
        try {
          const eventType = payload?.type === 'live_typing' ? 'live_typing' : 'update';
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`)
          );
        } catch (e) {
          // Controller might be closed
        }
      });

      // 3. Keep-alive ping every 15s to prevent timeouts
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      // 4. Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
