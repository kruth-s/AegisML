import { NextRequest, NextResponse } from 'next/server';
import { APIResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    // Generate readable random room code like 'clip-9x4k7'
    const randomChars = Math.random().toString(36).substring(2, 8);
    const roomCode = `clip-${randomChars}`;

    return NextResponse.json<APIResponse<{ slug: string }>>({
      success: true,
      data: { slug: roomCode },
    });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Failed to generate room code' },
      { status: 500 }
    );
  }
}
