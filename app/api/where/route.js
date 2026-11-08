// File: app/api/where/route.js
import { NextResponse } from "next/server";
import { generateWithCascade } from "@/lib/server/ai-gateway";
import {
  resolveTmdbCredentials,
  buildProviderDirectUrl,
  SUPPORTED_REGIONS,
} from "@/lib/movie-apis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

function normalizeRegion(raw) {
  const upper = String(raw || "CA").trim().toUpperCase();
  return SUPPORTED_REGIONS.includes(upper) ? upper : "CA";
}

async function fetchTmdbProviders(title, region = "CA") {
  const { apiKey } = resolveTmdbCredentials();
  if (!apiKey) return null;

  try {
    const searchRes = await fetch(
      `${TMDB_BASE_URL}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(title)}&include_adult=false`,
      { next: { revalidate: 43200 } }
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const media = (searchData.results || []).find((r) => r.media_type === "movie" || r.media_type === "tv");

    if (!media) return null;

    const providerRes = await fetch(
      `${TMDB_BASE_URL}/${media.media_type}/${media.id}/watch/providers?api_key=${apiKey}`,
      { next: { revalidate: 43200 } }
    );
    if (!providerRes.ok) return null;
    const providerData = await providerRes.json();
    const regionData = providerData.results?.[region] || providerData.results?.["US"] || null;

    if (!regionData) return null;

    const mapProviders = (list = []) =>
      list.map((p) => ({
        name: p.provider_name,
        logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
        url: buildProviderDirectUrl(p.provider_name, title),
      }));

    return {
      mediaId: media.id,
      mediaType: media.media_type,
      stream: mapProviders(regionData.flatrate),
      rent: mapProviders(regionData.rent),
      buy: mapProviders(regionData.buy),
      free: mapProviders([...(regionData.free || []), ...(regionData.ads || [])]),
      link: regionData.link || "https://www.themoviedb.org",
    };
  } catch (err) {
    console.warn("TMDB provider auxiliary scan bypassed:", err.message);
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTitle = (body.title || body.query || "").trim();
    const region = normalizeRegion(body.region);

    if (!rawTitle) {
      return NextResponse.json(
        { error: "Cinema title or query required." },
        { status: 400 }
      );
    }

    const title = rawTitle.slice(0, 150);
    const tmdbDataPromise = fetchTmdbProviders(title, region);

    const systemInstruction = `You are the SceneSense Live Distribution Radar.
Detect current digital streaming availability, subscription platforms, rentals, and free-with-ad distribution for the requested film or series in region ${region}.
Format your response as a concise 2-to-3 sentence briefing with platform names in bold.
If physical media or theatrical screening is the only avenue, declare it directly.`;

    const aiResult = await generateWithCascade({
      contents: `Locate active digital distribution and streaming platforms for "${title}" in region: ${region}.`,
      systemInstruction,
      googleSearch: true,
      temperature: 0.2,
    });

    const verifiedProviders = await tmdbDataPromise;
    const aiBriefing = aiResult.success ? aiResult.text.trim() : "";

    const hasLiveResults =
      Boolean(
        verifiedProviders &&
          (verifiedProviders.stream.length > 0 ||
            verifiedProviders.rent.length > 0 ||
            verifiedProviders.buy.length > 0 ||
            verifiedProviders.free.length > 0)
      ) || Boolean(aiBriefing);

    return NextResponse.json(
      {
        success: true,
        title,
        region,
        hasLiveResults,
        briefing:
          aiBriefing ||
          `Distribution scan complete for "${title}" across region ${region}.`,
        providers: verifiedProviders || {
          stream: [],
          rent: [],
          buy: [],
          free: [],
          link: "https://www.themoviedb.org",
        },
        sources: aiResult.groundingSources || [],
        attribution:
          "Streaming availability data synthesized via Google Grounded Search & TMDB/JustWatch.",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=900",
        },
      }
    );
  } catch (error) {
    console.error("Where-To-Watch Route Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to scan streaming telemetry.",
        briefing: "Distribution signal degraded. Check regional listings.",
      },
      { status: 500 }
    );
  }
}
