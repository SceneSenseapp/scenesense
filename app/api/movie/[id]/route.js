// app/api/movie/[id]/route.js
import { NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function GET(request, { params }) {
  // Await params for Next.js 15+ compatibility
  const resolvedParams = await params;
  const { id } = resolvedParams;

  if (!id) {
    return NextResponse.json({ error: 'Movie ID is required' }, { status: 400 });
  }

  try {
    // Revalidates on the server once every 24 hours (86,400 seconds)
    const res = await fetch(`${TMDB_BASE_URL}/movie/${id}?append_to_response=credits,videos`, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN || ''}`,
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch movie details from TMDB' },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}