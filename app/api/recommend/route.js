// File: app/api/recommend/route.js
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

const DAILY_LIMIT = 20;

export async function POST(request) {
  try {
    const { mood, persona = 'SceneSense', userId, category = 'movie', history = [] } = await request.json();

    if (!mood) {
      return NextResponse.json({ error: 'Mood payload is missing.' }, { status: 400 });
    }

    // --- GRACEFUL DAILY QUOTA CHECK ---
    let currentUsage = 0;
    let userGenRef = null;

    if (userId && db) {
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        userGenRef = doc(db, "user_generations", userId);
        const userGenSnap = await getDoc(userGenRef);

        if (!userGenSnap.exists()) {
          await setDoc(userGenRef, { generations_used: 0, last_reset_date: todayStr });
        } else {
          const data = userGenSnap.data();
          if (data.last_reset_date !== todayStr) {
            currentUsage = 0;
            await updateDoc(userGenRef, { generations_used: 0, last_reset_date: todayStr });
          } else {
            currentUsage = data.generations_used || 0;
          }
        }

        if (currentUsage >= DAILY_LIMIT) {
          return NextResponse.json(
            { error: "Daily beta generation limit reached (20/20)." },
            { status: 429 }
          );
        }
      } catch (quotaErr) {
        console.warn("Quota verification bypassed:", quotaErr.message);
      }
    }

    const apiKey = 
      process.env.GEMINI_API_KEY || 
      process.env.GOOGLE_GENAI_API_KEY || 
      process.env.GOOGLE_API_KEY || 
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing Gemini API Key in server environment variables.");
    }

    const tmdbApiKey = 
      process.env.TMDB_API_KEY || 
      process.env.NEXT_PUBLIC_TMDB_API_KEY || 
      "e2b0c95a0bc07e997f769f3d9b4b0db3";

    const ai = new GoogleGenAI({ apiKey });

    let personaDirective = "Curate an eclectic, emotionally resonant selection spanning acclaimed standouts and underappreciated discoveries.";
    if (persona === 'The Director') {
      personaDirective = "Prioritize celebrated directorial masterworks, bold visual compositions, and landmark cinematic achievements.";
    } else if (persona === 'The Cine-Maniac') {
      personaDirective = "Prioritize underground cult favorites, unhinged midnight movies, rare indie cinema, and wild genre surprises.";
    } else if (persona === 'The Know It All' || persona === 'The Film Critic') {
      personaDirective = "Prioritize cerebral art-house, international festival laureates, and Criterion-level masterpieces.";
    } else if (persona === 'The Horror Archivist') {
      personaDirective = "Prioritize creeping psychological dread, foreign horror masterworks, atmospheric supernatural chills, and visceral thrillers.";
    } else if (persona === 'The Sci-Fi Mastermind') {
      personaDirective = "Prioritize high-concept hard science fiction, temporal mechanics, philosophical space odysseys, and dystopian cyberpunk.";
    }

    const antiRepeatPrompt = history && history.length > 0 
      ? `STRICT EXCLUSION: DO NOT include any of these previously shown titles: ${history.slice(-30).join(', ')}.` 
      : '';

    const systemInstruction = `
You are SceneSense Studio's cinematic intelligence engine.
Your mission is to recommend exactly 20 real, existing ${category === 'tv' ? 'TV series' : 'feature films'} matching the user's emotional wavelength, persona directive, and format.

TEMPORAL ACCURACY DIRECTIVE:
- If the user specifies a year or era (e.g., "movies from 2025", "1994", "80s horror"), all titles MUST be strictly from that era.
- Otherwise, include a balance of recent releases (2022-2026) alongside classic titles.

Respond ONLY with raw JSON matching this structure:
{
  "dialogue": "1-2 sentence persona transmission.",
  "primary_reason": "Specific sentence explaining why the #1 choice fits their precise request.",
  "titles": [
    {"title": "Film Title", "year": "YYYY"}
  ]
}
`;

    const promptText = `User Query: "${mood}"\nPersona: "${persona}"\nDirective: "${personaDirective}"\n${antiRepeatPrompt}`;

    const modelCandidate = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const response = await ai.models.generateContent({
      model: modelCandidate,
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    let rawText = response.text || "{}";
    // Strip markdown code fences if returned
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

    let aiResult;
    try {
      aiResult = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      aiResult = match ? JSON.parse(match[0]) : { titles: [] };
    }

    const recommendedList = Array.isArray(aiResult.titles) ? aiResult.titles : [];

    // Query TMDB in parallel with graceful error containment
    const searchPromises = recommendedList.slice(0, 20).map(async (item) => {
      try {
        const searchUrl = new URL(`https://api.themoviedb.org/3/search/${category}`);
        searchUrl.searchParams.append('api_key', tmdbApiKey);
        searchUrl.searchParams.append('query', item.title);
        searchUrl.searchParams.append('language', 'en-US');
        if (item.year) {
          if (category === 'movie') searchUrl.searchParams.append('primary_release_year', item.year);
          else searchUrl.searchParams.append('first_air_date_year', item.year);
        }

        const res = await fetch(searchUrl.toString());
        if (!res.ok) return null;
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          const matched = data.results.find(r => r.poster_path) || data.results[0];
          return {
            id: matched.id,
            title: matched.title || matched.name,
            overview: matched.overview || "No overview telemetry recorded.",
            poster_path: matched.poster_path || null,
            release_date: matched.release_date || matched.first_air_date || item.year || "N/A",
            vote_average: matched.vote_average || 0,
            media_type: category
          };
        }
        return null;
      } catch {
        return null;
      }
    });

    const searchResults = await Promise.all(searchPromises);
    const validMovies = searchResults.filter(Boolean);

    const seen = new Set();
    const finalMovies = validMovies.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    if (finalMovies.length === 0) {
      throw new Error("No TMDB records could be matched with the AI output.");
    }

    if (userGenRef) {
      try {
        await updateDoc(userGenRef, { generations_used: currentUsage + 1 });
      } catch (err) {
        console.warn("Could not increment quota count:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        movies: finalMovies,
        reason: aiResult.primary_reason || `Authentically aligned with your transmission: "${mood}".`,
        avatar: {
          dialogue: aiResult.dialogue || `Transmission locked on "${mood}". Verified matches acquired.`,
          animation_state: "excited"
        },
        generationsRemaining: Math.max(0, DAILY_LIMIT - (currentUsage + 1))
      }
    });

  } catch (error) {
    console.error("[SCENESENSE API CRITICAL ERROR]:", error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: {
        movies: [{
          id: 603,
          title: "The Matrix",
          overview: "Backup protocol engaged. A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
          poster_path: "/f89U3ADr1oiB1s9GvwJwBZZ4Zcz.jpg",
          release_date: "1999-03-30",
          vote_average: 8.2,
          media_type: 'movie'
        }],
        avatar: {
          dialogue: "Transmission interrupted. Offline emergency telemetry deployed.",
          animation_state: "neutral"
        }
      }
    });
  }
}