// app/api/providers/route.js
import { NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const FALLBACK_TMDB_KEY = "e2b0c95a0bc07e997f769f3d9b4b0db3";

// Deep-link generator to launch direct service searches
const getProviderDirectUrl = (providerName, title) => {
  const query = encodeURIComponent(title || '');
  const normalized = (providerName || '').toLowerCase().trim();

  if (normalized.includes('netflix')) return `https://www.netflix.com/search?q=${query}`;
  if (normalized.includes('prime video') || normalized.includes('amazon prime') || normalized.includes('amazon video')) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
  }
  if (normalized.includes('disney')) return `https://www.disneyplus.com/search?q=${query}`;
  if (normalized.includes('apple tv') || normalized.includes('apple')) return `https://tv.apple.com/search?term=${query}`;
  if (normalized.includes('crave')) return `https://www.crave.ca/en/search?q=${query}`;
  if (normalized.includes('max') || normalized.includes('hbo')) return `https://play.max.com/search?q=${query}`;
  if (normalized.includes('paramount')) return `https://www.paramountplus.com/search/?query=${query}`;
  if (normalized.includes('hulu')) return `https://www.hulu.com/search?q=${query}`;
  if (normalized.includes('peacock')) return `https://www.peacocktv.com/search?q=${query}`;
  if (normalized.includes('tubi')) return `https://tubitv.com/search/${query}`;
  if (normalized.includes('pluto')) return `https://pluto.tv/en/search/details?query=${query}`;
  if (normalized.includes('crunchyroll')) return `https://www.crunchyroll.com/search?q=${query}`;

  return `https://www.google.com/search?q=${encodeURIComponent(`watch "${title || ''}" on ${providerName}`)}`;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const mediaType = (searchParams.get('type') || searchParams.get('mediaType') || 'movie').toLowerCase();
    const region = (searchParams.get('region') || 'CA').toUpperCase();
    const title = searchParams.get('title') || '';

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: 'Valid numerical identifier required' },
        { status: 400 }
      );
    }

    // 1. Resolve API authentication credentials
    const accessToken = process.env.TMDB_ACCESS_TOKEN;
    const apiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || FALLBACK_TMDB_KEY;

    const endpointPath = mediaType === 'tv' ? 'tv' : 'movie';
    let targetUrl = `${TMDB_BASE_URL}/${endpointPath}/${id}/watch/providers`;
    const headers = { accept: 'application/json' };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    } else {
      targetUrl += `?api_key=${apiKey}`;
    }

    // 2. Fetch from TMDB with 12-hour edge revalidation
    const res = await fetch(targetUrl, {
      headers,
      next: { revalidate: 43200 }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `TMDB satellite rejected provider query with status: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const allRegions = data.results || {};

    // Prioritize selected region, falling back across common catalog zones
    const primaryRegionData = allRegions[region] || allRegions['CA'] || allRegions['US'] || null;

    if (!primaryRegionData) {
      return NextResponse.json({
        hasProviders: false,
        region,
        providersSummary: "No digital distribution feeds recorded in this territory.",
        link: "https://www.themoviedb.org",
        flatrate: [],
        free: [],
        rent: [],
        buy: []
      });
    }

    // Transform provider objects into enriched structures with direct deep-links
    const formatProviderList = (list = []) =>
      list.map(p => ({
        id: p.provider_id,
        name: p.provider_name,
        logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
        url: getProviderDirectUrl(p.provider_name, title)
      }));

    const flatrate = formatProviderList(primaryRegionData.flatrate);
    const free = formatProviderList([...(primaryRegionData.free || []), ...(primaryRegionData.ads || [])]);
    const rent = formatProviderList(primaryRegionData.rent);
    const buy = formatProviderList(primaryRegionData.buy);

    // Build human-readable provider summary for quick text consumption
    const summaryParts = [];
    if (flatrate.length > 0) summaryParts.push(`Stream: ${flatrate.map(p => p.name).join(', ')}`);
    if (free.length > 0) summaryParts.push(`Free: ${free.map(p => p.name).join(', ')}`);
    if (rent.length > 0) summaryParts.push(`Rent: ${rent.map(p => p.name).join(', ')}`);
    if (buy.length > 0) summaryParts.push(`Buy: ${buy.map(p => p.name).join(', ')}`);

    const providersSummary = summaryParts.length > 0
      ? summaryParts.join(' | ')
      : "Not currently streaming digitally. Check local physical archives.";

    return NextResponse.json({
      hasProviders: (flatrate.length + free.length + rent.length + buy.length) > 0,
      region,
      mediaType,
      providersSummary,
      link: primaryRegionData.link || "https://www.themoviedb.org",
      flatrate,
      free,
      rent,
      buy,
      attribution: "Streaming availability telemetry powered by JustWatch via TMDB. Strictly non-commercial."
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=21600'
      }
    });

  } catch (err) {
    console.error('Provider retrieval failure:', err);
    return NextResponse.json(
      { error: 'Internal provider telemetry failure' },
      { status: 500 }
    );
  }
}