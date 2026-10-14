import { NextRequest, NextResponse } from 'next/server';
import { getClipboard, saveClipboard, deleteClipboard } from '@/lib/db';
import { getActivePresence } from '@/lib/presence';
import { APIResponse, ClipboardRoom } from '@/lib/types';

import { getShuffledPhrasesWithDecoys, encodeVaultCipher } from '@/lib/privateVault';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug?.toLowerCase().trim();
    if (!slug) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    let room = await getClipboard(slug);

    if (!room) {
      // Create empty room if it doesn't exist yet
      room = await saveClipboard(slug, {
        mainContent: '',
        snippets: [],
      });
    }

    // Attach currently active devices
    const activeDevices = await getActivePresence(slug);

    // Check if room is private vault
    if (room.isPrivate && room.privateWords && room.privateWords.length === 3) {
      const cookieToken = request.cookies.get(`vault_auth_${slug}`)?.value;
      const headerToken = request.headers.get('x-vault-token');
      const queryToken = request.nextUrl.searchParams.get('vault_token');
      const isAuthed =
        (cookieToken && cookieToken.startsWith(`vault_unlocked_${slug}`)) ||
        (headerToken && headerToken.startsWith(`vault_unlocked_${slug}`)) ||
        (queryToken && queryToken.startsWith(`vault_unlocked_${slug}`));

      const ctfCipher = encodeVaultCipher(room.privateWords);
      const options = getShuffledPhrasesWithDecoys(room.privateWords);

      if (!isAuthed) {
        return NextResponse.json<APIResponse<any>>({
          success: true,
          data: {
            slug,
            isPrivate: true,
            isLocked: true,
            mainContent: '',
            snippets: [],
            files: [],
            activeDevices,
            options,
            ctfCipher,
            createdAt: room.createdAt,
            updatedAt: room.updatedAt,
          },
        });
      }

      return NextResponse.json<APIResponse<ClipboardRoom & { isLocked?: boolean; ctfCipher?: string; options?: string[] }>>({
        success: true,
        data: {
          ...room,
          isLocked: false,
          activeDevices,
          options,
          ctfCipher,
        },
      });
    }

    return NextResponse.json<APIResponse<ClipboardRoom>>({
      success: true,
      data: {
        ...room,
        activeDevices,
      },
    });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = await saveClipboard(slug, body);

    return NextResponse.json<APIResponse<ClipboardRoom>>({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    await deleteClipboard(slug);

    return NextResponse.json<APIResponse<{ message: string }>>({
      success: true,
      data: { message: 'Clipboard room cleared successfully' },
    });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
