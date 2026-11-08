// File: app/api/movie/[id]/route.js
import { NextResponse } from 'next/server';
import {
  SUPPORTED_REGIONS,
  getEnrichedMovie,
  getAggregatedRatings,
  getWatchmodeDeepLinks,
  synthesizeStreamingSources,
} from '@/lib/movie-apis';

const REGION_SET = new Set(SUPPORTED_REGIONS);

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  if (!id) {
    return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const mediaType = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const rawRegion = (searchParams.get('region') || 'US').toUpperCase();
  const region = REGION_SET.has(rawRegion) ? rawRegion : 'US';

  try {
    // Parallelize TMDB single-request enrichment + Watchmode regional deep-links
    const [data, watchmodeSources] = await Promise.all([
      getEnrichedMovie(id, mediaType),
      getWatchmodeDeepLinks(id, mediaType, region),
    ]);

    if (!data) {
      return NextResponse.json(
        { error: `Failed to fetch ${mediaType} details from TMDB` },
        { status: 404 }
      );
    }

    const imdbId = data.imdb_id || data.external_ids?.imdb_id || null;
    const externalRatings = imdbId ? await getAggregatedRatings(imdbId) : null;
    const displayTitle = data.title || data.name || 'Untitled';

    const streamingSources = synthesizeStreamingSources(
      data['watch/providers'],
      displayTitle,
      region,
      watchmodeSources
    );

    return NextResponse.json(
      {
        ...data,
        media_type: mediaType,
        region,
        externalRatings,
        streamingSources,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=21600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching media details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
