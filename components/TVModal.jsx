// components/TVModal.jsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/hooks/useWatchlist';
import ActorModal from '@/components/ActorModal';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const AMAZON_AFFILIATE_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG || 'scenesense-20';

export default function TVModal({ tvId, onClose }) {
  const [tvShow, setTvShow] = useState(null);
  const [cast, setCast] = useState([]);
  const [crew, setCrew] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [allSimilarShows, setAllSimilarShows] = useState([]);
  const [similarDisplayLimit, setSimilarDisplayLimit] = useState(12);
  const [watchProviders, setWatchProviders] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [isLoading, setIsLoading] = useState(true);
  const [playingTrailer, setPlayingTrailer] = useState(false);

  // Actor Modal Navigation Stack
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [previousPersonId, setPreviousPersonId] = useState(null);
  
  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();
  const isSaved = tvShow ? watchlist.some((item) => String(item.id) === String(tvShow.id)) : false;

  useEffect(() => {
    if (!tvId) return;

    let isActive = true;

    queueMicrotask(() => {
      if (isActive) {
        setPlayingTrailer(false);
        setSimilarDisplayLimit(12);
      }
    });

    const fetchTVData = async () => {
      setIsLoading(true);
      try {
        const [detailsData, creditsData, videosData, similarData, providersData] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/tv/${tvId}?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/tv/${tvId}/credits?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/tv/${tvId}/videos?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/tv/${tvId}/similar?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/tv/${tvId}/watch/providers?api_key=${TMDB_API_KEY}`).then(r => r.json())
        ]);

        if (!isActive) return;

        const trailer = videosData.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
        const keyCrew = creditsData.crew?.filter(c => c.job === 'Producer' || c.job === 'Executive Producer' || c.job === 'Creator' || c.job === 'Director') || [];

        setTvShow(detailsData);
        setCast(creditsData.cast?.slice(0, 16) || []);
        setCrew(keyCrew.slice(0, 12));
        setTrailerKey(trailer ? trailer.key : null);
        setAllSimilarShows(similarData.results || []);
        setWatchProviders(providersData.results || {});
      } catch (error) {
        console.error("Failed to fetch TV series telemetry:", error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchTVData();

    return () => {
      isActive = false;
    };
  }, [tvId]);

  if (!tvId) return null;

  const handleAskCineMind = () => {
    if (!tvShow) return;
    const params = new URLSearchParams({
      title: tvShow.name,
      year: (tvShow.first_air_date || '').split('-')[0],
      overview: tvShow.overview || '',
      genres: (tvShow.genres || []).map(g => g.name).join(', '),
    });
    router.push(`/chat?${params.toString()}`);
  };

  const toggleWatchlistForItem = (item, e) => {
    e.stopPropagation();
    const itemWithMediaType = { ...item, media_type: 'tv' };
    const isAlreadySaved = watchlist.some(w => String(w.id) === String(item.id));
    if (isAlreadySaved) {
      removeFromWatchlist(item.id);
    } else {
      saveToWatchlist(itemWithMediaType);
    }
  };

  const regionData = watchProviders?.[selectedRegion] || {};
  const displayedSimilar = allSimilarShows.slice(0, similarDisplayLimit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-y-auto" role="dialog" aria-modal="true">
      
      {/* Cinematic Ambient Backdrop Glow Layer */}
      {tvShow?.backdrop_path && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
          <Image
            src={`https://image.tmdb.org/t/p/original${tvShow.backdrop_path}`}
            alt=""
            fill
            className="object-cover blur-3xl scale-125"
          />
        </div>
      )}

      <div className="bg-[#0b0b16]/95 border-2 border-cyan-500/40 w-full max-w-6xl rounded-[32px] p-6 sm:p-10 relative shadow-[0_25px_80px_rgba(6,182,212,0.35)] my-8 space-y-10 animate-fadeIn text-white z-10">
        
        {/* Back to Profile Button */}
        {previousPersonId && (
          <button
            onClick={() => {
              const targetPerson = previousPersonId;
              setPreviousPersonId(null);
              setSelectedPersonId(targetPerson);
            }}
            className="absolute top-6 left-6 px-4 py-2 rounded-full bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all cursor-pointer z-10 flex items-center gap-2 shadow-lg"
          >
            <span>← Back to Profile</span>
          </button>
        )}

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/10 hover:bg-red-600 flex items-center justify-center text-white text-base font-bold transition-colors cursor-pointer z-10 shadow-lg"
        >
          ✕
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Scanning Series Telemetry...</span>
          </div>
        ) : !tvShow ? (
          <div className="text-center py-20 text-gray-400 text-sm font-mono">
            <p>TV series transmission not found.</p>
          </div>
        ) : (
          <div className="space-y-8 max-h-[82vh] overflow-y-auto pr-3 scrollbar-thin">
            
            {/* Header Navigation & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-cyan-500/20 pb-5 gap-4">
              <span className="text-xs font-mono tracking-widest uppercase text-cyan-400 font-bold">SCENESENSE TV SERIES OVERLAY</span>

              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={handleAskCineMind}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>🧠</span>
                  <span>Brief CineMind</span>
                </button>

                <a
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(tvShow.name + ' box set merchandise')}&tag=${AMAZON_AFFILIATE_TAG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#121218] border border-amber-500/40 hover:border-amber-400 text-amber-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                >
                  <span className="font-serif font-black lowercase text-sm leading-none">a</span>
                  <span>Amazon</span>
                </a>

                <button
                  onClick={() => (isSaved ? removeFromWatchlist(tvShow.id) : saveToWatchlist({ ...tvShow, media_type: 'tv' }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                    isSaved ? 'bg-emerald-600/25 text-emerald-400 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-black/60 text-gray-300 border-cyan-500/30 hover:bg-cyan-500/20 hover:text-white'
                  }`}
                >
                  {isSaved ? '✓ In Watchlist' : '+ Watchlist'}
                </button>
              </div>
            </div>

            {/* TV Show Info Grid */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="relative w-44 md:w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-cyan-500/30 flex-shrink-0 shadow-2xl">
                {tvShow.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${tvShow.poster_path}`}
                    alt={tvShow.name}
                    fill
                    priority
                    sizes="(max-width: 768px) 176px, 192px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-500 font-mono">No Image</div>
                )}
              </div>

              <div className="flex flex-col gap-4 flex-1 text-center md:text-left">
                <h1 className="text-3xl sm:text-4xl font-black text-white">{tvShow.name}</h1>
                <p className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
                  {(tvShow.first_air_date || '').split('-')[0]} • ★ {tvShow.vote_average ? tvShow.vote_average.toFixed(1) : 'N/A'} / 10 • {tvShow.number_of_seasons} Seasons ({tvShow.number_of_episodes} Episodes)
                </p>

                {tvShow.genres && (
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {tvShow.genres.map(g => (
                      <span key={g.id} className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-full text-[10px] font-mono text-cyan-300">{g.name}</span>
                    ))}
                  </div>
                )}

                <p className="text-sm text-gray-300 leading-relaxed font-light">{tvShow.overview}</p>
              </div>
            </div>

            {/* TRAILER CONTAINER */}
            {trailerKey && (
              <div className="w-full max-w-3xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl relative transform-gpu translate-z-0 group">
                {playingTrailer ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&modestbranding=1&rel=0&playsinline=1`}
                    title="TV Trailer"
                    className="w-full h-full absolute inset-0 border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div 
                    onClick={() => setPlayingTrailer(true)}
                    className="w-full h-full relative cursor-pointer flex items-center justify-center bg-cover bg-center group"
                    style={{ backgroundImage: `url('https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg')` }}
                  >
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors"></div>
                    <div className="relative z-10 w-14 h-14 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xl shadow-[0_0_30px_rgba(6,182,212,0.8)] group-hover:scale-110 transition-transform">
                      ▶
                    </div>
                    <span className="absolute bottom-3 left-3 text-[11px] font-mono font-bold text-white bg-black/70 px-2.5 py-1 rounded-lg backdrop-blur-md border border-cyan-500/30">
                      Play HD Trailer
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* STREAMING PROVIDERS */}
            <div className="bg-black/60 border border-cyan-500/25 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">
                  Streaming Availability &amp; Watch Options
                </h3>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="bg-[#141418] border border-cyan-500/30 text-xs font-bold text-cyan-300 rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-mono uppercase text-gray-400 mb-2">Stream / Subscription</p>
                  {regionData.flatrate && regionData.flatrate.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {regionData.flatrate.map((prov) => (
                        <a
                          key={prov.provider_id}
                          href={regionData.link || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-[#181820] hover:bg-[#252530] border border-cyan-500/20 px-3 py-2 rounded-xl transition-all group"
                        >
                          <div className="relative w-6 h-6 rounded overflow-hidden bg-white/10 flex-shrink-0">
                            <Image src={`https://image.tmdb.org/t/p/w92${prov.logo_path}`} alt={prov.provider_name} fill sizes="24px" className="object-cover" />
                          </div>
                          <span className="text-xs font-bold text-gray-200 group-hover:text-white">{prov.provider_name}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">Not currently streaming on subscription in this region.</p>
                  )}
                </div>
              </div>
            </div>

            {/* TELEMETRY BAR */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/30 border border-cyan-500/20 rounded-xl p-3 text-center font-mono">
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Seasons</p>
                <p className="text-xs font-semibold text-cyan-400">{tvShow.number_of_seasons || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Episodes</p>
                <p className="text-xs font-semibold text-cyan-400">{tvShow.number_of_episodes || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Language</p>
                <p className="text-xs font-semibold uppercase">{tvShow.original_language || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase">Status</p>
                <p className="text-xs font-semibold text-emerald-400">{tvShow.status || 'Returning Series'}</p>
              </div>
            </div>

            {/* CREW SECTION - Horizontal Reel */}
            {crew.length > 0 && (
              <div className="pt-4 border-t border-cyan-500/20">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 mb-4 font-bold">Key Production Crew &amp; Creators</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                  {crew.map((member) => (
                    <button
                      key={member.credit_id || member.id}
                      type="button"
                      onClick={() => {
                        setPreviousPersonId(null);
                        setSelectedPersonId(member.id);
                      }}
                      className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-24 text-center cursor-pointer transition-transform active:scale-95"
                    >
                      <div className="relative aspect-[2/3] w-20 rounded-xl overflow-hidden border border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-md bg-[#141420]">
                        {member.profile_path ? (
                          <Image src={`https://image.tmdb.org/t/p/w300${member.profile_path}`} alt={member.name} fill sizes="80px" className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-500 font-mono font-bold">{member.name.slice(0, 2).toUpperCase()}</div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors mt-2 truncate w-full">{member.name}</span>
                      <span className="text-[10px] text-cyan-400/90 truncate w-full font-mono mt-0.5">{member.job}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CAST SECTION - Horizontal Reel */}
            {cast.length > 0 && (
              <div className="pt-6 border-t border-cyan-500/20">
                <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 mb-4 font-bold">Key Cast &amp; Actors</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                  {cast.map((actor) => (
                    <button
                      key={actor.id}
                      type="button"
                      onClick={() => {
                        setPreviousPersonId(null);
                        setSelectedPersonId(actor.id);
                      }}
                      className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-24 text-center cursor-pointer transition-transform active:scale-95"
                    >
                      <div className="relative aspect-[2/3] w-20 rounded-xl overflow-hidden border border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-md bg-[#141420]">
                        {actor.profile_path ? (
                          <Image src={`https://image.tmdb.org/t/p/w300${actor.profile_path}`} alt={actor.name} fill sizes="80px" className="object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-500 font-mono font-bold">{actor.name.slice(0, 2).toUpperCase()}</div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors mt-2 truncate w-full">{actor.name}</span>
                      <span className="text-[10px] text-gray-400 truncate w-full font-mono mt-0.5">{actor.character || 'Actor'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SIMILAR SHOWS - Horizontal Reel */}
            {allSimilarShows.length > 0 && (
              <div className="pt-6 border-t border-cyan-500/20 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">Similar Series Recommendations</h3>
                  {similarDisplayLimit < allSimilarShows.length && (
                    <button
                      type="button"
                      onClick={() => setSimilarDisplayLimit(prev => Math.min(prev + 8, allSimilarShows.length))}
                      className="px-3.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      <span>🔄 More Recommendations</span>
                    </button>
                  )}
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                  {displayedSimilar.map((sim) => {
                    const isSimSaved = watchlist.some(w => String(w.id) === String(sim.id));
                    return (
                      <div 
                        key={sim.id}
                        onClick={() => {
                          window.history.pushState(null, '', `?movieId=${sim.id}&type=tv`);
                          window.location.reload();
                        }}
                        className="snap-start shrink-0 w-36 sm:w-40 bg-black/60 border border-cyan-500/20 hover:border-cyan-400 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all group shadow-md hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(6,182,212,0.25)]"
                      >
                        <div>
                          <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-white/5 mb-2 border border-cyan-500/20">
                            {sim.poster_path ? (
                              <Image src={`https://image.tmdb.org/t/p/w300${sim.poster_path}`} alt={sim.name} fill sizes="160px" className="object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-[10px] text-gray-500 font-mono">N/A</div>
                            )}
                            {sim.vote_average > 0 && (
                              <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-black text-amber-400 border border-amber-500/30">
                                ★ {Number(sim.vote_average).toFixed(1)}
                              </div>
                            )}
                          </div>
                          <p 
                            className="text-xs font-bold line-clamp-2 h-8 leading-snug group-hover:text-cyan-300 transition-colors mb-2 px-0.5"
                            title={sim.name}
                          >
                            {sim.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => toggleWatchlistForItem(sim, e)}
                          className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer border ${
                            isSimSaved 
                              ? 'bg-emerald-600/25 text-emerald-400 border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                              : 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500 hover:text-white'
                          }`}
                        >
                          {isSimSaved ? '✓ Saved' : '+ Watchlist'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      <ActorModal 
        personId={selectedPersonId} 
        onClose={() => setSelectedPersonId(null)} 
        onSelectMovie={(newMovieId) => {
          setSelectedPersonId(null);
          setPreviousPersonId(null);
          window.history.pushState(null, '', `?movieId=${newMovieId}&type=tv`);
          window.location.reload();
        }} 
      />

    </div>
  );
}