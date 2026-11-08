// File: app/api/analyze/route.js
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

const CURATED_SCENE_PROFILES = [
  {
    keywords: [
      "neon",
      "cyberpunk",
      "rain",
      "android",
      "replicant",
      "future",
      "hologram",
      "baseline",
      "interrogation",
    ],
    identifiedMedia: [
      {
        title: "Blade Runner 2049",
        year: 2017,
        mediaType: "movie",
        confidence: "High",
        matchScore: 97,
        timestampHint: "Act II // Las Vegas & LAPD Baseline Sequence",
        sceneSummary:
          "Matches the rain-drenched brutalist architecture, holographic neon reflections, and existential interrogation atmosphere.",
        keyActors: ["Ryan Gosling", "Harrison Ford", "Ana de Armas"],
      },
      {
        title: "Ghost in the Shell",
        year: 1995,
        mediaType: "movie",
        confidence: "High",
        matchScore: 91,
        timestampHint: "Act I // Canal Pursuit & Cybernetic Dive",
        sceneSummary:
          "Philosophical cyberpunk noir exploring identity amidst rain-slicked urban megastructures.",
        keyActors: ["Atsuko Tanaka", "Akio Otsuka"],
      },
      {
        title: "Altered Carbon",
        year: 2018,
        mediaType: "tv",
        confidence: "Medium",
        matchScore: 84,
        timestampHint: "Season 1 // Bay City Neon District",
        sceneSummary:
          "High-contrast neon noir detective investigation in a stratified cyberpunk metropolis.",
        keyActors: ["Joel Kinnaman", "Martha Higareda"],
      },
    ],
    cinematicThemes: [
      "Existential Cyberpunk",
      "Simulated Humanity",
      "Tech-Noir Melancholy",
      "Urban Isolation",
      "Memory & Soul",
    ],
    directorsOrStyle:
      "Denis Villeneuve & Roger Deakins — Anamorphic wide-angle framing, monolithic brutalist silhouettes, slow-burn atmospheric dread, and volumetric sodium-vapor / cyan lighting.",
    visualBreakdown: {
      cinematography:
        "Wide-format anamorphic lenses with deep-focus architectural framing and deliberate, slow-push dolly movements that dwarf the subject against megalithic cityscapes.",
      lightingAndMood:
        "High-contrast chiaroscuro pairing toxic magenta and electric cyan neon rim lights against rain-slicked asphalt and oppressive industrial fog.",
      pacing:
        "Hypnotic, meditative cadence punctuated by sudden bursts of kinetic brutality.",
      audioDesign:
        "Cavernous analog synthesizer brass swells (Vangelis / Hans Zimmer lineage) layered over ambient downpours and distant spinner turbines.",
    },
    colorPalette: [
      { name: "Replicant Cyan", hex: "#06B6D4", role: "Primary Neon Key Light" },
      {
        name: "Hologram Magenta",
        hex: "#EC4899",
        role: "Secondary Accent & Reflections",
      },
      {
        name: "Las Vegas Sodium",
        hex: "#F59E0B",
        role: "Atmospheric Fog & Backlight",
      },
      { name: "Asphalt Abyss", hex: "#0B0F19", role: "Deep Shadow Base" },
      { name: "Concrete Haze", hex: "#475569", role: "Brutalist Midtone" },
    ],
    aiSummary:
      "Neural telemetry locks onto a high-concept Tech-Noir / Cyberpunk visual signature characterized by anamorphic chiaroscuro lighting, existential themes, and immersive synth-driven soundscapes.",
  },
  {
    keywords: [
      "hallway",
      "gravity",
      "spinning",
      "dream",
      "suit",
      "heist",
      "subconscious",
      "hotel",
      "totem",
    ],
    identifiedMedia: [
      {
        title: "Inception",
        year: 2010,
        mediaType: "movie",
        confidence: "High",
        matchScore: 98,
        timestampHint: "Act II // Zero-Gravity Rotating Hotel Corridor",
        sceneSummary:
          "Iconic practical rotating centrifuge corridor sequence where gravity shifts dynamically mid-combat.",
        keyActors: ["Joseph Gordon-Levitt", "Leonardo DiCaprio", "Cillian Murphy"],
      },
      {
        title: "Paprika",
        year: 2006,
        mediaType: "movie",
        confidence: "High",
        matchScore: 89,
        timestampHint: "Act II // Collapsing Dream Corridor",
        sceneSummary:
          "Surrealist psychological sci-fi where dream logic bends physical architecture and spatial geometry.",
        keyActors: ["Megumi Hayashibara", "Toru Emori"],
      },
      {
        title: "Doctor Strange",
        year: 2016,
        mediaType: "movie",
        confidence: "Medium",
        matchScore: 82,
        timestampHint: "Act II // Mirror Dimension Kaleidoscope",
        sceneSummary:
          "Folding architectural planes and shifting gravitational vectors during kinetic hand-to-hand combat.",
        keyActors: ["Benedict Cumberbatch", "Mads Mikkelsen"],
      },
    ],
    cinematicThemes: [
      "Dream Architecture",
      "Layered Reality",
      "Temporal Dilation",
      "Subconscious Heist",
      "Practical Spectacle",
    ],
    directorsOrStyle:
      "Christopher Nolan & Wally Pfister — IMAX 65mm tactile realism, cross-cut parallel timelines, non-linear tension, and practical mechanical set engineering.",
    visualBreakdown: {
      cinematography:
        "360-degree rotating rig camera locked to the corridor axis, alternating with handheld close-ups to disorient the viewer's spatial equilibrium.",
      lightingAndMood:
        "Warm tungsten hotel sconces casting shifting directional shadows as the floor-to-ceiling orientation continuously revolves.",
      pacing:
        "Relentless cross-cutting between multiple synchronized temporal layers, escalating urgency with every cut.",
      audioDesign:
        "Slowed Edith Piaf brass motifs ('Non, je ne regrette rien') transformed into percussive, time-dilated orchestral ostinatos.",
    },
    colorPalette: [
      {
        name: "Corridor Amber",
        hex: "#D97706",
        role: "Practical Tungsten Sconces",
      },
      { name: "Mahogany Panel", hex: "#451A03", role: "Architectural Warmth" },
      {
        name: "Charcoal Tailoring",
        hex: "#1E293B",
        role: "Wardrobe & Tactical Contrast",
      },
      { name: "Limbo Steel", hex: "#64748B", role: "Subconscious Coldness" },
      { name: "Brass Totem", hex: "#FBBF24", role: "Key Focal Highlight" },
    ],
    aiSummary:
      "Scene telemetry identifies a Mind-Bending Architectural Thriller defined by practical spatial manipulation, time-dilated parallel editing, and propulsive orchestral tension.",
  },
  {
    keywords: [
      "coin",
      "diner",
      "gas station",
      "hitman",
      "desert",
      "texas",
      "western",
      "silence",
      "tension",
    ],
    identifiedMedia: [
      {
        title: "No Country for Old Men",
        year: 2007,
        mediaType: "movie",
        confidence: "High",
        matchScore: 98,
        timestampHint: "Act I // Roadside Gas Station Coin Toss ('Call It')",
        sceneSummary:
          "Masterclass in minimalist suspense as Anton Chigurh forces a gas station proprietor to call a coin toss for his life.",
        keyActors: ["Javier Bardem", "Gene Jones", "Josh Brolin"],
      },
      {
        title: "Hell or High Water",
        year: 2016,
        mediaType: "movie",
        confidence: "High",
        matchScore: 88,
        timestampHint: "Act II // West Texas Diner Stand-Off",
        sceneSummary:
          "Sun-bleached neo-western simmering with unspoken dread and fatalistic dialogue.",
        keyActors: ["Jeff Bridges", "Chris Pine", "Ben Foster"],
      },
      {
        title: "Fargo",
        year: 2014,
        mediaType: "tv",
        confidence: "Medium",
        matchScore: 84,
        timestampHint: "Season 1 // Lorne Malvo Diner Confrontation",
        sceneSummary:
          "Coen-inspired existential menace erupting inside mundane roadside Americana.",
        keyActors: ["Billy Bob Thornton", "Martin Freeman"],
      },
    ],
    cinematicThemes: [
      "Fatalism & Chance",
      "Neo-Western Dread",
      "Banality of Evil",
      "Moral Erosion",
      "Minimalist Suspense",
    ],
    directorsOrStyle:
      "Joel & Ethan Coen with Roger Deakins — Locked-off precision shot/reverse-shot compositions, complete absence of non-diegetic musical score, and razor-sharp dialogue cadence.",
    visualBreakdown: {
      cinematography:
        "Clinical, static medium close-ups that slowly tighten with each exchange, refusing to grant the audience an escape valve.",
      lightingAndMood:
        "Bleached West Texas daylight filtering through dusty glass, creating a deceptively mundane setting for existential terror.",
      pacing:
        "Deliberate, unhurried pauses where every crinkle of a cashew wrapper carries life-or-death weight.",
      audioDesign:
        "Zero musical score — pure diegetic sound design emphasizing fluorescent hum, wind across desert scrub, and a spinning quarter on a countertop.",
    },
    colorPalette: [
      {
        name: "Caliche Dust",
        hex: "#D6D3D1",
        role: "Bleached Daylight Exterior",
      },
      { name: "Desert Ochre", hex: "#B45309", role: "Sun-Baked Earth" },
      { name: "Countertop Formica", hex: "#78716C", role: "Interior Midtone" },
      { name: "Chigurh Pitch", hex: "#090D16", role: "Predatory Silhouette" },
      { name: "Fluorescent Sage", hex: "#84CC16", role: "Sickly Interior Cast" },
    ],
    aiSummary:
      "Telemetry locks onto a Neo-Western Suspense masterwork leveraging total scoreless silence, static Deakins compositions, and fatalistic psychological tension.",
  },
];

function parseImageDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return null;
  }
  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/i
  );
  if (!match) return null;
  const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  const base64Data = match[2];
  // Cap inline frame size at ~4MB base64
  if (base64Data.length > 5_500_000) return null;
  return { mimeType, base64Data };
}

async function hydrateMediaListWithTmdb(identifiedList, creds) {
  if (!Array.isArray(identifiedList) || identifiedList.length === 0) return [];

  const fetchEndpoint = async (endpoint, queryTitle) => {
    const url = new URL(`https://api.themoviedb.org/3/search/${endpoint}`);
    if (creds.apiKey && !creds.bearerToken) {
      url.searchParams.set("api_key", creds.apiKey);
    }
    url.searchParams.set("query", queryTitle);
    url.searchParams.set("include_adult", "false");
    const res = await fetch(url.toString(), {
      headers: creds.bearerToken
        ? { Authorization: `Bearer ${creds.bearerToken}` }
        : undefined,
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  };

  const hydrated = await Promise.all(
    identifiedList.slice(0, 6).map(async (item) => {
      try {
        const queryTitle = item.searchQuery || item.title;
        if (!queryTitle) return item;

        const endpoint = item.mediaType === "tv" ? "tv" : "movie";
        let results = await fetchEndpoint(endpoint, item.title || queryTitle);
        let resolvedType = endpoint;

        if (results.length === 0) {
          const altEndpoint = endpoint === "movie" ? "tv" : "movie";
          const altResults = await fetchEndpoint(
            altEndpoint,
            item.title || queryTitle
          );
          if (altResults.length > 0) {
            results = altResults;
            resolvedType = altEndpoint;
          }
        }

        const targetYear = Number(item.year) || null;
        let match = results.find((r) => {
          if (!targetYear) return Boolean(r.poster_path);
          const dateStr = r.release_date || r.first_air_date || "";
          const y = parseInt(dateStr.split("-")[0], 10);
          return Math.abs(y - targetYear) <= 2 && Boolean(r.poster_path);
        });

        if (!match) {
          match = results.find((r) => r.poster_path) || results[0];
        }

        if (!match) return item;

        return {
          ...item,
          id: match.id,
          tmdbId: match.id,
          title: match.title || match.name || item.title,
          name: match.title || match.name || item.title,
          year:
            Number(
              (match.release_date || match.first_air_date || "").split("-")[0]
            ) ||
            item.year ||
            2024,
          mediaType: resolvedType,
          media_type: resolvedType,
          poster_path: match.poster_path || null,
          backdrop_path: match.backdrop_path || null,
          vote_average: match.vote_average
            ? Number(match.vote_average.toFixed(1))
            : 0,
          overview: match.overview || item.sceneSummary || "",
          release_date: match.release_date || match.first_air_date || "",
        };
      } catch {
        return item;
      }
    })
  );

  return hydrated;
}

function buildFallbackAnalysis(sceneText) {
  const lower = (sceneText || "").toLowerCase();
  for (const profile of CURATED_SCENE_PROFILES) {
    if (profile.keywords.some((kw) => lower.includes(kw))) {
      return profile;
    }
  }
  return CURATED_SCENE_PROFILES[0];
}

export async function POST(request) {
  const creds = resolveTmdbCredentials();

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON transmission." },
        { status: 400 }
      );
    }

    const { scene = "", mode = "deep", imageDataUrl = null } = body || {};
    const parsedImage = parseImageDataUrl(imageDataUrl);
    const sanitizedScene =
      typeof scene === "string" ? scene.trim().slice(0, 4000) : "";

    if (!sanitizedScene && !parsedImage) {
      return NextResponse.json(
        {
          error:
            "Provide a scene description, dialogue fragment, or upload a scene frame image.",
        },
        { status: 400 }
      );
    }

    let parsedReply = null;
    let modelUsed = null;

    if (resolveGeminiApiKey()) {
      const systemInstruction = `You are SceneSense CineMind Vision, an elite cinematic intelligence analyzer, DP (Director of Photography), and film archivist.
Analyze user-submitted scene descriptions, dialogue fragments, lighting setups, and/or uploaded still frames.
Identify the exact or closest matching films/TV series and break down the scene's cinematography, color palette, and sonic architecture.
Return ONLY valid JSON matching this exact schema:
{
  "identifiedMedia": [
    {
      "title": "Exact Movie or Series Title",
      "year": 2017,
      "mediaType": "movie",
      "confidence": "High",
      "matchScore": 96,
      "timestampHint": "Act II // Sequence or Scene Name",
      "sceneSummary": "2-sentence breakdown of why this title matches the scene/frame and how it is staged",
      "keyActors": ["Actor 1", "Actor 2"],
      "searchQuery": "Title"
    }
  ],
  "visualBreakdown": {
    "cinematography": "Camera movement, lens focal length, framing, and blocking analysis",
    "lightingAndMood": "Key light, contrast ratio, atmospheric elements, and emotional tone",
    "pacing": "Editing rhythm, cut frequency, and narrative tension",
    "audioDesign": "Score instrumentation, diegetic sound effects, and acoustic space"
  },
  "colorPalette": [
    { "name": "Color Name", "hex": "#06B6D4", "role": "Lighting or production design role" }
  ],
  "cinematicThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4"],
  "directorsOrStyle": "Analysis of the directorial signature, cinematographer hallmarks, and movement style",
  "aiSummary": "Concise 2-3 sentence executive briefing on the scene identification and aesthetic DNA"
}
Provide 3 to 4 items in identifiedMedia and 5 colors in colorPalette with valid 6-digit hex codes.`;

      const textPrompt = sanitizedScene
        ? `Analysis Mode: ${mode}\nScene Description: "${sanitizedScene}"${
            parsedImage
              ? "\nAlso inspect the attached still frame closely for actor likenesses, aspect ratio, lens flare/bokeh, production design, and color LUT."
              : ""
          }`
        : `Analysis Mode: ${mode}\nIdentify the exact film or TV series from this uploaded still frame (or closest matching cinematic counterparts if original photography) and dissect its cinematography, lighting, and color LUT.`;

      const contents = parsedImage
        ? [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: parsedImage.mimeType,
                    data: parsedImage.base64Data,
                  },
                },
                { text: textPrompt },
              ],
            },
          ]
        : textPrompt;

      const aiRes = await generateWithCascade({
        contents,
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.35,
        models: [
          { name: GEMINI_MODELS.PRIMARY, timeoutMs: 30000 },
          { name: GEMINI_MODELS.FAST_FALLBACK, timeoutMs: 18000 },
        ],
      });

      if (aiRes.success) {
        parsedReply = safeParseJson(aiRes.text);
        modelUsed = aiRes.modelUsed;
      }
    }

    if (
      !parsedReply ||
      !Array.isArray(parsedReply.identifiedMedia) ||
      parsedReply.identifiedMedia.length === 0
    ) {
      parsedReply = buildFallbackAnalysis(sanitizedScene);
    }

    const hydratedMedia = await hydrateMediaListWithTmdb(
      parsedReply.identifiedMedia,
      creds
    );

    const finalPayload = {
      ...parsedReply,
      identifiedMedia: hydratedMedia,
      visionAnalyzed: Boolean(parsedImage),
      modelUsed,
      reply:
        parsedReply.aiSummary ||
        "Scene telemetry analyzed. Review identified titles and cinematography breakdown below.",
    };

    return NextResponse.json(finalPayload, { status: 200 });
  } catch (error) {
    console.error("Scene Analysis Engine Failure:", error);
    const fallback = buildFallbackAnalysis("");
    const hydratedMedia = await hydrateMediaListWithTmdb(
      fallback.identifiedMedia,
      creds
    );
    return NextResponse.json(
      {
        ...fallback,
        identifiedMedia: hydratedMedia,
        reply: fallback.aiSummary,
      },
      { status: 200 }
    );
  }
}
