import { NextRequest, NextResponse } from 'next/server';
import { getClipboard, saveClipboard } from '@/lib/db';
import { broadcastToRoom } from '@/lib/events';
import { APIResponse, ClipboardRoom } from '@/lib/types';

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
    const { action, burnMode, durationSeconds, deviceId } = body;

    const existing = await getClipboard(slug);
    if (!existing) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'Room not found' },
        { status: 404 }
      );
    }

    // 1. ACTION: Set Burn Mode (e.g. 'burn_on_copy' or 'timer')
    if (action === 'set_mode') {
      const now = Date.now();
      const expiresAt =
        burnMode === 'timer' && typeof durationSeconds === 'number'
          ? now + durationSeconds * 1000
          : null;

      const updated = await saveClipboard(slug, {
        burnMode: burnMode || null,
        burnExpiresAt: expiresAt,
        burnAuthorDeviceId: deviceId,
        isBurned: false,
      });

      broadcastToRoom(slug, {
        type: 'update',
        ...updated,
      });

      return NextResponse.json<APIResponse<ClipboardRoom>>({
        success: true,
        data: updated,
      });
    }

    // 2. ACTION: Execute Burn (Self-Destruct & Shred)
    if (action === 'burn') {
      // Validate: if burn_on_copy is set and the requester is the original author, don't burn if author is copying their own text
      // (Unless explicitly forced)
      if (
        existing.burnMode === 'burn_on_copy' &&
        existing.burnAuthorDeviceId &&
        deviceId &&
        deviceId === existing.burnAuthorDeviceId &&
        !body.force
      ) {
        // Author copying own text does not trigger self-destruct
        return NextResponse.json<APIResponse<{ burned: boolean }>>({
          success: true,
          data: { burned: false },
        });
      }

      // Purge content permanently from database/Redis
      const updated = await saveClipboard(slug, {
        mainContent: '',
        burnMode: null,
        burnExpiresAt: null,
        isBurned: true,
      });

      // Broadcast content_burned SSE event to all connected peers for synchronous paper shredder animation
      broadcastToRoom(slug, {
        type: 'content_burned',
        burnedAt: Date.now(),
        room: updated,
      });

      return NextResponse.json<APIResponse<{ burned: boolean }>>({
        success: true,
        data: { burned: true },
      });
    }

    return NextResponse.json<APIResponse<null>>(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Burn route error:', error);
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
