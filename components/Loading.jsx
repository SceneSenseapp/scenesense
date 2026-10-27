// File: components/Loading.jsx
"use client";

export default function Loading({ 
  text = "Decrypting Sector Telemetry...", 
  fullScreen = false, 
  size = "md", // "sm" | "md" | "lg"
  className = "" 
}) {
  const sizeMap = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3"
  };

  const spinnerSize = sizeMap[size] || sizeMap.md;

  const content = (
    <div 
      role="status" 
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 font-mono select-none ${className}`}
    >
      {/* Dual Concentric Radar Spinners */}
      <div className="relative flex items-center justify-center">
        {/* Outer Pulsing Ring */}
        <div className={`rounded-full border-cyan-500/20 ${spinnerSize} animate-ping absolute opacity-40`} />
        
        {/* Primary High-Speed Orbit Ring */}
        <div className={`rounded-full border-cyan-500/25 border-t-cyan-400 border-r-cyan-400/50 ${spinnerSize} animate-spin shadow-[0_0_15px_rgba(6,182,212,0.4)]`} />
        
        {/* Core Node Pulse */}
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse absolute" />
      </div>

      {/* Telemetry Status Message */}
      {text && (
        <div className="flex items-center gap-2 text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-400/90 font-mono">
            {text}
          </p>
        </div>
      )}

      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[75vh] w-full flex items-center justify-center p-6 bg-[#050508]/80 backdrop-blur-md relative overflow-hidden">
        {/* Ambient Depth Halos */}
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 p-8 rounded-3xl border border-cyan-500/20 bg-[#080d1a]/90 shadow-[0_0_50px_rgba(6,182,212,0.15)]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-6 w-full">
      {content}
    </div>
  );
}