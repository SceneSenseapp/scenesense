// File: app/api/review/route.js
import { NextResponse } from "next/server";
import {
  generateWithCascade,
  safeParseJson,
  resolveGeminiApiKey,
} from "@/lib/server/ai-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATIC_FALLBACK_REVIEW = {
  rating: 8.2,
  review:
    "A compelling cinematic work that delivers striking visual atmosphere and gripping narrative momentum from start to finish.",
};

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const movieTitle = (body.movieTitle || body.title || "")
      .trim()
      .slice(0, 200);
    const movieOverview = (body.movieOverview || body.overview || "")
      .trim()
      .slice(0, 1500);
    const genres = Array.isArray(body.genres)
      ? body.genres.join(", ").slice(0, 200)
      : String(body.genres || "").slice(0, 200);

    if (!movieTitle) {
      return NextResponse.json(
        { error: "Movie title is required for critic analysis." },
        { status: 400 }
      );
    }

    if (!resolveGeminiApiKey()) {
      return NextResponse.json(STATIC_FALLBACK_REVIEW);
    }

    const systemInstruction = `You are an elite, perceptive film critic.
Generate a sharp, punchy 2-sentence personal review and a realistic rating out of 10 for the given movie.
Strictly return a valid JSON object matching this schema:
{
  "rating": 8.4,
  "review": "Concise 2-sentence cinematic critique."
}`;

    const prompt = `Movie Title: ${movieTitle}\nOverview: ${movieOverview || "No logline available."}\nGenres: ${genres || "Unclassified"}`;

    const aiRes = await generateWithCascade({
      contents: prompt,
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.6,
    });

    const parsedData = safeParseJson(aiRes.text) || STATIC_FALLBACK_REVIEW;
    const numericRating = Number(parsedData.rating);

    return NextResponse.json({
      rating: Number.isFinite(numericRating)
        ? Number(Math.min(10, Math.max(1, numericRating)).toFixed(1))
        : 8.0,
      review: String(parsedData.review || STATIC_FALLBACK_REVIEW.review),
    });
  } catch (error) {
    console.error("AI Review Generation Exception:", error.message || error);
    return NextResponse.json(STATIC_FALLBACK_REVIEW);
  }
}
