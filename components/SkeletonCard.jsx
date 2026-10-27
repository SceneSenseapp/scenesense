// components/SkeletonCard.jsx
"use client";

export default function SkeletonCard({ view = "grid", className = "" }) {
  if (view === "list") {
    return (
      <div 
        aria-hidden="true" 
        className={`w-full p-3 rounded-2xl border border-cyan-500/20 bg-[#080d1a] flex items-center justify-between gap-3.5 relative overflow-hidden animate-pulse select-none ${className}`}
      >
        {/* Shimmer Telemetry Sweep */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent pointer-events-none" />

        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Poster Box */}
          <div className="w-11 h-16 rounded-xl bg-[#050811] border border-cyan-500/20 shrink-0" />

          {/* Title & Metadata Lines */}
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3.5 bg-cyan-950/60 rounded-md w-1/3" />
            <div className="flex items-center gap-2">
              <div className="h-2.5 bg-cyan-950/40 rounded-md w-12" />
              <div className="h-2.5 bg-cyan-950/40 rounded-md w-8" />
            </div>
          </div>
        </div>

        {/* Action Button Stubs */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20 h-8 rounded-xl bg-cyan-950/40 border border-cyan-500/15 hidden sm:block" />
          <div className="w-20 h-8 rounded-xl bg-[#050811] border border-cyan-500/15" />
          <div className="w-8 h-8 rounded-xl bg-[#050811] border border-cyan-500/15" />
        </div>
      </div>
    );
  }

  return (
    <div 
      aria-hidden="true" 
      className={`bg-[#080d1a] border border-cyan-500/20 rounded-2xl overflow-hidden flex flex-col justify-between relative shadow-lg animate-pulse select-none font-mono ${className}`}
    >
      {/* Shimmer Telemetry Sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent pointer-events-none z-10" />

      {/* Poster Artwork Deck */}
      <div className="relative aspect-[2/3] w-full bg-[#050811] overflow-hidden">
        {/* Top-Right Rating Badge Placeholder */}
        <div className="absolute top-2 right-2 w-10 h-5 bg-black/60 rounded-lg border border-cyan-500/20" />
      </div>

      {/* Meta Information & Command Controls */}
      <div className="p-3.5 flex flex-col gap-3 flex-grow justify-between">
        <div className="space-y-1.5">
          <div className="h-3.5 bg-cyan-950/60 rounded-md w-4/5" />
          <div className="h-2.5 bg-cyan-950/40 rounded-md w-1/3" />
        </div>

        {/* Button Stubs */}
        <div className="space-y-2 pt-2 border-t border-cyan-500/10">
          <div className="w-full h-7 rounded-xl bg-cyan-950/50 border border-cyan-500/20" />
          <div className="w-full h-7 rounded-xl bg-[#050811] border border-cyan-500/15" />
        </div>
      </div>
    </div>
  );
}