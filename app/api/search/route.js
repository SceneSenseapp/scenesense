// app/api/search/route.js
import { NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const FALLBACK_TMDB_KEY = "e2b0c95a0bc07e997f769f3d9b4b0db3";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q') || searchParams.get('query') || '';
    const query = rawQuery.trim();
    const type = (searchParams.get('type') || 'movie').toLowerCase(); // 'movie' | 'tv' | 'multi'
    const page = searchParams.get('page') || '1';

    if (!query) {
      return NextResponse.json({ results: [], page: 1, total_pages: 0, total_results: 0 });
    }

    // 1. Resolve Credentials (Bearer Access Token or API Key)
    const accessToken = process.env.TMDB_ACCESS_TOKEN;
    const apiKey = 
      process.env.TMDB_API_KEY || 
      process.env.NEXT_PUBLIC_TMDB_API_KEY || 
      FALLBACK_TMDB_KEY;

    // 2. Resolve Endpoint
    const endpointPath = type === 'tv' ? 'search/tv' : (type === 'multi' ? 'search/multi' : 'search/movie');
    let targetUrl = `${TMDB_BASE_URL}/${endpointPath}?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}`;

    const headers = { accept: 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      targetUrl += `&api_key=${apiKey}`;
    }

    // 3. Fetch from TMDB with Edge Revalidation (30 mins)
    const res = await fetch(targetUrl, {
      headers,
      next: { revalidate: 1800 }
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.status_message || 'TMDB radar rejected search query.', results: [] },
        { status: res.status }
      );
    }

    // 4. Normalize and filter media records
    const results = (data.results || [])
      .filter((item) => {
        if (item.media_type === 'person') {
          return Array.isArray(item.known_for) && item.known_for.length > 0;
        }
        return Boolean(item.poster_path || item.backdrop_path);
      })
      .map((item) => {
        const itemType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
        const displayTitle = item.title || item.name || 'Untitled Record';
        const releaseDate = item.release_date || item.first_air_date || '';
        const year = releaseDate.split('-')[0] || '';

        return {
          id: item.id,
          movieId: item.id,
          title: displayTitle,
          name: displayTitle,
          media_type: itemType,
          poster_path: item.poster_path || '',
          backdrop_path: item.backdrop_path || '',
          overview: item.overview || 'No surveillance briefing available.',
          vote_average: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
          vote_count: item.vote_count || 0,
          release_date: releaseDate,
          year,
          popularity: item.popularity || 0
        };
      });

    return NextResponse.json({
      page: data.page || 1,
      total_pages: data.total_pages || 1,
      total_results: data.total_results || results.length,
      results
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900'
      }
    });

  } catch (err) {
    console.error("TMDB search route error:", err);
    return NextResponse.json(
      { error: 'Internal surveillance search error.', results: [] }, 
      { status: 500 }
    );
  }
}