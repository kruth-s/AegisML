import { NextRequest, NextResponse } from 'next/server';
import { getClipboard, saveClipboard } from '@/lib/db';
import {
  generatePrivateWords,
  getShuffledPhrasesWithDecoys,
  verifyPrivateWords,
  encodeVaultCipher,
} from '@/lib/privateVault';
import { APIResponse } from '@/lib/types';

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

    const room = await getClipboard(slug);

    if (!room) {
      return NextResponse.json({
        success: true,
        exists: false,
        isPrivate: false,
      });
    }

    if (room.isPrivate && room.privateWords && room.privateWords.length === 3) {
      const options = getShuffledPhrasesWithDecoys(room.privateWords);
      return NextResponse.json({
        success: true,
        exists: true,
        isPrivate: true,
        options,
        ctfCipher: encodeVaultCipher(room.privateWords),
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      isPrivate: false,
    });
  } catch (error: any) {
    return NextResponse.json(
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
    const slug = params.slug?.toLowerCase().trim();
    if (!slug) {
      return NextResponse.json<APIResponse<null>>(
        { success: false, error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const action = body.action || 'create_or_upgrade';

    const existing = await getClipboard(slug);

    // ACTION 1: Verify submitted 3 words
    if (action === 'verify') {
      const candidateWords: string[] = body.words || [];

      if (!existing || !existing.isPrivate || !existing.privateWords) {
        return NextResponse.json(
          { success: false, error: 'Room is not private or not found' },
          { status: 404 }
        );
      }

      const isValid = verifyPrivateWords(existing.privateWords, candidateWords);
      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Incorrect phrases. Access denied. Please ensure all 3 selected words match.',
          },
          { status: 401 }
        );
      }

      const token = `vault_unlocked_${slug}_${Buffer.from(existing.privateWords.join('-')).toString('base64').substring(0, 12)}`;
      
      const response = NextResponse.json({
        success: true,
        token,
        message: 'Vault unlocked successfully.',
        words: existing.privateWords,
      });

      // Set auth cookie for seamless access
      response.cookies.set(`vault_auth_${slug}`, token, {
        path: '/',
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      });

      return response;
    }

    // ACTION 2: Create or Upgrade to Private Room
    if (action === 'create_or_upgrade') {
      // Case A: Room already exists and is already private
      if (existing && existing.isPrivate && existing.privateWords && existing.privateWords.length === 3) {
        return NextResponse.json({
          success: true,
          slug,
          isPrivate: true,
          alreadyPrivate: true,
          words: existing.privateWords,
          options: getShuffledPhrasesWithDecoys(existing.privateWords),
          ctfCipher: encodeVaultCipher(existing.privateWords),
        });
      }

      // Case B: Room already exists as normal -> UPGRADE without losing content
      // Case C: Room doesn't exist -> CREATE new private room
      const privateWords = generatePrivateWords();

      const updated = await saveClipboard(slug, {
        isPrivate: true,
        privateWords,
      });

      const isUpgraded = Boolean(
        existing &&
          (existing.mainContent ||
            (existing.snippets && existing.snippets.length > 0) ||
            (existing.files && existing.files.length > 0))
      );

      const token = `vault_unlocked_${slug}_${Buffer.from(privateWords.join('-')).toString('base64').substring(0, 12)}`;

      const response = NextResponse.json({
        success: true,
        slug,
        isPrivate: true,
        newlyCreated: !existing,
        upgraded: isUpgraded,
        words: privateWords,
        token,
        options: getShuffledPhrasesWithDecoys(privateWords),
        ctfCipher: encodeVaultCipher(privateWords),
      });

      // Automatically authenticate the creator so they are never locked out of their own room
      response.cookies.set(`vault_auth_${slug}`, token, {
        path: '/',
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
