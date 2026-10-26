// app/chat/watch-party/page.jsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

export default function WatchPartyPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilm, setActiveFilm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [sourceMode, setSourceMode] = useState('tmdb'); // 'tmdb' | 'custom'
  const [customTitle, setCustomTitle] = useState('');
  const [customFormat, setCustomFormat] = useState('📼 VHS Tape');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = searchParams.get('channel') || 'welcome-to-scenesense';

  // Auth & Room State Hydration
  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Load room state from Firestore
        const roomRef = doc(db, 'topics', channelId, 'watchParty', 'current');
        const snap = await getDoc(roomRef);
        if (snap.exists() && snap.data().active) {
          setActiveFilm(snap.data());
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, [channelId, router]);

  // Live Timer Tick
  useEffect(() => {
    if (!isPlaying || !activeFilm) return;
    const timer = setInterval(() => setElapsedSeconds(p => p + 1), 1000);
    return () => clearInterval(timer);
  }, [isPlaying, activeFilm]);

  // TMDB Search
  useEffect(() => {
    if (!searchQuery.trim() || sourceMode !== 'tmdb') {
      const timer = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=1`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults((data.results || []).filter(i => i.poster_path && (i.title || i.name)).slice(0, 8));
        }
      } catch (err) {
        console.warn("TMDB search error:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, sourceMode]);

  const handleLaunchRoom = async (filmObj) => {
    const title = filmObj.title || filmObj.name;
    const poster = filmObj.poster_path?.startsWith('http') ? filmObj.poster_path : `https://image.tmdb.org/t/p/w500${filmObj.poster_path}`;
    
    const payload = {
      active: true,
      filmId: filmObj.id || `custom-${encodeURIComponent(title)}`,
      title,
      poster_path: poster,
      overview: filmObj.overview || 'Custom physical media screening room.',
      hostName: user.displayName || 'Operative',
      isPlaying: true,
      startedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'topics', channelId, 'watchParty', 'current'), payload, { merge: true });
    } catch (e) {
      console.warn("Firestore sync warning:", e);
    }

    setActiveFilm(payload);
    setElapsedSeconds(0);
  };

  const formatTimer = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#050508] text-cyan-400 font-mono text-xs uppercase tracking-widest">
        <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3"></span>
        Loading Screening Room...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans overflow-hidden">
      
      {/* TOP DECK HEADER */}
      <header className="h-16 px-6 bg-[#080d1a] border-b border-cyan-500/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🍿</span>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
              Watch Party Studio Theater
            </h1>
            <p className="text-[10px] font-mono text-cyan-400">Channel Frequency: #{channelId}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/chat')}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white cursor-pointer transition-all"
        >
          ← Return to Chat
        </button>
      </header>

      {/* MAIN SCREENING CONTENT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {activeFilm ? (
          <>
            {/* LEFT: NATIVE JITSI VIDEO GRID & SYNC CONTROLS */}
            <div className="flex-1 flex flex-col h-full bg-black relative border-r border-cyan-500/20">
              
              {/* Floating Status Bar */}
              <div className="absolute top-4 left-4 right-4 z-20 bg-black/70 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white font-mono font-black text-[9px] uppercase tracking-widest rounded animate-pulse">
                    ● LIVE
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-black text-white truncate">{activeFilm.title}</h3>
                    <p className="text-[10px] font-mono text-cyan-300">Sync Timer: {formatTimer(elapsedSeconds)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black text-[10px] uppercase rounded-xl cursor-pointer"
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilm(null)}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-500/40 font-mono text-[10px] uppercase rounded-xl cursor-pointer"
                  >
                    End Screening
                  </button>
                </div>
              </div>

              {/* Embedded Jitsi WebRTC Grid */}
              <div className="flex-1 w-full h-full">
                <iframe
                  src={`https://meet.jit.si/scenesense-${channelId}-${activeFilm.filmId}#config.startWithAudioMuted=true&config.startWithVideoMuted=false&userInfo.displayName=${encodeURIComponent(user.displayName || 'Operative')}`}
                  allow="camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write"
                  className="w-full h-full border-0"
                  title="SceneSense Watch Party Theater"
                ></iframe>
              </div>

            </div>
          </>
        ) : (
          /* NO ACTIVE FILM: SETUP SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto my-auto">
            <div className="w-16 h-16 rounded-3xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center text-3xl mb-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              🎬
            </div>
            <h2 className="text-lg font-black text-white font-mono uppercase tracking-wider">Initialize Screening Room</h2>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Select a film from TMDB or queue up physical media (VHS, LaserDisc, Plex) to start broadcasting your live camera &amp; mic feed to the channel.
            </p>

            <div className="w-full bg-[#080d1a] border-2 border-cyan-500/40 p-5 rounded-3xl text-left space-y-4 shadow-2xl">
              
              <div className="flex bg-[#050811] p-1 rounded-xl border border-white/10 gap-1 text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setSourceMode('tmdb')}
                  className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${sourceMode === 'tmdb' ? 'bg-cyan-500 text-black' : 'text-slate-400'}`}
                >
                  TMDB Search
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('custom')}
                  className={`flex-1 py-2 rounded-lg transition-colors cursor-pointer ${sourceMode === 'custom' ? 'bg-cyan-500 text-black' : 'text-slate-400'}`}
                >
                  📼 Physical Media
                </button>
              </div>

              {sourceMode === 'tmdb' ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movie title..."
                    className="w-full bg-[#050811] border border-cyan-500/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {searchResults.map(film => (
                      <div
                        key={film.id}
                        onClick={() => handleLaunchRoom(film)}
                        className="p-2 bg-[#050811] hover:bg-cyan-950/50 border border-white/10 hover:border-cyan-400 rounded-xl cursor-pointer flex items-center gap-2.5 transition-all"
                      >
                        {film.poster_path && (
                          <div className="relative w-10 h-14 rounded overflow-hidden shrink-0">
                            <Image src={`https://image.tmdb.org/t/p/w200${film.poster_path}`} alt={film.title || film.name} fill unoptimized sizes="40px" className="object-cover" />
                          </div>
                        )}
                        <span className="text-xs font-bold text-white truncate">{film.title || film.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Custom Title (e.g., Street Fighter - VHS Copy)"
                    className="w-full bg-black border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                  />
                  <select
                    value={customFormat}
                    onChange={(e) => setCustomFormat(e.target.value)}
                    className="w-full bg-black border border-white/20 rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono cursor-pointer"
                  >
                    <option value="📼 VHS Tape">📼 VHS Tape</option>
                    <option value="💿 Blu-ray / DVD">💿 Blu-ray / DVD</option>
                    <option value="⚡ LaserDisc">⚡ LaserDisc</option>
                    <option value="🖥️ Plex Server">🖥️ Plex Server</option>
                  </select>
                  <button
                    type="button"
                    disabled={!customTitle.trim()}
                    onClick={() => handleLaunchRoom({
                      id: `custom-${Date.now()}`,
                      title: `${customTitle.trim()} [${customFormat}]`,
                      poster_path: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400&auto=format&fit=crop',
                      overview: `Custom physical media screening via ${customFormat}.`
                    })}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-400 disabled:opacity-40 text-black font-mono font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer shadow"
                  >
                    🚀 Launch Custom Screening Room
                  </button>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

    </div>
  );
}