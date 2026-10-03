import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Movie ID required' }, { status: 400 });

  try {
    const tmdbUrl = `https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${process.env.TMDB_API_KEY}`;
    const res = await fetch(tmdbUrl);
    const data = await res.json();

    // Extract both CA and US regional data if available
    const regions = [data.results?.CA, data.results?.US].filter(Boolean);

    if (regions.length === 0) {
      return NextResponse.json({ providers: "No digital distribution feeds found in regional databases.", link: null });
    }

    const allProviders = new Set();
    let primaryLink = "https://www.themoviedb.org";

    regions.forEach(regionData => {
      if (regionData.link) primaryLink = regionData.link;

      if (regionData.flatrate) {
        regionData.flatrate.forEach(p => allProviders.add(`Streaming: ${p.provider_name}`));
      }
      if (regionData.free) {
        regionData.free.forEach(p => allProviders.add(`Free: ${p.provider_name}`));
      }
      if (regionData.ads) {
        regionData.ads.forEach(p => allProviders.add(`Free with Ads: ${p.provider_name}`));
      }
      if (regionData.rent) {
        regionData.rent.forEach(p => allProviders.add(`Rent: ${p.provider_name}`));
      }
      if (regionData.buy) {
        regionData.buy.forEach(p => allProviders.add(`Buy: ${p.provider_name}`));
      }
    });

    if (allProviders.size === 0) {
      return NextResponse.json({ providers: "Not currently streaming. Check physical media.", link: primaryLink });
    }

    const providerString = Array.from(allProviders).join(' | ');

    return NextResponse.json({ providers: providerString, link: primaryLink });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}