// File: app/mood/page.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';
import MovieModal from '@/components/MovieModal';

const VIBES = [
  { id: 'psych', label: 'Psychological Tension', icon: '🧠', desc: 'Mind-bending paranoia & shifting reality' },
  { id: 'cyber', label: 'Cyberpunk Dystopia', icon: '⚡', desc: 'High-tech, low-life neon synthetic grit' },
  { id: 'catharsis', label: 'Cathartic Melancholy', icon: '🌧️', desc: 'Poignant emotional weight & quiet release' },
  { id: 'cosmic', label: 'Cosmic Dread', icon: '🌌', desc: 'Unfathomable scale, cold stars & existential fear' },
  { id: 'comfort', label: 'Comfort Noir', icon: '☕', desc: 'Rain-slicked asphalt, saxophone & trench coats' }
];

const ERAS = [
  { id: 'classics', label: 'Pre-1980s (Golden & New Hollywood)' },
  { id: 'neon80s', label: '80s & 90s (Celluloid Renaissance)' },
  { id: 'modern', label: '2000s–2010s (Digital Revolution)' },
  { id: 'contemporary', label: 'Contemporary (2020s Auteur Era)' }
];

const INTENSITIES = [
  { id: 'low', label: 'Ambient & Meditative' },
  { id: 'medium', label: 'Calculated & Balanced' },
  { id: 'high', label: 'Intense Sensory Overload' }
];

const QUICK_PRESETS = [
  { label: 'Cyberpunk Paranoia', vibe: 'Cyberpunk Dystopia', era: '80s & 90s (Celluloid Renaissance)', intensity: 'Intense Sensory Overload', prompt: 'Rogue synthetics, sprawling corporate megastructures, and analog synth soundscapes.' },
  { label: 'Atmospheric Noir Mystery', vibe: 'Comfort Noir', era: 'Pre-1980s (Golden & New Hollywood)', intensity: 'Calculated & Balanced', prompt: 'A cynical private investigator unraveling an institutional conspiracy under neon streetlights.' },
  { label: 'Existential Deep Space', vibe: 'Cosmic Dread', era: 'Contemporary (2020s Auteur Era)', intensity: 'Ambient & Meditative', prompt: 'Isolated crew confronting incomprehensible phenomena beyond the edge of charted solar space.' }
];

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

export default function MagicalOraclePage() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([
    { 
      role: 'oracle', 
      text: "AI Oracle Nexus online. Select your psychometric resonance parameters or describe what you want to experience.",
      profile: "Ready for telemetry",
      compatibility: "99.8%"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [selectedVibe, setSelectedVibe] = useState(VIBES[0].label);
  const [selectedEra, setSelectedEra] = useState(ERAS[3].label);
  const [selectedIntensity, setSelectedIntensity] = useState(INTENSITIES[1].label);

  const [isLoading, setIsLoading] = useState(false);
  const [oraclePosters, setOraclePosters] = useState({});
  const [selectedMovieId, setSelectedMovieId] = useState(null);

  const chatEndRef = useRef(null);
  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else router.push('/login');
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Clean raw AI response titles of brackets, quotes, and parenthetical release years
  const cleanTitleForSearch = (raw) => {
    if (!raw) return '';
    return raw
      .replace(/\s*\(\d{4}\).*/g, '') // Strips (1999) or (2023)
      .replace(/["'«»]/g, '')           // Strips extraneous quotes
      .replace(/^title:\s*/i, '')      // Strips leading 'title:' tags
      .trim();
  };

  const fetchMoviePoster = async (movieTitle, messageIndex) => {
    const sanitized = cleanTitleForSearch(movieTitle);
    if (!sanitized) return;

    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(sanitized)}&include_adult=false&page=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setOraclePosters((prev) => ({ ...prev, [messageIndex]: data.results[0] }));
        }
      }
    } catch (err) {
      console.warn("Poster search warning:", err);
    }
  };

  const applyPreset = (preset) => {
    setSelectedVibe(preset.vibe);
    setSelectedEra(preset.era);
    setSelectedIntensity(preset.intensity);
    setInputValue(preset.prompt);
  };

  const randomizeParameters = () => {
    const randomVibe = VIBES[Math.floor(Math.random() * VIBES.length)].label;
    const randomEra = ERAS[Math.floor(Math.random() * ERAS.length)].label;
    const randomIntensity = INTENSITIES[Math.floor(Math.random() * INTENSITIES.length)].label;

    setSelectedVibe(randomVibe);
    setSelectedEra(randomEra);
    setSelectedIntensity(randomIntensity);
  };

  const handleConsultOracle = async (overridePrompt) => {
    const userQuery = overridePrompt || inputValue.trim();
    const compositeQuery = `[Resonance: ${selectedVibe}] [Era: ${selectedEra}] [Pacing: ${selectedIntensity}] ${userQuery}`;
    if (!userQuery && !overridePrompt && isLoading) return;

    setInputValue('');
    const updatedMessages = [...messages, { role: 'user', text: userQuery || `${selectedVibe} • ${selectedEra}` }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user?.uid, 
          newMessage: compositeQuery, 
          mood: compositeQuery,
          vibe: selectedVibe,
          era: selectedEra,
          intensity: selectedIntensity 
        })
      });
      
      const data = await res.json();
      const newMsgIndex = updatedMessages.length;

      const rawTitle = data.recommendedTitle || data.title;
      const oracleReply = {
        role: 'oracle',
        profile: data.profile || "Neural Match Confirmed",
        recommendedTitle: rawTitle,
        text: data.reasoning || data.text || "Transmission resolved across satellite archive.",
        compatibility: `${Math.floor(Math.random() * 8) + 92}.${Math.floor(Math.random() * 9)}%`
      };

      setMessages((prev) => [...prev, oracleReply]);
      if (rawTitle) {
        await fetchMoviePoster(rawTitle, newMsgIndex);
      }
    } catch (err) {
      console.warn("Oracle query notice, engaging satellite fallback:", err);
      const fallbackTitle = selectedVibe.includes('Cyber') ? "Blade Runner 2049" : "Chinatown";
      const fallbackReply = { 
        role: 'oracle', 
        profile: "Telemetry Fallback Matrix",
        recommendedTitle: fallbackTitle,
        text: "Direct cognitive uplink encountered high interference. Local archive returned high-resonance masterwork aligned with your selected era.",
        compatibility: "96.4%"
      };
      setMessages((prev) => [...prev, fallbackReply]);
      await fetchMoviePoster(fallbackTitle, updatedMessages.length);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main className="max-w-6xl mx-auto mt-4 md:mt-8 p-4 md:p-8 min-h-[88vh] flex flex-col bg-[#050508] border border-cyan-500/20 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.15)] relative overflow-hidden text-white font-sans">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER BAR HUD */}
      <div className="border-b border-cyan-500/20 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] shrink-0">
            🔮
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                PSYCHOMETRIC UPLINK // V2.6
              </span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-mono mt-1">
              AI Oracle Nexus &amp; Mood Engine
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <button
            type="button"
            onClick={randomizeParameters}
            className="px-3.5 py-2 bg-[#080d1a] hover:bg-cyan-950/40 border border-cyan-500/25 hover:border-cyan-400 text-cyan-300 font-bold rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            title="Randomize Resonance Parameters"
          >
            <span>🎲</span>
            <span>Scramble</span>
          </button>

          <Link
            href="/where-to-watch"
            className="px-4 py-2 bg-[#080d1a] hover:bg-white/5 border border-cyan-500/30 hover:border-cyan-400 text-slate-200 hover:text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>←</span> Return to Radar
          </Link>
        </div>
      </div>

      {/* COMPACT PARAMETER MATRIX */}
      <div className="bg-[#080d1a]/90 backdrop-blur-md border border-cyan-500/20 rounded-3xl p-5 mb-6 relative z-10 space-y-4 shadow-xl">
        
        {/* Row 1: Quick Presets */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
            QUICK ARCHETYPE PRESETS:
          </span>
          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 bg-[#050811] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 text-slate-300 hover:text-cyan-200 text-[10px] rounded-lg transition-colors cursor-pointer"
              >
                ⚡ {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Core Vibe Chips */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-bold">
            1. Core Psychometric Resonance
          </span>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((vibe) => {
              const isSelected = selectedVibe === vibe.label;
              return (
                <button
                  key={vibe.id}
                  type="button"
                  onClick={() => setSelectedVibe(vibe.label)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-400/80'
                      : 'bg-[#050811] text-slate-400 hover:text-white border border-cyan-500/15 hover:border-cyan-500/40'
                  }`}
                  title={vibe.desc}
                >
                  <span className="text-sm">{vibe.icon}</span>
                  <span>{vibe.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Era & Intensity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-cyan-500/15 font-mono text-xs">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-bold">
              2. Era Window
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ERAS.map((era) => {
                const isSelected = selectedEra === era.label;
                return (
                  <button
                    key={era.id}
                    type="button"
                    onClick={() => setSelectedEra(era.label)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-sm font-bold'
                        : 'bg-[#050811] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {era.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block mb-2 font-bold">
              3. Pacing &amp; Dramatic Tension
            </span>
            <div className="flex flex-wrap gap-1.5">
              {INTENSITIES.map((lvl) => {
                const isSelected = selectedIntensity === lvl.label;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setSelectedIntensity(lvl.label)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/20 border border-indigo-400 text-indigo-300 shadow-sm font-bold'
                        : 'bg-[#050811] text-slate-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {lvl.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CONVERSATION & TELEMETRY STREAM */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-2 mb-6 scrollbar-thin relative z-10 min-h-[320px]">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const posterMovie = oraclePosters[index];
          const isSaved = posterMovie 
            ? (watchlist || []).some((w) => String(w.id || w.movieId) === String(posterMovie.id)) 
            : false;

          return (
            <div key={index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-3 animate-fade-in`}>
              
              {/* Message Bubble */}
              <div className={`p-4 md:p-5 rounded-3xl max-w-[90%] md:max-w-[75%] text-xs md:text-sm leading-relaxed shadow-xl ${
                isUser 
                  ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 text-white rounded-tr-none shadow-[0_0_20px_rgba(6,182,212,0.25)] font-medium' 
                  : 'bg-[#080d1a] border border-cyan-500/25 text-slate-200 rounded-tl-none shadow-lg'
              }`}>
                {msg.profile && (
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-cyan-500/15 text-[10px] font-mono text-cyan-400 uppercase tracking-widest gap-4">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      {msg.profile}
                    </span>
                    {msg.compatibility && (
                      <span className="font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-lg shadow-sm">
                        {msg.compatibility} Match
                      </span>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-line font-light">{msg.text}</p>
              </div>

              {/* REVEAL CARD FOR FILM MATCH */}
              {!isUser && posterMovie && (
                <div className="w-full max-w-lg p-4 bg-[#080d1a] border border-cyan-500/35 rounded-3xl flex gap-4 items-center shadow-[0_15px_35px_rgba(0,0,0,0.85)] animate-zoom-in">
                  <div 
                    onClick={() => setSelectedMovieId(posterMovie.id)}
                    className="relative w-20 aspect-[2/3] rounded-2xl overflow-hidden bg-[#141420] border border-cyan-500/30 shrink-0 cursor-pointer group shadow-md"
                  >
                    {posterMovie.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w300${posterMovie.poster_path}`}
                        alt={posterMovie.title}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">
                        N/A
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5 font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold">
                        Target Acquisition
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                        ★ {posterMovie.vote_average ? Number(posterMovie.vote_average).toFixed(1) : 'N/A'}
                      </span>
                    </div>

                    <h4 
                      onClick={() => setSelectedMovieId(posterMovie.id)}
                      className="text-sm font-bold text-white hover:text-cyan-300 transition-colors truncate cursor-pointer uppercase tracking-tight"
                    >
                      {posterMovie.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans font-light">
                      {posterMovie.overview}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedMovieId(posterMovie.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        Inspect Dossier
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/where-to-watch?movieId=${posterMovie.id}`)}
                        className="px-3 py-1.5 bg-[#050811] hover:bg-white/5 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Stream Intel
                      </button>

                      <button
                        type="button"
                        onClick={() => isSaved ? removeFromWatchlist(posterMovie.id) : saveToWatchlist(posterMovie)}
                        className={`px-3 py-1.5 text-[10px] font-bold rounded-xl border transition-all cursor-pointer ${
                          isSaved 
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' 
                            : 'bg-[#050811] text-slate-300 border-white/10 hover:border-cyan-400 hover:text-cyan-300'
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
          <div className="flex items-center gap-3 py-2 text-xs font-mono text-cyan-400 animate-pulse">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Processing psychometric frequency &amp; scanning catalog...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* BOTTOM INPUT BAR */}
      <div className="relative z-10 pt-3 border-t border-cyan-500/20">
        <form onSubmit={(e) => { e.preventDefault(); handleConsultOracle(); }} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a custom plot concept, psychological mood, or click Compute..."
            className="flex-1 bg-[#080d1a] border border-cyan-500/25 focus:border-cyan-400 rounded-2xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner font-mono"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 md:px-8 py-3 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer whitespace-nowrap active:scale-95"
          >
            {isLoading ? 'Computing...' : '⚡ Compute'}
          </button>
        </form>
      </div>

      {/* DETAIL DOSSIER MODAL */}
      {selectedMovieId && (
        <MovieModal 
          movieId={selectedMovieId} 
          onClose={() => setSelectedMovieId(null)} 
        />
      )}

    </main>
  );
}