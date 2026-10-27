// app/api/metadata/route.js
import { NextResponse } from 'next/server';

// Quick HTML entity decoder for clean preview text
function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&bull;/g, '•')
    .replace(/&copy;/g, '©')
    .trim();
}

// SSRF Guard: Verify URL scheme and prevent probing local/internal networks
function isSafeUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost, loopbacks, and link-local ranges
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('127.') ||
      host === '169.254.169.254' // Cloud instance metadata
    ) {
      return false;
    }

    // Block standard private subnets
    if (
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function POST(request) {
  let targetUrl = '';

  try {
    const body = await request.json().catch(() => ({}));
    targetUrl = (body.url || '').trim();

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    // Prepend protocol if omitted
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    if (!isSafeUrl(targetUrl)) {
      return NextResponse.json(
        { error: 'Security violation: Prohibited or malformed destination URL.' },
        { status: 400 }
      );
    }

    // Enforce 6-second timeout to prevent hanging connections
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SceneSenseBot/2.6 (+https://scenesense.app; movie metadata preview)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 3600 }, // 1-hour cache
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        metadata: { title: targetUrl, description: '', image: '', url: targetUrl }
      });
    }

    // Read only first 300KB to prevent memory exhaustion on large files
    const reader = res.body.getReader();
    const chunks = [];
    let bytesReceived = 0;
    const maxBytes = 300 * 1024; // 300 KB limit

    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      bytesReceived += value.length;
      if (bytesReceived >= maxBytes) {
        reader.cancel();
        break;
      }
    }

    const html = new TextDecoder('utf-8').decode(
      Uint8Array.from(chunks.flatMap(c => Array.from(c)))
    );

    // Flexible metadata tag reader across OpenGraph and Twitter Cards
    const extractMeta = (keys) => {
      for (const key of keys) {
        const regex1 = new RegExp(`<meta[^>]*(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
        const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, 'i');
        const match = html.match(regex1) || html.match(regex2);
        if (match && match[1]) return decodeHtmlEntities(match[1]);
      }
      return null;
    };

    // 1. Resolve Title
    let title = extractMeta(['og:title', 'twitter:title']) ||
                html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ||
                targetUrl;
    title = decodeHtmlEntities(title);

    // 2. Resolve Description
    let description = extractMeta(['og:description', 'twitter:description', 'description']) || '';
    description = decodeHtmlEntities(description);

    // 3. Resolve Media Image
    let image = extractMeta(['og:image', 'twitter:image', 'twitter:image:src', 'image']) || '';
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        const baseOrigin = new URL(targetUrl).origin;
        image = new URL(image, baseOrigin).href;
      } catch {
        image = '';
      }
    }

    // 4. Resolve Site Name
    const siteName = extractMeta(['og:site_name']) || '';

    return NextResponse.json({
      success: true,
      metadata: {
        title,
        description,
        image,
        siteName,
        url: targetUrl
      }
    });

  } catch (err) {
    console.warn("Metadata inspection notice:", err.message || err);
    return NextResponse.json({
      success: false,
      metadata: { title: targetUrl, description: '', image: '', url: targetUrl }
    });
  }
}