import { NextRequest, NextResponse } from 'next/server';
import { recordPresence, getActivePresence, removePresence } from '@/lib/presence';
import { APIResponse, DevicePresence } from '@/lib/types';

function getCountryFlag(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '';
  }
}

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

    const devices = await getActivePresence(slug);
    return NextResponse.json<APIResponse<{ devices: DevicePresence[] }>>({
      success: true,
      data: { devices },
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

    // Support navigator.sendBeacon leave call: POST /presence?deviceId=...
    const { searchParams } = new URL(request.url);
    const leaveDeviceId = searchParams.get('deviceId');
    if (leaveDeviceId) {
      await removePresence(slug, leaveDeviceId);
      return NextResponse.json<APIResponse<{ message: string }>>({
        success: true,
        data: { message: 'Device removed' },
      });
    }

    // Parse body safely
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty or invalid body (e.g. from beacon)
    }

    if (body?.action === 'leave' && body?.deviceId) {
      await removePresence(slug, body.deviceId);
      return NextResponse.json<APIResponse<{ message: string }>>({
        success: true,
        data: { message: 'Device left' },
      });
    }

    if (!body?.device?.deviceId) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'Device data is required' },
        { status: 400 }
      );
    }

    // Extract network & geolocation telemetry from Vercel Edge / Forwarded headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : (realIp || '127.0.0.1');

    // Vercel Geolocation headers
    const rawCity = request.headers.get('x-vercel-ip-city');
    const city = rawCity ? decodeURIComponent(rawCity) : undefined;
    const country = request.headers.get('x-vercel-ip-country') || undefined;
    const region = request.headers.get('x-vercel-ip-country-region') || undefined;
    const countryFlag = country ? getCountryFlag(country) : undefined;

    const enrichedDevice = {
      ...body.device,
      ip: clientIp,
      city,
      country,
      region,
      countryFlag,
    };

    const devices = await recordPresence(slug, enrichedDevice);
    return NextResponse.json<APIResponse<{ devices: DevicePresence[] }>>({
      success: true,
      data: { devices },
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
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (slug && deviceId) {
      await removePresence(slug, deviceId);
    }

    return NextResponse.json<APIResponse<{ success: boolean }>>({
      success: true,
      data: { success: true },
    });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
