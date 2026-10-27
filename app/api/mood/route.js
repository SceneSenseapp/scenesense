// app/api/mood/route.js
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

// Resilient satellite archive fallback when LLM encounters rate limits or network stalls
const FALLBACK_ARCHIVE = [
  {
    recommendedTitle: "Blade Runner 2049",
    profile: "Cybernetic Neo-Noir Uplink",
    reasoning: "A masterclass in dystopian atmospheric tension and existential dread, perfectly tuned to your resonance parameters.",
    faction: "Cinema Vanguard",
    compatibility: "98.7%",
    mediaDetails: {
      id: 335984,
      title: "Blade Runner 2049",
      poster_path: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
      backdrop_path: "/ilRyASD5H7znMRyvQ1i114pTqF5.jpg",
      year: "2017",
      vote_average: 7.6
    }
  },
  {
    recommendedTitle: "Arrival",
    profile: "Deep Temporal Intellect",
    reasoning: "Profound philosophical immersion balancing emotional resonance with hard science-fiction intrigue.",
    faction: "Cinema Vanguard",
    compatibility: "99.2%",
    mediaDetails: {
      id: 329865,
      title: "Arrival",
      poster_path: "/x2OloKv2CcVeFFKzBOAz6L3Y6PG.jpg",
      backdrop_path: "/hBC75p6gN13hKovg4cO66k1Jv5.jpg",
      year: "2016",
      vote_average: 8.0
    }
  },
  {
    recommendedTitle: "Drive",
    profile: "Nocturnal Synthwave Tension",
    reasoning: "High-contrast neon pacing focused on stoic tension, hyper-stylized action, and lingering cinematic mood.",
    faction: "Cinema Vanguard",
    compatibility: "97.9%",
    mediaDetails: {
      id: 64690,
      title: "Drive",
      poster_path: "/602vevJKBfO1e36Hj0p3n316N8K.jpg",
      backdrop_path: "/b0Bs4d7Q0R0Pj8b1Jj15p7uG5.jpg",
      year: "2011",
      vote_average: 7.9
    }
  },
  {
    recommendedTitle: "Ex Machina",
    profile: "Psychological Isolation Grid",
    reasoning: "A claustrophobic study of artificial intelligence, deception, and cerebral tension.",
    faction: "Cinema Vanguard",
    compatibility: "98.4%",
    mediaDetails: {
      id: 264660,
      title: "Ex Machina",
      poster_path: "/dmJW8IAK9roT4J14b2dGvO38u7F.jpg",
      backdrop_path: "/hAmi3U2q0V4u4lUo8gR7L0sT.jpg",
      year: "2014",
      vote_average: 7.6
    }
  }
];

// Helper to hydrate TMDB metadata on the server
async function fetchTmdbDetails(title) {
  if (!title || !TMDB_API_KEY) return null;
  try {
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&include_adult=false`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = await res.json();
    const match = (data.results || []).find((item) => item.media_type === 'movie' || item.media_type === 'tv');

    if (match) {
      return {
        id: match.id,
        title: match.title || match.name,
        poster_path: match.poster_path,
        backdrop_path: match.backdrop_path,
        year: (match.release_date || match.first_air_date || '').split('-')[0] || 'N/A',
        vote_average: match.vote_average ? Number(match.vote_average.toFixed(1)) : null,
        overview: match.overview || '',
        media_type: match.media_type
      };
    }
  } catch (err) {
    console.warn("TMDB satellite hydration notice:", err);
  }
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const currentMessage = (body.message || body.newMessage || body.mood || "").trim().slice(0, 1500);
    const history = Array.isArray(body.history) ? body.history : [];
    const parameters = body.parameters || {};

    if (!currentMessage) {
      return NextResponse.json({ error: "Query payload missing." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      console.warn("GEMINI_API_KEY unconfigured. Serving archive telemetry.");
      const fallback = FALLBACK_ARCHIVE[Math.floor(Math.random() * FALLBACK_ARCHIVE.length)];
      return NextResponse.json(fallback);
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are the AI Oracle Nexus inside SceneSense Studio—an elite, charismatic cinema scholar and discovery engine.
Discuss films, directors, cinematography, themes, and screenplays naturally.

Key Directives:
1. Multi-turn dialogue: If user greets or converses generally, chat freely and set "recommendedTitle" to null.
2. If user requests a movie, describes a mood, or seeks a watch suggestion, provide ONE exact real title in "recommendedTitle".
3. Return valid JSON matching the exact schema.`;

    const contents = [];

    // Append prior dialogue turns with role normalization
    for (const msg of history.slice(-6)) {
      const textContent = msg.content || msg.text;
      if (!textContent) continue;
      contents.push({
        role: (msg.role === 'user' || msg.role === 'human') ? 'user' : 'model',
        parts: [{ text: String(textContent).slice(0, 1000) }]
      });
    }

    // Append current turn with active filter parameters
    const promptWithContext = `[Context Filters: Resonance="${parameters.vibe || 'Open'}", Era="${parameters.era || 'Open'}", Tension="${parameters.intensity || 'Open'}"]\nUser: "${currentMessage}"`;

    contents.push({
      role: 'user',
      parts: [{ text: promptWithContext }]
    });

    // 8-second circuit breaker to prevent gateway kills
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI Gateway Response Timeout")), 8000)
    );

    const generatePromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.6,
        maxOutputTokens: 350
      }
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const responseText = response?.text || "{}";

    let parsedData = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const titleMatch = responseText.match(/"recommendedTitle"\s*:\s*"([^"]+)"/);
      const reasoningMatch = responseText.match(/"reasoning"\s*:\s*"([^"]+)"/);
      parsedData = {
        recommendedTitle: titleMatch ? titleMatch[1] : null,
        reasoning: reasoningMatch ? reasoningMatch[1] : "Telemetry link resolved from archive signals."
      };
    }

    // Server-side TMDB hydration if title is returned
    let mediaDetails = null;
    if (parsedData.recommendedTitle) {
      mediaDetails = await fetchTmdbDetails(parsedData.recommendedTitle);
    }

    return NextResponse.json({
      profile: parsedData.profile || "Neural Intel Synchronized",
      recommendedTitle: parsedData.recommendedTitle || null,
      reasoning: parsedData.reasoning || "Oracle online and listening.",
      faction: parsedData.faction || "Cinema Vanguard",
      compatibility: parsedData.compatibility || "98.2%",
      mediaDetails
    });

  } catch (error) {
    console.warn("Oracle Fallback Engaged:", error.message);
    const fallback = FALLBACK_ARCHIVE[Math.floor(Math.random() * FALLBACK_ARCHIVE.length)];
    return NextResponse.json(fallback);
  }
}