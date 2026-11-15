import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt: userPrompt, mood, recentMovies } = body;

    const apiKey = 
      process.env.GEMINI_API_KEY || 
      process.env.GOOGLE_GENAI_API_KEY || 
      process.env.GOOGLE_API_KEY || 
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      console.error("Missing Gemini API Key in Oracle endpoint.");
      return NextResponse.json(
        { error: "Neural link severed. Gemini API key is missing from environment." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Handle CineMind chat prompt if sent
    if (userPrompt) {
      const systemInstruction = `
You are CineMind AI—the advanced cinematic oracle and film scholar inside SceneSense Studio.
Answer questions about films, directors, cinematography, themes, and screenplays with deep insight, charismatic precision, and authentic cinematic flair. Keep responses direct and engaging (2-4 sentences unless deep analysis is requested).
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const reply = response.text || "Signal intercepted: Neural analysis synchronized with cinematic mainframe.";

      return NextResponse.json({
        success: true,
        text: reply,
        answer: reply,
        reason: reply
      });
    }

    // Otherwise handle mood-based recommendation
    const prompt = `
      You are The Oracle, a highly advanced, slightly cynical cinematic AI in a cyberpunk universe.
      The operative is currently feeling: "${mood || 'Contemplative'}".
      Their recently watched movies are: ${recentMovies?.length > 0 ? recentMovies.join(", ") : "None on record"}.
      
      Based on this psychological state and their watch history, recommend ONE specific movie they should watch next. 
      Do not break character. Keep the reason under 3 sentences.
      
      You must respond strictly in the following JSON format without any markdown blocks or extra text:
      {
        "title": "Exact Movie Title",
        "reason": "Your badass, in-character explanation of why this fits their mood and history."
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const responseText = response.text || "{}";
    const cleanJson = responseText.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    
    let parsed = {};
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      parsed = {
        title: "Blade Runner 2049",
        reason: "Atmospheric dystopian immersion aligned with your emotional telemetry."
      };
    }

    return NextResponse.json({
      success: true,
      title: parsed.title,
      reason: parsed.reason,
      text: parsed.reason,
      answer: parsed.reason
    });

  } catch (error) {
    console.error("Oracle Connection Failed:", error);
    return NextResponse.json(
      { error: "Neural link severed. The Oracle is temporarily overloaded. Retrying transmission shortly." }, 
      { status: 500 }
    );
  }
}
