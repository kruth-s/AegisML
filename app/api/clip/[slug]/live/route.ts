import { NextRequest, NextResponse } from 'next/server';
import { getClipboard, saveClipboard } from '@/lib/db';
import { broadcastToRoom } from '@/lib/events';
import { APIResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'Slug required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { mainContent, senderDeviceId, senderDeviceName, senderColor } = body;

    if (typeof mainContent !== 'string') {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'mainContent must be a string' },
        { status: 400 }
      );
    }

    const normalizedSlug = slug.toLowerCase().trim();

    // 1. Instantly broadcast to all active SSE connected devices (<10ms)
    broadcastToRoom(normalizedSlug, {
      type: 'live_typing',
      slug: normalizedSlug,
      mainContent,
      senderDeviceId,
      senderDeviceName,
      senderColor,
      timestamp: Date.now(),
    });

    // 2. Fast-path update memory store without waiting for external network/Redis calls
    const existing = await getClipboard(normalizedSlug);
    if (existing) {
      existing.mainContent = mainContent;
      existing.updatedAt = new Date().toISOString();
    } else {
      await saveClipboard(normalizedSlug, { mainContent });
    }

    return NextResponse.json<APIResponse<{ broadcast: boolean }>>({
      success: true,
      data: { broadcast: true },
    });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Live typing broadcast failed' },
      { status: 500 }
    );
  }
}
