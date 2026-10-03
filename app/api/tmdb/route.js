import { NextResponse } from 'next/server';

export async function GET(request) {
  // Extract parameters from the local request
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || 1;
  const endpoint = searchParams.get('endpoint') || 'trending/movie/day';
  
  // Safely access the server-side environment variable
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    return NextResponse.json({ error: "CRITICAL: TMDB_API_KEY is missing on the server." }, { status: 500 });
  }

  try {
    // Construct the secure request to TMDB
    const res = await fetch(`https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}&page=${page}`);
    const data = await res.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch from TMDB" }, { status: 500 });
  }
}