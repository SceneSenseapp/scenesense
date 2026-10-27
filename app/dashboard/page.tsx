// File: app/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { calculateRankAndSector, LIFETIME_ACCOLADES } from '@/app/dashboard/data/objectives';
import MovieModal from '@/components/MovieModal';

interface Movie {
  id: string;
  movieId?: string | number;
  title?: string;
  name?: string;
  poster_path?: string;
  overview?: string;
  vote_average?: number;
  release_date?: string;
  savedAt?: Timestamp | Date | string | null;
}

interface UserProfileData {
  coins?: number;
  xp?: number;
  reviewCount?: number;
  classicCount?: number;
  equippedTitle?: string | null;
  equippedFrame?: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData>({
    coins: 0,
    xp: 0,
    reviewCount: 0,
    classicCount: 0,
    equippedTitle: null,
    equippedFrame: null,
  });

  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedMovieId, setSelectedMovieId] = useState<string | number | null>(null);

  // Authenticate & listen to user document in real time
  useEffect(() => {
    if (!auth) return;

    let unsubUserDoc = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      unsubUserDoc();
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        if (db) {
          const userRef = doc(db, 'users', currentUser.uid);
          unsubUserDoc = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setUserProfile({
                coins: data.coins ?? 0,
                xp: data.xp ?? 0,
                reviewCount: data.reviewCount ?? 0,
                classicCount: data.classicCount ?? 0,
                equippedTitle: data.equippedTitle ?? null,
                equippedFrame: data.equippedFrame ?? null,
              });
            }
          });
        }
      }
    });

    return () => {
      unsubAuth();
      unsubUserDoc();
    };
  }, [router]);

  // Real-time synchronization of the user's secured watchlist
  useEffect(() => {
    if (!user || !db) return;

    const q = query(
      collection(db, 'users', user.uid, 'watchlist'),
      orderBy('savedAt', 'desc')
    );

    const unsubWatchlist = onSnapshot(q, (snapshot) => {
      const movies = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as Movie));
      setWatchlist(movies);
      setIsLoading(false);
    }, (error) => {
      console.warn("Watchlist snapshot warning:", error);
      setIsLoading(false);
    });

    return () => unsubWatchlist();
  }, [user]);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push('/');
  };

  // Compute Rank telemetry using the exponential curve
  const rankStats = useMemo(() => {
    return calculateRankAndSector(userProfile.xp || 0);
  }, [userProfile.xp]);

  // Filter watchlist titles by query
  const filteredWatchlist = useMemo(() => {
    if (!searchQuery.trim()) return watchlist;
    const term = searchQuery.toLowerCase().trim();
    return watchlist.filter((m) =>
      (m.title || m.name || '').toLowerCase().includes(term)
    );
  }, [watchlist, searchQuery]);

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans p-4 sm:p-8 relative overflow-hidden">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* TOP COMMAND HUD HEADER */}
        <header className="bg-[#080d1a]/80 backdrop-blur-xl border border-cyan-500/25 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-11 h-11 rounded-2xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-md group shrink-0"
              title="Return to Main Uplink"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform font-mono">←</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                  OPERATIVE STATION // SECTOR 01
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-mono mt-1">
                Operative Command Hub
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Active Terminal: <span className="text-slate-200 font-semibold">{user.email}</span>
                {userProfile.equippedTitle && (
                  <span className="text-cyan-300 ml-2 font-bold font-mono">[{userProfile.equippedTitle}]</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end font-mono text-xs">
            <Link
              href="/where-to-watch"
              className="px-4 py-2.5 bg-[#050811] hover:bg-cyan-950/40 border border-cyan-500/25 hover:border-cyan-400 text-cyan-300 rounded-2xl font-bold transition-all shadow-sm"
            >
              Radar Scanner ↗
            </Link>
            <Link
              href="/armoury"
              className="px-4 py-2.5 bg-[#050811] hover:bg-amber-950/40 border border-amber-500/30 hover:border-amber-400 text-amber-300 rounded-2xl font-bold transition-all shadow-sm"
            >
              The Armoury 🪙
            </Link>
            <button 
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2.5 bg-[#050811] hover:bg-rose-950/50 border border-white/10 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 rounded-2xl font-bold transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* TELEMETRY HUD & RANKING RADIAL BAR */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 font-mono">
          
          {/* Level & Rank Card */}
          <div className="md:col-span-6 lg:col-span-5 bg-[#080d1a] border border-cyan-500/25 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-slate-500 block">CURRENT RANK</span>
                <h3 className="text-xl font-black text-white uppercase tracking-wider mt-0.5">
                  {rankStats.sector}
                </h3>
              </div>
              <span className="text-2xl font-black text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-3.5 py-1 rounded-2xl shadow-inner">
                LVL {rankStats.level}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 uppercase">EXPERIENCE PROGRESS</span>
                <span className="text-cyan-300 font-bold">
                  {rankStats.currentExp} / {rankStats.nextLevelExp} XP
                </span>
              </div>
              <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-700"
                  style={{ width: `${rankStats.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-cyan-500/15 flex items-center justify-between text-[11px] text-slate-400">
              <span>Next Threshold: Level {Math.min(50, rankStats.level + 1)}</span>
              <span className="text-cyan-400 font-bold">{rankStats.progressPercent}% Complete</span>
            </div>
          </div>

          {/* Studio Stats Summary */}
          <div className="md:col-span-6 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block">STUDIO COINS</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-amber-400">{userProfile.coins}</span>
                <span className="text-xs text-amber-500/70">🪙</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block">Commissary Credits</span>
            </div>

            <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block">CRITIQUES LOGGED</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-cyan-300">{userProfile.reviewCount}</span>
                <span className="text-xs text-cyan-500/70">DISPATCHES</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block">Published Reviews</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest block">HISTORIC CLASSICS</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-black text-indigo-300">{userProfile.classicCount}</span>
                <span className="text-xs text-indigo-400/70">(&lt;1980)</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 block">Archivist Index</span>
            </div>

          </div>

        </div>

        {/* SECURED TARGETS (WATCHLIST SECTION) */}
        <div className="space-y-5">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-cyan-500/20">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-tight font-mono">
                  Secured Targets (Watchlist Radar)
                </h2>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  {watchlist.length} TITLES
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Surveillance deck containing queued and analyzed cinematic releases
              </p>
            </div>

            <div className="relative w-full sm:w-72 font-mono text-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Filter saved targets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080d1a] border border-cyan-500/25 focus:border-cyan-400 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 outline-none transition-colors"
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3 font-mono">
              <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-xs text-cyan-400 uppercase tracking-widest">
                Decrypting radar database payload...
              </span>
            </div>
          ) : filteredWatchlist.length === 0 ? (
            <div className="p-12 border border-cyan-500/20 rounded-3xl bg-[#080d1a] text-center space-y-4">
              <span className="text-4xl block">📡</span>
              <p className="text-slate-300 font-mono text-sm">
                No targets secured yet matching your query.
              </p>
              <Link 
                href="/where-to-watch"
                className="inline-block px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                Scan Global Radar
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
              {filteredWatchlist.map((movie) => {
                const title = movie.title || movie.name || 'Untitled Feature';
                const posterUrl = movie.poster_path
                  ? (movie.poster_path.startsWith('http')
                    ? movie.poster_path
                    : `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
                  : null;

                return (
                  <div 
                    key={movie.id} 
                    onClick={() => setSelectedMovieId(movie.movieId || movie.id)}
                    className="bg-[#080d1a] rounded-2xl overflow-hidden border border-cyan-500/20 hover:border-cyan-400/80 transition-all duration-300 group shadow-lg flex flex-col justify-between hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="relative aspect-[2/3] w-full bg-[#111624] overflow-hidden">
                      {posterUrl ? (
                        <Image 
                          src={posterUrl} 
                          alt={title} 
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-2 font-mono text-xs">
                          <span>🎬</span>
                          <span className="mt-1 line-clamp-2 text-[10px]">{title}</span>
                        </div>
                      )}

                      {movie.vote_average ? (
                        <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30 shadow-md">
                          ★ {Number(movie.vote_average).toFixed(1)}
                        </div>
                      ) : null}
                    </div>

                    <div className="p-3 border-t border-cyan-500/15 flex flex-col justify-between flex-1">
                      <h3 
                        className="font-bold text-xs truncate text-slate-200 group-hover:text-cyan-300 transition-colors uppercase font-mono tracking-tight"
                        title={title}
                      >
                        {title}
                      </h3>
                      
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2">
                        <span>{(movie.release_date || '').split('-')[0] || 'Feature'}</span>
                        <span className="text-cyan-400 font-bold group-hover:translate-x-0.5 transition-transform">
                          Dossier →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* DETAIL DOSSIER MODAL */}
      {selectedMovieId && (
        <MovieModal 
          movieId={selectedMovieId} 
          onClose={() => setSelectedMovieId(null)} 
        />
      )}

    </div>
  );
}