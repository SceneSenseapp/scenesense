// app/chat/watch-party/page.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  getDocs, 
  getDoc 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { useRouter, useSearchParams } from 'next/navigation';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

export default function WatchPartyPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilm, setActiveFilm] = useState(null);

  // Selector Modes: 'tmdb' | 'watchlist' | 'custom'
  const [sourceMode, setSourceMode] = useState('tmdb');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customFormat, setCustomFormat] = useState('📼 VHS Tape');

  // Playback & Synchronization
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHost, setIsHost] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const channelId = searchParams.get('channel') || 'welcome-to-scenesense';
  const searchTimeoutRef = useRef(null);

  // Authenticate user & hydrate watchlist
  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Fetch user watchlist for quick screening selection
        if (db) {
          try {
            const list = [];
            const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (userSnap.exists() && Array.isArray(userSnap.data()?.watchlist)) {
              list.push(...userSnap.data().watchlist);
            }
            const subSnap = await getDocs(collection(db, 'users', currentUser.uid, 'watchlist'));
            subSnap.forEach((d) => list.push({ id: d.id, ...d.data() }));

            const seen = new Set();
            const unique = list.filter((item) => {
              const key = item.id || item.movieId || item.title;
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            setWatchlistItems(unique);
          } catch (e) {
            console.warn("Watchlist load notice:", e);
          }
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, [router]);

  // Real-time bidirectional room synchronization
  useEffect(() => {
    if (!db || !channelId) return;

    const roomRef = doc(db, 'topics', channelId, 'watchParty', 'current');
    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.active) {
          setActiveFilm(data);
          setIsPlaying(Boolean(data.isPlaying));
          if (typeof data.elapsedSeconds === 'number') {
            setElapsedSeconds(data.elapsedSeconds);
          }
          if (user && data.hostUid) {
            setIsHost(user.uid === data.hostUid);
          }
        } else {
          setActiveFilm(null);
          setElapsedSeconds(0);
        }
      } else {
        setActiveFilm(null);
      }
    }, (err) => {
      console.warn("Watch party telemetry sync warning:", err);
    });

    return () => unsubRoom();
  }, [channelId, user]);

  // Local clock runner when playing
  useEffect(() => {
    if (!isPlaying || !activeFilm) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, activeFilm]);

  // TMDB Real-time Search Debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchQuery.trim() || sourceMode !== 'tmdb') {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=1`
        );
        if (res.ok) {
          const data = await res.json();
          const valid = (data.results || [])
            .filter((i) => i.poster_path && (i.title || i.name))
            .slice(0, 8);
          setSearchResults(valid);
        }
      } catch (err) {
        console.warn("TMDB search error:", err);
      }
    }, 250);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, sourceMode]);

  const handleLaunchRoom = async (filmObj) => {
    if (!user || !db) return;

    const title = filmObj.title || filmObj.name || 'Untitled Feature';
    const rawPoster = filmObj.poster_path || filmObj.poster || '';
    const poster = rawPoster.startsWith('http')
      ? rawPoster
      : rawPoster
        ? `https://image.tmdb.org/t/p/w500${rawPoster}`
        : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400&auto=format&fit=crop';

    const payload = {
      active: true,
      filmId: filmObj.id || `custom-${Date.now()}`,
      title,
      poster_path: poster,
      overview: filmObj.overview || 'Live tactical theater screening session.',
      hostName: user.displayName || user.email?.split('@')[0] || 'Operative',
      hostUid: user.uid,
      isPlaying: true,
      elapsedSeconds: 0,
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'topics', channelId, 'watchParty', 'current'), payload, { merge: true });
      setActiveFilm(payload);
      setElapsedSeconds(0);
      setIsHost(true);
    } catch (e) {
      console.warn("Failed to deploy watch party telemetry:", e);
    }
  };

  const handleTogglePlayback = async () => {
    if (!activeFilm || !db) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    try {
      const roomRef = doc(db, 'topics', channelId, 'watchParty', 'current');
      await updateDoc(roomRef, {
        isPlaying: nextPlaying,
        elapsedSeconds,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Playback update error:", e);
    }
  };

  const handleEndScreening = async () => {
    if (!confirm("Are you sure you want to end this live screening session?")) return;
    if (!db) return;

    try {
      const roomRef = doc(db, 'topics', channelId, 'watchParty', 'current');
      await setDoc(roomRef, { active: false, updatedAt: serverTimestamp() }, { merge: true });
      setActiveFilm(null);
      setElapsedSeconds(0);
    } catch (e) {
      console.warn("Failed to end screening:", e);
    }
  };

  const formatTimer = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading || !user) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-[#050508] text-cyan-400 font-mono text-xs uppercase tracking-widest">
        <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3" />
        Synchronizing Watch Party Frequency...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans overflow-hidden">
      
      {/* COMMAND HEADER DECK */}
      <header className="h-16 px-4 md:px-6 bg-[#080d1a] border-b border-cyan-500/20 flex items-center justify-between shrink-0 relative z-30">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => router.push('/chat')}
            className="w-9 h-9 rounded-xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
            title="Return to Community Chat"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🍿</span>
              <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono">
                Watch Party Studio Theater
              </h1>
              <span className="text-[10px] bg-cyan-950 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded font-mono">
                #{channelId}
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              Live WebRTC Video Sync • Synchronized Screenings &amp; Audio Transmissions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeFilm && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-rose-950/70 border border-rose-500/50 rounded-xl text-rose-300 font-mono text-[10px] font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Broadcasting: {activeFilm.title}
            </span>
          )}

          <button
            type="button"
            onClick={() => router.push('/chat')}
            className="px-3.5 py-1.5 bg-[#050811] hover:bg-white/5 border border-cyan-500/30 text-slate-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
          >
            Chat Stream ↵
          </button>
        </div>
      </header>

      {/* THEATER VIEWPORT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {activeFilm ? (
          <div className="flex-1 flex flex-col h-full bg-black relative">
            
            {/* FLOATING HUD CONTROL BAR */}
            <div className="absolute top-4 left-4 right-4 z-20 bg-[#080d1a]/90 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-3 flex items-center justify-between gap-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-3 min-w-0">
                <span className="px-2.5 py-1 bg-rose-600 text-white font-mono font-black text-[9px] uppercase tracking-widest rounded-lg animate-pulse shrink-0">
                  ● LIVE THEATER
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate font-mono uppercase">
                    {activeFilm.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-300">
                    <span>Host: {activeFilm.hostName}</span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">⏱ {formatTimer(elapsedSeconds)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                <button
                  type="button"
                  onClick={handleTogglePlayback}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer ${
                    isPlaying 
                      ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                      : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  }`}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>

                {(isHost || !activeFilm.hostUid) && (
                  <button
                    type="button"
                    onClick={handleEndScreening}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer"
                  >
                    End Session
                  </button>
                )}
              </div>
            </div>

            {/* EMBEDDED JITSI WEBRTC CONTAINER */}
            <div className="flex-1 w-full h-full relative">
              <iframe
                src={`https://meet.jit.si/scenesense-${channelId}-${activeFilm.filmId}#config.startWithAudioMuted=true&config.startWithVideoMuted=false&userInfo.displayName=${encodeURIComponent(user.displayName || user.email?.split('@')[0] || 'Operative')}`}
                allow="camera; microphone; fullscreen; display-capture; clipboard-read; clipboard-write"
                className="w-full h-full border-0"
                title="SceneSense Watch Party Video Grid"
              />
            </div>

          </div>
        ) : (
          /* NO ACTIVE FILM: STAGE INITIALIZER */
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-3xl mb-4 shadow-[0_0_35px_rgba(6,182,212,0.3)]">
              🎬
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-mono uppercase tracking-wider">
              Initialize Screening Room
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-6 max-w-md">
              Queue a movie from your secured watchlist radar, search TMDB, or calibrate custom physical media formats (VHS, LaserDisc, Plex) to broadcast to #{channelId}.
            </p>

            <div className="w-full bg-[#080d1a] border-2 border-cyan-500/35 p-6 rounded-3xl text-left space-y-5 shadow-2xl">
              
              {/* SOURCE SELECTOR TABS */}
              <div className="flex bg-[#050811] p-1 rounded-2xl border border-cyan-500/20 gap-1 text-xs font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setSourceMode('tmdb')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                    sourceMode === 'tmdb' 
                      ? 'bg-cyan-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🔍 TMDB Search
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('watchlist')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                    sourceMode === 'watchlist' 
                      ? 'bg-cyan-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📋 Watchlist ({watchlistItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('custom')}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                    sourceMode === 'custom' 
                      ? 'bg-cyan-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📼 Physical Media
                </button>
              </div>

              {/* TAB 1: TMDB SEARCH */}
              {sourceMode === 'tmdb' && (
                <div className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type movie or TV series title..."
                      className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none transition-colors"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {searchResults.map((film) => {
                        const title = film.title || film.name;
                        const poster = film.poster_path ? `https://image.tmdb.org/t/p/w200${film.poster_path}` : '';
                        return (
                          <div
                            key={film.id}
                            onClick={() => handleLaunchRoom(film)}
                            className="p-2.5 bg-[#050811] hover:bg-cyan-950/50 border border-cyan-500/20 hover:border-cyan-400 rounded-xl cursor-pointer flex items-center gap-3 transition-all group"
                          >
                            {poster ? (
                              <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-cyan-500/30">
                                <Image src={poster} alt={title} fill unoptimized sizes="40px" className="object-cover group-hover:scale-105 transition-transform" />
                              </div>
                            ) : (
                              <div className="w-10 h-14 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-xs shrink-0">🎬</div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">{title}</h4>
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                {(film.release_date || film.first_air_date || '').split('-')[0] || 'Feature'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PERSONAL WATCHLIST */}
              {sourceMode === 'watchlist' && (
                <div className="space-y-3">
                  {watchlistItems.length === 0 ? (
                    <p className="text-xs font-mono text-slate-500 text-center py-8">
                      Your saved watchlist radar is empty. Save movies from Where to Watch first.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {watchlistItems.map((item) => {
                        const title = item.title || item.name || 'Untitled';
                        const rawPoster = item.poster_path || item.poster;
                        const poster = rawPoster?.startsWith('http') ? rawPoster : (rawPoster ? `https://image.tmdb.org/t/p/w200${rawPoster}` : '');
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleLaunchRoom(item)}
                            className="p-2.5 bg-[#050811] hover:bg-cyan-950/50 border border-cyan-500/20 hover:border-cyan-400 rounded-xl cursor-pointer flex items-center gap-3 transition-all group"
                          >
                            {poster ? (
                              <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-cyan-500/30">
                                <Image src={poster} alt={title} fill unoptimized sizes="40px" className="object-cover group-hover:scale-105 transition-transform" />
                              </div>
                            ) : (
                              <div className="w-10 h-14 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-xs shrink-0">🎬</div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">{title}</h4>
                              <span className="text-[10px] font-mono text-amber-400 font-bold block mt-0.5">
                                ★ {item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: PHYSICAL MEDIA */}
              {sourceMode === 'custom' && (
                <div className="space-y-3.5 font-mono text-xs">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">
                      Physical Format Title
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Blade Runner: The Final Cut [VHS]"
                      className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 font-bold">
                      Format Hardware
                    </label>
                    <select
                      value={customFormat}
                      onChange={(e) => setCustomFormat(e.target.value)}
                      className="w-full bg-[#050811] border border-cyan-500/30 text-cyan-300 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none cursor-pointer"
                    >
                      <option value="📼 VHS Tape">📼 VHS Tape</option>
                      <option value="💿 Blu-ray / DVD">💿 Blu-ray / DVD</option>
                      <option value="⚡ LaserDisc">⚡ LaserDisc</option>
                      <option value="🖥️ Plex Server">🖥️ Plex Server</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={!customTitle.trim()}
                    onClick={() => handleLaunchRoom({
                      id: `custom-${Date.now()}`,
                      title: `${customTitle.trim()} [${customFormat}]`,
                      poster_path: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400&auto=format&fit=crop',
                      overview: `Custom physical media broadcast using ${customFormat}.`
                    })}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95"
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