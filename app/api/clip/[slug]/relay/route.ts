import { NextRequest, NextResponse } from 'next/server';
import { createRelayTransfer, getRelayTransfer } from '@/lib/relayTransfer';
import { broadcastSignal } from '@/lib/p2pSignaling';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const senderDeviceId = (formData.get('senderDeviceId') as string) || '';
    const senderDeviceName = (formData.get('senderDeviceName') as string) || 'Peer';

    if (!file) {
      return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const relayItem = createRelayTransfer({
      slug,
      filename: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
      buffer,
      senderDeviceId,
      senderDeviceName,
    });

    // Notify all devices in the room via SSE
    await broadcastSignal(slug, {
      fromDeviceId: senderDeviceId,
      fromDeviceName: senderDeviceName,
      toDeviceId: 'all',
      signalType: 'relay_ready',
      data: {
        code: relayItem.code,
        filename: relayItem.filename,
        size: relayItem.size,
        contentType: relayItem.contentType,
        senderDeviceName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        code: relayItem.code,
        filename: relayItem.filename,
        size: relayItem.size,
        expiresAt: relayItem.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Relay transfer error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const infoOnly = searchParams.get('info') === '1';

    if (!code) {
      return NextResponse.json({ success: false, error: 'Transfer code is required' }, { status: 400 });
    }

    const item = getRelayTransfer(code);
    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired 6-digit transfer code' },
        { status: 404 }
      );
    }

    // Return metadata info only
    if (infoOnly) {
      return NextResponse.json({
        success: true,
        data: {
          code: item.code,
          filename: item.filename,
          size: item.size,
          contentType: item.contentType,
          senderDeviceName: item.senderDeviceName,
          expiresAt: item.expiresAt,
        },
      });
    }

    // Stream download file binary
    item.downloadCount += 1;
    const uint8 = new Uint8Array(item.buffer);

    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': item.contentType || 'application/octet-stream',
        'Content-Length': item.size.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(item.filename)}"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
