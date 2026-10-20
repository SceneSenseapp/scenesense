import { NextResponse } from 'next/server';

export async function GET(request) {
  // Extract parameters from the local request
  const { searchParams } = new URL(request.url);
  const requestedPage = searchParams.get('page');
  const requestedEndpoint = searchParams.get('endpoint') || 'trending/movie/day';

  // Restrict endpoint to a server-controlled allowlist
  const allowedEndpoints = new Set([
    'trending/movie/day',
    'trending/tv/day',
    'movie/popular',
    'movie/top_rated',
    'tv/popular',
    'tv/top_rated',
  ]);
  const endpoint = allowedEndpoints.has(requestedEndpoint)
    ? requestedEndpoint
    : 'trending/movie/day';

  // Sanitize page to a positive integer
  const parsedPage = Number.parseInt(requestedPage ?? '1', 10);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? String(parsedPage) : '1';
  
  // Safely access the server-side environment variable
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: "CRITICAL: TMDB_API_KEY is missing on the server." }, { status: 500 });
  }

  try {
    // Construct the secure request to TMDB
    const tmdbUrl = new URL(`https://api.themoviedb.org/3/${endpoint}`);
    tmdbUrl.searchParams.set('api_key', TMDB_API_KEY);
    tmdbUrl.searchParams.set('page', page);

    const res = await fetch(tmdbUrl.toString());
    const data = await res.json();
    
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
}