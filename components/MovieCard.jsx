// components/MovieCard.jsx
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { playTerminalClick, playConfirmTone, playDeploySweep } from '@/components/utils/sfx';

export default function MovieCard({ 
  movie, 
  watchlist = [], 
  onSaveToWatchlist, 
  removeFromWatchlist, 
  onToggleWatched, 
  onOpenReview,
  onSelectMovie 
}) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!movie) return null;

  const targetId = movie.id || movie.movieId;
  const displayTitle = movie.title || movie.name || "Untitled Target";
  const releaseYear = (movie.release_date || movie.first_air_date || '').split('-')[0] || 'N/A';
  const rating = movie.vote_average ? Number(movie.vote_average).toFixed(1) : null;

  const isSaved = (watchlist || []).some(
    item => String(item.id || item.movieId) === String(targetId)
  );

  const matchedWatchlistEntry = (watchlist || []).find(
    item => String(item.id || item.movieId) === String(targetId)
  );

  const isWatched = Boolean(matchedWatchlistEntry?.watched);

  const posterUrl = movie.poster_path && !imageError
    ? (movie.poster_path.startsWith('http') 
        ? movie.poster_path 
        : `https://image.tmdb.org/t/p/w500${movie.poster_path.startsWith('/') ? '' : '/'}${movie.poster_path}`)
    : null;

  const handleCardClick = () => {
    playTerminalClick();
    if (onSelectMovie) {
      onSelectMovie(movie);
    }
  };

  const handleSave = (e) => {
    e.stopPropagation();
    playConfirmTone();
    if (onSaveToWatchlist) {
      onSaveToWatchlist(movie);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    playTerminalClick();
    if (removeFromWatchlist) {
      removeFromWatchlist(targetId);
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    playTerminalClick();
    if (onToggleWatched) {
      onToggleWatched(targetId, !isWatched);
    }
  };

  const handleAiReview = async (e) => {
    e.stopPropagation();
    setIsAiLoading(true);
    playDeploySweep();

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: displayTitle,
          movieOverview: movie.overview || "No overview available.",
          genres: Array.isArray(movie.genre_ids) ? movie.genre_ids.join(", ") : "Cinematic"
        })
      });

      const data = await res.json();
      if (data.review && onOpenReview) {
        onOpenReview({
          ...movie,
          title: displayTitle,
          userRating: data.rating || 4.5,
          userReview: data.review
        });
      }
    } catch (err) {
      console.error("AI Review telemetry failed:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-[#080d1a] border rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-xl relative cursor-pointer font-mono ${
        isWatched
          ? 'border-emerald-500/40 bg-[#06100c]/70 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
          : 'border-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_10px_30px_rgba(6,182,212,0.25)] hover:-translate-y-1'
      }`}
    >
      {/* Poster Artwork Deck */}
      <div className="relative aspect-[2/3] w-full bg-[#050811] overflow-hidden">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={displayTitle}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
            onError={() => setImageError(true)}
            className={`object-cover transition-all duration-500 ${
              isWatched ? 'grayscale-30 opacity-80' : 'group-hover:scale-105'
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-xs text-slate-500 p-4 text-center font-mono">
            <span className="text-2xl mb-1">🎬</span>
            <span className="line-clamp-2">{displayTitle}</span>
          </div>
        )}

        {/* Rating Capsule */}
        <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-400 border border-amber-500/30 shadow-md">
          ★ {rating || 'N/A'}
        </div>

        {/* Watched Marker Pill */}
        {isWatched && (
          <div className="absolute top-2 left-2 bg-emerald-950/85 backdrop-blur-md px-2 py-0.5 rounded-lg text-[9px] font-bold text-emerald-300 border border-emerald-500/40 shadow-md">
            ✓ Watched
          </div>
        )}
      </div>

      {/* Meta Information & Command Controls */}
      <div className="p-3.5 flex flex-col gap-3 flex-grow justify-between">
        <div>
          <h3 
            className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors line-clamp-1 uppercase tracking-tight"
            title={displayTitle}
          >
            {displayTitle}
          </h3>
          <p className="text-slate-400 text-[10px] mt-0.5">{releaseYear}</p>
        </div>

        <div className="flex flex-col gap-2 pt-1 border-t border-cyan-500/10">
          {isSaved ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggle}
                className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 truncate ${
                  isWatched
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-[#050811] text-slate-300 border-white/10 hover:border-cyan-400 hover:text-cyan-300'
                }`}
              >
                <span>{isWatched ? '✓ Watched' : '○ Mark Watched'}</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                className="w-8 h-8 rounded-xl bg-[#050811] hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 text-xs flex items-center justify-center transition-all cursor-pointer"
                title="Remove from Watchlist"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-1.5 px-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)] cursor-pointer active:scale-95 text-center"
            >
              + Watchlist Radar
            </button>
          )}

          {/* AI Auto-Review Generator */}
          <button
            type="button"
            onClick={handleAiReview}
            disabled={isAiLoading}
            className="w-full py-1.5 px-2 bg-[#050811] hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-sm active:scale-95"
          >
            {isAiLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
                <span>Analyzing Script...</span>
              </>
            ) : (
              <span>✨ AI Auto-Review</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}