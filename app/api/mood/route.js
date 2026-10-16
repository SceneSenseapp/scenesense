// app/api/mood/route.js
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

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

    // Construct multi-turn contents for Gemini
    const contents = [];

    // Append prior dialogue turns
    for (const msg of history.slice(-6)) {
      if (!msg.content) continue;
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // Append latest prompt with active telemetry parameters
    const promptWithContext = `[Parameters: Resonance="${parameters.vibe || 'Open'}", Era="${parameters.era || 'Open'}", Tension="${parameters.intensity || 'Open'}"]\nUser: "${currentMessage}"`;

    contents.push({
      role: 'user',
      parts: [{ text: promptWithContext }]
    });

    // Use gemini-2.5-flash (standard, fast, stable model)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.75,
      }
    });

    const responseText = response.text || "{}";
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json({
      profile: parsedData.profile || "Neural Intel Synchronized",
      recommendedTitle: parsedData.recommendedTitle || null,
      reasoning: parsedData.reasoning || parsedData.text || "Oracle online and listening.",
      faction: parsedData.faction || "Cinema Vanguard",
      compatibility: parsedData.compatibility || "98.2%"
    });

  } catch (error) {
    console.error("LIVE ORACLE API ERROR:", error);
    return NextResponse.json({ 
      error: `Neural uplink failure: ${error.message}` 
    }, { status: 500 });
  }
}