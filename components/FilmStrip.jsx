// File: components/FilmStrip.jsx
"use client";

import Image from "next/image";
import { playTerminalClick } from "@/components/utils/sfx";

export default function FilmStrip({ 
  items = [], 
  onSelectMovie,
  speed = "normal", // "slow" | "normal" | "fast"
  className = "" 
}) {
  const speedClass = 
    speed === "slow" 
      ? "animate-[marquee_45s_linear_infinite]" 
      : speed === "fast" 
        ? "animate-[marquee_20s_linear_infinite]" 
        : "animate-[marquee_30s_linear_infinite]";

  // Perforation sprocket tracks
  const renderSprockets = () => (
    <div className="flex items-center gap-3 w-max py-1 select-none pointer-events-none">
      {Array.from({ length: 48 }).map((_, i) => (
        <div 
          key={i} 
          className="w-3.5 h-2 bg-[#050811] border border-cyan-400/50 rounded-[2px] shadow-[inset_0_1px_2px_rgba(6,182,212,0.4)] shrink-0"
        />
      ))}
    </div>
  );

  return (
    <div 
      aria-label="35mm Filmstrip Reel"
      className={`w-full bg-[#050508] border-y border-cyan-500/25 overflow-hidden relative shadow-[0_0_25px_rgba(6,182,212,0.15)] select-none my-4 ${className}`}
    >
      {/* Background Depth Halos */}
      <div className="absolute top-0 left-1/4 w-72 h-12 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-12 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* TOP SPROCKET TRACK */}
      <div className="overflow-hidden border-b border-cyan-500/15 bg-black/40">
        <div className={`flex w-max ${speedClass}`}>
          {renderSprockets()}
          {renderSprockets()}
        </div>
      </div>

      {/* CENTER REEL FRAMES (Optional Interactive Mode) */}
      {items.length > 0 ? (
        <div className="py-2.5 overflow-hidden bg-[#070b14]/90 relative">
          <div className={`flex items-center gap-4 w-max ${speedClass} hover:[animation-play-state:paused]`}>
            {[...items, ...items].map((movie, idx) => {
              const posterSrc = movie.poster_path 
                ? (movie.poster_path.startsWith("http") ? movie.poster_path : `https://image.tmdb.org/t/p/w200${movie.poster_path}`)
                : null;
              const title = movie.title || movie.name || "Reel Target";

              return (
                <div
                  key={`${movie.id || idx}-${idx}`}
                  onClick={() => {
                    playTerminalClick();
                    onSelectMovie?.(movie);
                  }}
                  className="relative group shrink-0 w-28 sm:w-36 aspect-[16/9] rounded-lg overflow-hidden border border-cyan-500/30 hover:border-cyan-300 bg-[#050811] cursor-pointer shadow-md transition-all duration-300 hover:scale-105"
                  title={title}
                >
                  {posterSrc ? (
                    <Image
                      src={posterSrc}
                      alt={title}
                      fill
                      unoptimized
                      sizes="144px"
                      className="object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-500 p-1 text-center">
                      🎬 {title}
                    </div>
                  )}

                  {/* Frame Edge Line & Overlay Tag */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] font-mono font-bold text-cyan-300 truncate block uppercase tracking-tight">
                      {title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* OPTICAL SOUNDTRACK TRACK (When no items provided) */
        <div className="py-1 px-4 flex items-center justify-between font-mono text-[9px] text-cyan-500/40 uppercase tracking-widest bg-[#050811]">
          <span>● 35MM CELLULOID REEL</span>
          <span className="hidden sm:inline">24 FPS // SOUNDTRACK OPTICS ACTIVE</span>
          <span>EMULSION LAYER ●</span>
        </div>
      )}

      {/* BOTTOM SPROCKET TRACK */}
      <div className="overflow-hidden border-t border-cyan-500/15 bg-black/40">
        <div className={`flex w-max ${speedClass}`}>
          {renderSprockets()}
          {renderSprockets()}
        </div>
      </div>
    </div>
  );
}