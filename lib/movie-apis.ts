// File: lib/movie-apis.ts

export type SupportedRegion = "CA" | "US" | "GB" | "AU" | "FR" | "DE" | "JP";

export const SUPPORTED_REGIONS: SupportedRegion[] = [
  "CA",
  "US",
  "GB",
  "AU",
  "FR",
  "DE",
  "JP",
];

export interface WatchmodeSource {
  source_id: number;
  name: string;
  type: "sub" | "rent" | "buy" | "free" | "tve";
  region: string;
  ios_url: string | null;
  android_url: string | null;
  web_url: string;
  format: "SD" | "HD" | "4K";
  price: number | null;
  logo_path?: string | null;
  seasons?: number;
  episodes?: number;
}

export interface TMDBMovieDetail {
  id: number;
  imdb_id: string | null;
  external_ids?: {
    imdb_id?: string | null;
  };
  title?: string;
  name?: string;
  tagline: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  vote_average: number;
  vote_count: number;
  backdrop_path: string | null;
  poster_path: string | null;
  genres: Array<{ id: number; name: string }>;
  "watch/providers"?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
        free?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
        ads?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
        rent?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
        buy?: Array<{ provider_id: number; provider_name: string; logo_path: string }>;
      }
    >;
  };
  credits?: {
    cast: Array<{
      id: number;
      name: string;
      character: string;
      profile_path: string | null;
    }>;
    crew: Array<{
      id: number;
      name: string;
      job: string;
      department: string;
      profile_path?: string | null;
    }>;
  };
  videos?: {
    results: Array<{
      id: string;
      key: string;
      name: string;
      site: "YouTube" | "Vimeo";
      type: "Trailer" | "Teaser" | "Clip" | "Featurette";
      official: boolean;
    }>;
  };
}

export interface AggregatedRatings {
  imdbRating: string | null;
  rottenTomatoes: string | null;
  metacritic: string | null;
  awards: string | null;
  boxOffice: string | null;
}

const FALLBACK_TMDB_KEY = "e2b0c95a0bc07e997f769f3d9b4b0db3";

export function resolveTmdbCredentials(): {
  bearerToken: string | null;
  apiKey: string;
} {
  const bearerToken =
    process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN || null;
  const apiKey =
    process.env.TMDB_API_KEY ||
    process.env.NEXT_PUBLIC_TMDB_API_KEY ||
    FALLBACK_TMDB_KEY;
  return {
    bearerToken: bearerToken && bearerToken.length > 40 ? bearerToken : null,
    apiKey,
  };
}

export function buildProviderDirectUrl(providerName: string, title: string): string {
  const encodedTitle = encodeURIComponent(title || "");
  const normalized = (providerName || "").toLowerCase().trim();

  if (
    normalized.includes("prime video") ||
    normalized.includes("amazon prime") ||
    normalized.includes("amazon video") ||
    normalized === "amazon"
  ) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodedTitle}`;
  }
  if (normalized.includes("netflix")) return `https://www.netflix.com/search?q=${encodedTitle}`;
  if (normalized.includes("disney")) return `https://www.disneyplus.com/search?q=${encodedTitle}`;
  if (normalized.includes("apple tv") || normalized === "apple itunes") {
    return `https://tv.apple.com/search?term=${encodedTitle}`;
  }
  if (normalized.includes("max") || normalized.includes("hbo")) {
    return `https://play.max.com/search?q=${encodedTitle}`;
  }
  if (normalized.includes("hulu")) return `https://www.hulu.com/search?q=${encodedTitle}`;
  if (normalized.includes("paramount")) {
    return `https://www.paramountplus.com/search/?query=${encodedTitle}`;
  }
  if (normalized.includes("peacock")) return `https://www.peacocktv.com/search?q=${encodedTitle}`;
  if (normalized.includes("crave")) return `https://www.crave.ca/en/search?q=${encodedTitle}`;
  if (normalized.includes("tubi")) return `https://tubitv.com/search/${encodedTitle}`;
  if (normalized.includes("pluto")) {
    return `https://pluto.tv/en/search/details?query=${encodedTitle}`;
  }
  if (normalized.includes("youtube") || normalized.includes("google play")) {
    return `https://www.youtube.com/results?search_query=${encodedTitle}+official`;
  }
  if (normalized.includes("vudu") || normalized.includes("fandango")) {
    return `https://www.vudu.com/content/movies/search?searchString=${encodedTitle}`;
  }
  if (normalized.includes("crunchyroll")) {
    return `https://www.crunchyroll.com/search?q=${encodedTitle}`;
  }
  if (normalized.includes("mubi")) return `https://mubi.com/en/search?query=${encodedTitle}`;
  if (normalized.includes("criterion")) {
    return `https://www.criterionchannel.com/search?q=${encodedTitle}`;
  }
  if (normalized.includes("shudder")) return `https://www.shudder.com/search?q=${encodedTitle}`;

  return `https://www.google.com/search?q=${encodeURIComponent(`watch "${title}" on ${providerName}`)}`;
}

/**
 * Watchmode Regional Deep-Link Fetcher
 * Caches responses for 24 hours (86,400s) to protect API quotas.
 */
export async function getWatchmodeDeepLinks(
  tmdbId: number | string,
  mediaType: "movie" | "tv" = "movie",
  region: SupportedRegion = "CA"
): Promise<WatchmodeSource[]> {
  const apiKey = process.env.WATCHMODE_API_KEY;
  if (!apiKey || !tmdbId) return [];

  try {
    const searchField = mediaType === "movie" ? "tmdb_movie_id" : "tmdb_tv_id";
    const searchUrl = `https://api.watchmode.com/v1/search/?apiKey=${apiKey}&search_field=${searchField}&search_value=${tmdbId}`;

    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const titleId = searchData?.title_results?.[0]?.id;
    if (!titleId) return [];

    const sourcesUrl = `https://api.watchmode.com/v1/title/${titleId}/sources/?apiKey=${apiKey}&regions=${region}`;
    const sourcesRes = await fetch(sourcesUrl, { next: { revalidate: 86400 } });
    if (!sourcesRes.ok) return [];

    const sources: WatchmodeSource[] = await sourcesRes.json();
    if (!Array.isArray(sources)) return [];

    const uniqueMap = new Map<string, WatchmodeSource>();
    for (const src of sources) {
      const key = `${src.source_id}-${src.type}`;
      if (!uniqueMap.has(key) || src.format === "4K") {
        uniqueMap.set(key, src);
      }
    }

    return Array.from(uniqueMap.values());
  } catch (error) {
    console.error("[Watchmode API] Failed to fetch streaming sources:", error);
    return [];
  }
}

/**
 * Synthesizes unified regional streaming sources by combining Watchmode deep-links
 * (when configured) with TMDB regional watch/providers logos and direct platform URLs.
 */
export function synthesizeStreamingSources(
  watchProvidersByRegion: TMDBMovieDetail["watch/providers"] | undefined,
  title: string,
  region: SupportedRegion,
  watchmodeSources: WatchmodeSource[] = []
): WatchmodeSource[] {
  const regionProviders = watchProvidersByRegion?.results?.[region];
  const logoByName = new Map<string, string>();

  const collectLogos = (
    list?: Array<{ provider_id: number; provider_name: string; logo_path: string }>
  ) => {
    for (const p of list || []) {
      if (p.provider_name && p.logo_path) {
        logoByName.set(p.provider_name.toLowerCase().trim(), p.logo_path);
      }
    }
  };

  if (regionProviders) {
    collectLogos(regionProviders.flatrate);
    collectLogos(regionProviders.free);
    collectLogos(regionProviders.ads);
    collectLogos(regionProviders.rent);
    collectLogos(regionProviders.buy);
  }

  if (watchmodeSources.length > 0) {
    return watchmodeSources.map((src) => {
      const lower = (src.name || "").toLowerCase().trim();
      let matchedLogo = logoByName.get(lower) || null;
      if (!matchedLogo) {
        for (const [k, v] of logoByName.entries()) {
          if (k.includes(lower) || lower.includes(k)) {
            matchedLogo = v;
            break;
          }
        }
      }
      return {
        ...src,
        web_url: src.web_url || buildProviderDirectUrl(src.name, title),
        logo_path: matchedLogo,
      };
    });
  }

  if (!regionProviders) return [];

  const synthesized: WatchmodeSource[] = [];
  const seen = new Set<string>();

  const pushGroup = (
    items: Array<{ provider_id: number; provider_name: string; logo_path: string }> | undefined,
    type: WatchmodeSource["type"],
    format: WatchmodeSource["format"]
  ) => {
    for (const p of items || []) {
      const key = `${p.provider_id}-${type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      synthesized.push({
        source_id: p.provider_id,
        name: p.provider_name,
        type,
        region,
        ios_url: null,
        android_url: null,
        web_url: buildProviderDirectUrl(p.provider_name, title),
        format,
        price: null,
        logo_path: p.logo_path || null,
      });
    }
  };

  pushGroup(regionProviders.flatrate, "sub", "4K");
  pushGroup(regionProviders.free, "free", "HD");
  pushGroup(regionProviders.ads, "free", "HD");
  pushGroup(regionProviders.rent, "rent", "4K");
  pushGroup(regionProviders.buy, "buy", "4K");

  return synthesized;
}

/**
 * TMDB Single-Request Enrichment with append_to_response
 */
export async function getEnrichedMovie(
  tmdbId: string | number,
  mediaType: "movie" | "tv" = "movie"
): Promise<TMDBMovieDetail | null> {
  if (!tmdbId) return null;
  const { bearerToken, apiKey } = resolveTmdbCredentials();

  try {
    const appendParam =
      "credits,videos,similar,recommendations,watch/providers,release_dates,content_ratings,external_ids";
    const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${encodeURIComponent(String(tmdbId))}`);
    url.searchParams.set("append_to_response", appendParam);
    url.searchParams.set("language", "en-US");

    const headers: Record<string, string> = { Accept: "application/json" };
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    } else {
      url.searchParams.set("api_key", apiKey);
    }

    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("[TMDB API] Failed to enrich media:", error);
    return null;
  }
}

/**
 * OMDb Multi-Source Ratings Aggregator (Rotten Tomatoes, IMDb, Metacritic)
 */
export async function getAggregatedRatings(
  imdbId: string | null
): Promise<AggregatedRatings | null> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey || !imdbId) return null;

  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${apiKey}`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.Response === "False") return null;

    const rtObj = data.Ratings?.find(
      (r: { Source: string; Value: string }) => r.Source === "Rotten Tomatoes"
    );

    return {
      imdbRating: data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null,
      rottenTomatoes: rtObj?.Value ?? null,
      metacritic: data.Metascore && data.Metascore !== "N/A" ? `${data.Metascore}/100` : null,
      awards: data.Awards && data.Awards !== "N/A" ? data.Awards : null,
      boxOffice: data.BoxOffice && data.BoxOffice !== "N/A" ? data.BoxOffice : null,
    };
  } catch (error) {
    console.error("[OMDb API] Failed to fetch external ratings:", error);
    return null;
  }
}
