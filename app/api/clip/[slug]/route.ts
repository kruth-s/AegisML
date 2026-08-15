import { NextRequest, NextResponse } from 'next/server';
import { getClipboard, saveClipboard, deleteClipboard } from '@/lib/db';
import { APIResponse, ClipboardRoom } from '@/lib/types';

export async function GET(
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

    let room = await getClipboard(slug);

    if (!room) {
      // Create empty room if it doesn't exist yet
      room = await saveClipboard(slug, {
        mainContent: '',
        snippets: [],
      });
    }

    return NextResponse.json<APIResponse<ClipboardRoom>>({
      success: true,
      data: room,
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
