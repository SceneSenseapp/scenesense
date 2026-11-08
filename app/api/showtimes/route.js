// File: app/api/showtimes/route.js
import { NextResponse } from "next/server";
import {
  generateWithCascade,
  resolveGeminiApiKey,
  GEMINI_MODELS,
} from "@/lib/server/ai-gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildTicketingFallbackLinks(title, location) {
  const q = encodeURIComponent(`${title} showtimes near ${location}`);
  const titleQuery = encodeURIComponent(title);
  return [
    {
      title: `Google Showtimes (${location})`,
      url: `https://www.google.com/search?q=${q}`,
    },
    {
      title: "Cineplex Theatres",
      url: `https://www.cineplex.com/search?q=${titleQuery}`,
    },
    {
      title: "Fandango Ticketing",
      url: `https://www.fandango.com/search?q=${titleQuery}`,
    },
    {
      title: "AMC Theatres",
      url: `https://www.amctheatres.com/search?q=${titleQuery}`,
    },
  ];
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawTitle = (body.title || body.movieTitle || "").trim();
    const rawLocation = (body.location || "Toronto, ON").trim();

    if (!rawTitle) {
      return NextResponse.json(
        { success: false, error: "Movie title is required." },
        { status: 400 }
      );
    }

    const title = rawTitle.slice(0, 150);
    const location = rawLocation.slice(0, 100);

    if (!resolveGeminiApiKey()) {
      return NextResponse.json({
        success: true,
        title,
        location,
        showtimesText: `Live neural grounding is on standby. Use the direct ticketing dispatch links below to check current screenings for "${title}" near ${location}.`,
        sources: buildTicketingFallbackLinks(title, location),
        status: "ACTIVE_SCREENINGS_FOUND",
      });
    }

    const systemInstruction = `You are the SceneSense Live Cinema Dispatch agent.
Search the web for current real-world theater showtimes, cinema names, formats (e.g. Standard, IMAX, UltraAVX, VIP), and direct ticketing/booking links.
Focus strictly on current listings near the provided geographic location.
If no active screenings are found, clearly conclude with "NO_SHOWTIMES_RECORDED".`;

    const prompt = `Locate active theater showtimes for "${title}" near ${location}.
Provide the cinema venues, formats, showing times, and direct ticket links where available.`;

    const aiRes = await generateWithCascade({
      contents: prompt,
      systemInstruction,
      googleSearch: true,
      temperature: 0.2,
      models: [
        { name: GEMINI_MODELS.PRIMARY, timeoutMs: 22000 },
        { name: GEMINI_MODELS.FAST_FALLBACK, timeoutMs: 15000 },
      ],
    });

    const outputText = aiRes.text || "";
    const groundedSources = aiRes.groundingSources.slice(0, 6);

    const lowerText = outputText.toLowerCase();
    const hasNoShowtimes =
      !outputText.trim() ||
      outputText.includes("NO_SHOWTIMES_RECORDED") ||
      lowerText.includes("no showtimes found") ||
      lowerText.includes("no current showtimes") ||
      lowerText.includes("not currently showing") ||
      lowerText.includes("not playing");

    const sources =
      groundedSources.length > 0
        ? groundedSources
        : buildTicketingFallbackLinks(title, location);

    return NextResponse.json({
      success: true,
      title,
      location,
      showtimesText: hasNoShowtimes ? "" : outputText,
      sources: hasNoShowtimes
        ? buildTicketingFallbackLinks(title, location)
        : sources,
      status: hasNoShowtimes
        ? "ARCHIVED_OR_NOT_SCREENING"
        : "ACTIVE_SCREENINGS_FOUND",
    });
  } catch (error) {
    console.error("Showtimes fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to scan cinema showtimes.",
      },
      { status: 500 }
    );
  }
}
