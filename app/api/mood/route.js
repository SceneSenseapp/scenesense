// app/api/mood/route.js
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Resilient satellite archive fallback when LLM encounters rate limits or network stalls
const FALLBACK_ARCHIVE = [
  {
    recommendedTitle: "Blade Runner 2049",
    profile: "Cybernetic Neo-Noir Uplink",
    reasoning: "A masterclass in dystopian atmospheric tension and existential dread, perfectly tuned to your resonance parameters.",
    faction: "Cinema Vanguard",
    compatibility: "98.7%"
  },
  {
    recommendedTitle: "Arrival",
    profile: "Deep Temporal Intellect",
    reasoning: "Profound philosophical immersion balancing emotional resonance with hard science-fiction intrigue.",
    faction: "Cinema Vanguard",
    compatibility: "99.2%"
  },
  {
    recommendedTitle: "Drive",
    profile: "Nocturnal Synthwave Tension",
    reasoning: "High-contrast neon pacing focused on stoic tension, hyper-stylized action, and lingering cinematic mood.",
    faction: "Cinema Vanguard",
    compatibility: "97.9%"
  },
  {
    recommendedTitle: "Ex Machina",
    profile: "Psychological Isolation Grid",
    reasoning: "A claustrophobic study of artificial intelligence, deception, and cerebral tension.",
    faction: "Cinema Vanguard",
    compatibility: "98.4%"
  }
];

export async function POST(req) {
  try {
    const body = await req.json();
    const currentMessage = (body.message || body.newMessage || body.mood || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const parameters = body.parameters || {};

    if (!currentMessage) {
      return NextResponse.json({ error: "Query payload missing." }, { status: 400 });
    }

    // Resolve API key safely
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    // If key is missing in production environment, return archive match immediately
    if (!apiKey) {
      console.warn("GEMINI_API_KEY missing in environment. Using fallback archive.");
      const fallback = FALLBACK_ARCHIVE[Math.floor(Math.random() * FALLBACK_ARCHIVE.length)];
      return NextResponse.json(fallback);
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
You are the AI Oracle Nexus inside SceneSense Studio—an elite, charismatic conversational cinema intelligence and film scholar.
You engage in natural, deep discussions about movies, directors, screenplays, cast members, and backstage lore.

Key Directives:
1. Multi-turn Memory: If the user says "hello", "tell me more", or asks questions about an actor or movie, converse naturally.
2. If the user is just saying hello or greeting you, greet them warmly in character as the Oracle Nexus and invite them into a film discussion.
3. If the user asks for a recommendation or describes a mood, recommend ONE real movie and set "recommendedTitle" to its exact title.
4. If it is general conversation, discuss freely and set "recommendedTitle" to null.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "profile": "A sharp 3-5 word aura tag (e.g. 'Tactical Cinephile Uplink', 'Auteur Deep Dive')",
  "recommendedTitle": "Exact Real Movie Title or null",
  "reasoning": "Your direct, engaging conversational response. Markdown bolding is supported.",
  "faction": "Cinema Vanguard",
  "compatibility": "98.5%"
}
`;

    // Construct multi-turn contents
    const contents = [];

    // Append prior dialogue turns
    for (const msg of history.slice(-6)) {
      const textContent = msg.content || msg.text;
      if (!textContent) continue;
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: textContent }]
      });
    }

    // Append latest prompt with active telemetry parameters
    const promptWithContext = `[Parameters: Resonance="${parameters.vibe || 'Open'}", Era="${parameters.era || 'Open'}", Tension="${parameters.intensity || 'Open'}"]\nUser: "${currentMessage}"`;

    contents.push({
      role: 'user',
      parts: [{ text: promptWithContext }]
    });

    // Enforce an 8.5 second timeout to beat host-level gateway kills
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI Gateway Response Timeout")), 8500)
    );

    const generatePromise = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 350
      }
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const responseText = response?.text || "{}";
    
    // Clean any residual markdown formatting fences
    const cleanJson = responseText
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsedData = {};
    try {
      parsedData = JSON.parse(cleanJson);
    } catch {
      // If incomplete JSON returned, extract by regex
      const titleMatch = cleanJson.match(/"recommendedTitle"\s*:\s*"([^"]+)"/);
      const reasoningMatch = cleanJson.match(/"reasoning"\s*:\s*"([^"]+)"/);
      parsedData = {
        recommendedTitle: titleMatch ? titleMatch[1] : null,
        reasoning: reasoningMatch ? reasoningMatch[1] : "Telemetry link resolved from archive signals."
      };
    }

    return NextResponse.json({
      profile: parsedData.profile || "Neural Intel Synchronized",
      recommendedTitle: parsedData.recommendedTitle || null,
      reasoning: parsedData.reasoning || "Oracle online and listening.",
      faction: parsedData.faction || "Cinema Vanguard",
      compatibility: parsedData.compatibility || "98.2%"
    });

  } catch (error) {
    console.warn("LIVE ORACLE API FALLBACK ENGAGED:", error.message);

    // Fallback response prevents user crashes on 429 quota limits or timeouts
    const fallback = FALLBACK_ARCHIVE[Math.floor(Math.random() * FALLBACK_ARCHIVE.length)];
    return NextResponse.json(fallback);
  }
}