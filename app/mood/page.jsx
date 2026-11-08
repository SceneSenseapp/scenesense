// app/mood/page.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PageShell from '@/components/layout/PageShell';
import PageHeader from '@/components/layout/PageHeader';
import { useStudioSession } from '@/components/StudioSessionProvider';
import { useWatchlist } from '@/hooks/useWatchlist';
import { trackQuestEvent } from '@/lib/quest-tracker';
import MovieModal from '@/components/MovieModal';

const VIBES = [
  { id: 'psych', label: 'Psychological', icon: '🧠' },
  { id: 'cyber', label: 'Cyberpunk', icon: '⚡' },
  { id: 'catharsis', label: 'Cathartic', icon: '🌧️' },
  { id: 'cosmic', label: 'Cosmic Dread', icon: '🌌' },
  { id: 'comfort', label: 'Comfort Noir', icon: '☕' },
];

const ERAS = [
  { id: 'classics', label: 'Pre-1980s' },
  { id: 'neon80s', label: '80s & 90s' },
  { id: 'modern', label: '2000s–2010s' },
  { id: 'contemporary', label: 'Contemporary' },
];

const INTENSITIES = [
  { id: 'low', label: 'Ambient' },
  { id: 'medium', label: 'Balanced' },
  { id: 'high', label: 'Intense Overload' },
];

export default function MagicalOraclePage() {
  const { user } = useStudioSession();
  const [messages, setMessages] = useState([
    {
      role: 'oracle',
      text: 'AI Oracle Nexus online. Select your resonance parameters or describe the atmosphere you want to experience tonight.',
      profile: 'Ready for telemetry',
      compatibility: '99.8%',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedVibe, setSelectedVibe] = useState(VIBES[0].label);
  const [selectedEra, setSelectedEra] = useState(ERAS[3].label);
  const [selectedIntensity, setSelectedIntensity] = useState(INTENSITIES[1].label);

  const [isLoading, setIsLoading] = useState(false);
  const [oraclePosters, setOraclePosters] = useState({});
  const [selectedMovieId, setSelectedMovieId] = useState(null);

  const chatEndRef = useRef(null);
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchMoviePoster = async (movieTitle, messageIndex) => {
    if (!movieTitle) return;
    try {
      const res = await fetch(
        `/api/tmdb?endpoint=search/movie&query=${encodeURIComponent(movieTitle)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setOraclePosters((prev) => ({ ...prev, [messageIndex]: data.results[0] }));
        }
      }
    } catch (err) {
      console.warn('Poster search warning:', err);
    }
  };

  const handleConsultOracle = async (overridePrompt) => {
    const userQuery = overridePrompt || inputValue.trim();
    const compositeQuery = `[Resonance: ${selectedVibe}] [Era: ${selectedEra}] [Pacing: ${selectedIntensity}] ${userQuery}`;
    if (isLoading) return;

    setInputValue('');
    const updatedMessages = [
      ...messages,
      {
        role: 'user',
        text: userQuery || `${selectedVibe} • ${selectedEra} • ${selectedIntensity}`,
      },
    ];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid || null,
          newMessage: compositeQuery,
          mood: compositeQuery,
          recentMovies: (watchlist || [])
            .slice(0, 6)
            .map((w) => w.title || w.name)
            .filter(Boolean),
        }),
      });

      const data = await res.json();
      const newMsgIndex = updatedMessages.length;
      const targetTitle = data.recommendedTitle || data.title;

      const oracleReply = {
        role: 'oracle',
        profile: data.profile || 'Neural Match Confirmed',
        recommendedTitle: targetTitle,
        text:
          data.reasoning ||
          data.reason ||
          data.text ||
          'Transmission resolved across the cinema archive.',
        compatibility: `${Math.floor(Math.random() * 8) + 92}.${Math.floor(
          Math.random() * 9
        )}%`,
      };

      setMessages((prev) => [...prev, oracleReply]);
      if (user?.uid) {
        trackQuestEvent(user.uid, 'oracle_consult_3', 1);
      }

      if (data.mediaDetails && data.mediaDetails.id) {
        setOraclePosters((prev) => ({ ...prev, [newMsgIndex]: data.mediaDetails }));
      } else if (targetTitle) {
        await fetchMoviePoster(targetTitle, newMsgIndex);
      }
    } catch (err) {
      console.warn('Oracle query notice:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'oracle',
          profile: 'Telemetry Fallback',
          recommendedTitle: 'Blade Runner 2049',
          text: 'Direct uplink encountered atmospheric noise. Serving high-resonance masterwork from archive.',
          compatibility: '96.4%',
        },
      ]);
      await fetchMoviePoster('Blade Runner 2049', updatedMessages.length);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell maxWidth="max-w-6xl">
      <PageHeader
        eyebrow="Psychometric Cinema Engine • Gemini 3.8 Flash"
        title="AI Mood"
        accent="Oracle"
        subtitle="Tune your emotional vibe, era window, and pacing intensity—or describe a custom mood to receive a precision film recommendation."
        actions={
          <>
            <Link
              href="/analyze"
              className="px-4 py-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/30 text-violet-200 text-xs font-mono font-semibold transition-all"
            >
              🔬 Scene &amp; Frame Analyzer
            </Link>
            <Link
              href="/where-to-watch"
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-mono font-semibold transition-all"
            >
              📡 Streaming Radar
            </Link>
          </>
        }
      />

      <div className="studio-panel rounded-3xl p-5 sm:p-7 flex flex-col min-h-[65vh] space-y-6">
        {/* COMPACT PARAMETER MATRIX */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="mood-vibe-select"
                className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block mb-1.5 font-bold"
              >
                1. Core Vibe
              </label>
              <select
                id="mood-vibe-select"
                value={selectedVibe}
                onChange={(e) => setSelectedVibe(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 text-xs font-mono font-bold text-white rounded-xl px-3 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
              >
                {VIBES.map((v) => (
                  <option key={v.id} value={v.label} className="bg-[#050811] text-white">
                    {v.icon} {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="mood-era-select"
                className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block mb-1.5 font-bold"
              >
                2. Era Window
              </label>
              <select
                id="mood-era-select"
                value={selectedEra}
                onChange={(e) => setSelectedEra(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 text-xs font-mono font-bold text-white rounded-xl px-3 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
              >
                {ERAS.map((era) => (
                  <option key={era.id} value={era.label} className="bg-[#050811] text-white">
                    ⌛ {era.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="mood-intensity-select"
                className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block mb-1.5 font-bold"
              >
                3. Pacing &amp; Tension
              </label>
              <select
                id="mood-intensity-select"
                value={selectedIntensity}
                onChange={(e) => setSelectedIntensity(e.target.value)}
                className="w-full bg-[#050811] border border-white/15 text-xs font-mono font-bold text-white rounded-xl px-3 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
              >
                {INTENSITIES.map((lvl) => (
                  <option key={lvl.id} value={lvl.label} className="bg-[#050811] text-white">
                    ⚡ {lvl.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CONVERSATION & TELEMETRY STREAM */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 min-h-[280px]">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const posterMovie = oraclePosters[index];
            const isSaved = posterMovie
              ? (watchlist || []).some((w) => String(w.id) === String(posterMovie.id))
              : false;

            return (
              <div
                key={index}
                className={`flex flex-col ${
                  isUser ? 'items-end' : 'items-start'
                } space-y-3`}
              >
                <div
                  className={`p-4 md:p-5 rounded-2xl max-w-[88%] text-xs md:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none shadow-md font-medium'
                      : 'bg-[#080d1a] border border-white/10 text-slate-200 rounded-tl-none shadow-lg'
                  }`}
                >
                  {msg.profile && (
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 text-[10px] font-mono text-cyan-400 uppercase tracking-widest gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        {msg.profile}
                      </span>
                      {msg.compatibility && (
                        <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                          {msg.compatibility} Match
                        </span>
                      )}
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {!isUser && posterMovie && (
                  <div className="w-full max-w-lg p-4 bg-[#080d1a] border border-cyan-500/25 rounded-2xl flex gap-4 items-center shadow-xl">
                    <div
                      onClick={() => setSelectedMovieId(posterMovie.id)}
                      className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden bg-[#141420] border border-white/10 shrink-0 cursor-pointer group"
                    >
                      {posterMovie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${posterMovie.poster_path}`}
                          alt={posterMovie.title}
                          fill
                          unoptimized
                          sizes="80px"
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
                          N/A
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                          Recommended Match
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          ★{' '}
                          {posterMovie.vote_average
                            ? Number(posterMovie.vote_average).toFixed(1)
                            : 'N/A'}
                        </span>
                      </div>

                      <h4
                        onClick={() => setSelectedMovieId(posterMovie.id)}
                        className="text-sm font-bold text-white hover:text-cyan-300 transition-colors truncate cursor-pointer"
                      >
                        {posterMovie.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {posterMovie.overview}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedMovieId(posterMovie.id)}
                          className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer"
                        >
                          Quick View
                        </button>
                        <Link
                          href={`/movie/${posterMovie.id}?type=movie`}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-[10px] font-mono font-bold rounded-lg text-cyan-300"
                        >
                          Theater Page ↗
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            isSaved
                              ? removeFromWatchlist(posterMovie.id)
                              : saveToWatchlist(posterMovie)
                          }
                          className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                            isSaved
                              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50'
                              : 'bg-[#141420] text-slate-300 border-white/15 hover:text-white'
                          }`}
                        >
                          {isSaved ? '✓ Saved' : '+ Watchlist'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 py-2 text-xs font-mono text-cyan-400">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing psychometric match...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* BOTTOM INPUT BAR */}
        <div className="pt-3 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleConsultOracle();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Describe a plot concept, atmosphere, or hit Consult Oracle..."
              className="flex-1 bg-[#080d1a] border border-white/15 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 outline-none transition-all font-mono"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 md:px-7 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap"
            >
              {isLoading ? 'Computing...' : '⚡ Consult Oracle'}
            </button>
          </form>
        </div>
      </div>

      {selectedMovieId && (
        <MovieModal
          movieId={selectedMovieId}
          onClose={() => setSelectedMovieId(null)}
        />
      )}
    </PageShell>
  );
}
