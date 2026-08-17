import { NextRequest, NextResponse } from 'next/server';
import { getClipboard, saveClipboard } from '@/lib/db';
import { APIResponse } from '@/lib/types';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const slug = params.slug;
    const id = params.id;
    if (!slug || !id) {
      return NextResponse.json<APIResponse<null>>( { success: false, error: 'Slug and file id required' }, { status: 400 });
    }

    const room = await getClipboard(slug);
    if (!room || !room.files) {
      return NextResponse.json<APIResponse<null>>( { success: false, error: 'File not found' }, { status: 404 });
    }

    const file = room.files.find((f) => f.id === id);
    if (!file) {
      return NextResponse.json<APIResponse<null>>( { success: false, error: 'File not found' }, { status: 404 });
    }

    // Remove file from room and save
    const updatedFiles = room.files.filter((f) => f.id !== id);
    await saveClipboard(slug, { files: updatedFiles });

    // Attempt to delete from Cloudinary (best-effort)
    try {
      if (file.publicId) {
        await cloudinary.uploader.destroy(file.publicId, { resource_type: 'auto' });
      }
    } catch (e) {
      console.error('Cloudinary delete failed', e);
    }

    return NextResponse.json<APIResponse<{ message: string }>>({ success: true, data: { message: 'File deleted' } });
  } catch (error: any) {
    return NextResponse.json<APIResponse<null>>( { success: false, error: error.message || 'Failed to delete file' }, { status: 500 });
  }
}
