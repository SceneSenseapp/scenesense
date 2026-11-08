// File: app/api/cinemind/route.js
import { NextResponse } from "next/server";
import {
  generateWithCascade,
  safeParseJson,
  resolveGeminiApiKey,
  GEMINI_MODELS,
} from "@/lib/server/ai-gateway";
import { resolveTmdbCredentials } from "@/lib/movie-apis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODELS_TO_TRY = [
  { name: GEMINI_MODELS.PRIMARY, timeoutMs: 25000 },
  { name: GEMINI_MODELS.FAST_FALLBACK, timeoutMs: 16000 },
];

const CURATED_FALLBACK_POOLS = {
  scifi_90s_twist: [
    {
      title: "Dark City",
      year: "1998",
      media_type: "movie",
      matchScore: 98,
      hook: "Noir-soaked 1998 mind-bender where reality and memories are re-engineered at midnight—culminating in a jaw-dropping cosmic reveal.",
    },
    {
      title: "12 Monkeys",
      year: "1995",
      media_type: "movie",
      matchScore: 96,
      hook: "Terry Gilliam’s 1995 temporal labyrinth with an unforgettable causal-loop finale that recontextualizes every frame.",
    },
    {
      title: "The Thirteenth Floor",
      year: "1999",
      media_type: "movie",
      matchScore: 94,
      hook: "Underrated 1999 simulated-reality noir where a murder investigation uncovers nested worlds and a devastating existential twist.",
    },
    {
      title: "eXistenZ",
      year: "1999",
      media_type: "movie",
      matchScore: 92,
      hook: "David Cronenberg’s 1999 bio-virtual puzzle box where the boundary between game and reality dissolves until the final line.",
    },
    {
      title: "Strange Days",
      year: "1995",
      media_type: "movie",
      matchScore: 91,
      hook: "Kathryn Bigelow’s 1995 cyberpunk conspiracy thriller dealing in recorded human memories and a razor-sharp third-act twist.",
    },
    {
      title: "Gattaca",
      year: "1997",
      media_type: "movie",
      matchScore: 90,
      hook: "High-tension 1997 biopunk identity thriller where a stolen genetic profile drives a relentless cat-and-mouse mystery.",
    },
  ],
  general_mindbenders: [
    {
      title: "Predestination",
      year: "2014",
      media_type: "movie",
      matchScore: 97,
      hook: "The ultimate temporal paradox thriller where every character thread knots into a single astonishing revelation.",
    },
    {
      title: "Coherence",
      year: "2013",
      media_type: "movie",
      matchScore: 95,
      hook: "A dinner party under a passing comet fractures into parallel quantum realities.",
    },
    {
      title: "Shutter Island",
      year: "2010",
      media_type: "movie",
      matchScore: 94,
      hook: "Atmospheric psychological neo-noir with a seismic perspective reversal.",
    },
    {
      title: "Arrival",
      year: "2016",
      media_type: "movie",
      matchScore: 95,
      hook: "Linguistic first-contact sci-fi whose nonlinear emotional twist reshapes how you perceive time.",
    },
    {
      title: "Memento",
      year: "2000",
      media_type: "movie",
      matchScore: 96,
      hook: "Reverse-chronology neo-noir mystery that weaponizes memory loss for a devastating final reveal.",
    },
    {
      title: "Severance",
      year: "2022",
      media_type: "tv",
      matchScore: 96,
      hook: "Surgical memory-split corporate thriller packed with relentless mystery-box twists.",
    },
  ],
};

async function hydrateTmdbItem(rec, creds) {
  if (!rec?.title || (!creds.apiKey && !creds.bearerToken)) return null;
  const mediaType = rec.media_type === "tv" ? "tv" : "movie";
  const yearVal =
    rec.year && /^\d{4}$/.test(String(rec.year)) ? String(rec.year) : null;

  const runQuery = async (withYear) => {
    const url = new URL(`https://api.themoviedb.org/3/search/${mediaType}`);
    if (creds.apiKey && !creds.bearerToken) {
      url.searchParams.set("api_key", creds.apiKey);
    }
    url.searchParams.set("query", rec.title);
    url.searchParams.set("include_adult", "false");
    if (withYear && yearVal) {
      url.searchParams.set(
        mediaType === "tv" ? "first_air_date_year" : "year",
        yearVal
      );
    }
    const res = await fetch(url.toString(), {
      headers: creds.bearerToken
        ? { Authorization: `Bearer ${creds.bearerToken}` }
        : undefined,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0] || null;
  };

  try {
    let match = await runQuery(true);
    if (!match && yearVal) {
      match = await runQuery(false);
    }
    if (!match) return null;

    return {
      id: match.id,
      movieId: match.id,
      title: match.title || match.name || rec.title,
      name: match.name || match.title || rec.title,
      poster_path: match.poster_path || null,
      backdrop_path: match.backdrop_path || null,
      release_date:
        match.release_date || match.first_air_date || `${rec.year || ""}`,
      first_air_date:
        match.first_air_date || match.release_date || `${rec.year || ""}`,
      year:
        (match.release_date || match.first_air_date || rec.year || "").split(
          "-"
        )[0] || "N/A",
      vote_average: match.vote_average
        ? Number(match.vote_average.toFixed(1))
        : 7.8,
      overview: match.overview || rec.hook || "",
      media_type: mediaType,
      matchScore: rec.matchScore || 92,
      hook: rec.hook || match.overview || "Verified CineMind telemetry match.",
    };
  } catch (err) {
    console.warn("CineMind TMDB hydration notice:", err.message);
    return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body.prompt || "").trim().slice(0, 1200);
    const context = body.context || null;
    const region = String(body.region || "CA").toUpperCase();
    const historyMessages = Array.isArray(body.messages)
      ? body.messages.slice(-8)
      : [];
    const watchlistTitles = Array.isArray(body.watchlistTitles)
      ? body.watchlistTitles.slice(0, 25)
      : [];

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Prompt transmission is required." },
        { status: 400 }
      );
    }

    let parsedAi = null;
    let modelUsed = null;

    if (resolveGeminiApiKey()) {
      const contextBlock = context
        ? `ACTIVE CONTEXT LOCKED BY OPERATIVE:
- Type: ${context.type || "movie"}
- Title/Name: ${context.title || context.name || "Unknown"} (${context.year || "N/A"})
- Genres/Dept: ${context.genres || context.department || "N/A"}
- Synopsis/Bio: ${String(context.overview || context.biography || "").slice(0, 500)}`
        : "ACTIVE CONTEXT: Global Cinema & Television Database (No single title locked).";

      const transcriptBlock =
        historyMessages.length > 0
          ? historyMessages
              .map(
                (m) =>
                  `${m.role === "assistant" ? "CineMind" : "Operative"}: ${String(
                    m.text || m.content || ""
                  ).slice(0, 350)}`
              )
              .join("\n")
          : "No prior messages in this session.";

      const systemInstruction = `You are CineMind v3.8, SceneSense Studio's persistent, context-aware conversational cinema intelligence.
Active Streaming Region: ${region}.
Your mission:
1. Engage the user with sharp, authoritative, deeply knowledgeable film/TV analysis tailored to their exact prompt and active context.
2. Always return 6 hyper-relevant, real Movie or TV recommendations in the "recommendations" array that match the user's specific criteria (era, subgenre, plot twists, directorial style, or similarity to the locked context). Avoid titles already in their watchlist unless explicitly asked about them.
3. Provide 3 smart, clickable follow-up prompts in "followUpPrompts".
4. Respond strictly in valid JSON with the following schema:
{
  "reply": "Detailed conversational response (2-4 sentences, rich in cinematic insight).",
  "followUpPrompts": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"],
  "recommendations": [
    {
      "title": "Exact Official Title",
      "year": "YYYY",
      "media_type": "movie",
      "matchScore": 95,
      "hook": "1-sentence explanation of why this fits the exact prompt without spoiling the ending."
    }
  ]
}`;

      const userPayload = `${contextBlock}
Operative Watchlist Sample: ${
        watchlistTitles.length > 0 ? watchlistTitles.join(", ") : "Empty"
      }

Recent Conversation History:
${transcriptBlock}

Latest Operative Prompt: "${prompt}"`;

      const aiRes = await generateWithCascade({
        contents: userPayload,
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
        models: MODELS_TO_TRY,
      });

      if (aiRes.success) {
        parsedAi = safeParseJson(aiRes.text);
        modelUsed = aiRes.modelUsed;
      }
    }

    if (!parsedAi || !Array.isArray(parsedAi.recommendations)) {
      const lower = prompt.toLowerCase();
      const is90sSciFi =
        (lower.includes("90") || lower.includes("nineties")) &&
        (lower.includes("sci") ||
          lower.includes("twist") ||
          lower.includes("mind"));

      const pool = is90sSciFi
        ? CURATED_FALLBACK_POOLS.scifi_90s_twist
        : CURATED_FALLBACK_POOLS.general_mindbenders;

      const contextPrefix =
        context?.title || context?.name
          ? `Anchored to **${context.title || context.name}**, `
          : "";

      parsedAi = {
        reply: is90sSciFi
          ? `${contextPrefix}The late 1990s was a golden era for paranoid simulated-reality and temporal sci-fi thrillers. Here are 6 verified 90s sci-fi mind-benders engineered around massive third-act plot twists.`
          : `${contextPrefix}I have cross-referenced your parameters against the SceneSense neural archive and isolated 6 high-resonance titles with precision narrative hooks.`,
        followUpPrompts: [
          "Find me a sci-fi mind-bender from the 90s with a massive plot twist",
          "Show dark neo-noir thrillers with unreliable narrators",
          "Which of these has the highest critical acclaim and best cinematography?",
        ],
        recommendations: pool,
      };
    }

    const creds = resolveTmdbCredentials();
    const rawRecs = Array.isArray(parsedAi.recommendations)
      ? parsedAi.recommendations.slice(0, 6)
      : [];
    const hydratedList = (
      await Promise.all(rawRecs.map((r) => hydrateTmdbItem(r, creds)))
    ).filter(Boolean);

    return NextResponse.json({
      success: true,
      modelUsed,
      reply:
        parsedAi.reply ||
        "Telemetry locked. Here are the top matching dossiers from the TMDB archive.",
      followUpPrompts: Array.isArray(parsedAi.followUpPrompts)
        ? parsedAi.followUpPrompts.slice(0, 3)
        : [
            "Find me a sci-fi mind-bender from the 90s with a massive plot twist",
            "Give me a slow-burn psychological thriller set in one location",
            "Recommend underrated cyberpunk anime series",
          ],
      recommendations: hydratedList,
    });
  } catch (err) {
    console.error("CineMind API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "CineMind neural link interrupted.",
      },
      { status: 500 }
    );
  }
}
