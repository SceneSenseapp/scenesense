// File: app/api/analyze/route.js
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { scene } = body;

    if (!scene || typeof scene !== "string" || !scene.trim()) {
      return NextResponse.json(
        { error: "A valid scene description is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyAX0LF6ZjKA3dnsUPkIXLrHQW7p3H0-N2g";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    const prompt = `Explain this movie/TV scene clearly, without major spoilers:\n\n${scene.trim()}`;

    // Updated to the current standard model identifier
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Gemini API Error Response:", data);
      return NextResponse.json(
        { error: data.error?.message || "Failed to analyze scene with Gemini." },
        { status: res.status }
      );
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Unable to analyze this scene at the moment.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Scene Analysis Route Exception:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error occurred." },
      { status: 500 }
    );
  }
}