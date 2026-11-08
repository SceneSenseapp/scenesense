// File: app/api/movies/search/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const FALLBACK_TMDB_KEY = 'e2b0c95a0bc07e997f769f3d9b4b0db3';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || searchParams.get('q') || '').trim();
    const type = (searchParams.get('type') || 'movie').toLowerCase();
    const page = searchParams.get('page') || '1';

    const accessToken = process.env.TMDB_ACCESS_TOKEN;
    const apiKey =
      process.env.TMDB_API_KEY ||
      process.env.NEXT_PUBLIC_TMDB_API_KEY ||
      FALLBACK_TMDB_KEY;

    const searchEndpoint =
      type === 'tv' ? 'search/tv' : type === 'multi' ? 'search/multi' : 'search/movie';
    const trendingEndpoint =
      type === 'tv' ? 'trending/tv/day' : type === 'multi' ? 'trending/all/day' : 'trending/movie/day';

    let endpoint = query
      ? `${TMDB_BASE_URL}/${searchEndpoint}?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}`
      : `${TMDB_BASE_URL}/${trendingEndpoint}?language=en-US&page=${page}`;

    const headers = { accept: 'application/json' };
    if (accessToken && accessToken.length > 40) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      endpoint += `&api_key=${apiKey}`;
    }

    const res = await fetch(endpoint, {
      headers,
      next: { revalidate: 1800 },
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.status_message || 'Failed to fetch from TMDB');
    }

    return NextResponse.json({
      page: data.page || 1,
      total_pages: data.total_pages || 1,
      total_results: data.total_results || (data.results || []).length,
      results: data.results || [],
    });
  } catch (err) {
    console.error('TMDB Fetch Error:', err);
    return NextResponse.json(
      { error: err.message || 'TMDB search failed', results: [] },
      { status: 500 }
    );
  }
}
