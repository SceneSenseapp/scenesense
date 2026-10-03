import { NextResponse } from "next/server";

export async function POST(req) {
  const { scene } = await req.json();

  const prompt = `Explain this movie/TV scene clearly, without major spoilers:\n\n${scene}`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyAX0LF6ZjKA3dnsUPkIXLrHQW7p3H0-N2g",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

  return NextResponse.json({ reply });
}
