// File: app/api/streaming/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  SUPPORTED_REGIONS,
  SupportedRegion,
  getEnrichedMovie,
  getWatchmodeDeepLinks,
  synthesizeStreamingSources,
} from "@/lib/movie-apis";

const ALLOWED_REGIONS = new Set<SupportedRegion>(SUPPORTED_REGIONS);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbIdParam = searchParams.get("tmdbId");
    const mediaTypeParam = searchParams.get("mediaType") === "tv" ? "tv" : "movie";
    const regionRaw = (searchParams.get("region") || "CA").toUpperCase() as SupportedRegion;

    const parsedId = Number(tmdbIdParam);
    if (!tmdbIdParam || !Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json(
        { error: "A valid positive integer 'tmdbId' query parameter is required." },
        { status: 400 }
      );
    }

    const region: SupportedRegion = ALLOWED_REGIONS.has(regionRaw) ? regionRaw : "CA";

    const [watchmodeSources, tmdbDetails] = await Promise.all([
      getWatchmodeDeepLinks(parsedId, mediaTypeParam, region),
      getEnrichedMovie(parsedId, mediaTypeParam),
    ]);

    const title = tmdbDetails?.title || tmdbDetails?.name || "Title";
    const sources = synthesizeStreamingSources(
      tmdbDetails?.["watch/providers"],
      title,
      region,
      watchmodeSources
    );

    return NextResponse.json(
      {
        tmdbId: parsedId,
        mediaType: mediaTypeParam,
        region,
        providerMode: watchmodeSources.length > 0 ? "watchmode+tmdb" : "tmdb-synthesized",
        count: sources.length,
        sources,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=21600",
        },
      }
    );
  } catch (error) {
    console.error("[SceneSense API /api/streaming] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unable to resolve regional streaming sources at this time." },
      { status: 500 }
    );
  }
}
