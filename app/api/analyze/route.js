// app/api/analyze/route.js
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Neural analysis engine is not configured (missing GEMINI_API_KEY)." },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON transmission." }, { status: 400 });
    }

    const { scene } = body;
    if (!scene || typeof scene !== "string" || !scene.trim()) {
      return NextResponse.json(
        { error: "Scene description or transcript is required." },
        { status: 400 }
      );
    }

    // Limit payload to avoid token exhaustion
    const sanitizedScene = scene.trim().slice(0, 4000);

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are SceneSense CineMind, an elite cinematic intelligence analyzer.
Analyze user-submitted scene descriptions, movie dialogue fragments, or visual recollections.
Identify matching films or television series with high precision.
Return a structured JSON object with the following schema:
{
  "identifiedMedia": [
    {
      "title": "Exact Title",
      "year": 2024,
      "mediaType": "movie" | "tv",
      "confidence": "High" | "Medium" | "Low",
      "sceneSummary": "Why this matches the user's description",
      "keyActors": ["Actor 1", "Actor 2"],
      "searchQuery": "Optimized query for TMDB search"
    }
  ],
  "cinematicThemes": ["Theme 1", "Theme 2"],
  "directorsOrStyle": "Description of cinematic style or notable directors",
  "aiSummary": "Concise briefing on the scene identification"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: sanitizedScene,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const replyText = response.text || "{}";
    let parsedReply;
    try {
      parsedReply = JSON.parse(replyText);
    } catch {
      parsedReply = { reply: replyText };
    }

    return NextResponse.json(parsedReply, { status: 200 });
  } catch (error) {
    console.error("Scene Analysis Engine Failure:", error);
    return NextResponse.json(
      { error: "Cinematic telemetry analysis failed." },
      { status: 500 }
    );
  }
}