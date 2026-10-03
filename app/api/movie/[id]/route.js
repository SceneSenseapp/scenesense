// app/api/movie/[id]/route.js
import { NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request, { params }) {
  const { id } = params;

  try {
    const res = await fetch(`${TMDB_BASE_URL}/movie/${id}`, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN || ''}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch movie details from TMDB' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}