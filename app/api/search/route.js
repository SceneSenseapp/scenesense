// app/api/search/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || searchParams.get('query');
  const type = searchParams.get('type') || 'movie'; // 'movie' | 'tv' | 'multi'

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.TMDB_API_KEY;
  const endpoint = type === 'tv' ? 'search/tv' : (type === 'multi' ? 'search/multi' : 'search/movie');

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(q)}&include_adult=false&language=en-US&page=1`
    );
    const data = await res.json();
    return NextResponse.json({ results: data.results || [] });
  } catch (err) {
    console.error("TMDB search error:", err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}