// File: app/api/tmdb/route.js
import { NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const FALLBACK_TMDB_KEY = "e2b0c95a0bc07e997f769f3d9b4b0db3";

// Whitelist allowed TMDB proxy segments to prevent path manipulation
const ALLOWED_PATH_PREFIXES = [
  'trending/',
  'movie/',
  'tv/',
  'person/',
  'discover/',
  'search/',
  'genre/',
  'configuration',
  'watch/providers'
];

function isSafeEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') return false;
  const clean = endpoint.trim().replace(/^\/+/, '');
  // Prevent path traversal sequences
  if (clean.includes('..') || clean.includes('\\')) return false;
  return ALLOWED_PATH_PREFIXES.some(prefix => clean.startsWith(prefix));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawEndpoint = searchParams.get('endpoint') || 'trending/movie/day';
    const cleanEndpoint = rawEndpoint.trim().replace(/^\/+/, '');

    if (!isSafeEndpoint(cleanEndpoint)) {
      return NextResponse.json(
        { error: 'Prohibited or unsupported TMDB endpoint pathway.' },
        { status: 400 }
      );
    }

    // 1. Resolve Credentials (Bearer Access Token or API Key)
    const accessToken = process.env.TMDB_ACCESS_TOKEN;
    const apiKey = 
      process.env.TMDB_API_KEY || 
      process.env.NEXT_PUBLIC_TMDB_API_KEY || 
      FALLBACK_TMDB_KEY;

    // 2. Reconstruct query parameters safely
    const targetUrl = new URL(`${TMDB_BASE_URL}/${cleanEndpoint}`);
    
    // Forward all incoming client searchParams except internal 'endpoint'
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        targetUrl.searchParams.set(key, value);
      }
    });

    // Ensure baseline defaults
    if (!targetUrl.searchParams.has('language')) {
      targetUrl.searchParams.set('language', 'en-US');
    }

    const headers = { accept: 'application/json' };
    if (accessToken && accessToken.length > 40) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      targetUrl.searchParams.set('api_key', apiKey);
    }

    // 3. Fetch upstream from TMDB with edge revalidation (1 hour)
    const res = await fetch(targetUrl.toString(), {
      headers,
      next: { revalidate: 3600 }
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.status_message || 'TMDB gateway error' },
        { status: res.status }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800'
      }
    });

  } catch (error) {
    console.error('TMDB Proxy Route Exception:', error);
    return NextResponse.json(
      { error: 'Internal TMDB telemetry proxy failure.' },
      { status: 500 }
    );
  }
}
