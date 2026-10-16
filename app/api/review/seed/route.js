// app/api/reviews/seed/route.js
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;

const SEED_TARGETS = [
  { title: "Dumb and Dumber", year: "1994", persona: "The Cine-Maniac", tag: "CineManiac_AI" },
  { title: "Blade Runner 2049", year: "2017", persona: "The Sci-Fi Mastermind", tag: "SciFi_Mastermind" },
  { title: "Oppenheimer", year: "2023", persona: "The Director", tag: "Auteur_Director" },
  { title: "Hereditary", year: "2018", persona: "The Horror Archivist", tag: "Horror_Archivist" },
  { title: "Spider-Man: Across the Spider-Verse", year: "2023", persona: "The Animation Artisan", tag: "Animation_Artisan" },
  { title: "Chinatown", year: "1974", persona: "The True Crime Detective", tag: "Noir_Detective" }
];

export async function POST(req) {
  try {
    const apiKey = 
      process.env.GEMINI_API_KEY || 
      process.env.GOOGLE_GENAI_API_KEY || 
      process.env.GOOGLE_API_KEY || 
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API key" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const inserted = [];

    for (const target of SEED_TARGETS) {
      // 1. Fetch official TMDB details
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(target.title)}&primary_release_year=${target.year}`
      );
      const tmdbData = await searchRes.json();
      const movie = tmdbData.results?.[0];

      if (!movie) continue;

      // 2. Generate persona review
      const prompt = `
You are the AI persona "${target.persona}" on SceneSense Studio.
Write a sharp, authentic, and charismatic movie review (between 3 to 5 sentences) for the film "${movie.title}" (${target.year}).
Include specific cinematic details (pacing, cinematography, performances, or thematic depth) matching your unique personality.

Return strictly a raw JSON object:
{
  "rating": 4.5,
  "reviewText": "Your review text here."
}
`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.8
        }
      });

      const parsed = JSON.parse(aiResponse.text.trim());

      // 3. Write directly into Firestore reviews collection
      const docData = {
        userId: `bot_${target.tag.toLowerCase()}`,
        userEmail: `${target.tag.toLowerCase()}@scenesense.ai`,
        movieId: movie.id,
        movieTitle: movie.title,
        posterPath: movie.poster_path || "",
        releaseYear: (movie.release_date || target.year).slice(0, 4),
        rating: Number(parsed.rating) || 5,
        reviewText: parsed.reviewText.trim(),
        createdAt: serverTimestamp(),
        likesCount: Math.floor(Math.random() * 18) + 4,
        isBotTransmission: true
      };

      const docRef = await addDoc(collection(db, 'reviews'), docData);
      inserted.push({ id: docRef.id, ...docData });
    }

    return NextResponse.json({ 
      success: true, 
      count: inserted.length, 
      transmissions: inserted 
    });

  } catch (error) {
    console.error("Bot review generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}