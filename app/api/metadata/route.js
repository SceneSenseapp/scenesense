// File: app/api/metadata/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isSafeExternalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function decodeHtmlEntities(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const url = (body.url || '').trim();

    if (!url || !isSafeExternalUrl(url)) {
      return NextResponse.json(
        { error: 'Valid public HTTP/HTTPS URL required.' },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'SceneSenseBot/2.0 (+https://scenesense.app)' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        metadata: { title: url, description: '', image: '', url },
      });
    }

    const html = (await res.text()).slice(0, 150000);

    const getMetaTag = (key) => {
      const match =
        html.match(
          new RegExp(
            `<meta[^>]*property=["'](?:og|twitter):${key}["'][^>]*content=["']([^"']*)["']`,
            'i'
          )
        ) ||
        html.match(
          new RegExp(
            `<meta[^>]*content=["']([^"']*)["'][^>]*property=["'](?:og|twitter):${key}["']`,
            'i'
          )
        ) ||
        html.match(
          new RegExp(
            `<meta[^>]*name=["'](?:twitter:)?${key}["'][^>]*content=["']([^"']*)["']`,
            'i'
          )
        );
      return match ? decodeHtmlEntities(match[1]) : null;
    };

    const rawTitle =
      getMetaTag('title') ||
      decodeHtmlEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '') ||
      url;
    const description = getMetaTag('description') || '';
    const image = getMetaTag('image') || '';
    const siteName = getMetaTag('site_name') || new URL(url).hostname.replace(/^www\./, '');

    return NextResponse.json({
      success: true,
      metadata: {
        title: rawTitle,
        description,
        image,
        siteName,
        url,
      },
    });
  } catch (err) {
    console.warn('Metadata scraping warning:', err.message);
    return NextResponse.json({
      success: false,
      metadata: { title: '', description: '', image: '', url: '' },
    });
  }
}
