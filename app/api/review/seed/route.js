// File: app/api/review/seed/route.js
import { NextResponse } from "next/server";
import { getAdminServices, FieldValue } from "@/lib/server/firebase-admin";
import {
  generateWithCascade,
  safeParseJson,
  resolveGeminiApiKey,
} from "@/lib/server/ai-gateway";
import { resolveTmdbCredentials } from "@/lib/movie-apis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEED_TARGETS = [
  {
    title: "Dumb and Dumber",
    year: "1994",
    persona: "The Cine-Maniac",
    tag: "CineManiac_AI",
    role: "Cult Connoisseur",
    frame: "frame_neon_cyan",
  },
  {
    title: "Blade Runner 2049",
    year: "2017",
    persona: "The Sci-Fi Mastermind",
    tag: "SciFi_Mastermind",
    role: "Synthetics Archivist",
    frame: "frame_solar_gold",
  },
  {
    title: "Oppenheimer",
    year: "2023",
    persona: "The Director",
    tag: "Auteur_Director",
    role: "Auteur Visionary",
    frame: "frame_matrix_emerald",
  },
  {
    title: "Hereditary",
    year: "2018",
    persona: "The Horror Archivist",
    tag: "Horror_Archivist",
    role: "Macabre Specialist",
    frame: "frame_blood_cinema",
  },
  {
    title: "Spider-Man: Across the Spider-Verse",
    year: "2023",
    persona: "The Animation Artisan",
    tag: "Animation_Artisan",
    role: "Visual Stylist",
    frame: "frame_neon_cyan",
  },
  {
    title: "Chinatown",
    year: "1974",
    persona: "The True Crime Detective",
    tag: "Noir_Detective",
    role: "Nocturnal Operative",
    frame: "frame_monochrome_noir",
  },
];

export async function POST(req) {
  try {
    // 1. Strict authorization check — closed unless ADMIN_SEED_SECRET or ADMIN_SECRET_KEY is configured and matches
    const { searchParams } = new URL(req.url);
    const secret =
      searchParams.get("secret") || req.headers.get("x-admin-secret");
    const expectedSecret =
      process.env.ADMIN_SEED_SECRET || process.env.ADMIN_SECRET_KEY;

    if (!expectedSecret || !secret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: "Forbidden. Admin seed secret is not configured or invalid." },
        { status: 403 }
      );
    }

    if (!resolveGeminiApiKey()) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY in server environment." },
        { status: 500 }
      );
    }

    const { db } = getAdminServices();
    if (!db) {
      return NextResponse.json(
        { error: "Firestore Admin service unavailable." },
        { status: 503 }
      );
    }

    const { apiKey: tmdbKey, bearerToken } = resolveTmdbCredentials();

    const seedOperations = SEED_TARGETS.map(async (target) => {
      try {
        const searchUrl = new URL("https://api.themoviedb.org/3/search/movie");
        if (tmdbKey && !bearerToken) {
          searchUrl.searchParams.set("api_key", tmdbKey);
        }
        searchUrl.searchParams.set("query", target.title);
        searchUrl.searchParams.set("primary_release_year", target.year);
        searchUrl.searchParams.set("language", "en-US");

        const searchRes = await fetch(searchUrl.toString(), {
          headers: bearerToken
            ? { Authorization: `Bearer ${bearerToken}` }
            : undefined,
          next: { revalidate: 86400 },
        });

        if (!searchRes.ok) return null;
        const tmdbData = await searchRes.json();
        const movie = tmdbData.results?.[0];
        if (!movie) return null;

        const systemInstruction = `You are the authentic AI persona "${target.persona}" on SceneSense Studio (scenesense.app).
Write a charismatic, sharp film critique (3-4 sentences) for "${movie.title}" (${target.year}).
Focus on cinematography, thematic atmosphere, pacing, or standout performances matching your persona.
Return strictly a valid JSON object with keys "rating" (number out of 5) and "reviewText".`;

        const prompt = `Critique Target: "${movie.title}" (${target.year})\nOverview: "${movie.overview || ""}"`;

        const aiRes = await generateWithCascade({
          contents: prompt,
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.75,
        });

        const parsed = safeParseJson(aiRes.text) || {
          rating: 4.5,
          reviewText:
            "A masterfully crafted piece of cinema that commands total visual and emotional engagement.",
        };

        const docData = {
          userId: `bot_${target.tag.toLowerCase()}`,
          userName: target.persona,
          userEmail: `${target.tag.toLowerCase()}@scenesense.app`,
          movieId: movie.id,
          movieTitle: movie.title,
          posterPath: movie.poster_path || "",
          backdropPath: movie.backdrop_path || "",
          releaseYear: (movie.release_date || target.year).slice(0, 4),
          rating: Number(parsed.rating) || 4.5,
          reviewText: String(
            parsed.reviewText ||
              parsed.review ||
              "Exemplary execution of the medium."
          ).trim(),
          equippedFrame: target.frame,
          equippedTitle: target.role,
          likesCount: Math.floor(Math.random() * 24) + 6,
          isBotTransmission: true,
          createdAt: FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection("reviews").add(docData);
        return { id: docRef.id, ...docData };
      } catch (targetErr) {
        console.warn(`Seed failure for "${target.title}":`, targetErr.message);
        return null;
      }
    });

    const results = await Promise.allSettled(seedOperations);
    const inserted = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value);

    return NextResponse.json({
      success: true,
      count: inserted.length,
      transmissions: inserted,
    });
  } catch (error) {
    console.error("Bot review generation error:", error);
    return NextResponse.json(
      { error: error.message || "Review seed engine error" },
      { status: 500 }
    );
  }
}
