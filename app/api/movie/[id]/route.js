// app/api/movie/[id]/route.js
import { NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const FALLBACK_TMDB_KEY = "e2b0c95a0bc07e997f769f3d9b4b0db3";

export async function GET(request, context) {
  try {
    // 1. Resolve params asynchronously
    const params = await context.params;
    const movieId = params?.id;

    if (!movieId || isNaN(Number(movieId))) {
      return NextResponse.json(
        { error: 'Valid numerical movie identifier required.' },
        { status: 400 }
      );
    }

    // 2. Resolve credentials (Bearer Access Token or API Key)
    const accessToken = process.env.TMDB_ACCESS_TOKEN;
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || FALLBACK_TMDB_KEY;

    let targetUrl = `${TMDB_BASE_URL}/movie/${movieId}?append_to_response=credits,videos,similar,watch/providers,release_dates`;
    const headers = { accept: 'application/json' };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      targetUrl += `&api_key=${apiKey}`;
    }

    // 3. Fetch from TMDB with 24-hour cache revalidation
    const res = await fetch(targetUrl, {
      headers,
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `TMDB satellite rejected movie request with status: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // 4. Prune and optimize credits to minimize payload weight
    if (data.credits) {
      const topCast = (data.credits.cast || [])
        .slice(0, 24)
        .map((actor) => ({
          id: actor.id,
          name: actor.name,
          character: actor.character,
          profile_path: actor.profile_path,
        }));

      const topCrew = (data.credits.crew || [])
        .filter((c) =>
          ['Director', 'Producer', 'Executive Producer', 'Screenplay', 'Writer', 'Director of Photography', 'Original Music Composer'].includes(c.job)
        )
        .slice(0, 16)
        .map((crewMember) => ({
          id: crewMember.id,
          name: crewMember.name,
          job: crewMember.job,
          department: crewMember.department,
          profile_path: crewMember.profile_path,
        }));

      data.credits = { cast: topCast, crew: topCrew };
    }

    // 5. Format age certification (MPAA rating) for US/CA if available
    let certification = 'NR';
    const releaseResults = data.release_dates?.results || [];
    const regionRelease = releaseResults.find((r) => r.iso_3166_1 === 'US') || releaseResults.find((r) => r.iso_3166_1 === 'CA');
    if (regionRelease?.release_dates?.length > 0) {
      const certEntry = regionRelease.release_dates.find((d) => d.certification);
      if (certEntry) certification = certEntry.certification;
    }
    data.certification = certification;

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    console.error('Error fetching movie dossier:', error);
    return NextResponse.json(
      { error: 'Internal telemetry server failure.' },
      { status: 500 }
    );
  }
}