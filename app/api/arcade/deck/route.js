// File: app/api/arcade/deck/route.js
import { NextResponse } from "next/server";
import { mergeCinemaPool } from "@/lib/arcade-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const FALLBACK_TMDB_KEY = "e2b0c95a0bc07e997f769f3d9b4b0db3";

const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

let cachedDeck = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30 * 60 * 1000;

async function fetchTmdbList(path) {
  const accessToken = process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_READ_ACCESS_TOKEN;
  const apiKey =
    process.env.TMDB_API_KEY ||
    process.env.NEXT_PUBLIC_TMDB_API_KEY ||
    FALLBACK_TMDB_KEY;

  const url = new URL(`${TMDB_BASE_URL}/${path}`);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const headers = { accept: "application/json" };
  if (accessToken && accessToken.length > 40) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    url.searchParams.set("api_key", apiKey);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function normalizeTmdbMovie(m) {
  if (!m?.title || (!m.backdrop_path && !m.poster_path)) return null;
  const yearNum = parseInt(String(m.release_date || "").slice(0, 4), 10);
  const genres = Array.isArray(m.genre_ids)
    ? m.genre_ids
        .slice(0, 2)
        .map((id) => GENRE_MAP[id])
        .filter(Boolean)
        .join(" • ")
    : "Cinema";

  const cleanOverview = String(m.overview || "").trim();
  const maskedOverview =
    cleanOverview.length > 24
      ? cleanOverview.replace(
          new RegExp(m.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
          "[REDACTED TITLE]"
        )
      : "";

  return {
    id: `tmdb_${m.id}`,
    tmdbId: m.id,
    title: m.title,
    year: Number.isFinite(yearNum) ? yearNum : 2022,
    director: "Featured Theatrical Release",
    genre: genres || "Cinema",
    rating: typeof m.vote_average === "number" ? Number(m.vote_average.toFixed(1)) : 7.8,
    grossMillions: null,
    tagline: "",
    clue:
      maskedOverview ||
      `Acclaimed ${Number.isFinite(yearNum) ? yearNum : ""} ${genres || "cinema"} feature rated ${Number(
        m.vote_average || 7.8
      ).toFixed(1)}/10 by global audiences.`,
    backdrop: m.backdrop_path
      ? `https://image.tmdb.org/t/p/w780${m.backdrop_path}`
      : `https://image.tmdb.org/t/p/w500${m.poster_path}`,
    poster: m.poster_path
      ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
      : `https://image.tmdb.org/t/p/w780${m.backdrop_path}`,
  };
}

export async function GET() {
  const now = Date.now();
  if (cachedDeck && now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({
      ok: true,
      source: "tmdb_cached_hybrid",
      count: cachedDeck.length,
      items: cachedDeck,
    });
  }

  const [topRated, trending] = await Promise.all([
    fetchTmdbList("movie/top_rated"),
    fetchTmdbList("trending/movie/week"),
  ]);

  const liveNormalized = [...topRated, ...trending]
    .map(normalizeTmdbMovie)
    .filter(Boolean);

  const merged = mergeCinemaPool(liveNormalized);
  cachedDeck = merged;
  cachedAt = now;

  return NextResponse.json(
    {
      ok: true,
      source: liveNormalized.length > 0 ? "tmdb_live_hybrid" : "verified_master_catalog",
      count: merged.length,
      items: merged,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    }
  );
}
