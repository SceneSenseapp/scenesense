// app/api/actor/[id]/route.js
import { NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const FALLBACK_TMDB_KEY = "e2b0c95a0bc07e997f769f3d9b4b0db3";

export async function GET(request, context) {
  try {
    // 1. Resolve asynchronous route parameters safely
    const params = await context.params;
    const actorId = params?.id;

    // 2. Validate identifier format
    if (!actorId || isNaN(Number(actorId))) {
      return NextResponse.json(
        { error: 'Valid numerical talent identifier required.' },
        { status: 400 }
      );
    }

    // 3. Resolve authentication credentials (Bearer Token or API Key)
    const accessToken = process.env.TMDB_ACCESS_TOKEN;
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || FALLBACK_TMDB_KEY;

    let targetUrl = `${TMDB_BASE_URL}/person/${actorId}?append_to_response=combined_credits,images,external_ids`;
    const headers = { accept: 'application/json' };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      targetUrl += `&api_key=${apiKey}`;
    }

    // 4. Fetch upstream intelligence from TMDB with daily cache revalidation
    const res = await fetch(targetUrl, {
      headers,
      next: { revalidate: 86400 } // 24-hour cache
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `TMDB satellite rejected talent query with status: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // 5. Optimize & normalize filmography payload for client consumption
    if (data.combined_credits) {
      const topCast = (data.combined_credits.cast || [])
        .filter((item) => item.poster_path || item.backdrop_path)
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
        .slice(0, 30);

      const topCrew = (data.combined_credits.crew || [])
        .filter((item) => ['Director', 'Producer', 'Executive Producer', 'Writer', 'Creator'].includes(item.job))
        .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
        .slice(0, 20);

      data.combined_credits = {
        cast: topCast,
        crew: topCrew,
        total_appearances: (data.combined_credits.cast?.length || 0) + (data.combined_credits.crew?.length || 0)
      };
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Talent dossier retrieval exception:', error);
    return NextResponse.json(
      { error: 'Internal server uplink failure.' },
      { status: 500 }
    );
  }
}