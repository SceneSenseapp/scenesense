import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: 'TMDB API key is not configured on the server.' }, { status: 500 });
  }

  try {
    const endpoint = query
      ? `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      : `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.status_message || 'Failed to fetch from TMDB');
    }

    return NextResponse.json({ results: data.results || [] });
  } catch (err) {
    console.error('TMDB Fetch Error:', err);
    return NextResponse.json({ error: err.message, results: [] }, { status: 500 });
  }
}