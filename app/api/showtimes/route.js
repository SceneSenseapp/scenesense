// File: app/api/showtimes/route.js
import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, location = 'London, Ontario' } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Movie title is required.' },
        { status: 400 }
      );
    }

    if (!ai) {
      console.error('GEMINI_API_KEY missing in environment variables.');
      return NextResponse.json(
        { success: false, error: 'Showtimes search engine offline (Missing API key).' },
        { status: 500 }
      );
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find current local theater showtimes, theater names, and booking links for the movie "${title}" near ${location}. Format the response clearly with cinema names, showtimes, and booking details. If there are no current showtimes found, state explicitly: "No showtimes found."`,
      tools: [{ googleSearch: {} }],
    });

    const outputText = response.text || '';
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Check if the response indicates no showings
    const hasNoShowtimes = 
      !outputText.trim() || 
      outputText.toLowerCase().includes('no showtimes found') ||
      outputText.toLowerCase().includes('no current showtimes');

    return NextResponse.json({ 
      success: true, 
      showtimesText: hasNoShowtimes ? '' : outputText,
      sources: hasNoShowtimes ? [] : sources
    });
  } catch (error) {
    console.error("Showtimes fetch error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to scan cinema showtimes.' 
      }, 
      { status: 500 }
    );
  }
}