// components/MovieCard.jsx
"use client";

import { useState } from 'react';
import Image from 'next/image';

export default function MovieCard({ movie, watchlist, onSaveToWatchlist, removeFromWatchlist, onToggleWatched, onOpenReview }) {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const isSaved = watchlist?.some(item => item.id === movie.id);
  const matchedWatchlistEntry = watchlist?.find(item => item.id === movie.id);

  const handleAiReview = async (e) => {
    e.stopPropagation();
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieTitle: movie.title,
          movieOverview: movie.overview || "No overview available.",
          genres: movie.genre_ids ? movie.genre_ids.join(", ") : "Cinematic"
        })
      });
      const data = await res.json();
      if (data.review && onOpenReview) {
        // Automatically open the review modal pre-filled with AI genius
        onOpenReview({
          ...movie,
          userRating: data.rating || 8,
          userReview: data.review
        });
      }
    } catch (err) {
      console.error("AI Review generation failed:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col justify-between group hover:border-red-600 transition-all shadow-xl relative">
      <div className="relative aspect-[2/3] w-full bg-[#1a1a1a] overflow-hidden">
        {movie.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            fill
            unoptimized
            sizes="300px"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-500 p-4 text-center">
            {movie.title}
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-amber-400 border border-amber-500/30">
          ★ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-grow justify-between">
        <div>
          <h3 className="font-bold text-sm text-white line-clamp-1 mb-1">{movie.title}</h3>
          <p className="text-gray-400 text-xs">{movie.release_date ? movie.release_date.split('-')[0] : 'Unknown'}</p>
        </div>

        <div className="flex flex-col gap-2">
          {isSaved ? (
            <div className="flex gap-2">
              <button
                onClick={() => onToggleWatched(movie.id, !matchedWatchlistEntry?.watched)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-colors ${
                  matchedWatchlistEntry?.watched ? 'bg-emerald-600 text-white' : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                }`}
              >
                {matchedWatchlistEntry?.watched ? '✓ Watched' : '○ Unwatched'}
              </button>
              <button
                onClick={() => removeFromWatchlist(movie.id)}
                className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-900/50 text-red-400 text-xs font-bold rounded transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => onSaveToWatchlist(movie)}
              className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-all shadow-md"
            >
              + Save to Vault
            </button>
          )}

          {/* AI Feature Button */}
          <button
            onClick={handleAiReview}
            disabled={isAiLoading}
            className="w-full py-1.5 bg-purple-950/40 hover:bg-purple-900 border border-purple-500/40 text-purple-300 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isAiLoading ? (
              <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>✨ AI Auto-Review</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}