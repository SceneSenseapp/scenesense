// components/profile/ReviewsTab.jsx
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { 
  collection, 
  addDoc, 
  doc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/firebase';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
const RATING_STEPS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
const VERDICT_TAGS = ['Masterpiece', 'Visually Stunning', 'Mind-Bending', 'Exceptional Acting', 'Cult Classic'];

export default function ReviewsTab({ user, reviews = [], showToast }) {
  const [reviewInput, setReviewInput] = useState('');
  const [rating, setRating] = useState(5.0);
  const [isPublic, setIsPublic] = useState(true);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [reviewSearchQuery, setReviewSearchQuery] = useState('');
  const [reviewSearchResults, setReviewSearchResults] = useState([]);
  const [selectedReviewMovie, setSelectedReviewMovie] = useState(null);
  const [isSearchingMovie, setIsSearchingMovie] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const searchMovieForReview = async (e) => {
    e.preventDefault();
    if (!reviewSearchQuery.trim()) return;
    
    setIsSearchingMovie(true);
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(reviewSearchQuery)}&include_adult=false&page=1`);
      if (res.ok) {
        const data = await res.json();
        setReviewSearchResults(data.results?.slice(0, 6) || []);
      }
    } catch (err) {
      console.error("Failed to query target database:", err);
      showToast?.("Radar satellite connection failed.", "error");
    } finally {
      setIsSearchingMovie(false);
    }
  };

  const handleAppendTag = (tag) => {
    setReviewInput(prev => prev ? `${prev} #${tag}` : `#${tag} `);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewInput.trim() || !user || !selectedReviewMovie || isDeploying) {
      showToast?.("Select a target and input your critique transmission.", "error");
      return;
    }

    setIsDeploying(true);
    try {
      const releaseYear = selectedReviewMovie.release_date 
        ? Number(selectedReviewMovie.release_date.split('-')[0]) 
        : new Date().getFullYear();
      const isClassic = releaseYear < 1980;
      const posterPath = selectedReviewMovie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${selectedReviewMovie.poster_path}` 
        : '';
      const text = reviewInput.trim();

      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Operative',
        authorName: user.displayName || user.email?.split('@')[0] || 'Operative',
        userPhoto: user.photoURL || null,
        authorAvatar: user.photoURL || null,
        movieId: selectedReviewMovie.id,
        tmdbId: selectedReviewMovie.id,
        movieTitle: selectedReviewMovie.title,
        moviePoster: selectedReviewMovie.poster_path || '',
        posterPath: posterPath,
        releaseYear: releaseYear,
        rating: Number(rating) || 5.0,
        reviewText: text,
        text: text,
        containsSpoilers: Boolean(containsSpoilers),
        isPublic: Boolean(isPublic),
        createdAt: serverTimestamp()
      });

      // Synchronize economy & telemetry metrics in user record
      if (db && user.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          reviewCount: increment(1),
          xp: increment(50),
          coins: increment(10),
          ...(isClassic ? { classicCount: increment(1) } : {})
        });
      }
      
      setReviewInput('');
      setRating(5.0);
      setSelectedReviewMovie(null);
      setReviewSearchQuery('');
      setReviewSearchResults([]);
      setContainsSpoilers(false);
      
      showToast?.("Critique published to archive! (+50 XP, +10 🪙)", "success");
    } catch (error) {
      console.error("Failed to broadcast review:", error);
      showToast?.("Log deployment rejected by server.", "error");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDeleteReview = async (review) => {
    if (!window.confirm("Confirm archive purge for this critique entry?")) return;
    try {
      await deleteDoc(doc(db, 'reviews', review.id));

      if (db && user?.uid) {
        const isClassic = Number(review.releaseYear) < 1980;
        await updateDoc(doc(db, 'users', user.uid), {
          reviewCount: increment(-1),
          ...(isClassic ? { classicCount: increment(-1) } : {})
        });
      }

      showToast?.("Transmission log purged from archives.", "info");
    } catch (error) {
      console.error("Failed to delete review:", error);
      showToast?.("Purge command failed.", "error");
    }
  };

  return (
    <div className="p-6 sm:p-8 bg-[#080d1a]/95 backdrop-blur-2xl min-h-[500px] max-w-4xl mx-auto rounded-3xl border border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-8 font-sans text-slate-100">
      
      {/* HEADER DECK */}
      <div className="border-b border-cyan-500/20 pb-4 font-mono">
        <div className="flex items-center gap-2.5">
          <span className="text-base">📝</span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Tactical Movie Critiques &amp; Transmission Logs
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Broadcast your analytical breakdowns to the global studio archives. Earn 50 XP and 10 Studio Coins per verified critique.
        </p>
      </div>
      
      {/* STEP 1: TARGET SELECTOR */}
      {!selectedReviewMovie ? (
        <div className="bg-[#050811] border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Step 1: Acquire Cinematic Target
            </h3>
            <span className="text-[10px] text-slate-500">TMDB Satellite Uplink</span>
          </div>

          <form onSubmit={searchMovieForReview} className="flex gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
              <input 
                type="text"
                value={reviewSearchQuery}
                onChange={(e) => setReviewSearchQuery(e.target.value)}
                placeholder="Search database for a target film (e.g. Oppenheimer, Chinatown)..."
                className="w-full bg-[#080d1a] text-xs sm:text-sm text-slate-100 placeholder-slate-600 border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-2.5 outline-none transition-colors shadow-inner"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearchingMovie || !reviewSearchQuery.trim()} 
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap active:scale-95"
            >
              {isSearchingMovie ? 'Scanning...' : 'Scan Target'}
            </button>
          </form>
          
          {reviewSearchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 animate-fade-in">
              {reviewSearchResults.map((movie) => (
                <div 
                  key={movie.id} 
                  onClick={() => setSelectedReviewMovie(movie)} 
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[#080d1a] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 cursor-pointer transition-all group shadow-sm"
                >
                  {movie.poster_path ? (
                    <div className="relative w-11 h-16 rounded-lg overflow-hidden border border-cyan-500/30 shrink-0 bg-zinc-900">
                      <Image 
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} 
                        alt={movie.title} 
                        fill 
                        unoptimized 
                        sizes="44px" 
                        className="object-cover group-hover:scale-105 transition-transform" 
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-16 bg-[#101424] rounded-lg flex items-center justify-center text-[10px] text-slate-500 shrink-0">N/A</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors truncate">{movie.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{movie.release_date?.split('-')[0] || 'Unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: DISPATCH COMPOSER */
        <form onSubmit={submitReview} className="bg-[#050811] border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5 font-mono text-xs animate-fade-in">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-3.5 min-w-0">
              {selectedReviewMovie.poster_path ? (
                <div className="relative w-14 h-20 rounded-xl overflow-hidden shadow-lg border border-cyan-500/40 shrink-0 bg-zinc-900">
                  <Image 
                    src={`https://image.tmdb.org/t/p/w185${selectedReviewMovie.poster_path}`} 
                    alt={selectedReviewMovie.title} 
                    fill 
                    unoptimized 
                    sizes="56px" 
                    className="object-cover" 
                  />
                </div>
              ) : (
                <div className="w-14 h-20 bg-[#101424] rounded-xl flex items-center justify-center text-xs text-slate-500 shrink-0">🎬</div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest block">Target Locked</span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate uppercase tracking-tight mt-0.5">{selectedReviewMovie.title}</h3>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Year: {selectedReviewMovie.release_date?.split('-')[0] || 'N/A'}
                </span>
              </div>
            </div>

            <button 
              type="button" 
              onClick={() => { setSelectedReviewMovie(null); setReviewSearchResults([]); setReviewSearchQuery(''); }} 
              className="text-[10px] text-slate-400 uppercase tracking-wider font-bold hover:text-white border border-cyan-500/30 hover:border-cyan-400 px-3 py-1.5 rounded-xl transition-colors bg-[#080d1a] cursor-pointer shrink-0"
            >
              Change Target ✕
            </button>
          </div>

          {/* Star Rating Capsule Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Critique Rating: {rating.toFixed(1)} / 5.0
              </label>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                ★ {rating >= 4.5 ? 'Masterpiece' : rating >= 3.5 ? 'Recommended' : rating >= 2.5 ? 'Mixed' : 'Flawed'}
              </span>
            </div>

            <div className="grid grid-cols-9 gap-1">
              {RATING_STEPS.map((s) => {
                const isSelected = rating === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className={`py-1.5 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)] scale-105 z-10'
                        : 'bg-[#080d1a] border-cyan-500/20 text-slate-400 hover:text-white hover:border-cyan-400/50'
                    }`}
                  >
                    {s.toFixed(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Tags Strip */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Quick Tags (Click to Append)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VERDICT_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAppendTag(tag)}
                  className="px-2.5 py-1 bg-[#080d1a] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 rounded-lg text-[10px] transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Analytical Feedback &amp; Subtext
              </label>
              <span className="text-[10px] text-slate-500">{reviewInput.length} chars</span>
            </div>
            <textarea 
              rows={4}
              value={reviewInput}
              onChange={(e) => setReviewInput(e.target.value)}
              placeholder="Detail narrative pacing, cinematography, performances, sound design..."
              className="w-full bg-[#080d1a] text-xs sm:text-sm text-slate-100 placeholder-slate-600 border border-cyan-500/30 rounded-xl p-3.5 focus:outline-none focus:border-cyan-400 transition-colors resize-none shadow-inner font-sans leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-cyan-500/30 bg-[#080d1a] text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Public Archive Broadcast
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={containsSpoilers}
                  onChange={(e) => setContainsSpoilers(e.target.checked)}
                  className="rounded border-cyan-500/30 bg-[#080d1a] text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                  Contains Spoilers
                </span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isDeploying || !reviewInput.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              {isDeploying ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deploying...</span>
                </>
              ) : (
                'Deploy Critique (+50 XP)'
              )}
            </button>
          </div>
        </form>
      )}

      {/* REVIEWS ARCHIVE STREAM */}
      <div className="space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            Personal Transmission Archives ({reviews.length})
          </h3>
          <span className="text-[10px] text-slate-500">Live Global Synchronization</span>
        </div>

        {reviews.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs bg-[#050811] border border-cyan-500/15 rounded-2xl p-6">
            No published dispatches found in your dossier. Select a target above to log your first review.
          </div>
        ) : (
          reviews.map((review) => {
            const rawPoster = review.posterPath || review.moviePoster;
            const posterSrc = rawPoster 
              ? (rawPoster.startsWith('http') ? rawPoster : `https://image.tmdb.org/t/p/w185${rawPoster}`) 
              : null;
            const textContent = review.reviewText || review.text || '';
            const ratingScore = review.rating ? Number(review.rating).toFixed(1) : null;

            return (
              <div 
                key={review.id} 
                className="bg-[#050811] border border-cyan-500/20 hover:border-cyan-400/60 rounded-2xl p-5 flex flex-col gap-3 group relative shadow-md transition-all animate-fade-in"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-4 flex-1 min-w-0">
                    {posterSrc ? (
                      <div className="relative w-12 h-16 rounded-xl overflow-hidden border border-cyan-500/30 hidden sm:block shrink-0 bg-zinc-900 shadow-sm">
                        <Image 
                          src={posterSrc} 
                          alt={review.movieTitle || "Movie Poster"} 
                          fill 
                          unoptimized 
                          sizes="48px" 
                          className="object-cover" 
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-16 rounded-xl bg-[#080d1a] border border-cyan-500/20 hidden sm:flex items-center justify-center text-xs shrink-0">
                        🎬
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {review.movieTitle && (
                          <h4 className="text-xs font-bold text-white uppercase tracking-tight truncate">
                            {review.movieTitle}
                          </h4>
                        )}
                        {ratingScore && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                            ★ {ratingScore}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans font-light whitespace-pre-wrap">
                        &quot;{textContent}&quot;
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteReview(review)}
                    title="Purge transmission log"
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 text-xs p-1.5 rounded-lg border border-white/5 hover:border-rose-500/30 bg-rose-950/20 transition-all cursor-pointer font-mono"
                  >
                    🗑️
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-cyan-500/15 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
                      review.isPublic 
                        ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' 
                        : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                    }`}>
                      {review.isPublic ? '🌐 Public Broadcast' : '🔒 Private Cache'}
                    </span>
                    {review.containsSpoilers && (
                      <span className="text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded-md font-bold">
                        ⚠️ Spoilers
                      </span>
                    )}
                  </div>

                  <span className="text-slate-500">
                    {review.createdAt?.seconds 
                      ? new Date(review.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                      : (review.date || 'Active Entry')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}