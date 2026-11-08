// components/MovieCard.jsx
"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function MovieCard({ 
  movie, 
  watchlist, 
  onSaveToWatchlist, 
  removeFromWatchlist, 
  onToggleWatched, 
  onOpenReview,
  onOpenModal 
}) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const movieId = movie.id || movie.tmdbId;
  const mediaType = movie.media_type || 'movie';
  const isSaved = watchlist?.some(item => String(item.id) === String(movieId));
  const matchedWatchlistEntry = watchlist?.find(item => String(item.id) === String(movieId));

  const displayTitle = movie.title || movie.name || "Untitled Film";
  const releaseYear = (movie.release_date || movie.first_air_date || '').split('-')[0] || 'Unknown';
  const voteAverage = movie.vote_average ? Number(movie.vote_average).toFixed(1) : null;
  const matchScore = movie.matchScore || movie.matchPercentage || null;

  const handleAiReview = async (e) => {
    e.stopPropagation();
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: displayTitle,
          movieOverview: movie.overview || "No overview available.",
          genres: movie.genre_ids ? movie.genre_ids.join(", ") : "Cinematic"
        })
      });
      const data = await res.json();
      if (data.review && onOpenReview) {
        onOpenReview({
          ...movie,
          id: movieId,
          title: displayTitle,
          userRating: data.rating || 8,
          userReview: data.review
        });
      } else {
        toast.success("AI Critique drafted!", { icon: '✨' });
      }
    } catch (err) {
      console.error("AI Review generation failed:", err);
      toast.error("Failed to generate AI review.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCardClick = () => {
    if (onOpenModal) {
      onOpenModal(movieId, mediaType);
    }
  };

  return (
    <div 
      className="bg-[#0b0f19] border border-cyan-500/20 hover:border-cyan-400/80 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_40px_rgba(6,182,212,0.2)] relative hover:-translate-y-1 font-sans"
    >
      {/* Poster Image Container */}
      <div 
        onClick={handleCardClick}
        className="relative aspect-[2/3] w-full bg-[#121624] overflow-hidden cursor-pointer"
      >
        {movie.poster_path && !imageError ? (
          <Image
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={displayTitle}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 250px"
            onError={() => setImageError(true)}
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-gradient-to-b from-[#141829] to-[#0d101d] text-gray-400">
            <span className="text-3xl mb-2">🎬</span>
            <span className="text-xs font-bold text-gray-300 line-clamp-3">{displayTitle}</span>
            <span className="text-[10px] font-mono text-cyan-400 mt-1">{releaseYear}</span>
          </div>
        )}

        {/* Ambient Gradient Overlay on Poster Bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b0f19] to-transparent pointer-events-none"></div>

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
          {/* Match Percentage Badge */}
          {matchScore ? (
            <span className="bg-emerald-950/85 backdrop-blur-md border border-emerald-400/60 text-emerald-300 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg shadow-lg">
              {matchScore}% MATCH
            </span>
          ) : (
            <span></span>
          )}

          {/* Rating Badge */}
          {voteAverage && (
            <div className="bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/40 shadow-lg font-mono flex items-center gap-1">
              <span>★</span>
              <span>{voteAverage}</span>
            </div>
          )}
        </div>

        {/* Category Tag Pill if saved */}
        {matchedWatchlistEntry?.categoryTag && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-cyan-500/40 text-[9px] font-mono text-cyan-300 font-bold truncate max-w-[140px] block">
              📁 {matchedWatchlistEntry.categoryTag}
            </span>
          </div>
        )}
      </div>

      {/* Card Info & Actions */}
      <div className="p-3.5 sm:p-4 flex flex-col gap-3 flex-grow justify-between">
        <div>
          <Link 
            href={`/movie/${movieId}?type=${mediaType}`}
            className="font-black text-sm text-white hover:text-cyan-300 transition-colors line-clamp-1 mb-1 block"
            title={displayTitle}
          >
            {displayTitle}
          </Link>
          <div className="flex items-center gap-2 text-gray-400 text-xs font-mono">
            <span>{releaseYear}</span>
            <span>•</span>
            <span className="uppercase text-[10px] text-cyan-400 font-bold">{mediaType}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
          {isSaved ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onToggleWatched?.(movieId, !matchedWatchlistEntry?.watched)}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                  matchedWatchlistEntry?.watched 
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                    : 'bg-[#151928] text-gray-300 border-white/10 hover:border-cyan-500/40 hover:text-white'
                }`}
              >
                {matchedWatchlistEntry?.watched ? '✓ Watched' : '○ Mark Watched'}
              </button>
              <button
                type="button"
                onClick={() => removeFromWatchlist?.(movieId)}
                aria-label="Remove from vault"
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSaveToWatchlist?.(movie)}
              className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>+</span>
              <span>Save to Vault</span>
            </button>
          )}

          {/* AI Feature Button */}
          <button
            type="button"
            onClick={handleAiReview}
            disabled={isAiLoading}
            className="w-full py-1.5 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isAiLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>✨ AI Auto-Review</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
