// File: app/reviews/[movieId]/page.jsx
"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';

const RATING_STEPS = [1.0, 2.0, 3.0, 4.0, 5.0];

export default function MovieReviewsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const rawMovieId = params?.movieId;
  const movieId = useMemo(() => {
    if (Array.isArray(rawMovieId)) return rawMovieId[0];
    return rawMovieId ? String(rawMovieId) : null;
  }, [rawMovieId]);

  const [movieMeta, setMovieMeta] = useState({
    title: searchParams.get('title') || '',
    posterPath: searchParams.get('poster') || '',
    releaseYear: searchParams.get('year') || '',
    voteAverage: searchParams.get('rating') || ''
  });

  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [rating, setRating] = useState(5.0);
  const [isDeploying, setIsDeploying] = useState(false);
  const messagesEndRef = useRef(null);

  // Authentication & Route Guard
  useEffect(() => {
    if (!auth) return;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // Fetch movie details if missing from query params
  useEffect(() => {
    if (!movieId) return;
    if (movieMeta.title && movieMeta.posterPath) return;

    let isMounted = true;
    async function loadMovieDetails() {
      try {
        const res = await fetch(`/api/movie/${movieId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setMovieMeta({
              title: data.title || data.name || 'Untitled Production',
              posterPath: data.poster_path ? `https://image.tmdb.org/t/p/w200${data.poster_path}` : '',
              releaseYear: (data.release_date || data.first_air_date || '').split('-')[0] || '',
              voteAverage: data.vote_average ? Number(data.vote_average).toFixed(1) : ''
            });
          }
        }
      } catch (err) {
        console.warn("Movie detail query notice:", err);
      }
    }
    loadMovieDetails();
    return () => { isMounted = false; };
  }, [movieId, movieMeta.title, movieMeta.posterPath]);

  // Real-time Firestore Review Stream
  useEffect(() => {
    if (!movieId || !db) return;

    const q = query(
      collection(db, 'reviews'),
      where('movieId', 'in', [movieId, Number(movieId) || movieId]),
      orderBy('createdAt', 'asc')
    );

    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map(d => {
        const data = d.data();
        let timeStr = 'Just now';
        if (data.createdAt?.toDate) {
          timeStr = data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (data.createdAt?.seconds) {
          timeStr = new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return {
          id: d.id,
          ...data,
          timeStr
        };
      });
      setReviews(fetchedLogs);
    }, (error) => {
      console.warn("Snapshot notice (falling back without compound sorting):", error);
      // Fallback query if composite index is pending
      const fallbackQuery = query(
        collection(db, 'reviews'),
        where('movieId', '==', movieId)
      );
      onSnapshot(fallbackQuery, (snapshot) => {
        const fallbackLogs = snapshot.docs.map(d => ({ id: d.id, ...d.data(), timeStr: 'Logged' }));
        setReviews(fallbackLogs);
      });
    });

    return () => unsubscribeReviews();
  }, [movieId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reviews]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !movieId || isDeploying) return;
    
    setIsDeploying(true);
    try {
      const text = newMessage.trim();
      const numMovieId = Number(movieId) || movieId;
      const isClassic = Number(movieMeta.releaseYear) < 1980;

      await addDoc(collection(db, 'reviews'), {
        movieId: numMovieId,
        tmdbId: numMovieId,
        movieTitle: movieMeta.title || 'Untitled Target',
        posterPath: movieMeta.posterPath || '',
        releaseYear: Number(movieMeta.releaseYear) || new Date().getFullYear(),
        rating: Number(rating) || 5.0,
        reviewText: text,
        text: text, // backward compatibility
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Operative',
        authorName: user.displayName || user.email?.split('@')[0] || 'Operative',
        authorAvatar: user.photoURL || null,
        userPhoto: user.photoURL || null,
        isPublic: true, 
        createdAt: serverTimestamp()
      });

      // Increment user economy & critique metrics
      if (db && user.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          reviewCount: increment(1),
          xp: increment(50),
          coins: increment(10),
          ...(isClassic ? { classicCount: increment(1) } : {})
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error("Failed to broadcast to sector:", error);
      alert("Failed to submit review: " + error.message);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDelete = async (review) => {
    if (!user || user.uid !== review.userId) return;
    if (!confirm("Purge this transmission from the archives?")) return;

    try {
      await deleteDoc(doc(db, 'reviews', review.id));

      if (db && user.uid) {
        const isClassic = Number(review.releaseYear) < 1980;
        await updateDoc(doc(db, 'users', user.uid), {
          reviewCount: increment(-1),
          ...(isClassic ? { classicCount: increment(-1) } : {})
        });
      }
    } catch (error) {
      console.error("Purge command failed:", error);
    }
  };

  const renderSpoilerText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\|\|[\s\S]*?\|\|)/g);
    return parts.map((part, i) => {
      if (part.startsWith('||') && part.endsWith('||')) {
        return (
          <span 
            key={i} 
            onClick={(e) => e.currentTarget.classList.toggle('text-transparent')}
            className="bg-black/90 border border-cyan-500/40 text-transparent hover:text-cyan-200 cursor-pointer rounded px-1.5 py-0.5 transition-colors select-none font-mono text-xs inline-block"
            title="Click to decrypt spoiler"
          >
            {part.slice(2, -2)}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!user) return null;

  return (
    <main className="max-w-5xl mx-auto my-6 sm:my-10 min-h-[85vh] flex flex-col bg-[#050508] border border-cyan-500/25 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden font-sans relative">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* SECTOR COMMAND HEADER */}
      <header className="bg-[#080d1a]/90 backdrop-blur-xl p-4 sm:p-6 border-b border-cyan-500/20 flex items-center justify-between z-20 relative gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 bg-[#050811] hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl flex items-center justify-center text-cyan-300 transition-all cursor-pointer shadow-md shrink-0 font-mono"
            title="Return to Previous Sector"
          >
            ←
          </button>

          <div className="flex items-center gap-3.5 min-w-0">
            {movieMeta.posterPath ? (
              <div className="w-12 h-16 relative rounded-xl overflow-hidden shadow-md border border-cyan-500/30 bg-zinc-900 shrink-0">
                <Image 
                  src={movieMeta.posterPath} 
                  alt={movieMeta.title || 'Poster'} 
                  fill 
                  unoptimized
                  sizes="48px" 
                  className="object-cover" 
                />
              </div>
            ) : (
              <div className="w-12 h-16 rounded-xl bg-[#0c1424] border border-cyan-500/20 flex items-center justify-center text-lg shrink-0">
                🎬
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                  TARGET FREQUENCY
                </span>
                {movieMeta.voteAverage && (
                  <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    ★ {movieMeta.voteAverage}
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate font-mono uppercase mt-1">
                {movieMeta.title || `Target ID #${movieId}`}
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">
                {movieMeta.releaseYear ? `Released: ${movieMeta.releaseYear} • ` : ''}Active Discussion Sector
              </p>
            </div>
          </div>
        </div>

        <div className="text-right hidden sm:flex flex-col items-end shrink-0 font-mono">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest">UPLINK STATUS</span>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ENCRYPTED (256-BIT)
          </span>
        </div>
      </header>

      {/* CRITIQUE & DISCUSSION FEED */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#050508] scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent min-h-[380px] z-10">
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 font-mono">
            <span className="text-4xl mb-3 text-slate-600">📡</span>
            <p className="text-sm text-slate-300 font-bold uppercase tracking-wide">
              No critique transmissions logged for this target yet.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              File the opening review below to claim 50 XP and 10 Studio Credits.
            </p>
          </div>
        ) : (
          reviews.map((log) => {
            const isMe = user && log.userId === user.uid;
            const author = log.userName || log.authorName || 'Operative';
            const textContent = log.reviewText || log.text || '';
            const ratingScore = log.rating ? Number(log.rating).toFixed(1) : null;

            return (
              <div 
                key={log.id} 
                className={`flex gap-3 sm:gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-900 border border-cyan-500/30 shrink-0 mt-1 shadow-sm">
                  {log.userPhoto || log.authorAvatar ? (
                    <Image 
                      src={log.userPhoto || log.authorAvatar} 
                      alt={author} 
                      fill 
                      unoptimized 
                      sizes="36px" 
                      className="object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-mono text-cyan-300 bg-cyan-950 font-bold uppercase">
                      {author.charAt(0)}
                    </div>
                  )}
                </div>
                
                <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1 font-mono">
                    <span className="text-[11px] font-bold text-slate-300">
                      {isMe ? 'You' : `@${author}`}
                    </span>
                    {ratingScore && (
                      <span className="text-[10px] text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold">
                        ★ {ratingScore}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{log.timeStr}</span>
                  </div>
                  
                  <div className={`relative group p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg font-mono ${
                    isMe 
                      ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 text-white rounded-tr-none shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
                      : 'bg-[#080d1a] border border-cyan-500/25 text-slate-200 rounded-tl-none shadow-md'
                  }`}>
                    <p className="whitespace-pre-line font-light">
                      {renderSpoilerText(textContent)}
                    </p>
                    
                    {isMe && (
                      <button 
                        type="button"
                        onClick={() => handleDelete(log)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-1 text-xs cursor-pointer"
                        title="Purge transmission"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* DISPATCH COMPOSER DOCK */}
      <div className="p-4 bg-[#080d1a] border-t border-cyan-500/20 z-20 space-y-3 font-mono">
        <form onSubmit={submitReview} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          
          {/* Star Rating Select Capsule */}
          <div className="flex items-center gap-1.5 bg-[#050811] border border-cyan-500/30 rounded-xl px-3 py-2 shrink-0">
            <span className="text-amber-400 text-xs">★</span>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-amber-300 outline-none cursor-pointer"
            >
              {RATING_STEPS.map((s) => (
                <option key={s} value={s} className="bg-[#080d1a] text-slate-100">
                  {s.toFixed(1)} Stars
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Transmit critique (use ||spoiler|| for redacted notes)..."
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-600 outline-none transition-colors shadow-inner font-mono"
              disabled={isDeploying}
            />
          </div>

          <button 
            type="submit"
            disabled={!newMessage.trim() || isDeploying}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer shrink-0 active:scale-95 flex items-center justify-center gap-2"
          >
            {isDeploying ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Broadcasting...</span>
              </>
            ) : (
              <>
                <span>✍️</span>
                <span>Deploy (+50 XP)</span>
              </>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
          <span>TIPS: ENCROACH CRITICAL PLOT REVEALS WITH ||SPOILER TEXT||</span>
          <span className="text-cyan-400/80">REWARD: +10 COINS ON PUBLISH</span>
        </div>
      </div>

    </main>
  );
}