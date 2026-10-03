import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    const res = await fetch(url, { headers: { 'User-Agent': 'SceneSenseBot/1.0' } });
    const html = await res.text();

    const getMetaTag = (prop) => {
      const match = html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${prop}["']`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMetaTag('title') || html.match(/<title>([^<]*)</)?.[1] || url;
    const description = getMetaTag('description') || '';
    const image = getMetaTag('image') || '';

    return NextResponse.json({ success: true, metadata: { title, description, image, url } });
  } catch (err) {
    console.error("Metadata scraping error:", err);
    return NextResponse.json({ success: false, metadata: { title: url, url } });
  }
}