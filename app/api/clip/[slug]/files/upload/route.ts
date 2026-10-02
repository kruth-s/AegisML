import { NextRequest, NextResponse } from 'next/server';
import { getClipboard, saveClipboard } from '@/lib/db';
import { APIResponse, FileItem } from '@/lib/types';

// Maximum payload size for direct in-memory / data-url storage (10MB)
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer then to base64 Data URL for zero-config persistence
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'application/octet-stream';
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const id = Math.random().toString(36).substring(2, 9);
    const fileItem: FileItem = {
      id,
      publicId: `direct_${id}`,
      filename: file.name || `drop_${Date.now()}`,
      url: dataUrl,
      secureUrl: dataUrl,
      size: file.size,
      contentType: mimeType,
      createdAt: new Date().toISOString(),
    };

    // Append to existing room files
    const existing = (await getClipboard(slug)) || null;
    const updatedFiles = existing && existing.files ? [fileItem, ...existing.files] : [fileItem];

    await saveClipboard(slug, { files: updatedFiles });

    return NextResponse.json<APIResponse<FileItem>>({
      success: true,
      data: fileItem,
    });
  } catch (error: any) {
    console.error('Direct upload error:', error);
    return NextResponse.json<APIResponse<null>>(
      { success: false, error: error.message || 'Direct upload failed' },
      { status: 500 }
    );
  }
}
