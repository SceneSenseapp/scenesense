// File: app/api/actor/[id]/route.js
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const FALLBACK_TMDB_KEY = 'e2b0c95a0bc07e997f769f3d9b4b0db3';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'Valid numeric person ID is required.' },
        { status: 400 }
      );
    }

    const accessToken = process.env.TMDB_ACCESS_TOKEN;
    const apiKey =
      process.env.TMDB_API_KEY ||
      process.env.NEXT_PUBLIC_TMDB_API_KEY ||
      FALLBACK_TMDB_KEY;

    let targetUrl = `${TMDB_BASE_URL}/person/${id}?append_to_response=combined_credits,external_ids,images&language=en-US`;
    const headers = { accept: 'application/json' };

    if (accessToken && accessToken.length > 40) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      targetUrl += `&api_key=${apiKey}`;
    }

    const res = await fetch(targetUrl, {
      headers,
      next: { revalidate: 43200 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch actor details from TMDB' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=21600',
      },
    });
  } catch (error) {
    console.error('Error fetching actor details:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
