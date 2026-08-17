import { NextRequest, NextResponse } from 'next/server';
import { getClipboard, saveClipboard } from '@/lib/db';
import { APIResponse, FileItem } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json<APIResponse<null>>( { success: false, error: 'Slug required' }, { status: 400 });
    }

    const body = await request.json();
    // Expecting cloudinary response fields
    const { public_id, secure_url, url, bytes, original_filename, resource_type, format } = body;

    const id = Math.random().toString(36).substring(2, 9);
    const fileItem: FileItem = {
      id,
      publicId: public_id,
      filename: original_filename || public_id,
      url: secure_url || url || '',
      secureUrl: secure_url,
      size: bytes || 0,
      contentType: resource_type || format || undefined,
      createdAt: new Date().toISOString(),
    };

    // Append to existing room files
    const existing = (await getClipboard(slug)) || null;
    const updatedFiles = existing && existing.files ? [fileItem, ...existing.files] : [fileItem];

    await saveClipboard(slug, { files: updatedFiles });

    return NextResponse.json<APIResponse<FileItem>>({ success: true, data: fileItem });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>( { success: false, error: error.message || 'Failed to save file metadata' }, { status: 500 });
  }
}
