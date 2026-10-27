// components/ActorModal.jsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/hooks/useWatchlist';
import ReviewModal from '@/components/ReviewModal';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

export default function ActorModal({
  personId,
  onClose,
  onSelectMovie,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward
}) {
  const [personData, setPersonData] = useState(null);
  const [personCredits, setPersonCredits] = useState([]);
  const [backdropPath, setBackdropPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Global Review Modal Toggle State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    if (!personId) return;

    let isActive = true;

    const fetchPersonDetails = async () => {
      setIsLoading(true);
      try {
        const [personRes, creditsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/person/${personId}?api_key=${TMDB_API_KEY}`),
          fetch(`https://api.themoviedb.org/3/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}`)
        ]);

        const pData = await personRes.json();
        const cData = await creditsRes.json();

        if (!isActive) return;

        setPersonData(pData);
        
        const allRawCredits = [...(cData.cast || []), ...(cData.crew || [])];

        const validCredits = allRawCredits.filter(item => {
          if (item.adult) return false;
          const title = (item.title || item.name || '').toLowerCase();
          const adultKeywords = ['porn', 'xxx', 'adult video', 'erotic'];
          if (adultKeywords.some(kw => title.includes(kw))) return false;
          return (item.title || item.name) && (item.release_date || item.first_air_date) && item.poster_path;
        });

        const topBackdrop = validCredits.find(c => c.backdrop_path)?.backdrop_path || null;
        setBackdropPath(topBackdrop);

        const consolidatedMap = new Map();

        validCredits.forEach(credit => {
          const mediaKey = `${credit.media_type || 'movie'}-${credit.id}`;
          const currentRole = credit.character || credit.job || 'Contributor';

          if (consolidatedMap.has(mediaKey)) {
            const existing = consolidatedMap.get(mediaKey);
            if (!existing.roles.includes(currentRole)) {
              existing.roles.push(currentRole);
            }
          } else {
            consolidatedMap.set(mediaKey, {
              id: credit.id,
              media_type: credit.media_type || 'movie',
              title: credit.title || credit.name,
              release_date: credit.release_date || credit.first_air_date,
              poster_path: credit.poster_path,
              vote_average: credit.vote_average || 0,
              popularity: credit.popularity || 0,
              roles: [currentRole]
            });
          }
        });

        const deduplicatedCredits = Array.from(consolidatedMap.values());
        const sortedCredits = deduplicatedCredits.sort((a, b) => b.popularity - a.popularity);

        setPersonCredits(sortedCredits);
      } catch (e) {
        console.error("Failed to fetch person telemetry:", e);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchPersonDetails();

    return () => {
      isActive = false;
    };
  }, [personId]);

  if (!personId) return null;

  const handleAskCineMindActor = () => {
    if (!personData) return;
    const params = new URLSearchParams({
      topic: 'person',
      id: String(personData.id),
      name: personData.name,
      department: personData.known_for_department || 'Artist',
      biography: personData.biography || ''
    });
    router.push(`/chat?${params.toString()}`);
  };

  const handleToggleWatchlist = (e, credit) => {
    e.stopPropagation();
    const isSaved = (watchlist || []).some(w => String(w.id || w.movieId) === String(credit.id));
    if (isSaved) {
      removeFromWatchlist(credit.id);
    } else {
      saveToWatchlist(credit);
    }
  };

  return (
    <div className="w-full relative">
      {/* Background Ambient Backdrop */}
      {backdropPath && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
          <Image
            src={`https://image.tmdb.org/t/p/original${backdropPath}`}
            alt=""
            fill
            unoptimized
            priority
            className="object-cover blur-3xl scale-110"
          />
        </div>
      )}

      <div className="bg-[#080d1a]/95 border border-cyan-500/35 w-full max-w-6xl rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 relative shadow-[0_0_80px_rgba(6,182,212,0.25)] my-4 text-slate-100 z-10 mx-auto font-sans backdrop-blur-2xl">
        
        {/* Navigation & Action HUD Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-cyan-500/20 mb-8 gap-4 flex-wrap font-mono">
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoBack}
              disabled={!canGoBack}
              className="px-3.5 py-2 rounded-xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back</span>
            </button>
            <button
              type="button"
              onClick={onGoForward}
              disabled={!canGoForward}
              className="px-3.5 py-2 rounded-xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span className="hidden sm:inline">Forward</span>
              <span>→</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95"
            >
              <span>✍️</span>
              <span>Review Talent</span>
            </button>

            {personData && (
              <a
                href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${personData.name} autograph memorabilia poster`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#050811] border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer group"
                title={`Search eBay for ${personData.name} verified memorabilia`}
              >
                <span>🏷️</span>
                <span>Collectibles ↗</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleAskCineMindActor}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
            >
              <span>🧠</span>
              <span>Brief CineMind</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#050811] hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/50 flex items-center justify-center text-slate-300 hover:text-rose-300 text-sm font-bold transition-all cursor-pointer ml-1 shadow-md"
            >
              ✕
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3 font-mono">
            <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-cyan-400 uppercase tracking-widest">Accessing Personnel Dossier...</span>
          </div>
        ) : personData ? (
          <div className="space-y-10 max-h-[75vh] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-cyan-500/30">
            
            {/* Header Identity Block */}
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start border-b border-cyan-500/20 pb-8">
              <div className="relative w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.3)] shrink-0 bg-[#050811]">
                {personData.profile_path ? (
                  <Image 
                    src={`https://image.tmdb.org/t/p/w500${personData.profile_path}`} 
                    alt={personData.name} 
                    fill 
                    unoptimized
                    priority
                    className="object-cover" 
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-2xl font-mono font-bold text-slate-500">
                    {personData.name ? personData.name.slice(0, 2).toUpperCase() : 'N/A'}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 text-center sm:text-left flex-1 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap font-mono">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                    {personData.known_for_department || 'Artist'}
                  </span>
                  {personData.popularity && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                      ★ Popularity Index: {Number(personData.popularity).toFixed(1)}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                    {personCredits.length} Credited Works
                  </span>
                </div>

                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase font-mono">
                  {personData.name}
                </h2>

                <p className="text-xs font-mono text-slate-400 font-semibold">
                  Born: {personData.birthday || 'N/A'} {personData.place_of_birth ? `• ${personData.place_of_birth}` : ''}
                </p>

                {/* Biography with Read More / Read Less Disclosure */}
                <div className="text-sm text-slate-300 leading-relaxed font-light mt-2 space-y-3 font-sans">
                  {personData.biography ? (
                    <>
                      <div className={`space-y-3 ${!isBioExpanded ? 'line-clamp-4' : ''}`}>
                        {personData.biography.split('\n\n').map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                      {personData.biography.length > 300 && (
                        <button
                          type="button"
                          onClick={() => setIsBioExpanded(!isBioExpanded)}
                          className="text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer mt-1 inline-block"
                        >
                          {isBioExpanded ? '← Collapse Bio' : 'Read Full Personnel Bio →'}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="italic text-slate-500 font-mono text-xs">
                      No official transmission biography recorded on telemetry servers for this operative.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Filmography & TV - Interactive Side Scroller */}
            <div>
              <div className="flex items-center justify-between mb-4 font-mono">
                <h3 className="text-xs uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-2">
                  <span>🎬</span> Notable Filmography &amp; Television Credits
                </h3>
                <span className="text-xs text-slate-400">
                  {personCredits.length} Titles Calibrated
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                {personCredits.map((item) => {
                  const date = item.release_date;
                  const year = date ? date.split('-')[0] : 'N/A';
                  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;
                  const isSaved = (watchlist || []).some(w => String(w.id || w.movieId) === String(item.id));

                  return (
                    <div
                      key={`${item.media_type}-${item.id}`}
                      onClick={() => onSelectMovie(item.id, item.media_type)}
                      className="snap-start shrink-0 w-36 sm:w-44 bg-[#050811] border border-cyan-500/20 hover:border-cyan-400 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all group shadow-md hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(6,182,212,0.25)] relative"
                    >
                      <div>
                        {/* Poster with In-Card Watchlist Quick Toggle */}
                        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 mb-2 border border-cyan-500/20">
                          {item.poster_path ? (
                            <Image 
                              src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} 
                              alt={item.title} 
                              fill 
                              unoptimized
                              sizes="176px" 
                              className="object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] text-slate-500 font-mono">
                              N/A
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleToggleWatchlist(e, item)}
                            className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all shadow-md z-10 cursor-pointer ${
                              isSaved
                                ? 'bg-cyan-500 text-black shadow-cyan-500/50'
                                : 'bg-black/70 hover:bg-cyan-600 text-white border border-white/20'
                            }`}
                            title={isSaved ? "Saved to Watchlist" : "Add to Watchlist"}
                          >
                            {isSaved ? '✓' : '+'}
                          </button>
                        </div>
                        
                        <p 
                          className="text-xs font-bold font-mono line-clamp-2 h-8 leading-snug group-hover:text-cyan-300 transition-colors mb-1.5 px-0.5 text-white uppercase tracking-tight"
                          title={item.title}
                        >
                          {item.title}
                        </p>
                      </div>

                      {/* Clean Inline Metadata */}
                      <div className="mt-1 space-y-0.5 border-t border-cyan-500/10 pt-1.5 font-mono">
                        <p className="text-[10px] text-cyan-400 truncate" title={item.roles.join(', ')}>
                          {item.roles.join(', ')}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span>{year} • <span className="uppercase">{item.media_type}</span></span>
                          {rating && rating > 0 && (
                            <span className="text-amber-400 font-bold flex items-center gap-0.5">
                              <span>★</span> {rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-24 text-slate-500 font-mono text-xs">Personnel telemetry unavailable.</div>
        )}

      </div>

      {/* Global Review Modal Integration */}
      {isReviewModalOpen && personData && (
        <ReviewModal
          targetId={personData.id}
          targetTitle={personData.name}
          posterPath={personData.profile_path}
          mediaType="person"
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}

    </div>
  );
}