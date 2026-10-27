// components/InfoModal.jsx
'use client';

import React, { useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { playTerminalClick } from '@/components/utils/sfx';

export default function InfoModal({ 
  isOpen, 
  onClose, 
  data, 
  onSelectMedia 
}) {
  const router = useRouter();

  // Handle escape key listener to dismiss
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !data) return null;

  const resolveImage = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `https://image.tmdb.org/t/p/w500${clean}`;
  };

  const heroImage = resolveImage(data.image || data.poster_path || data.profile_path);
  const isActor = data.type === 'actor' || Boolean(data.birthDate) || Boolean(data.knownFor);
  const title = data.title || data.name || 'Classified Dossier';

  const handleLaunchSearch = () => {
    playTerminalClick();
    onClose();
    router.push(`/where-to-watch?search=${encodeURIComponent(title)}`);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-4 animate-fade-in font-sans"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#080d1a]/95 border border-cyan-500/35 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-[0_0_80px_rgba(6,182,212,0.25)] max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/30 overflow-hidden"
      >
        {/* Background Depth Halos */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            playTerminalClick();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm font-mono font-bold bg-[#050811] hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/50 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md z-10"
          title="Dismiss Modal (Esc)"
        >
          ✕
        </button>

        <div className="flex flex-col sm:flex-row gap-6 items-start relative z-10">
          {/* Main Visual Artwork */}
          {heroImage ? (
            <div className="relative w-36 sm:w-44 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden border-2 border-cyan-500/30 bg-[#050811] shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <Image
                src={heroImage}
                alt={title}
                fill
                unoptimized
                sizes="176px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-36 sm:w-44 aspect-[2/3] shrink-0 rounded-2xl border-2 border-cyan-500/20 bg-[#050811] flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
              <span className="text-3xl mb-1">{isActor ? '👤' : '🎬'}</span>
              <span>No Telemetry</span>
            </div>
          )}

          {/* Core Telemetry Details */}
          <div className="flex-1 min-w-0 font-mono">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                {isActor ? 'Talent Dossier' : 'Cinematic Target'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase truncate">
              {title}
            </h2>
            
            {data.birthDate && (
              <p className="text-xs text-slate-400 mt-1">
                Born: <span className="text-slate-200">{data.birthDate}</span>
              </p>
            )}
            {data.releaseDate && (
              <p className="text-xs text-slate-400 mt-1">
                Release Window: <span className="text-slate-200">{data.releaseDate}</span>
              </p>
            )}

            <p className="text-slate-300 text-xs sm:text-sm font-sans font-light leading-relaxed my-4 line-clamp-6">
              {data.biography || data.overview || 'No additional intelligence recorded on satellite telemetry servers.'}
            </p>

            {/* Quick Action Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleLaunchSearch}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95"
              >
                Scan Radar Feeds for &quot;{title}&quot; →
              </button>
            </div>

            {/* Interactive Filmography / Known For Rail */}
            {data.knownFor && data.knownFor.length > 0 && (
              <div className="pt-2 border-t border-cyan-500/15">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <span>🎬</span> Known For / Filmography
                </h4>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-cyan-500/30">
                  {data.knownFor.map((item) => {
                    const posterSrc = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : null;
                    const itemTitle = item.title || item.name || 'Untitled';

                    return (
                      <div 
                        key={item.id} 
                        onClick={() => {
                          playTerminalClick();
                          onSelectMedia?.(item);
                        }}
                        className="text-center shrink-0 w-20 group cursor-pointer"
                        title={itemTitle}
                      >
                        <div className="relative w-20 h-28 bg-[#050811] rounded-xl mb-1.5 overflow-hidden border border-cyan-500/20 group-hover:border-cyan-400 transition-colors shadow-sm">
                          {posterSrc ? (
                            <Image
                              src={posterSrc}
                              alt={itemTitle}
                              fill
                              unoptimized
                              sizes="80px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[9px] text-slate-500">
                              🎬
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 group-hover:text-cyan-300 block truncate transition-colors">
                          {itemTitle}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}