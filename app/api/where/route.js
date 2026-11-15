import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { title } = await req.json().catch(() => ({}));

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const apiKey = 
      process.env.GEMINI_API_KEY || 
      process.env.GOOGLE_GENAI_API_KEY || 
      process.env.GOOGLE_API_KEY || 
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        reply: "Streaming intelligence is temporarily unavailable (Missing API key)." 
      }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Find where the movie or show "${title}" is currently streaming legally.
Provide a clean, bulleted breakdown:
- Platform name (e.g., Netflix, Prime Video, Disney+, Apple TV)
- Access type (Subscription, Rental, Purchase, Free with Ads)
- Region availability (e.g., US, Canada, UK, Global)
Keep the answer concise and direct.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      tools: [{ googleSearch: {} }],
    });

    const reply = response.text || "No streaming info found.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Where to watch search error:", error);
    return NextResponse.json({ 
      reply: "Unable to retrieve live streaming availability at this moment." 
    }, { status: 500 });
  }
}
