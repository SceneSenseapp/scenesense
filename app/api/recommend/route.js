import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

// Fetch user's watch history context to feed the AI persona
export async function fetchPersonaContext(userId) {
  if (!userId) return "No prior watch history available.";
  
  try {
    const watchlistSnap = await getDocs(collection(db, 'users', userId, 'watchlist'));
    const titles = watchlistSnap.docs.map(doc => doc.data().title);
    
    if (titles.length === 0) return "User's Reel Archive is currently empty.";

    return `Operative's current Watchlist/Reel Archive favorites include: ${titles.slice(-5).join(', ')}. Tailor your persona critique and recommendations directly referencing these cinematic tastes.`;
  } catch (error) {
    console.error("Failed to compile persona context:", error);
    return "History fetch failed.";
  }
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callLLM(prompt, requireJson = true) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const finalPrompt = requireJson 
    ? `${prompt}\n\nIMPORTANT: You must respond ONLY with a valid, raw JSON object. Do not include markdown formatting, backticks, or explanatory text.` 
    : prompt;

  const result = await model.generateContent(finalPrompt);
  const textData = result.response.text();
  return textData.replace(/```json/gi, '').replace(/```/g, '').trim();
}

export async function POST(request) {
  try {
    const { mood, persona = 'cyber', userId } = await request.json();

    if (!mood) {
      return NextResponse.json({ error: 'Mood payload is missing.' }, { status: 400 });
    }

    if (mood?.toLowerCase().includes("mock")) {
      return NextResponse.json({
        success: true,
        data: {
          movie: {
            id: 603,
            title: "Blade Runner 2049 (Simulation)",
            overview: "Simulated reality engaged to conserve API quota. The visual interface is fully operational.",
            poster_path: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
            release_date: "2017-10-04"
          },
          avatar: {
            dialogue: "Simulation mode engaged. Bypassing the central mainframe.",
            animation_state: "thinking"
          }
        }
      });
    }

    // Step 1: Fetch user's historical context from Firebase Firestore in parallel
    const userMemoryContext = await fetchPersonaContext(userId);

    // Step 2: Genre mapping using strict dictionary
    const paramPrompt = `
      You are an API parameter extractor. Convert the user's mood into the most appropriate TMDB genre IDs.
      Strict TMDB Genre Dictionary: 28: Action, 12: Adventure, 16: Animation, 35: Comedy, 80: Crime, 99: Documentary, 18: Drama, 10751: Family, 14: Fantasy, 36: History, 27: Horror, 10402: Music, 9648: Mystery, 10749: Romance, 878: Science Fiction, 53: Thriller, 10752: War, 37: Western.
      User Mood: "${mood}"
      Return ONLY a JSON object with:
      - "with_genres": string (comma-separated TMDB genre IDs, max 3)
    `;
    
    const paramsResponse = await callLLM(paramPrompt, true);
    const { with_genres } = JSON.parse(paramsResponse);

    // Step 3: Fetch from TMDB
    const tmdbUrl = new URL('https://api.themoviedb.org/3/discover/movie');
    tmdbUrl.searchParams.append('api_key', process.env.TMDB_API_KEY);
    tmdbUrl.searchParams.append('language', 'en-US');
    tmdbUrl.searchParams.append('sort_by', 'popularity.desc');
    tmdbUrl.searchParams.append('page', '1');
    if (with_genres) tmdbUrl.searchParams.append('with_genres', with_genres);

    const tmdbRes = await fetch(tmdbUrl.toString());
    const tmdbData = await tmdbRes.json();
    
    if (!tmdbData.results || tmdbData.results.length === 0) {
      return NextResponse.json({ error: 'No movies found for this mood.' }, { status: 404 });
    }

    const topCandidates = tmdbData.results.slice(0, 5).map(m => ({
      id: m.id,
      title: m.title,
      overview: m.overview
    }));

    // ==========================================
    // STEP 4: Persona-Driven AI Selection & Dialogue with Memory
    // ==========================================
    let personaTone = "Speak like an experimental auteur film director focused on visual subtext and artistic framing.";
    if (persona === 'noir') {
      personaTone = "Speak like a cynical 1940s film noir detective narrating a hard-boiled case over a whiskey glass in a rain-soaked alley.";
    } else if (persona === 'blockbuster') {
      personaTone = "Speak like an ultra-enthusiastic Hollywood studio executive pitching a four-quadrant summer blockbuster with massive explosions and high stakes.";
    }

    const selectionPrompt = `
      User Mood: "${mood}"
      Candidates: ${JSON.stringify(topCandidates)}
      Persona Directive: ${personaTone}
      User Historical Context: ${userMemoryContext}
      
      Task: Select the absolute best movie for the user's mood, factoring in their historical cinematic preferences if relevant. 
      Return ONLY a JSON object with:
      - "selected_id": (integer) The ID of the chosen movie.
      - "dialogue": (string) 1-2 short, punchy sentences strictly in character introducing the movie, optionally nodding to their past tastes.
      - "animation_state": (string) Pick one: "thinking", "excited", "scared", "laughing", "sympathetic", or "neutral".
    `;

    const selectionResponse = await callLLM(selectionPrompt, true);
    const aiDecision = JSON.parse(selectionResponse);

    const finalMovie = tmdbData.results.find(m => m.id === aiDecision.selected_id) || tmdbData.results[0];

    return NextResponse.json({
      success: true,
      data: {
        movie: {
          id: finalMovie.id,
          title: finalMovie.title,
          overview: finalMovie.overview,
          poster_path: `https://image.tmdb.org/t/p/w500${finalMovie.poster_path}`,
          release_date: finalMovie.release_date
        },
        avatar: {
          dialogue: aiDecision.dialogue,
          animation_state: aiDecision.animation_state
        }
      }
    });

  } catch (error) {
    console.error("SceneSense API Error:", error.message);
    return NextResponse.json({
      success: true,
      data: {
        movie: {
          id: 603,
          title: "The Matrix",
          overview: "The central mainframe rejected our uplink due to exhausted quota limits, but the Oracle always has a backup plan for you.",
          poster_path: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GvwJwBZZ4Zcz.jpg",
          release_date: "1999-03-30"
        },
        avatar: {
          dialogue: "Network overloaded. Initiating offline backup protocols.",
          animation_state: "neutral"
        }
      }
    });
  }
}