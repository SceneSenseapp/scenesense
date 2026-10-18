// components/MovieModal.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useWatchlist } from '@/hooks/useWatchlist';
import ActorModal from '@/components/ActorModal';
import ReviewModal from '@/components/ReviewModal';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

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
  if (normalized.includes('youtube') || normalized.includes('google play')) return `https://www.youtube.com/results?search_query=${encodedTitle}+movie`;
  if (normalized.includes('vudu') || normalized.includes('fandango')) return `https://www.vudu.com/content/movies/search?searchString=${encodedTitle}`;
  if (normalized.includes('crunchyroll')) return `https://www.crunchyroll.com/search?q=${encodedTitle}`;
  if (normalized.includes('starz')) return `https://www.starz.com/us/en/search?q=${encodedTitle}`;

  return `https://www.google.com/search?q=${encodeURIComponent(`watch "${title}" on ${providerName}`)}`;
};

export default function MovieModal({ movieId: initialMovieId, mediaType: initialMediaType = 'movie', onClose }) {
  const [mounted, setMounted] = useState(false);

  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const prevInitialIdRef = useRef(null);

  const [media, setMedia] = useState(null);
  const [cast, setCast] = useState([]);
  const [crew, setCrew] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [allSimilar, setAllSimilar] = useState([]);
  const [similarDisplayLimit, setSimilarDisplayLimit] = useState(12);
  const [watchProviders, setWatchProviders] = useState(null);
  const [releaseDatesData, setReleaseDatesData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('US');
  const [isLoading, setIsLoading] = useState(true);
  const [playingTrailer, setPlayingTrailer] = useState(false);

  // Global Review Modal Toggle State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [showtimesText, setShowtimesText] = useState('');
  const [showtimesSources, setShowtimesSources] = useState([]);
  const [isLoadingShowtimes, setIsLoadingShowtimes] = useState(false);
  const [hasScannedShowtimes, setHasScannedShowtimes] = useState(false);
  const [noShowtimesFound, setNoShowtimesFound] = useState(false);

  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  const isSaved = media ? (watchlist || []).some((item) => String(item.id) === String(media.id)) : false;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialMovieId && String(initialMovieId) !== String(prevInitialIdRef.current)) {
      prevInitialIdRef.current = initialMovieId;
      setHistory([{ kind: 'movie', id: initialMovieId, mediaType: initialMediaType }]);
      setHistoryIdx(0);
      setMedia(null);
      setIsLoading(true);
    }
  }, [initialMovieId, initialMediaType]);

  const currentItem = history[historyIdx] || (initialMovieId ? { kind: 'movie', id: initialMovieId, mediaType: initialMediaType } : null);
  const isViewingPerson = currentItem?.kind === 'person';
  const currentMovieId = isViewingPerson ? null : currentItem?.id;
  const currentMediaType = currentItem?.mediaType || 'movie';
  const isTv = currentMediaType === 'tv';

  const pushHistory = (item) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIdx + 1);
      return [...trimmed, item];
    });
    setHistoryIdx((prev) => prev + 1);
  };

  const handleSelectMovie = (id, type = 'movie') => {
    pushHistory({ kind: 'movie', id, mediaType: type });
  };

  const handleSelectPerson = (personId) => {
    pushHistory({ kind: 'person', id: personId });
  };

  const goBack = () => {
    if (historyIdx > 0) {
      setHistoryIdx((prev) => prev - 1);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (initialMovieId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [initialMovieId]);

  useEffect(() => {
    if (!currentMovieId || isViewingPerson) return;

    let isActive = true;
    setPlayingTrailer(false);
    setSimilarDisplayLimit(12);
    setShowtimesText('');
    setShowtimesSources([]);
    setHasScannedShowtimes(false);
    setNoShowtimesFound(false);

    const fetchMediaData = async () => {
      setIsLoading(true);
      const endpoint = isTv ? 'tv' : 'movie';
      try {
        const [detailsData, creditsData, videosData, similarData, providersData, releaseData] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/${endpoint}/${currentMovieId}?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/${endpoint}/${currentMovieId}/credits?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/${endpoint}/${currentMovieId}/videos?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/${endpoint}/${currentMovieId}/similar?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/${endpoint}/${currentMovieId}/watch/providers?api_key=${TMDB_API_KEY}`).then(r => r.json()),
          isTv ? Promise.resolve({ results: [] }) : fetch(`https://api.themoviedb.org/3/movie/${currentMovieId}/release_dates?api_key=${TMDB_API_KEY}`).then(r => r.json())
        ]);

        if (!isActive) return;

        const trailer = videosData.results?.find((v) => v.type === 'Trailer' && v.site === 'YouTube');

        const consolidatedCast = (creditsData.cast || []).reduce((acc, current) => {
          const existing = acc.find(item => item.id === current.id);
          if (existing) {
            if (current.character && !existing.roles.includes(current.character)) {
              existing.roles.push(current.character);
            }
          } else {
            acc.push({
              id: current.id,
              name: current.name,
              profile_path: current.profile_path,
              roles: current.character ? [current.character] : ['Cast Member']
            });
          }
          return acc;
        }, []).slice(0, 18);

        const keyCrewRaw = (creditsData.crew || []).filter(c => 
          ['Director', 'Writer', 'Screenplay', 'Producer', 'Executive Producer', 'Creator'].includes(c.job)
        );

        const consolidatedCrew = keyCrewRaw.reduce((acc, current) => {
          const existing = acc.find(item => item.id === current.id);
          if (existing) {
            if (current.job && !existing.roles.includes(current.job)) {
              existing.roles.push(current.job);
            }
          } else {
            acc.push({
              id: current.id,
              name: current.name,
              profile_path: current.profile_path,
              roles: current.job ? [current.job] : ['Production']
            });
          }
          return acc;
        }, []).slice(0, 12);

        setMedia(detailsData);
        setCast(consolidatedCast);
        setCrew(consolidatedCrew);
        setTrailerKey(trailer ? trailer.key : null);
        setAllSimilar(similarData.results || []);
        setWatchProviders(providersData.results || {});
        setReleaseDatesData(releaseData.results || []);
      } catch (error) {
        console.error("Failed to fetch cinematic telemetry:", error);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchMediaData();

    return () => {
      isActive = false;
    };
  }, [currentMovieId, isTv, isViewingPerson]);

  const regionRelease = releaseDatesData.find(r => r.iso_3166_1 === selectedRegion);
  const theatricalRelease = regionRelease?.release_dates?.find(d => d.type === 3 || d.type === 2);
  const isCurrentlyInTheaters = !isTv && Boolean(theatricalRelease);

  const handleScanShowtimes = async () => {
    if (!media) return;
    setIsLoadingShowtimes(true);
    setHasScannedShowtimes(true);
    setNoShowtimesFound(false);

    try {
      const title = media.title || media.name;
      const locationQuery = selectedRegion === 'CA' ? 'London, Ontario' : 'New York, US';
      const res = await fetch('/api/showtimes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, location: locationQuery })
      });

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Non-JSON showtimes uplink response:", parseError);
      }

      if (json.success && json.showtimesText?.trim()) {
        setShowtimesText(json.showtimesText);
        setShowtimesSources(json.sources || []);
      } else {
        setNoShowtimesFound(true);
        setShowtimesText('');
        setShowtimesSources([]);
      }
    } catch (e) {
      console.error("Failed to load live showtimes:", e);
      setNoShowtimesFound(true);
    } finally {
      setIsLoadingShowtimes(false);
    }
  };

  if (!initialMovieId || !mounted) return null;

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const handleAskCineMind = () => {
    if (!media) return;
    const title = media.title || media.name;
    const dateStr = media.release_date || media.first_air_date || '';
    const params = new URLSearchParams({
      topic: 'film',
      id: media.id,
      title,
      year: dateStr.split('-')[0],
      overview: media.overview || '',
      genres: (media.genres || []).map(g => g.name).join(', ')
    });
    router.push(`/chat?${params.toString()}`);
  };

  const toggleWatchlistForItem = (item, e) => {
    if (e) e.stopPropagation();
    const itemWithMediaType = { ...item, media_type: currentMediaType };
    const isAlreadySaved = (watchlist || []).some(w => String(w.id) === String(item.id));
    if (isAlreadySaved) {
      removeFromWatchlist(item.id);
    } else {
      saveToWatchlist(itemWithMediaType);
    }
  };

  const regionData = watchProviders?.[selectedRegion] || {};
  const displayedSimilar = allSimilar.slice(0, similarDisplayLimit);
  const mediaTitle = media ? (media.title || media.name) : '';
  const releaseYear = media ? (media.release_date || media.first_air_date || '').split('-')[0] : '';

  const modalContent = (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-2 sm:p-4 md:p-6 overflow-y-auto scrollbar-stealth-pill font-sans" role="dialog" aria-modal="true">
      
      {isViewingPerson ? (
        <ActorModal
          personId={currentItem.id}
          onClose={onClose}
          onSelectMovie={handleSelectMovie}
          canGoBack={historyIdx > 0}
          canGoForward={historyIdx < history.length - 1}
          onGoBack={goBack}
          onGoForward={goForward}
        />
      ) : (
        <>
          {media?.backdrop_path && (
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-25 z-0">
              <Image
                src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`}
                alt=""
                fill
                unoptimized
                priority
                className="object-cover blur-3xl scale-110"
              />
            </div>
          )}

          <div className="bg-[#07070d]/95 border border-cyan-500/30 w-full max-w-6xl rounded-[28px] sm:rounded-[36px] p-6 sm:p-10 relative shadow-[0_25px_100px_rgba(6,182,212,0.3)] my-4 text-white z-10">
            
            {/* Navigation & Control Bar */}
            <div className="flex items-center justify-between pb-6 border-b border-cyan-500/20 mb-8 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={historyIdx <= 0}
                  className="px-3.5 py-2 rounded-xl bg-[#0e0e16] border border-cyan-500/30 hover:border-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">Back</span>
                </button>
                <button
                  type="button"
                  onClick={goForward}
                  disabled={historyIdx >= history.length - 1}
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

                <button
                  type="button"
                  onClick={handleAskCineMind}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer active:scale-95"
                >
                  <span>🧠</span>
                  <span>Brief CineMind</span>
                </button>

                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${mediaTitle} movie where to watch stream`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#121218] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md cursor-pointer group active:scale-95"
                  title="Search Online Availability"
                >
                  <span>🌐</span>
                  <span>Web Search</span>
                </a>

                <button
                  type="button"
                  onClick={() => toggleWatchlistForItem(media)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border flex items-center gap-1.5 active:scale-95 ${
                    isSaved 
                      ? 'bg-emerald-600/25 text-emerald-400 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-600/35' 
                      : 'bg-black/60 text-gray-300 border-cyan-500/30 hover:bg-cyan-500/20 hover:text-white'
                  }`}
                >
                  <span>{isSaved ? '✓ In Watchlist' : '+ Watchlist'}</span>
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
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Scanning {isTv ? 'Series' : 'Film'} Telemetry...</span>
              </div>
            ) : !media ? (
              <div className="text-center py-24 text-gray-400 text-sm">Transmission not found.</div>
            ) : (
              <div className="space-y-10 max-h-[75vh] overflow-y-auto pr-3 scrollbar-stealth-pill">
                
                {/* Header Details Hero */}
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <div className="relative w-48 sm:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 border border-cyan-500/30 shrink-0 shadow-2xl">
                    {media.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                        alt={mediaTitle}
                        fill
                        priority
                        unoptimized
                        sizes="224px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-500 font-mono">No Image Available</div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 flex-1 text-center md:text-left">
                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">{mediaTitle}</h1>
                    <p className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">
                      {releaseYear} • ★ {media.vote_average ? media.vote_average.toFixed(1) : 'N/A'} / 10 • {isTv ? `${media.number_of_seasons} Seasons (${media.number_of_episodes} Eps)` : `${media.runtime} min`}
                    </p>

                    {media.genres && (
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {media.genres.map(g => (
                          <span key={g.id} className="px-3 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-full text-[10px] font-mono text-cyan-300">{g.name}</span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-light">{media.overview}</p>
                  </div>
                </div>

                {/* Video Trailer */}
                {trailerKey && (
                  <div className="w-full max-w-4xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl relative transform-gpu group">
                    {playingTrailer ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&modestbranding=1&rel=0&playsinline=1`}
                        title="Trailer"
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
                        <div className="relative z-10 w-16 h-16 rounded-full bg-cyan-600 flex items-center justify-center text-white text-2xl shadow-[0_0_30px_rgba(6,182,212,0.8)] group-hover:scale-110 transition-transform">
                          ▶
                        </div>
                        <span className="absolute bottom-4 left-4 text-xs font-mono font-bold text-white bg-black/70 px-3 py-1.5 rounded-lg backdrop-blur-md border border-cyan-500/30">
                          Play HD Trailer
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Theatrical Showtimes Panel */}
                {isCurrentlyInTheaters && (
                  <div className="bg-gradient-to-r from-red-950/70 via-rose-950/50 to-black border-2 border-red-500/50 rounded-2xl p-6 space-y-4 shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-red-500/20 pb-4">
                      <div>
                        <span className="px-2.5 py-1 bg-red-600 text-white font-mono text-[10px] font-black uppercase rounded tracking-widest">
                          In Theaters Now ({selectedRegion})
                        </span>
                        <h4 className="text-base font-bold text-white mt-1">Live Local Showtimes &amp; Box Office Tickets</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleScanShowtimes}
                          disabled={isLoadingShowtimes}
                          className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                          {isLoadingShowtimes ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                              <span>Scanning...</span>
                            </>
                          ) : hasScannedShowtimes ? (
                            '🔄 Re-Scan'
                          ) : (
                            '🔍 View Showtimes'
                          )}
                        </button>

                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(mediaTitle + ' showtimes tickets near me')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-black/70 hover:bg-black/90 border border-red-500/40 text-red-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <span>🎟️ Search Showtimes</span>
                        </a>
                      </div>
                    </div>

                    {isLoadingShowtimes && (
                      <div className="flex items-center gap-3 py-3 text-xs font-mono text-red-300">
                        <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></span>
                        Retrieving cinema schedules via live satellite uplink...
                      </div>
                    )}

                    {hasScannedShowtimes && !isLoadingShowtimes && showtimesText && (
                      <div className="space-y-3">
                        <div className="text-xs text-gray-200 whitespace-pre-line leading-relaxed bg-black/50 p-4 rounded-xl border border-red-500/20 font-mono">
                          {showtimesText}
                        </div>

                        {showtimesSources.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <span className="text-[10px] font-mono text-gray-400 self-center">Verified Cinema Feeds:</span>
                            {showtimesSources.map((chunk, i) => chunk.web?.uri && (
                              <a
                                key={i}
                                href={chunk.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-mono px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/30 rounded text-red-200 truncate max-w-[200px]"
                              >
                                {chunk.web.title || 'Cinema Partner'} ↗
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {hasScannedShowtimes && !isLoadingShowtimes && noShowtimesFound && (
                      <div className="text-xs text-red-300/80 bg-black/50 p-3.5 rounded-xl border border-red-500/20 flex items-center justify-between">
                        <span>No automated schedules returned for your immediate postal zone. Check Google Tickets directly via the button above.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Streaming Network Hub */}
                <div className="bg-black/60 border border-cyan-500/25 rounded-2xl p-6 space-y-5 shadow-xl">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 flex-wrap gap-2">
                    <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">
                      Streaming Network Feeds
                    </h3>
                    <select
                      value={selectedRegion}
                      onChange={(e) => {
                        setSelectedRegion(e.target.value);
                        setHasScannedShowtimes(false);
                        setNoShowtimesFound(false);
                        setShowtimesText('');
                        setShowtimesSources([]);
                      }}
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
                      <p className="text-[10px] font-mono uppercase text-gray-400 mb-2">Subscription Feeds</p>
                      {regionData.flatrate && regionData.flatrate.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {regionData.flatrate.map((prov) => (
                            <a
                              key={prov.provider_id}
                              href={getProviderDirectUrl(prov.provider_name, mediaTitle)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 bg-[#181820] hover:bg-[#252530] border border-cyan-500/20 px-3.5 py-2 rounded-xl transition-all group cursor-pointer"
                              title={`Watch "${mediaTitle}" on ${prov.provider_name}`}
                            >
                              <div className="relative w-6 h-6 rounded overflow-hidden bg-white/10 shrink-0">
                                <Image 
                                  src={`https://image.tmdb.org/t/p/w92${prov.logo_path}`} 
                                  alt={prov.provider_name} 
                                  fill 
                                  unoptimized
                                  sizes="24px" 
                                  className="object-cover" 
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-200 group-hover:text-white">{prov.provider_name}</span>
                              <span className="text-[10px] text-cyan-400 opacity-60 group-hover:opacity-100">↗</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No subscription streaming options recorded in this region.</p>
                      )}
                    </div>

                    {(regionData.rent?.length > 0 || regionData.buy?.length > 0) && (
                      <div className="pt-3 border-t border-white/5">
                        <p className="text-[10px] font-mono uppercase text-gray-400 mb-2">Digital Rent / Purchase</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(new Map([...(regionData.rent || []), ...(regionData.buy || [])].map(p => [p.provider_id, p])).values()).map((prov) => (
                            <a
                              key={prov.provider_id}
                              href={getProviderDirectUrl(prov.provider_name, mediaTitle)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#121218] hover:bg-[#1a1a24] border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all cursor-pointer"
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

                    <div className="pt-2 text-[10px] font-mono text-gray-500 border-t border-white/5">
                      Streaming availability powered by JustWatch via TMDB. Data is non-commercial.
                    </div>
                  </div>
                </div>

                {/* Financial Telemetry */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/30 border border-cyan-500/20 rounded-xl p-3 text-center font-mono">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase">Budget</p>
                    <p className="text-xs font-semibold text-emerald-400">{formatCurrency(media.budget)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase">Box Office</p>
                    <p className="text-xs font-semibold text-emerald-400">{formatCurrency(media.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase">Language</p>
                    <p className="text-xs font-semibold uppercase">{media.original_language || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase">Status</p>
                    <p className="text-xs font-semibold text-cyan-400">{media.status || 'Released'}</p>
                  </div>
                </div>

                {/* Production Crew - Horizontal Reel */}
                {crew.length > 0 && (
                  <div className="pt-6 border-t border-cyan-500/20">
                    <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 mb-4 font-bold">Key Production Crew &amp; Creators</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                      {crew.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelectPerson(member.id)}
                          className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-24 text-center cursor-pointer transition-transform active:scale-95"
                        >
                          <div className="relative aspect-[2/3] w-20 rounded-xl overflow-hidden border border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-[#141420]">
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
                              <div className="flex items-center justify-center h-full text-xs text-gray-500 font-mono font-bold">
                                {member.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-bold text-gray-200 mt-2 truncate w-full group-hover:text-cyan-300 transition-colors">
                            {member.name}
                          </span>
                          <span className="text-[10px] text-cyan-400/90 truncate w-full font-mono mt-0.5">
                            {member.roles.join(', ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cast & Actors - Horizontal Reel */}
                {cast.length > 0 && (
                  <div className="pt-6 border-t border-cyan-500/20">
                    <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 mb-4 font-bold">Key Cast &amp; Actors</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                      {cast.map((actor) => (
                        <button
                          key={actor.id}
                          type="button"
                          onClick={() => handleSelectPerson(actor.id)}
                          className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-24 text-center cursor-pointer transition-transform active:scale-95"
                        >
                          <div className="relative aspect-[2/3] w-20 rounded-xl overflow-hidden border border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] bg-[#141420]">
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
                              <div className="flex items-center justify-center h-full text-xs text-gray-500 font-mono font-bold">
                                {actor.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-bold text-gray-200 mt-2 truncate w-full group-hover:text-cyan-300 transition-colors">
                            {actor.name}
                          </span>
                          <span className="text-[10px] text-gray-400 truncate w-full font-mono mt-0.5">
                            {actor.roles.join(', ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Similar Titles - Clean Artwork Side Scroller */}
                {allSimilar.length > 0 && (
                  <div className="pt-6 border-t border-cyan-500/20 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">Similar Film Recommendations</h3>
                      {similarDisplayLimit < allSimilar.length && (
                        <button
                          type="button"
                          onClick={() => setSimilarDisplayLimit(prev => Math.min(prev + 8, allSimilar.length))}
                          className="px-3.5 py-1.5 bg-cyan-950/60 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md"
                        >
                          <span>🔄 More Recommendations</span>
                        </button>
                      )}
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
                      {displayedSimilar.map((sim) => {
                        const isSimSaved = (watchlist || []).some(w => String(w.id) === String(sim.id));
                        const simTitle = sim.title || sim.name || 'Similar Title';
                        const simYear = (sim.release_date || sim.first_air_date || '').split('-')[0] || 'N/A';
                        const simRating = sim.vote_average ? Number(sim.vote_average).toFixed(1) : null;

                        return (
                          <div 
                            key={sim.id}
                            onClick={() => handleSelectMovie(sim.id, currentMediaType)}
                            className="snap-start shrink-0 w-36 sm:w-40 bg-black/60 border border-cyan-500/20 hover:border-cyan-400 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all group shadow-md hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(6,182,212,0.25)]"
                          >
                            <div>
                              {/* 100% Clean Poster Art (No Overlapping Badges) */}
                              <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-white/5 mb-2 border border-cyan-500/20">
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
                                  <div className="flex items-center justify-center h-full text-[10px] text-gray-500 font-mono">N/A</div>
                                )}
                              </div>
                              <p 
                                className="text-xs font-bold line-clamp-2 h-8 leading-snug group-hover:text-cyan-300 transition-colors mb-1.5 px-0.5"
                                title={simTitle}
                              >
                                {simTitle}
                              </p>
                              <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 px-0.5 mb-2">
                                <span>{simYear}</span>
                                {simRating && simRating > 0 && (
                                  <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                    <span>★</span> {simRating}
                                  </span>
                                )}
                              </div>
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
        </>
      )}

      {/* Global Review Modal Integration */}
      {isReviewModalOpen && media && (
        <ReviewModal
          targetId={media.id}
          targetTitle={mediaTitle}
          posterPath={media.poster_path}
          mediaType={currentMediaType}
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}

    </div>
  );

  return createPortal(modalContent, document.body);
}