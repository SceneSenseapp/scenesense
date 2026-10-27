// components/AddToWatchlist.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWatchlist } from "@/hooks/useWatchlist";
import { playConfirmTone, playTerminalClick } from "@/components/utils/sfx";

export default function AddToWatchlist({ 
  movie, 
  className = "", 
  variant = "full", // "full" | "icon" | "compact"
  onToggle 
}) {
  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist, user, loading } = useWatchlist();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!movie || !movie.id) return null;

  const targetId = movie.id;
  const isSaved = (watchlist || []).some(
    (item) => String(item.id || item.movieId) === String(targetId)
  );

  const handleToggle = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!user) {
      router.push("/login");
      return;
    }

    setIsProcessing(true);

    try {
      if (isSaved) {
        playTerminalClick();
        await removeFromWatchlist(targetId);
        onToggle?.(false);
      } else {
        playConfirmTone();
        // Normalize complete TMDB payload attributes for Watchlist radar indexing
        const normalizedPayload = {
          id: targetId,
          movieId: targetId,
          title: movie.title || movie.name || "Untitled Target",
          name: movie.name || movie.title || "Untitled Target",
          poster_path: movie.poster_path || "",
          backdrop_path: movie.backdrop_path || "",
          release_date: movie.release_date || movie.first_air_date || "",
          first_air_date: movie.first_air_date || movie.release_date || "",
          vote_average: Number(movie.vote_average) || 0,
          genre_ids: Array.isArray(movie.genre_ids) ? movie.genre_ids : [],
          media_type: movie.media_type || (movie.first_air_date || movie.name ? "tv" : "movie"),
          watched: false
        };

        await saveToWatchlist(normalizedPayload);
        onToggle?.(true);
      }
    } catch (err) {
      console.error("Watchlist radar synchronization interrupted:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    if (variant === "icon") {
      return (
        <div className={`w-8 h-8 rounded-xl bg-[#050811] border border-cyan-500/20 flex items-center justify-center animate-pulse ${className}`}>
          <span className="w-3.5 h-3.5 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <button 
        type="button" 
        disabled 
        className={`w-full py-2.5 px-4 rounded-xl bg-[#050811] border border-cyan-500/20 text-slate-500 font-mono text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
      >
        <span className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        <span>Scanning Radar...</span>
      </button>
    );
  }

  // Icon-only HUD badge variant (for poster card overlays)
  if (variant === "icon") {
    return (
      <button
        type="button"
        disabled={isProcessing}
        onClick={handleToggle}
        className={`w-8 h-8 rounded-xl font-mono text-xs font-bold transition-all shadow-md flex items-center justify-center cursor-pointer active:scale-95 border ${
          isSaved
            ? "bg-cyan-500 text-black border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
            : "bg-[#050811]/90 hover:bg-cyan-950/70 border-cyan-500/30 hover:border-cyan-400 text-slate-300 hover:text-white"
        } ${className}`}
        title={isSaved ? "Saved to Watchlist Radar (Click to Remove)" : "Add Target to Watchlist Radar"}
      >
        {isProcessing ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isSaved ? (
          "✓"
        ) : (
          "+"
        )}
      </button>
    );
  }

  // Compact inline capsule variant
  if (variant === "compact") {
    return (
      <button
        type="button"
        disabled={isProcessing}
        onClick={handleToggle}
        className={`px-3 py-1.5 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 border ${
          isSaved
            ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            : "bg-[#050811] hover:bg-white/5 text-slate-300 hover:text-white border-white/10 hover:border-cyan-400"
        } ${className}`}
      >
        {isProcessing ? (
          <span className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        ) : isSaved ? (
          <>
            <span>✓</span>
            <span>Saved</span>
          </>
        ) : (
          <>
            <span>+</span>
            <span>Watchlist</span>
          </>
        )}
      </button>
    );
  }

  // Full action button variant (default for dossiers & modals)
  return (
    <button
      type="button"
      disabled={isProcessing}
      onClick={handleToggle}
      className={`w-full py-3 px-5 rounded-2xl font-mono font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 border ${
        isSaved
          ? "bg-cyan-950/80 hover:bg-rose-950/70 text-cyan-300 hover:text-rose-300 border-cyan-500/40 hover:border-rose-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)] group"
          : "bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
      } ${className}`}
    >
      {isProcessing ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          <span>Synchronizing Radar...</span>
        </>
      ) : isSaved ? (
        <>
          <span className="group-hover:hidden">✓ In Watchlist Radar</span>
          <span className="hidden group-hover:inline">✕ Remove from Radar</span>
        </>
      ) : (
        <>
          <span>+</span>
          <span>Acquire Target into Watchlist</span>
        </>
      )}
    </button>
  );
}