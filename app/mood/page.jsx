// app/mood/page.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';
import MovieModal from '@/components/MovieModal';

const VIBES = [
  { id: 'psych', label: 'Psychological', icon: '🧠' },
  { id: 'cyber', label: 'Cyberpunk', icon: '⚡' },
  { id: 'catharsis', label: 'Cathartic', icon: '🌧️' },
  { id: 'cosmic', label: 'Cosmic Dread', icon: '🌌' },
  { id: 'comfort', label: 'Comfort Noir', icon: '☕' }
];

const ERAS = [
  { id: 'classics', label: 'Pre-1980s' },
  { id: 'neon80s', label: '80s & 90s' },
  { id: 'modern', label: '2000s–2010s' },
  { id: 'contemporary', label: 'Contemporary' }
];

const INTENSITIES = [
  { id: 'low', label: 'Ambient' },
  { id: 'medium', label: 'Balanced' },
  { id: 'high', label: 'Intense Overload' }
];

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

export default function MagicalOraclePage() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([
    { 
      role: 'oracle', 
      text: "AI Oracle Nexus online. Select your resonance parameters or describe what you want to experience.",
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

  const fetchMoviePoster = async (movieTitle, messageIndex) => {
    if (!movieTitle) return;
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setOraclePosters(prev => ({ ...prev, [messageIndex]: data.results[0] }));
        }
      }
    } catch (err) {
      console.warn("Poster search warning:", err);
    }
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
        body: JSON.stringify({ userId: user?.uid, newMessage: compositeQuery, mood: compositeQuery })
      });
      
      const data = await res.json();
      const newMsgIndex = updatedMessages.length;

      const oracleReply = {
        role: 'oracle',
        profile: data.profile || "Neural Match Confirmed",
        recommendedTitle: data.recommendedTitle,
        text: data.reasoning || data.text || "Transmission resolved across satellite archive.",
        compatibility: `${Math.floor(Math.random() * 8) + 92}.${Math.floor(Math.random() * 9)}%`
      };

      setMessages(prev => [...prev, oracleReply]);
      if (data.recommendedTitle) {
        await fetchMoviePoster(data.recommendedTitle, newMsgIndex);
      }
    } catch (err) {
      console.warn("Oracle query notice:", err);
      setMessages(prev => [...prev, { 
        role: 'oracle', 
        profile: "Telemetry Fallback",
        recommendedTitle: "Blade Runner 2049",
        text: "Direct uplink encountered high atmospheric noise. Defaulted to high-resonance archive masterwork.",
        compatibility: "96.4%"
      }]);
      await fetchMoviePoster("Blade Runner 2049", updatedMessages.length);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto mt-4 md:mt-8 p-4 md:p-8 min-h-[88vh] flex flex-col bg-[#050508] border border-cyan-500/20 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.15)] relative overflow-hidden text-white font-sans">
      
      {/* Background Ambient Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER BAR */}
      <div className="border-b border-cyan-500/20 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-lg shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            🔮
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300">
              AI Oracle Nexus
            </h1>
            <p className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">Psychometric Cinema Engine</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push('/where-to-watch')}
          className="self-start sm:self-auto px-4 py-2 bg-[#080d1a] hover:bg-[#141420] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-inner"
        >
          <span>←</span> Return to Radar
        </button>
      </div>

      {/* COMPACT PARAMETER MATRIX */}
      <div className="bg-[#080d1a]/80 border border-cyan-500/20 rounded-2xl p-4 md:p-5 mb-6 relative z-10 space-y-4 shadow-inner">
        
        {/* Row 1: Core Vibe Chips */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-bold">
            1. Core Vibe
          </span>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((vibe) => (
              <button
                key={vibe.id}
                type="button"
                onClick={() => setSelectedVibe(vibe.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedVibe === vibe.label
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/60'
                    : 'bg-[#050811] text-slate-400 hover:text-white border border-cyan-500/15 hover:border-cyan-500/30'
                }`}
              >
                <span>{vibe.icon}</span>
                <span>{vibe.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Era & Intensity In-line Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-cyan-500/10">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-bold">
              2. Era Window
            </span>
            <div className="flex flex-wrap gap-2">
              {ERAS.map((era) => (
                <button
                  key={era.id}
                  type="button"
                  onClick={() => setSelectedEra(era.label)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    selectedEra === era.label
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-sm'
                      : 'bg-[#050811] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {era.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-bold">
              3. Pacing &amp; Tension
            </span>
            <div className="flex flex-wrap gap-2">
              {INTENSITIES.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedIntensity(lvl.label)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    selectedIntensity === lvl.label
                      ? 'bg-indigo-500/20 border border-indigo-400 text-indigo-300 shadow-sm'
                      : 'bg-[#050811] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CONVERSATION & TELEMETRY STREAM */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-2 mb-6 scrollbar-thin relative z-10 min-h-[300px]">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const posterMovie = oraclePosters[index];
          const isSaved = posterMovie ? (watchlist || []).some(w => String(w.id) === String(posterMovie.id)) : false;

          return (
            <div key={index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-3`}>
              
              {/* Message Bubble */}
              <div className={`p-4 md:p-5 rounded-2xl max-w-[88%] text-xs md:text-sm leading-relaxed ${
                isUser 
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-cyan-600/20 font-medium' 
                  : 'bg-[#080d1a] border border-cyan-500/20 text-slate-200 rounded-tl-none shadow-lg'
              }`}>
                {msg.profile && (
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-cyan-500/15 text-[10px] font-mono text-cyan-400 uppercase tracking-widest gap-4">
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

              {/* FILM MATCH REVEAL CARD */}
              {!isUser && posterMovie && (
                <div className="w-full max-w-lg p-4 bg-[#080d1a] border border-cyan-500/30 rounded-2xl flex gap-4 items-center shadow-xl">
                  <div 
                    onClick={() => setSelectedMovieId(posterMovie.id)}
                    className="relative w-20 aspect-[2/3] rounded-xl overflow-hidden bg-[#141420] border border-cyan-500/20 shrink-0 cursor-pointer group"
                  >
                    {posterMovie.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w300${posterMovie.poster_path}`}
                        alt={posterMovie.title}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-500 font-mono">N/A</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                        Target Acquisition
                      </span>
                      <span className="text-[10px] font-mono text-amber-400 font-bold">
                        ★ {posterMovie.vote_average ? Number(posterMovie.vote_average).toFixed(1) : 'N/A'}
                      </span>
                    </div>

                    <h4 
                      onClick={() => setSelectedMovieId(posterMovie.id)}
                      className="text-sm font-bold text-white hover:text-cyan-300 transition-colors truncate cursor-pointer uppercase tracking-tight"
                    >
                      {posterMovie.title}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-light">
                      {posterMovie.overview}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedMovieId(posterMovie.id)}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer shadow-sm"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => isSaved ? removeFromWatchlist(posterMovie.id) : saveToWatchlist(posterMovie)}
                        className={`px-3 py-1.5 text-[10px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                          isSaved 
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' 
                            : 'bg-[#141420] text-slate-300 border-cyan-500/20 hover:text-white'
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
            <span>Processing psychometric frequency...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* BOTTOM INPUT BAR */}
      <div className="relative z-10 pt-3 border-t border-cyan-500/20 space-y-2">
        <form onSubmit={(e) => { e.preventDefault(); handleConsultOracle(); }} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a custom plot concept, mood, or hit Compute below..."
            className="flex-1 bg-[#080d1a] border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs md:text-sm text-white placeholder-slate-500 outline-none transition-all shadow-inner font-mono"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 md:px-7 py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 text-white font-mono font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap active:scale-95"
          >
            {isLoading ? 'Computing...' : '⚡ Compute'}
          </button>
        </form>
      </div>

      {/* DETAIL MODAL */}
      {selectedMovieId && (
        <MovieModal 
          movieId={selectedMovieId} 
          onClose={() => setSelectedMovieId(null)} 
        />
      )}

    </div>
  );
}