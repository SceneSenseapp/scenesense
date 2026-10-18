// components/ActorModal.jsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ReviewModal from '@/components/ReviewModal';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

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

  // Global Review Modal Toggle State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const router = useRouter();

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
      id: personData.id,
      name: personData.name,
      department: personData.known_for_department || 'Artist',
      biography: personData.biography || ''
    });
    router.push(`/chat?${params.toString()}`);
  };

  return (
    <div className="w-full relative">
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

      <div className="bg-[#07070d]/95 border border-cyan-500/40 w-full max-w-6xl rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 relative shadow-[0_0_100px_rgba(6,182,212,0.4)] my-4 text-white z-10 mx-auto">
        
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between pb-6 border-b border-cyan-500/20 mb-8 gap-4 flex-wrap">
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoBack}
              disabled={!canGoBack}
              className="px-3.5 py-2 rounded-xl bg-[#0e0e16] border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>←</span>
              <span className="hidden sm:inline">Back</span>
            </button>
            <button
              type="button"
              onClick={onGoForward}
              disabled={!canGoForward}
              className="px-3.5 py-2 rounded-xl bg-[#0e0e16] border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span className="hidden sm:inline">Forward</span>
              <span>→</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95"
            >
              <span>✍️</span>
              <span>Write Review</span>
            </button>

            {personData && (
              <a
                href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(personData.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#121218] border border-blue-500/40 hover:border-blue-400 text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer group"
                title={`Search eBay for ${personData.name} memorabilia`}
              >
                <span>🏷️</span>
                <span>eBay Memorabilia</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleAskCineMindActor}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer active:scale-95"
            >
              <span>🧠</span>
              <span>Brief CineMind</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-600/80 border border-white/10 hover:border-red-500 flex items-center justify-center text-white text-sm font-bold transition-all cursor-pointer ml-2 shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Accessing Personnel File...</span>
          </div>
        ) : personData ? (
          <div className="space-y-10 max-h-[75vh] overflow-y-auto pr-3 scrollbar-stealth-pill">
            
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start border-b border-cyan-500/20 pb-8">
              <div className="relative w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.3)] shrink-0 bg-[#141420]">
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
                  <div className="flex items-center justify-center h-full text-2xl font-mono font-bold text-gray-500">
                    {personData.name ? personData.name.slice(0, 2).toUpperCase() : 'N/A'}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 text-center sm:text-left flex-1">
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{personData.name}</h2>
                <p className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {personData.known_for_department || 'Artist'} • Born: {personData.birthday || 'N/A'} {personData.place_of_birth ? `(${personData.place_of_birth})` : ''}
                </p>

                <div className="text-sm text-gray-300 leading-relaxed font-light mt-2 space-y-4">
                  {personData.biography ? (
                    personData.biography.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))
                  ) : (
                    <p className="italic text-gray-500">No biography recorded on telemetry servers for this talent.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Filmography & TV - Clean Artwork Side Scroller */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">
                  Notable Filmography &amp; TV Credits
                </h3>
                <span className="text-xs font-mono text-gray-400">
                  {personCredits.length} Titles Loaded
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                {personCredits.map((item) => {
                  const date = item.release_date;
                  const year = date ? date.split('-')[0] : 'N/A';
                  const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;

                  return (
                    <div
                      key={`${item.media_type}-${item.id}`}
                      onClick={() => onSelectMovie(item.id, item.media_type)}
                      className="snap-start shrink-0 w-36 sm:w-40 bg-black/60 border border-cyan-500/20 hover:border-cyan-400 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all group shadow-md hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(6,182,212,0.25)]"
                    >
                      <div>
                        {/* 100% Clean Poster Art (No Overlapping Badges) */}
                        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-white/5 mb-2 border border-cyan-500/20">
                          {item.poster_path ? (
                            <Image 
                              src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} 
                              alt={item.title} 
                              fill 
                              unoptimized
                              sizes="160px" 
                              className="object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] text-gray-500 font-mono">N/A</div>
                          )}
                        </div>
                        
                        <p 
                          className="text-xs font-bold line-clamp-2 h-8 leading-snug group-hover:text-cyan-300 transition-colors mb-2 px-0.5"
                          title={item.title}
                        >
                          {item.title}
                        </p>
                      </div>

                      {/* Clean Inline Metadata Below Title */}
                      <div className="mt-1 space-y-0.5 border-t border-white/5 pt-1.5">
                        <p className="text-[10px] font-mono text-cyan-400/90 truncate" title={item.roles.join(', ')}>
                          {item.roles.join(', ')}
                        </p>
                        <div className="flex items-center justify-between text-[9px] font-mono text-gray-400">
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
          <div className="text-center py-24 text-gray-400 text-sm">Personnel telemetry unavailable.</div>
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