// app/api/mood/route.js
import { NextResponse } from 'next/server';
import { generateWithCascade, safeParseJson } from '@/lib/server/ai-gateway';
import { resolveTmdbCredentials } from '@/lib/movie-apis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORACLE_FAILSAFE_ARCHIVE = [
  {
    title: 'Blade Runner 2049',
    recommendedTitle: 'Blade Runner 2049',
    profile: 'Cyberpunk Resonance Lock',
    reason:
      "The neon haze won't fix your existential drift, but watching K search for a soul in the ruins of Los Angeles will give your melancholy a razor-sharp aesthetic.",
    reasoning:
      "The neon haze won't fix your existential drift, but watching K search for a soul in the ruins of Los Angeles will give your melancholy a razor-sharp aesthetic.",
    mediaDetails: {
      id: 335984,
      title: 'Blade Runner 2049',
      poster_path: '/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
      backdrop_path: '/ilRyASD5H7znMRyvQ1i114pTqF5.jpg',
      year: '2017',
      vote_average: 7.6,
      overview:
        "Thirty years after the events of the first film, a new Blade Runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what's left of society into chaos.",
    },
  },
  {
    title: 'Dark City',
    recommendedTitle: 'Dark City',
    profile: 'Nocturnal Reality Shift',
    reason:
      'If you suspect the world is being rebuilt around you every midnight, stop fighting the paranoia and watch Murdoch shatter the nocturnal illusion.',
    reasoning:
      'If you suspect the world is being rebuilt around you every midnight, stop fighting the paranoia and watch Murdoch shatter the nocturnal illusion.',
    mediaDetails: {
      id: 2666,
      title: 'Dark City',
      poster_path: '/tN3A7W814vH3nB8H0B7kS7v7x6w.jpg',
      backdrop_path: '/vHlY3PqY1kF1oT6rQ9kK1qQ3q0R.jpg',
      year: '1998',
      vote_average: 7.3,
      overview:
        'A man struggles with memories of his past, including a wife he cannot remember, in a nightmarish world with no sun.',
    },
  },
  {
    title: 'Children of Men',
    recommendedTitle: 'Children of Men',
    profile: 'Kinetic Dystopian Catharsis',
    reason:
      'Hope is an expensive commodity in a dying world, operative. Strap in for single-take adrenaline through dystopia to remind yourself why survival matters.',
    reasoning:
      'Hope is an expensive commodity in a dying world, operative. Strap in for single-take adrenaline through dystopia to remind yourself why survival matters.',
    mediaDetails: {
      id: 9693,
      title: 'Children of Men',
      poster_path: '/8Xg2L2s1xV9Q1y8z0J8k5T5r7q9.jpg',
      backdrop_path: '/f5k9v0xQ2y9vH9k3qK2L9x8J7H.jpg',
      year: '2006',
      vote_average: 7.9,
      overview:
        'In 2027, in a chaotic world in which humans can no longer procreate, a former activist agrees to help transport a miraculously pregnant woman to a sanctuary at sea.',
    },
  },
];

async function hydrateMediaMetadata(title) {
  const { apiKey: tmdbKey } = resolveTmdbCredentials();
  if (!title || !tmdbKey) return null;
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(
      title
    )}&include_adult=false`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const data = await res.json();
    const match = data.results?.[0];

    if (match) {
      return {
        id: match.id,
        movieId: match.id,
        title: match.title,
        poster_path: match.poster_path,
        backdrop_path: match.backdrop_path,
        year: (match.release_date || '').split('-')[0] || 'N/A',
        vote_average: match.vote_average
          ? Number(match.vote_average.toFixed(1))
          : null,
        overview: match.overview || '',
      };
    }
  } catch (err) {
    console.warn('Oracle TMDB lookup note:', err.message);
  }
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const mood = (body.mood || body.newMessage || body.vibe || '').trim().slice(0, 500);
    const recentMovies = Array.isArray(body.recentMovies)
      ? body.recentMovies.slice(0, 10).map((m) => String(m).slice(0, 100))
      : [];

    if (!mood) {
      return NextResponse.json(
        { error: 'Psychological resonance parameters required.' },
        { status: 400 }
      );
    }

    const systemInstruction = `You are The Oracle: a highly perceptive cinematic curator inside the SceneSense Studio terminal.
Analyze the viewer's psychological mood and resonance parameters.
Recommend exactly ONE specific, real movie that fits their mental state.
Keep your voice sharp, intelligent, immersive, and under 3 sentences.
Return ONLY valid JSON matching this schema:
{
  "title": "Exact Movie Title",
  "profile": "Short 3-word psychometric classification (e.g. 'Neon Existential Drift')",
  "reason": "2-3 sentence sharp explanation of why this film matches their resonance"
}`;

    const prompt = `Viewer Mood: "${mood}"
Recent Logged Titles: ${
      recentMovies.length > 0 ? recentMovies.join(', ') : 'None on record'
    }

Select one specific movie and explain why it matches their resonance.`;

    const result = await generateWithCascade({
      contents: prompt,
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: 0.7,
    });

    const parsedResult = result.success ? safeParseJson(result.text) : null;

    if (!parsedResult || !parsedResult.title) {
      const fallback =
        ORACLE_FAILSAFE_ARCHIVE[
          Math.floor(Math.random() * ORACLE_FAILSAFE_ARCHIVE.length)
        ];
      return NextResponse.json(fallback);
    }

    const mediaDetails = await hydrateMediaMetadata(parsedResult.title);
    const resolvedTitle = mediaDetails?.title || parsedResult.title || 'Blade Runner 2049';
    const resolvedReason =
      parsedResult.reason ||
      parsedResult.reasoning ||
      'Telemetry synthesized from the silent grid.';

    return NextResponse.json({
      title: resolvedTitle,
      recommendedTitle: resolvedTitle,
      profile: parsedResult.profile || 'Neural Match Confirmed',
      reason: resolvedReason,
      reasoning: resolvedReason,
      text: resolvedReason,
      modelUsed: result.modelUsed,
      mediaDetails,
    });
  } catch (error) {
    console.warn('Oracle link interrupted, serving fail-safe archive:', error.message);
    const fallback =
      ORACLE_FAILSAFE_ARCHIVE[
        Math.floor(Math.random() * ORACLE_FAILSAFE_ARCHIVE.length)
      ];
    return NextResponse.json(fallback);
  }
}
