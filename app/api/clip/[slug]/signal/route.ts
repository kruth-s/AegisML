import { NextRequest, NextResponse } from 'next/server';
import { sendP2PSignal, getPendingSignals } from '@/lib/p2pSignaling';
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
    const { fromDeviceId, fromDeviceName, fromDeviceType, toDeviceId, signalType, data } = body;

    if (!fromDeviceId || !toDeviceId || !signalType) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'Missing required signal fields' },
        { status: 400 }
      );
    }

    const signal = await sendP2PSignal({
      slug,
      fromDeviceId,
      fromDeviceName: fromDeviceName || 'Unknown Device',
      fromDeviceType,
      toDeviceId,
      signalType,
      data,
    });

    return NextResponse.json<APIResponse<{ sent: boolean; id: string }>>({
      success: true,
      data: { sent: true, id: signal.id },
    });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Failed to dispatch signal' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'deviceId required' },
        { status: 400 }
      );
    }

    const pending = await getPendingSignals(deviceId);

    return NextResponse.json<APIResponse<typeof pending>>({
      success: true,
      data: pending,
    });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Failed to read signals' },
      { status: 500 }
    );
  }
}
