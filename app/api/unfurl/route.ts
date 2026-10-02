import { NextRequest, NextResponse } from 'next/server';

interface LinkMetadata {
  url: string;
  title: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  domain: string;
  type?: 'youtube' | 'github' | 'twitter' | 'figma' | 'article' | 'website';
}

// In-memory cache for unfurled URLs: url -> { data, timestamp }
const urlCache = new Map<string, { data: LinkMetadata; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

function getFaviconUrl(urlStr: string, rawFavicon?: string): string {
  try {
    const parsed = new URL(urlStr);
    if (rawFavicon) {
      if (rawFavicon.startsWith('http')) return rawFavicon;
      if (rawFavicon.startsWith('//')) return `https:${rawFavicon}`;
      return new URL(rawFavicon, parsed.origin).href;
    }
    // High-resolution Google Favicon service fallback
    return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=128`;
  } catch {
    return '';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
  }

  // Validate URL structure
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl.trim());
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ success: false, error: 'Invalid URL protocol' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed URL' }, { status: 400 });
  }

  const normalizedUrl = parsedUrl.href;

  // Check cache
  const cached = urlCache.get(normalizedUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, data: cached.data });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const domain = hostname.replace(/^www\./, '');

  let metadata: LinkMetadata = {
    url: normalizedUrl,
    title: domain,
    domain,
    favicon: getFaviconUrl(normalizedUrl),
    type: 'website',
  };

  // Specific handler 1: YouTube (oEmbed)
  if (domain === 'youtube.com' || domain === 'youtu.be' || domain.endsWith('.youtube.com')) {
    metadata.type = 'youtube';
    metadata.siteName = 'YouTube';

    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`,
        { next: { revalidate: 3600 } }
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        metadata.title = oembedData.title || 'YouTube Video';
        metadata.description = `Uploaded by ${oembedData.author_name || 'YouTube creator'}`;
        metadata.image = oembedData.thumbnail_url;
        metadata.siteName = 'YouTube';

        urlCache.set(normalizedUrl, { data: metadata, timestamp: Date.now() });
        return NextResponse.json({ success: true, data: metadata });
      }
    } catch {}
  }

  // Specific handler 2: GitHub
  if (domain === 'github.com') {
    metadata.type = 'github';
    metadata.siteName = 'GitHub';
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo] = parts;
      metadata.title = `${owner}/${repo}`;
      metadata.description = `GitHub repository by ${owner}`;
      metadata.image = `https://opengraph.githubassets.com/1/${owner}/${repo}`;
    } else if (parts.length === 1) {
      metadata.title = `${parts[0]} on GitHub`;
      metadata.description = `GitHub developer profile`;
    }
  }

  // Specific handler 3: Figma
  if (domain === 'figma.com') {
    metadata.type = 'figma';
    metadata.siteName = 'Figma';
    const parts = parsedUrl.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      metadata.title = decodeURIComponent(parts[parts.length - 1].replace(/[-_]/g, ' '));
      metadata.description = 'Figma Design & Prototype';
    }
  }

  // General OpenGraph HTML scraper
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();

      // Extract title
      const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        metadata.title = decodeEntities(ogTitleMatch[1]);
      } else if (titleTagMatch && titleTagMatch[1]) {
        metadata.title = decodeEntities(titleTagMatch[1].trim());
      }

      // Extract description
      const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
                          html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      if (ogDescMatch && ogDescMatch[1]) {
        metadata.description = decodeEntities(ogDescMatch[1]);
      }

      // Extract image
      const ogImgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (ogImgMatch && ogImgMatch[1]) {
        let img = ogImgMatch[1];
        if (img.startsWith('//')) img = `https:${img}`;
        else if (img.startsWith('/')) img = new URL(img, parsedUrl.origin).href;
        metadata.image = img;
      }

      // Extract site name
      const ogSiteMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
      if (ogSiteMatch && ogSiteMatch[1]) {
        metadata.siteName = decodeEntities(ogSiteMatch[1]);
      }

      // Extract favicon
      const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i);
      if (iconMatch && iconMatch[1]) {
        metadata.favicon = getFaviconUrl(normalizedUrl, iconMatch[1]);
      }
    }
  } catch (e) {
    // If fetching fails, fall back to basic domain-based metadata
  }

  // Ensure favicon exists
  if (!metadata.favicon) {
    metadata.favicon = getFaviconUrl(normalizedUrl);
  }

  urlCache.set(normalizedUrl, { data: metadata, timestamp: Date.now() });
  return NextResponse.json({ success: true, data: metadata });
}

function decodeEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}
