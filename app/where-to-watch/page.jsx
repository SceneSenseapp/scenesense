// File: app/where-to-watch/page.jsx
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';
import MovieModal from '@/components/MovieModal';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "e2b0c95a0bc07e997f769f3d9b4b0db3";

const GENRES = [
  { id: null, label: 'All Genres' },
  { id: 28, label: 'Action' },
  { id: 12, label: 'Adventure' },
  { id: 16, label: 'Animation' },
  { id: 35, label: 'Comedy' },
  { id: 80, label: 'Crime' },
  { id: 99, label: 'Documentary' },
  { id: 18, label: 'Drama' },
  { id: 10751, label: 'Family' },
  { id: 14, label: 'Fantasy' },
  { id: 27, label: 'Horror' },
  { id: 9648, label: 'Mystery' },
  { id: 10749, label: 'Romance' },
  { id: 878, label: 'Sci-Fi' },
  { id: 53, label: 'Thriller' }
];

const REGIONS = [
  { id: 'CA', label: 'Canada 🇨🇦' },
  { id: 'US', label: 'United States 🇺🇸' },
  { id: 'GB', label: 'United Kingdom 🇬🇧' },
  { id: 'AU', label: 'Australia 🇦🇺' }
];

const MEDIA_TYPES = [
  { id: 'all', label: 'All Formats' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' }
];

const detectUserRegion = () => {
  if (typeof window === 'undefined') return 'CA';

  try {
    const saved = localStorage.getItem('scenesense_region');
    if (saved && REGIONS.some(r => r.id === saved)) return saved;

    const locale = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    const localeCountry = locale.split('-')[1]?.toUpperCase();
    if (REGIONS.some(r => r.id === localeCountry)) return localeCountry;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      tz.startsWith('Canada/') ||
      tz.includes('Toronto') ||
      tz.includes('Vancouver') ||
      tz.includes('Edmonton') ||
      tz.includes('Winnipeg') ||
      tz.includes('Halifax')
    ) {
      return 'CA';
    }
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('America/') && !tz.includes('Toronto') && !tz.includes('Vancouver')) return 'US';
  } catch (e) {
    console.warn('Region auto-detect fallback applied:', e);
  }

  return 'CA';
};

export default function WhereToWatchPage() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState('all');
  const [movies, setMovies] = useState([]);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(() => detectUserRegion());
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [providerList, setProviderList] = useState([]);
  
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);

  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState('movie');
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const newBatchRef = useRef(null);
  const prevCountRef = useRef(0);

  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  // Route protection
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login'); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load live watch providers based on territory & media format
  useEffect(() => {
    let isCancelled = false;
    const fetchProviders = async () => {
      try {
        const endpoint = mediaType === 'tv'
          ? `https://api.themoviedb.org/3/watch/providers/tv?api_key=${TMDB_API_KEY}&watch_region=${selectedRegion}`
          : `https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=${selectedRegion}`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data.results)) {
            const targetIds = [8, 9, 337, 387, 15, 350, 230, 531, 386, 2, 119]; 
            const filtered = data.results.filter(p => targetIds.includes(p.provider_id) || (p.display_priority !== undefined && p.display_priority < 25));
            
            const formatted = [
              { id: null, label: 'All Services', logo: null },
              ...filtered.map(p => ({
                id: p.provider_id,
                label: p.provider_name,
                logo: p.logo_path
              }))
            ];
            setProviderList(formatted);
          }
        }
      } catch (e) {
        console.warn("Failed to load live watch providers:", e);
      }
    };
    fetchProviders();
    return () => { isCancelled = true; };
  }, [selectedRegion, mediaType]);

  const openModal = (item) => {
    const itemType = item.media_type || (mediaType === 'all' ? (item.title ? 'movie' : 'tv') : mediaType);
    setSelectedMovieId(item.id);
    setSelectedMediaType(itemType);
    window.history.pushState(null, '', `?movieId=${item.id}&type=${itemType}`);
  };

  const closeModal = () => {
    setSelectedMovieId(null);
    window.history.pushState(null, '', window.location.pathname);
  };

  // Synchronize modal state with URL query parameters and browser navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncModalFromParams = () => {
      const params = new URLSearchParams(window.location.search);
      const movieId = params.get('movieId');
      const type = params.get('type') || 'movie';
      if (movieId) {
        setSelectedMovieId(movieId);
        setSelectedMediaType(type);
      } else {
        setSelectedMovieId(null);
      }
    };

    syncModalFromParams();
    window.addEventListener('popstate', syncModalFromParams);
    return () => window.removeEventListener('popstate', syncModalFromParams);
  }, []);

  const getSingleTypeUrl = useCallback((targetPage, targetType, cat, genre, prov, reg, sort) => {
    if (genre || prov || (sort !== 'popularity.desc' && cat === 'trending')) {
      let endpoint = `https://api.themoviedb.org/3/discover/${targetType}?api_key=${TMDB_API_KEY}&sort_by=${sort}&page=${targetPage}`;
      if (genre) endpoint += `&with_genres=${genre}`;
      if (prov) endpoint += `&with_watch_providers=${prov}&watch_region=${reg}`;
      else endpoint += `&watch_region=${reg}`;
      return endpoint;
    }

    switch (cat) {
      case 'popular':
        return `https://api.themoviedb.org/3/${targetType}/popular?api_key=${TMDB_API_KEY}&region=${reg}&page=${targetPage}`;

      case 'top_rated':
        return `https://api.themoviedb.org/3/${targetType}/top_rated?api_key=${TMDB_API_KEY}&region=${reg}&page=${targetPage}`;

      case 'now_playing':
        return targetType === 'tv'
          ? `https://api.themoviedb.org/3/tv/on_the_air?api_key=${TMDB_API_KEY}&page=${targetPage}`
          : `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&region=${reg}&page=${targetPage}`;

      case 'upcoming':
        return targetType === 'tv'
          ? `https://api.themoviedb.org/3/tv/airing_today?api_key=${TMDB_API_KEY}&page=${targetPage}`
          : `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&region=${reg}&page=${targetPage}`;

      case 'trending':
      default:
        return `https://api.themoviedb.org/3/trending/${targetType}/day?api_key=${TMDB_API_KEY}&page=${targetPage}`;
    }
  }, []);

  const fetchTitlesBatch = useCallback(async (targetPage) => {
    if (searchQuery.trim()) {
      const searchUrl = mediaType === 'all'
        ? `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=${targetPage}`
        : `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=${targetPage}`;
      
      const res = await fetch(searchUrl);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map(item => ({
        ...item,
        media_type: item.media_type || (mediaType === 'all' ? (item.title ? 'movie' : 'tv') : mediaType)
      }));
    }

    if (activeCategory === 'trending' && mediaType === 'all' && !selectedGenre && !selectedProvider) {
      const res = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&page=${targetPage}`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map(item => ({
        ...item,
        media_type: item.media_type || (item.title ? 'movie' : 'tv')
      }));
    }

    if (mediaType === 'all') {
      const movieUrl = getSingleTypeUrl(targetPage, 'movie', activeCategory, selectedGenre, selectedProvider, selectedRegion, sortBy);
      const tvUrl = getSingleTypeUrl(targetPage, 'tv', activeCategory, selectedGenre, selectedProvider, selectedRegion, sortBy);

      const [movieRes, tvRes] = await Promise.all([fetch(movieUrl), fetch(tvUrl)]);
      const [movieData, tvData] = await Promise.all([
        movieRes.ok ? movieRes.json() : { results: [] },
        tvRes.ok ? tvRes.json() : { results: [] }
      ]);

      const moviesList = (movieData.results || []).map(m => ({ ...m, media_type: 'movie' }));
      const tvList = (tvData.results || []).map(t => ({ ...t, media_type: 'tv' }));

      const combined = [];
      const seen = new Set();
      const maxLength = Math.max(moviesList.length, tvList.length);

      for (let i = 0; i < maxLength; i++) {
        if (moviesList[i] && !seen.has(`movie-${moviesList[i].id}`)) {
          seen.add(`movie-${moviesList[i].id}`);
          combined.push(moviesList[i]);
        }
        if (tvList[i] && !seen.has(`tv-${tvList[i].id}`)) {
          seen.add(`tv-${tvList[i].id}`);
          combined.push(tvList[i]);
        }
      }
      return combined;
    }

    const endpoint = getSingleTypeUrl(targetPage, mediaType, activeCategory, selectedGenre, selectedProvider, selectedRegion, sortBy);
    const res = await fetch(endpoint);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(item => ({ ...item, media_type: mediaType }));
  }, [searchQuery, mediaType, activeCategory, selectedGenre, selectedProvider, selectedRegion, sortBy, getSingleTypeUrl]);

  const fetchMovies = useCallback(async () => {
    setIsLoadingSearch(true);
    try {
      const results = await fetchTitlesBatch(1);
      const filtered = results.filter(item => item.poster_path || item.backdrop_path);
      setMovies(filtered);
      prevCountRef.current = filtered.length;
    } catch (e) {
      console.warn("Satellite provider feed warning:", e);
    } finally {
      setIsLoadingSearch(false);
    }
  }, [fetchTitlesBatch]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        fetchMovies();
      }, 300);
      return () => clearTimeout(timer);
    }

    fetchMovies();
  }, [searchQuery, mediaType, activeCategory, selectedGenre, selectedProvider, selectedRegion, sortBy, fetchMovies]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMovies();
  };

  const loadMoreMovies = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    try {
      const results = await fetchTitlesBatch(nextPage);
      if (results && results.length > 0) {
        const filtered = results.filter(item => item.poster_path || item.backdrop_path);
        prevCountRef.current = movies.length;

        setMovies(prev => {
          const seen = new Set(prev.map(m => `${m.media_type || 'm'}-${m.id}`));
          const uniqueNew = filtered.filter(m => !seen.has(`${m.media_type || 'm'}-${m.id}`));
          return [...prev, ...uniqueNew];
        });

        setTimeout(() => {
          if (newBatchRef.current) {
            newBatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } catch (e) {
      console.warn("Failed to fetch additional provider records:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleWatchlist = (movie, e) => {
    e.preventDefault();
    e.stopPropagation();

    const isSaved = (watchlist || []).some(item => String(item.id || item.movieId) === String(movie.id));
    if (isSaved) {
      removeFromWatchlist(movie.id);
    } else {
      saveToWatchlist(movie);
    }
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setMediaType('all');
    setActiveCategory('trending');
    setSelectedGenre(null);
    setSelectedProvider(null);
    setSortBy('popularity.desc');
    setPage(1);
  };

  const currentProviderObj = providerList.find(p => p.id === selectedProvider);
  const currentGenreObj = GENRES.find(g => g.id === selectedGenre);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchQuery || 
      selectedGenre !== null || 
      selectedProvider !== null || 
      sortBy !== 'popularity.desc' || 
      mediaType !== 'all' || 
      activeCategory !== 'trending'
    );
  }, [searchQuery, selectedGenre, selectedProvider, sortBy, mediaType, activeCategory]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto mt-6 md:mt-10 p-5 md:p-8 min-h-[85vh] flex flex-col bg-[#050508] border border-cyan-500/20 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.15)] text-white relative overflow-hidden font-sans">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER COMMAND HUD */}
      <div className="border-b border-cyan-500/20 pb-8 mb-8 space-y-6 relative z-10">
        
        {/* Title & Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
              GLOBAL STREAMING DIRECTORY // 2026
            </span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-mono">
            Where To Watch
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-normal max-w-2xl leading-relaxed">
            Cross-reference live regional streaming catalogs, verify release availability across Netflix, Prime Video, Disney+, Apple TV+, and track cinema releases in real-time.
          </p>
        </div>

        {/* UNIFIED INPUT COMMAND BAR */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-[#080d1a]/80 p-2.5 rounded-2xl border border-cyan-500/20 backdrop-blur-md shadow-inner">
          
          {/* Target Territory */}
          <div className="md:col-span-3">
            <select
              value={selectedRegion}
              onChange={(e) => {
                const newReg = e.target.value;
                setPage(1);
                setSelectedRegion(newReg);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('scenesense_region', newReg);
                }
              }}
              className="w-full bg-[#050811] border border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
            >
              {REGIONS.map((reg) => (
                <option key={reg.id} value={reg.id}>{reg.label}</option>
              ))}
            </select>
          </div>

          {/* Media Format Switcher */}
          <div className="md:col-span-3 flex bg-[#050811] p-1 rounded-xl border border-cyan-500/20">
            {MEDIA_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setPage(1);
                  setMediaType(type.id);
                }}
                className={`flex-1 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  mediaType === type.id
                    ? 'bg-cyan-500 text-black shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Search Input Bar */}
          <div className="md:col-span-6">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setPage(1);
                  setSearchQuery(e.target.value);
                }}
                placeholder={mediaType === 'all' ? "Search all titles..." : `Search ${mediaType === 'movie' ? 'movies' : 'series'}...`}
                className="w-full bg-[#050811] border border-cyan-500/20 rounded-xl px-4 py-2 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all shadow-inner font-mono"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => { 
                    setPage(1);
                    setSearchQuery(''); 
                  }}
                  className="px-3 py-2 bg-[#141420] hover:bg-[#1f1f2e] text-slate-300 text-xs font-mono font-bold rounded-xl transition-colors border border-cyan-500/20 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </form>
          </div>

        </div>

      </div>

      {/* FILTER & TAXONOMY BAR */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 relative z-10 font-mono text-xs">
        
        {/* Category Selection Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'trending', label: '🔥 Trending' },
            { id: 'popular', label: '⚡ Popular' },
            { id: 'top_rated', label: '★ Top Rated' },
            { id: 'now_playing', label: '🎟 Theaters' },
            { id: 'upcoming', label: '📡 Upcoming' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setPage(1);
                setSearchQuery('');
                setActiveCategory(cat.id);
              }}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                !searchQuery && !selectedGenre && activeCategory === cat.id 
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] border border-cyan-400/50' 
                  : 'bg-[#080d1a] text-slate-400 hover:text-white border border-cyan-500/20 hover:border-cyan-500/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dropdowns Group */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsProviderModalOpen(true)}
            className="flex items-center gap-2 bg-[#080d1a] border border-cyan-500/20 hover:border-cyan-400 px-3.5 py-2 rounded-xl font-bold text-slate-200 transition-all cursor-pointer shadow-inner"
          >
            {currentProviderObj?.logo ? (
              <div className="relative w-3.5 h-3.5 rounded overflow-hidden bg-white/10 shrink-0">
                <Image
                  src={`https://image.tmdb.org/t/p/w92${currentProviderObj.logo}`}
                  alt={currentProviderObj.label}
                  fill
                  sizes="14px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-3.5 h-3.5 rounded bg-cyan-600 flex items-center justify-center text-[7px] font-bold text-white">ALL</div>
            )}
            <span>{currentProviderObj ? currentProviderObj.label : 'Service'}</span>
            <span className="text-[9px] text-cyan-400">▼</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGenreModalOpen(true)}
            className="flex items-center gap-2 bg-[#080d1a] border border-cyan-500/20 hover:border-cyan-400 px-3.5 py-2 rounded-xl font-bold text-slate-200 transition-all cursor-pointer shadow-inner"
          >
            <span>{currentGenreObj ? currentGenreObj.label : 'All Genres'}</span>
            <span className="text-[9px] text-cyan-400">▼</span>
          </button>

          <select
            value={sortBy}
            onChange={(e) => {
              setPage(1);
              setSortBy(e.target.value);
            }}
            className="bg-[#080d1a] border border-cyan-500/20 font-bold text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-cyan-400 cursor-pointer transition-all shadow-inner"
          >
            <option value="popularity.desc">Sort: Popular</option>
            <option value="vote_average.desc">Sort: Rated</option>
            <option value="primary_release_date.desc">Sort: Newest</option>
            <option value="revenue.desc">Sort: Box Office</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3 py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-300 rounded-xl font-bold text-[11px] transition-all cursor-pointer shadow-sm"
              title="Reset all search parameters and active filters"
            >
              Reset ✕
            </button>
          )}
        </div>

      </div>

      {searchQuery && (
        <div className="mb-6 text-xs text-cyan-400 font-mono font-medium px-1">
          Showing search results for: &quot;<span className="text-white font-bold">{searchQuery}</span>&quot; in <span className="uppercase font-bold text-white">{mediaType}</span>
        </div>
      )}

      {/* TITLES GRID CONTAINER */}
      {isLoadingSearch ? (
        <div className="flex flex-col justify-center items-center py-32 gap-3">
          <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-mono">Querying live satellite provider telemetry...</p>
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 relative z-10">
            {movies.map((item, index) => {
              const uniqueKey = `${item.id}-${item.media_type || 'title'}-${index}`;
              const isSaved = (watchlist || []).some(w => String(w.id || w.movieId) === String(item.id));
              const displayTitle = item.title || item.name || 'Untitled';
              const releaseYear = (item.release_date || item.first_air_date || '').slice(0, 4) || 'N/A';
              const rating = item.vote_average ? Number(item.vote_average).toFixed(1) : null;
              const isFirstOfNewBatch = index === prevCountRef.current;
              
              return (
                <div 
                  key={uniqueKey}
                  ref={isFirstOfNewBatch ? newBatchRef : null}
                  className="bg-[#080d1a] border border-cyan-500/20 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-cyan-400 hover:shadow-[0_10px_30px_rgba(6,182,212,0.2)] transition-all duration-300"
                >
                  <div 
                    onClick={(e) => {
                      e.preventDefault();
                      openModal(item);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="relative aspect-[2/3] w-full bg-[#141420] overflow-hidden">
                      {item.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                          alt={displayTitle}
                          fill
                          sizes="(max-width: 768px) 100vw, 200px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-500 p-2 text-center font-mono">{displayTitle}</div>
                      )}

                      {rating && (
                        <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                          ★ {rating}
                        </div>
                      )}
                    </div>

                    <div className="p-3.5 pb-1 relative z-10 bg-[#080d1a] font-mono">
                      <h3 className="font-bold text-xs line-clamp-1 text-white group-hover:text-cyan-300 transition-colors uppercase tracking-tight" title={displayTitle}>
                        {displayTitle}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{releaseYear}</span>
                        <span className="text-cyan-400/80 group-hover:text-cyan-300 text-[9px] uppercase">Dossier →</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 pt-2 bg-[#080d1a] relative z-10">
                    <button
                      type="button"
                      onClick={(e) => toggleWatchlist(item, e)}
                      className={`w-full py-2 px-3 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 border ${
                        isSaved 
                          ? 'bg-cyan-950/70 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900/60 shadow-[0_0_12px_rgba(6,182,212,0.2)]' 
                          : 'bg-[#141420] text-slate-300 border-white/10 hover:border-cyan-400 hover:text-white'
                      }`}
                    >
                      <span>{isSaved ? '✓ Saved' : '+ Watchlist'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex flex-col items-center justify-center mt-14 mb-6 relative z-10 gap-3">
            <button 
              type="button"
              onClick={loadMoreMovies} 
              disabled={isLoadingMore}
              className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:bg-slate-800 text-white px-10 py-3 rounded-xl font-mono font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95"
            >
              {isLoadingMore ? 'Decrypting feeds...' : 'See More Titles'}
            </button>
            <span className="text-[10px] font-mono text-slate-500">
              Where to Watch satellite integration powered by TMDB JustWatch feeds.
            </span>
          </div>
        </>
      ) : (
        <div className="py-32 text-center text-slate-500 text-sm font-mono">No signals found on the SceneSense streaming radar.</div>
      )}

      {/* STREAMING PROVIDERS POPUP MODAL */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#080d1a] border border-cyan-500/40 w-full max-w-lg p-6 shadow-2xl relative rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-6">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight font-mono">Filter Streaming Service</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Available platforms in {selectedRegion}[cite: 22]</p>
              </div>
              <button
                type="button"
                onClick={() => setIsProviderModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {providerList.map((prov) => {
                const isSelected = selectedProvider === prov.id;
                return (
                  <button
                    key={prov.id ?? 'all-modal'}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setSelectedProvider(prov.id);
                      setIsProviderModalOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-left border ${
                      isSelected 
                        ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-lg' 
                        : 'bg-[#050811] border-cyan-500/15 hover:border-cyan-500/40 text-slate-300 hover:text-white'
                    }`}
                  >
                    {prov.logo ? (
                      <div className="relative w-6 h-6 rounded overflow-hidden bg-white/10 shrink-0 border border-white/10">
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${prov.logo}`}
                          alt={prov.label}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center text-[8px] font-bold text-white shrink-0">ALL</div>
                    )}
                    <span className="truncate">{prov.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GENRES POPUP MODAL */}
      {isGenreModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#080d1a] border border-cyan-500/40 w-full max-w-lg p-6 shadow-2xl relative rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-6">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight font-mono">Select Genre Channel</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Filter by narrative taxonomy</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGenreModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {GENRES.map((genre) => {
                const isSelected = selectedGenre === genre.id;
                return (
                  <button
                    key={genre.id ?? 'all-genre-modal'}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setSelectedGenre(genre.id);
                      setIsGenreModalOpen(false);
                    }}
                    className={`p-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center border ${
                      isSelected 
                        ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-lg' 
                        : 'bg-[#050811] border-cyan-500/15 hover:border-cyan-500/40 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>{genre.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DOSSIER MODAL */}
      <MovieModal 
        movieId={selectedMovieId} 
        mediaType={selectedMediaType} 
        onClose={closeModal} 
      />

    </div>
  );
}