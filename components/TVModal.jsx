// components/TVModal.jsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/hooks/useWatchlist';
import ActorModal from '@/components/ActorModal';
import ReviewModal from '@/components/ReviewModal';
import CommunityReviews from '@/components/CommunityReviews';
import ForumSector from '@/components/ForumSector';
import { playTerminalClick, playConfirmTone, playDeploySweep } from '@/components/utils/sfx';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";
const AMAZON_AFFILIATE_TAG = process.env.NEXT_PUBLIC_AMAZON_TAG || 'scenesense-20';

const getProviderDirectUrl = (providerName, title) => {
  const encodedTitle = encodeURIComponent(title);
  const normalized = (providerName || '').toLowerCase().trim();

  if (normalized.includes('prime video') || normalized.includes('amazon prime') || normalized.includes('amazon video')) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodedTitle}`;
  }
  if (normalized.includes('netflix')) return `https://www.netflix.com/search?q=${encodedTitle}`;
  if (normalized.includes('disney')) return `https://www.disneyplus.com/search?q=${encodedTitle}`;
  if (normalized.includes('apple tv') || normalized.includes('apple')) return `https://tv.apple.com/search?term=${encodedTitle}`;
  if (normalized.includes('max') || normalized.includes('hbo')) return `https://play.max.com/search?q=${encodedTitle}`;
  if (normalized.includes('hulu')) return `https://www.hulu.com/search?q=${encodedTitle}`;
  if (normalized.includes('paramount')) return `https://www.paramountplus.com/search/?query=${encodedTitle}`;
  if (normalized.includes('peacock')) return `https://www.peacocktv.com/search?q=${encodedTitle}`;
  if (normalized.includes('crave')) return `https://www.crave.ca/en/search?q=${encodedTitle}`;
  if (normalized.includes('tubi')) return `https://tubitv.com/search/${encodedTitle}`;
  if (normalized.includes('pluto')) return `https://pluto.tv/en/search/details?query=${encodedTitle}`;
  if (normalized.includes('youtube') || normalized.includes('google play')) return `https://www.youtube.com/results?search_query=${encodedTitle}+tv+series`;
  if (normalized.includes('crunchyroll')) return `https://www.crunchyroll.com/search?q=${encodedTitle}`;
  if (normalized.includes('starz')) return `https://www.starz.com/us/en/search?q=${encodedTitle}`;

  return `https://www.google.com/search?q=${encodeURIComponent(`watch "${title}" on ${providerName}`)}`;
};

export default function TVModal({ tvId: initialTvId, onClose }) {
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const prevInitialIdRef = useRef(null);

  const [tvShow, setTvShow] = useState(null);
  const [cast, setCast] = useState([]);
  const [crew, setCrew] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [allSimilarShows, setAllSimilarShows] = useState([]);
  const [similarDisplayLimit, setSimilarDisplayLimit] = useState(12);
  const [watchProviders, setWatchProviders] = useState(null);
  const [activeDossierTab, setActiveDossierTab] = useState('overview'); // 'overview' | 'reviews' | 'forums'

  // Locale initial state with Canadian fallback
  const [selectedRegion, setSelectedRegion] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('scenesense_region');
        if (saved) return saved;
      } catch {}
    }
    return 'CA';
  });

  const [isLoading, setIsLoading] = useState(true);
  const [playingTrailer, setPlayingTrailer] = useState(false);

  // Global Review Modal Toggle State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  // Escape key dismiss handler
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      playTerminalClick();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (initialTvId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [initialTvId]);

  // Synchronize history when target prop changes
  useEffect(() => {
    if (initialTvId && String(initialTvId) !== String(prevInitialIdRef.current)) {
      prevInitialIdRef.current = initialTvId;
      setHistory([{ kind: 'tv', id: initialTvId }]);
      setHistoryIdx(0);
      setTvShow(null);
      setIsLoading(true);
      setActiveDossierTab('overview');
    }
  }, [initialTvId]);

  const currentItem = history[historyIdx] || (initialTvId ? { kind: 'tv', id: initialTvId } : null);
  const isViewingPerson = currentItem?.kind === 'person';
  const currentTvId = isViewingPerson ? null : currentItem?.id;

  const pushHistory = (item) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIdx + 1);
      return [...trimmed, item];
    });
    setHistoryIdx((prev) => prev + 1);
  };

  const handleSelectTvShow = (id) => {
    playTerminalClick();
    pushHistory({ kind: 'tv', id });
  };

  const handleSelectPerson = (personId) => {
    playTerminalClick();
    pushHistory({ kind: 'person', id: personId });
  };

  const goBack = () => {
    if (historyIdx > 0) {
      playTerminalClick();
      setHistoryIdx((prev) => prev - 1);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      playTerminalClick();
      setHistoryIdx((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (!currentTvId || isViewingPerson) return;

    let isActive = true;
    setPlayingTrailer(false);
    setSimilarDisplayLimit(12);

    const fetchTVData = async () => {
      setIsLoading(true);
      try {
        const [detailsData, creditsData, videosData, similarData, providersData] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/tv/${currentTvId}?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/tv/${currentTvId}/credits?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/tv/${currentTvId}/videos?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/tv/${currentTvId}/similar?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/tv/${currentTvId}/watch/providers?api_key=${TMDB_API_KEY}`).then(r => r.json())
        ]);

        if (!isActive) return;

        const trailer = videosData.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
        const keyCrew = creditsData.crew?.filter(c => 
          ['Producer', 'Executive Producer', 'Creator', 'Director', 'Writer'].includes(c.job)
        ) || [];

        setTvShow(detailsData);
        setCast(creditsData.cast?.slice(0, 18) || []);
        setCrew(keyCrew.slice(0, 12));
        setTrailerKey(trailer ? trailer.key : null);
        setAllSimilarShows(similarData.results || []);
        setWatchProviders(providersData.results || {});
      } catch (error) {
        console.error("Failed to fetch TV series telemetry:", error);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchTVData();

    return () => {
      isActive = false;
    };
  }, [currentTvId, isViewingPerson]);

  if (!initialTvId) return null;

  const isSaved = tvShow ? (watchlist || []).some((item) => String(item.id || item.movieId) === String(tvShow.id)) : false;

  const handleAskCineMind = () => {
    if (!tvShow) return;
    playDeploySweep();
    const params = new URLSearchParams({
      topic: 'film',
      id: tvShow.id,
      title: tvShow.name,
      year: (tvShow.first_air_date || '').split('-')[0],
      overview: tvShow.overview || '',
      genres: (tvShow.genres || []).map(g => g.name).join(', ')
    });
    router.push(`/chat?${params.toString()}`);
  };

  const toggleWatchlistForItem = (item, e) => {
    if (e) e.stopPropagation();
    const normalizedItem = { 
      ...item, 
      id: item.id,
      movieId: item.id,
      title: item.name || item.title || 'Untitled Series',
      media_type: 'tv' 
    };

    const isAlreadySaved = (watchlist || []).some(w => String(w.id || w.movieId) === String(item.id));
    if (isAlreadySaved) {
      playTerminalClick();
      removeFromWatchlist(item.id);
    } else {
      playConfirmTone();
      saveToWatchlist(normalizedItem);
    }
  };

  const regionData = watchProviders?.[selectedRegion] || {};
  const displayedSimilar = allSimilarShows.slice(0, similarDisplayLimit);
  const seriesTitle = tvShow?.name || '';
  const firstAirYear = (tvShow?.first_air_date || '').split('-')[0] || 'N/A';

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-2 sm:p-4 md:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/30 font-sans" 
      role="dialog" 
      aria-modal="true"
      onClick={() => {
        playTerminalClick();
        onClose();
      }}
    >
      
      {isViewingPerson ? (
        <div onClick={(e) => e.stopPropagation()}>
          <ActorModal
            personId={currentItem.id}
            onClose={onClose}
            onSelectMovie={handleSelectTvShow}
            canGoBack={historyIdx > 0}
            canGoForward={historyIdx < history.length - 1}
            onGoBack={goBack}
            onGoForward={goForward}
          />
        </div>
      ) : (
        <div onClick={(e) => e.stopPropagation()} className="w-full max-w-6xl my-auto">
          {/* Ambient Backdrop Glow */}
          {tvShow?.backdrop_path && (
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
              <Image
                src={`https://image.tmdb.org/t/p/original${tvShow.backdrop_path}`}
                alt=""
                fill
                unoptimized
                priority
                className="object-cover blur-3xl scale-110"
              />
            </div>
          )}

          <div className="bg-[#080d1a]/95 border border-cyan-500/35 w-full rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 relative shadow-[0_25px_100px_rgba(6,182,212,0.25)] text-slate-100 z-10 font-sans backdrop-blur-2xl">
            
            {/* Top Navigation & Action HUD Bar */}
            <div className="flex items-center justify-between pb-6 border-b border-cyan-500/20 mb-6 gap-4 flex-wrap font-mono">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={historyIdx <= 0}
                  className="px-3.5 py-2 rounded-xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">Back</span>
                </button>
                <button
                  type="button"
                  onClick={goForward}
                  disabled={historyIdx >= history.length - 1}
                  className="px-3.5 py-2 rounded-xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span className="hidden sm:inline">Forward</span>
                  <span>→</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    playTerminalClick();
                    setIsReviewModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95"
                >
                  <span>✍️</span>
                  <span>Write Review</span>
                </button>

                <button
                  type="button"
                  onClick={handleAskCineMind}
                  className="px-4 py-2 bg-[#050811] border border-indigo-500/40 hover:border-indigo-400 text-indigo-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
                >
                  <span>🧠</span>
                  <span>Brief CineMind</span>
                </button>

                <a
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(`${seriesTitle} box set merchandise`)}&tag=${AMAZON_AFFILIATE_TAG}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#050811] border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Search Amazon for Physical Media & Collectibles"
                >
                  <span>🏷️</span>
                  <span>Amazon Store ↗</span>
                </a>

                <button
                  type="button"
                  onClick={() => toggleWatchlistForItem(tvShow)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                    isSaved 
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                      : 'bg-[#050811] text-slate-300 border-cyan-500/30 hover:border-cyan-400 hover:text-white'
                  }`}
                >
                  <span>{isSaved ? '✓ In Watchlist' : '+ Watchlist'}</span>
                </button>

                <button 
                  type="button"
                  onClick={() => {
                    playTerminalClick();
                    onClose();
                  }} 
                  className="w-9 h-9 rounded-xl bg-[#050811] hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/50 flex items-center justify-center text-slate-300 hover:text-rose-300 text-sm font-bold transition-all cursor-pointer ml-1 shadow-md"
                  title="Dismiss Dossier (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Dossier Section Tabs */}
            <div className="flex items-center gap-2 mb-6 border-b border-cyan-500/15 pb-2 font-mono text-xs">
              {[
                { id: 'overview', label: 'Series Overview', icon: '📺' },
                { id: 'reviews', label: 'Community Transmissions', icon: '📝' },
                { id: 'forums', label: 'Episode Theories & Chat', icon: '📡' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playTerminalClick();
                    setActiveDossierTab(tab.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeDossierTab === tab.id
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4 font-mono">
                <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-cyan-400 uppercase tracking-widest">Scanning Series Telemetry...</span>
              </div>
            ) : !tvShow ? (
              <div className="text-center py-24 text-slate-500 font-mono text-xs">TV series transmission not found.</div>
            ) : (
              <div className="space-y-10 max-h-[70vh] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-cyan-500/30">
                
                {/* SUB-VIEW 1: OVERVIEW HERO */}
                {activeDossierTab === 'overview' && (
                  <>
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                      <div className="relative w-48 sm:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border-2 border-cyan-500/35 shrink-0 shadow-2xl">
                        {tvShow.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${tvShow.poster_path}`}
                            alt={seriesTitle}
                            fill
                            priority
                            unoptimized
                            sizes="224px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono">No Image Available</div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3.5 flex-1 text-center md:text-left">
                        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase font-mono">{seriesTitle}</h1>
                        <p className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
                          {firstAirYear} • ★ {tvShow.vote_average ? Number(tvShow.vote_average).toFixed(1) : 'N/A'} / 10 • {tvShow.number_of_seasons} Seasons ({tvShow.number_of_episodes} Episodes)
                        </p>

                        {tvShow.genres && (
                          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            {tvShow.genres.map(g => (
                              <span key={g.id} className="px-3 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-lg text-[10px] font-mono text-cyan-300">{g.name}</span>
                            ))}
                          </div>
                        )}

                        <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light font-sans">{tvShow.overview}</p>
                      </div>
                    </div>

                    {/* Video Trailer */}
                    {trailerKey && (
                      <div className="w-full max-w-4xl mx-auto aspect-video bg-black rounded-3xl overflow-hidden border border-cyan-500/30 shadow-2xl relative transform-gpu group">
                        {playingTrailer ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&modestbranding=1&rel=0&playsinline=1`}
                            title="Trailer"
                            className="w-full h-full absolute inset-0 border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        ) : (
                          <div 
                            onClick={() => {
                              playDeploySweep();
                              setPlayingTrailer(true);
                            }}
                            className="w-full h-full relative cursor-pointer flex items-center justify-center bg-cover bg-center group"
                            style={{ backgroundImage: `url('https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg')` }}
                          >
                            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors" />
                            <div className="relative z-10 w-16 h-16 rounded-full bg-cyan-500 text-black flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(6,182,212,0.8)] group-hover:scale-110 transition-transform">
                              ▶
                            </div>
                            <span className="absolute bottom-4 left-4 text-xs font-mono font-bold text-white bg-black/80 px-3 py-1.5 rounded-lg backdrop-blur-md border border-cyan-500/30">
                              Play HD Trailer
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Streaming Network Hub */}
                    <div className="bg-[#050811] border border-cyan-500/25 rounded-3xl p-6 space-y-5 shadow-xl font-mono">
                      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 flex-wrap gap-2">
                        <h3 className="text-xs uppercase tracking-widest text-cyan-400 font-bold">
                          Streaming Network Availability
                        </h3>
                        <select
                          value={selectedRegion}
                          onChange={(e) => {
                            setSelectedRegion(e.target.value);
                            try {
                              localStorage.setItem('scenesense_region', e.target.value);
                            } catch {}
                          }}
                          className="bg-[#080d1a] border border-cyan-500/30 text-xs font-bold text-cyan-300 rounded-xl px-3 py-1.5 outline-none focus:border-cyan-400 cursor-pointer"
                        >
                          <option value="CA">Canada 🇨🇦</option>
                          <option value="US">United States 🇺🇸</option>
                          <option value="GB">United Kingdom 🇬🇧</option>
                          <option value="AU">Australia 🇦🇺</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] uppercase text-slate-400 mb-2 font-bold">Subscription Feeds</p>
                          {regionData.flatrate && regionData.flatrate.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                              {regionData.flatrate.map((prov) => (
                                <a
                                  key={prov.provider_id}
                                  href={getProviderDirectUrl(prov.provider_name, seriesTitle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 bg-[#080d1a] hover:bg-[#0c1426] border border-cyan-500/20 px-3.5 py-2 rounded-xl transition-all group cursor-pointer"
                                  title={`Watch "${seriesTitle}" on ${prov.provider_name}`}
                                >
                                  <div className="relative w-6 h-6 rounded-lg overflow-hidden bg-white/10 shrink-0">
                                    <Image 
                                      src={`https://image.tmdb.org/t/p/w92${prov.logo_path}`} 
                                      alt={prov.provider_name} 
                                      fill 
                                      unoptimized
                                      sizes="24px" 
                                      className="object-cover" 
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-slate-200 group-hover:text-white">{prov.provider_name}</span>
                                  <span className="text-[10px] text-cyan-400 opacity-60 group-hover:opacity-100">↗</span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic">No subscription streaming options recorded in this territory.</p>
                          )}
                        </div>

                        {(regionData.rent?.length > 0 || regionData.buy?.length > 0) && (
                          <div className="pt-3 border-t border-cyan-500/10">
                            <p className="text-[10px] uppercase text-slate-400 mb-2 font-bold">Digital Purchase &amp; Video on Demand</p>
                            <div className="flex flex-wrap gap-2">
                              {Array.from(new Map([...(regionData.rent || []), ...(regionData.buy || [])].map(p => [p.provider_id, p])).values()).map((prov) => (
                                <a
                                  key={prov.provider_id}
                                  href={getProviderDirectUrl(prov.provider_name, seriesTitle)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 bg-[#080d1a] hover:bg-[#0c1426] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
                                >
                                  <div className="relative w-4 h-4 rounded overflow-hidden bg-white/5 shrink-0">
                                    <Image 
                                      src={`https://image.tmdb.org/t/p/w92${prov.logo_path}`} 
                                      alt={prov.provider_name} 
                                      fill 
                                      unoptimized
                                      sizes="16px" 
                                      className="object-cover" 
                                    />
                                  </div>
                                  <span className="text-[11px]">{prov.provider_name}</span>
                                  <span className="text-[9px] text-zinc-500">↗</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 text-[10px] text-slate-500 border-t border-cyan-500/10">
                          Streaming availability powered by JustWatch via TMDB. Data is non-commercial.
                        </div>
                      </div>
                    </div>

                    {/* Telemetry Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#050811] border border-cyan-500/20 rounded-2xl p-4 text-center font-mono">
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase">Seasons</p>
                        <p className="text-xs font-semibold text-cyan-400">{tvShow.number_of_seasons || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase">Episodes</p>
                        <p className="text-xs font-semibold text-cyan-400">{tvShow.number_of_episodes || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase">Language</p>
                        <p className="text-xs font-semibold uppercase text-slate-200">{tvShow.original_language || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-500 uppercase">Broadcast Status</p>
                        <p className="text-xs font-semibold text-emerald-400">{tvShow.status || 'Returning Series'}</p>
                      </div>
                    </div>

                    {/* Production Crew - Horizontal Reel */}
                    {crew.length > 0 && (
                      <div className="pt-6 border-t border-cyan-500/20 font-mono">
                        <h3 className="text-xs uppercase tracking-widest text-cyan-400 mb-4 font-bold">Key Production Crew &amp; Creators</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                          {crew.map((member) => (
                            <button
                              key={member.credit_id || member.id}
                              type="button"
                              onClick={() => handleSelectPerson(member.id)}
                              className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-24 text-center cursor-pointer transition-transform active:scale-95"
                            >
                              <div className="relative aspect-[2/3] w-20 rounded-xl overflow-hidden border border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-[#050811]">
                                {member.profile_path ? (
                                  <Image 
                                    src={`https://image.tmdb.org/t/p/w300${member.profile_path}`} 
                                    alt={member.name} 
                                    fill 
                                    unoptimized
                                    sizes="80px" 
                                    className="object-cover" 
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono font-bold">
                                    {member.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-200 mt-2 truncate w-full group-hover:text-cyan-300 transition-colors">
                                {member.name}
                              </span>
                              <span className="text-[10px] text-cyan-400/90 truncate w-full mt-0.5">
                                {member.job}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cast & Actors - Horizontal Reel */}
                    {cast.length > 0 && (
                      <div className="pt-6 border-t border-cyan-500/20 font-mono">
                        <h3 className="text-xs uppercase tracking-widest text-cyan-400 mb-4 font-bold">Key Cast &amp; Actors</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                          {cast.map((actor) => (
                            <button
                              key={actor.id}
                              type="button"
                              onClick={() => handleSelectPerson(actor.id)}
                              className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-24 text-center cursor-pointer transition-transform active:scale-95"
                            >
                              <div className="relative aspect-[2/3] w-20 rounded-xl overflow-hidden border border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-[#050811]">
                                {actor.profile_path ? (
                                  <Image 
                                    src={`https://image.tmdb.org/t/p/w300${actor.profile_path}`} 
                                    alt={actor.name} 
                                    fill 
                                    unoptimized
                                    sizes="80px" 
                                    className="object-cover" 
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono font-bold">
                                    {actor.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-200 mt-2 truncate w-full group-hover:text-cyan-300 transition-colors">
                                {actor.name}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate w-full mt-0.5">
                                {actor.character || 'Actor'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Similar Titles Reel */}
                    {allSimilarShows.length > 0 && (
                      <div className="pt-6 border-t border-cyan-500/20 space-y-4 font-mono">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <h3 className="text-xs uppercase tracking-widest text-cyan-400 font-bold">Similar Series Recommendations</h3>
                          {similarDisplayLimit < allSimilarShows.length && (
                            <button
                              type="button"
                              onClick={() => setSimilarDisplayLimit(prev => Math.min(prev + 8, allSimilarShows.length))}
                              className="px-3.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                            >
                              <span>🔄 More Series</span>
                            </button>
                          )}
                        </div>

                        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                          {displayedSimilar.map((sim) => {
                            const isSimSaved = (watchlist || []).some(w => String(w.id || w.movieId) === String(sim.id));
                            const simTitle = sim.name || sim.title || 'Similar Series';
                            const simYear = (sim.first_air_date || sim.release_date || '').split('-')[0] || 'N/A';
                            const simRating = sim.vote_average ? Number(sim.vote_average).toFixed(1) : null;

                            return (
                              <div 
                                key={sim.id}
                                onClick={() => handleSelectTvShow(sim.id)}
                                className="snap-start shrink-0 w-36 sm:w-40 bg-[#050811] border border-cyan-500/20 hover:border-cyan-400 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all group shadow-md hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(6,182,212,0.25)]"
                              >
                                <div>
                                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 mb-2 border border-cyan-500/20">
                                    {sim.poster_path ? (
                                      <Image 
                                        src={`https://image.tmdb.org/t/p/w300${sim.poster_path}`} 
                                        alt={simTitle} 
                                        fill 
                                        unoptimized
                                        sizes="160px" 
                                        className="object-cover group-hover:scale-105 transition-transform" 
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-[10px] text-slate-500 font-mono">N/A</div>
                                    )}
                                    {simRating && simRating > 0 && (
                                      <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-400 border border-amber-500/30">
                                        ★ {simRating}
                                      </div>
                                    )}
                                  </div>
                                  <p 
                                    className="text-xs font-bold line-clamp-2 h-8 leading-snug group-hover:text-cyan-300 transition-colors mb-1.5 px-0.5 text-white uppercase tracking-tight"
                                    title={simTitle}
                                  >
                                    {simTitle}
                                  </p>
                                  <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5 mb-2">
                                    <span>{simYear}</span>
                                    <span className="uppercase text-[8px] text-cyan-400/80">TV</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => toggleWatchlistForItem(sim, e)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                                    isSimSaved 
                                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                                      : 'bg-[#080d1a] text-slate-300 border-white/10 hover:border-cyan-400 hover:text-white'
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
                  </>
                )}

                {/* SUB-VIEW 2: REAL-TIME COMMUNITY TRANSMISSIONS */}
                {activeDossierTab === 'reviews' && (
                  <div className="pt-2">
                    <CommunityReviews movieId={tvShow.id} />
                  </div>
                )}

                {/* SUB-VIEW 3: SECTOR FORUMS & EPISODE DISCUSSIONS */}
                {activeDossierTab === 'forums' && (
                  <div className="pt-2">
                    <ForumSector movieId={tvShow.id} movieTitle={seriesTitle} />
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      )}

      {/* Global Review Modal Integration */}
      {isReviewModalOpen && tvShow && (
        <ReviewModal
          targetId={tvShow.id}
          targetTitle={seriesTitle}
          posterPath={tvShow.poster_path}
          mediaType="tv"
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}

    </div>
  );
}