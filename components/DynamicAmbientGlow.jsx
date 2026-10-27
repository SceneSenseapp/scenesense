// File: components/DynamicAmbientGlow.jsx
"use client";

import { useState, useEffect } from "react";

export default function DynamicAmbientGlow({ 
  backdropUrl, 
  opacity = 0.35, 
  blur = 100, 
  className = "" 
}) {
  const [activeBackdrop, setActiveBackdrop] = useState(null);
  const [prevBackdrop, setPrevBackdrop] = useState(null);
  const [isCrossFading, setIsCrossFading] = useState(false);

  // Normalize image source (handles raw TMDB paths, full URLs, and nulls)
  const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `https://image.tmdb.org/t/p/w1280${cleanPath}`;
  };

  useEffect(() => {
    const resolved = resolveImageUrl(backdropUrl);
    if (resolved !== activeBackdrop) {
      setPrevBackdrop(activeBackdrop);
      setActiveBackdrop(resolved);
      setIsCrossFading(true);

      const timer = setTimeout(() => {
        setIsCrossFading(false);
        setPrevBackdrop(null);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [backdropUrl, activeBackdrop]);

  return (
    <div 
      aria-hidden="true" 
      className={`absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#050508] ${className}`}
    >
      {/* Fallback Ambient Depth Spots */}
      <div className="absolute top-0 right-1/4 w-[480px] h-[480px] bg-cyan-600/10 rounded-full blur-[150px] transform-gpu pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[150px] transform-gpu pointer-events-none" />

      {/* Cross-Fading Previous Backdrop Layer */}
      {prevBackdrop && isCrossFading && (
        <div
          className="absolute inset-0 bg-cover bg-center scale-125 transform-gpu transition-opacity duration-700 ease-out"
          style={{
            backgroundImage: `url('${prevBackdrop}')`,
            opacity: 0,
            filter: `blur(${blur}px)`
          }}
        />
      )}

      {/* Active Backdrop Projection Layer */}
      {activeBackdrop ? (
        <div
          className={`absolute inset-0 bg-cover bg-center scale-125 transform-gpu transition-opacity duration-1000 ease-out will-change-transform ${
            isCrossFading ? "opacity-0" : ""
          }`}
          style={{
            backgroundImage: `url('${activeBackdrop}')`,
            opacity: isCrossFading ? 0 : opacity,
            filter: `blur(${blur}px)`
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12)_0%,transparent_75%)]" />
      )}

      {/* Cyan-Noir Vignette and Contrast Scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/60 via-[#050508]/85 to-[#050508]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#050508_100%)] opacity-80" />
    </div>
  );
}