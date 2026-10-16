// app/where/page.jsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';
import MovieModal from '@/components/MovieModal';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

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
  { id: 'CA', label: 'Canada' },
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'AU', label: 'Australia' }
];

const MEDIA_TYPES = [
  { id: 'all', label: 'All Titles' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'TV Shows' }
];

const detectUserRegion = () => {
  if (typeof window === 'undefined') return 'CA';

  try {
    const saved = localStorage.getItem('scenesense_region');
    if (saved && REGIONS.some(r => r.id === saved)) {
      return saved;
    }

    const locale = navigator.language || (navigator.languages && navigator.languages[0]) || '';
    const localeCountry = locale.split('-')[1]?.toUpperCase();
    if (REGIONS.some(r => r.id === localeCountry)) {
      return localeCountry;
    }

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
    if (tz.startsWith('Europe/London')) {
      return 'GB';
    }
    if (tz.startsWith('Australia/')) {
      return 'AU';
    }
    if (tz.startsWith('America/') && !tz.includes('Toronto') && !tz.includes('Vancouver')) {
      return 'US';
    }
  } catch (e) {
    console.error('Region auto-detect fallback applied:', e);
  }

  return 'CA';
};

export default function FindAFilmPage() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState('all'); // 'all' | 'movie' | 'tv'
  const [movies, setMovies] = useState([]);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(() => detectUserRegion());
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [providerList, setProviderList] = useState([]);
  
  // Modal states for popup selection
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);

  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState('movie');
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Ref to target the first item of a newly loaded batch for smooth auto-jump
  const newBatchRef = useRef(null);
  const prevCountRef = useRef(0);

  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login'); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Dynamically fetch live watch providers from TMDB based on selected region
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const endpoint = mediaType === 'tv'
          ? `https://api.themoviedb.org/3/watch/providers/tv?api_key=${TMDB_API_KEY}&watch_region=${selectedRegion}`
          : `https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=${selectedRegion}`;

        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const targetIds = [8, 9, 337, 387, 15, 350, 230, 531, 386, 2, 119]; 
          const filtered = data.results.filter(p => targetIds.includes(p.provider_id) || p.display_priority < 20);
          
          const formatted = [
            { id: null, label: 'All Providers', logo: null },
            ...filtered.map(p => ({
              id: p.provider_id,
              label: p.provider_name,
              logo: p.logo_path
            }))
          ];
          setProviderList(formatted);
        }
      } catch (e) {
        console.error("Failed to load live providers:", e);
      }
    };
    fetchProviders();
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('movieId');
    const type = params.get('type') || 'movie';
    if (movieId) {
      queueMicrotask(() => {
        setSelectedMovieId(movieId);
        setSelectedMediaType(type);
      });
    }
  }, []);

  // Construct exact TMDB URLs
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

  // Multi-Channel Executor
  const fetchTitlesBatch = useCallback(async (targetPage) => {
    if (searchQuery.trim()) {
      const searchUrl = mediaType === 'all'
        ? `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=${targetPage}`
        : `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=${targetPage}`;
      
      const res = await fetch(searchUrl);
      const data = await res.json();
      return (data.results || []).map(item => ({
        ...item,
        media_type: item.media_type || (mediaType === 'all' ? (item.title ? 'movie' : 'tv') : mediaType)
      }));
    }

    if (activeCategory === 'trending' && mediaType === 'all' && !selectedGenre && !selectedProvider) {
      const res = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_API_KEY}&page=${targetPage}`);
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
      const [movieData, tvData] = await Promise.all([movieRes.json(), tvRes.json()]);

      const moviesList = (movieData.results || []).map(m => ({ ...m, media_type: 'movie' }));
      const tvList = (tvData.results || []).map(t => ({ ...t, media_type: 'tv' }));

      const combined = [];
      const maxLength = Math.max(moviesList.length, tvList.length);
      for (let i = 0; i < maxLength; i++) {
        if (moviesList[i]) combined.push(moviesList[i]);
        if (tvList[i]) combined.push(tvList[i]);
      }
      return combined;
    }

    const endpoint = getSingleTypeUrl(targetPage, mediaType, activeCategory, selectedGenre, selectedProvider, selectedRegion, sortBy);
    const res = await fetch(endpoint);
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
      console.error("Failed to fetch feed:", e);
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

    queueMicrotask(() => {
      fetchMovies();
    });
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
        setMovies(prev => [...prev, ...filtered]);

        setTimeout(() => {
          if (newBatchRef.current) {
            newBatchRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      }
    } catch (e) {
      console.error("Failed to fetch more titles:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleWatchlist = (movie, e) => {
    e.preventDefault();
    e.stopPropagation();

    const isSaved = (watchlist || []).some(item => String(item.id) === String(movie.id));
    if (isSaved) {
      removeFromWatchlist(movie.id);
    } else {
      saveToWatchlist(movie);
    }
  };

  const currentProviderObj = providerList.find(p => p.id === selectedProvider);
  const currentGenreObj = GENRES.find(g => g.id === selectedGenre);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto mt-8 p-6 md:p-8 min-h-[85vh] flex flex-col bg-[#050508] border border-cyan-500/20 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)] text-white relative overflow-hidden font-sans">
      
      {/* Background Ambient Glow Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between border-b border-cyan-500/20 pb-6 mb-8 gap-6 relative z-10">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-serif italic tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300">
            Find A Film
          </h1>
          <p className="text-gray-400 text-xs md:text-sm font-light max-w-2xl leading-relaxed">
            Scan global releases, cross-reference regional streaming availability, and track upcoming titles across all services.
          </p>
        </div>

        <div className="flex items-end gap-4 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          {/* Select Your Region */}
          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/90 font-bold">
              Select Your Region
            </label>
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
              className="bg-[#0e0e16] border border-cyan-500/30 text-xs font-bold text-cyan-400 rounded-xl px-4 py-3 outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
            >
              {REGIONS.map((reg) => (
                <option key={reg.id} value={reg.id}>{reg.label}</option>
              ))}
            </select>
          </div>

          {/* Media Format Switcher & Search Bar */}
          <div className="flex flex-col gap-1.5 flex-1 sm:w-96">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-400/90 font-bold">
                Search Format
              </label>
              <div className="flex gap-1 bg-[#0e0e16] p-0.5 rounded-lg border border-cyan-500/20">
                {MEDIA_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setMediaType(type.id);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      mediaType === type.id
                        ? 'bg-cyan-500 text-black shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setPage(1);
                  setSearchQuery(e.target.value);
                }}
                placeholder={mediaType === 'all' ? "Search movies & TV shows..." : `Search ${mediaType === 'movie' ? 'movies' : 'TV shows'}...`}
                className="flex-1 bg-[#0e0e16] border border-cyan-500/20 rounded-xl px-4 py-3 text-xs font-medium text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => { 
                    setPage(1);
                    setSearchQuery(''); 
                  }}
                  className="px-4 py-3 bg-[#141420] hover:bg-[#1f1f2e] text-gray-300 text-xs font-bold rounded-xl transition-colors border border-cyan-500/20 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* CATEGORIES, PLATFORM, GENRE & SORTING TOOLBAR */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4 relative z-10">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'trending', label: 'Trending' },
            { id: 'popular', label: 'Popular' },
            { id: 'top_rated', label: 'Top Rated' },
            { id: 'now_playing', label: 'Now Airing / In Theaters' },
            { id: 'upcoming', label: 'Upcoming' }
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setPage(1);
                setSearchQuery('');
                setActiveCategory(cat.id);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                !searchQuery && !selectedGenre && activeCategory === cat.id 
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/50' 
                  : 'bg-[#0e0e16] text-gray-400 hover:text-white border border-cyan-500/20 hover:border-cyan-500/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* STREAMING PROVIDER BUTTON */}
          <button
            type="button"
            onClick={() => setIsProviderModalOpen(true)}
            className="flex items-center gap-2.5 bg-[#0e0e16] border border-cyan-500/20 hover:border-cyan-400 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-200 transition-all cursor-pointer shadow-inner"
          >
            {currentProviderObj?.logo ? (
              <div className="relative w-4 h-4 rounded overflow-hidden bg-white/10 flex-shrink-0">
                <Image
                  src={`https://image.tmdb.org/t/p/w92${currentProviderObj.logo}`}
                  alt={currentProviderObj.label}
                  fill
                  sizes="16px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-4 h-4 rounded bg-cyan-600 flex items-center justify-center text-[8px] font-bold text-white">ALL</div>
            )}
            <span>{currentProviderObj ? currentProviderObj.label : 'Select Platform'}</span>
            <svg className="w-3 h-3 text-cyan-400 ml-1 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* GENRES BUTTON */}
          <button
            type="button"
            onClick={() => setIsGenreModalOpen(true)}
            className="flex items-center gap-2 bg-[#0e0e16] border border-cyan-500/20 hover:border-cyan-400 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-200 transition-all cursor-pointer shadow-inner"
          >
            <span>{currentGenreObj ? currentGenreObj.label : 'All Genres'}</span>
            <svg className="w-3 h-3 text-cyan-400 ml-1 fill-current" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* SORTING SELECTOR */}
          <select
            value={sortBy}
            onChange={(e) => {
              setPage(1);
              setSortBy(e.target.value);
            }}
            className="bg-[#0e0e16] border border-cyan-500/20 text-xs font-bold text-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-cyan-400 cursor-pointer transition-all shadow-inner"
          >
            <option value="popularity.desc">Sort: Most Popular</option>
            <option value="vote_average.desc">Sort: Highest Rated</option>
            <option value="primary_release_date.desc">Sort: Newest Release</option>
            <option value="revenue.desc">Sort: Box Office Revenue</option>
          </select>
        </div>
      </div>

      {searchQuery && (
        <div className="mb-6 text-xs text-cyan-400 font-medium px-1">
          Showing search results for: &quot;<span className="text-white font-bold">{searchQuery}</span>&quot; in <span className="uppercase font-bold text-white">{mediaType}</span>
        </div>
      )}

      {/* TITLES GRID CONTAINER */}
      {isLoadingSearch ? (
        <div className="flex flex-col justify-center items-center py-32 gap-3">
          <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-mono">Scanning SceneSense satellite feeds...</p>
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 relative z-10">
            {movies.map((item, index) => {
              const uniqueKey = `${item.id}-${item.media_type || 'title'}-${index}`;
              const isSaved = (watchlist || []).some(w => String(w.id) === String(item.id));
              const displayTitle = item.title || item.name || 'Untitled';
              const releaseDate = item.release_date || item.first_air_date;
              const isFirstOfNewBatch = index === prevCountRef.current;
              
              return (
                <div 
                  key={uniqueKey}
                  ref={isFirstOfNewBatch ? newBatchRef : null}
                  className="bg-[#0e0e16] border border-cyan-500/20 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-cyan-400 hover:shadow-[0_10px_30px_rgba(6,182,212,0.2)] transition-all duration-300"
                >
                  {/* Clickable Poster & Title Area */}
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
                        <div className="flex items-center justify-center h-full text-xs text-gray-500 p-2 text-center">{displayTitle}</div>
                      )}
                      <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black text-amber-400 border border-amber-500/30 shadow-lg z-10">
                        ★ {item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}
                      </div>
                    </div>

                    <div className="p-4 pb-2 relative z-10 bg-[#0e0e16]">
                      <h3 className="font-bold text-xs line-clamp-1 text-white group-hover:text-cyan-300 transition-colors" title={displayTitle}>
                        {displayTitle}
                      </h3>
                      <p className="text-gray-400 text-[10px] mt-1 font-mono">{releaseDate ? releaseDate.split('-')[0] : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-1 bg-[#0e0e16] relative z-10">
                    <button
                      type="button"
                      onClick={(e) => toggleWatchlist(item, e)}
                      className={`w-full py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                        isSaved 
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600/30' 
                          : 'bg-[#141420] text-gray-300 border border-cyan-500/20 hover:border-cyan-400 hover:text-white'
                      }`}
                    >
                      <span>{isSaved ? 'In Watchlist' : '+ Watchlist'}</span>
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
              className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:bg-gray-700 text-white px-10 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95"
            >
              {isLoadingMore ? 'Decrypting feeds...' : 'See More Titles'}
            </button>
            <span className="text-[10px] font-mono text-gray-500">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </span>
          </div>
        </>
      ) : (
        <div className="py-32 text-center text-gray-500 text-sm font-mono">No signals found on the SceneSense radar.</div>
      )}

      {/* STREAMING PROVIDERS POPUP MODAL */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b12] border border-cyan-500/40 w-full max-w-lg p-6 shadow-2xl relative rounded-[24px]">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Select Streaming Platform</h3>
                <p className="text-xs text-gray-400 mt-0.5">Filter releases by preferred service provider</p>
              </div>
              <button
                type="button"
                onClick={() => setIsProviderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
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
                    className={`flex items-center gap-3 p-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-left border ${
                      isSelected 
                        ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-lg' 
                        : 'bg-[#141420] border-cyan-500/10 hover:border-cyan-500/30 text-gray-300 hover:text-white'
                    }`}
                  >
                    {prov.logo ? (
                      <div className="relative w-6 h-6 rounded overflow-hidden bg-white/10 flex-shrink-0">
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${prov.logo}`}
                          alt={prov.label}
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded bg-cyan-600 flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0">ALL</div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0b12] border border-cyan-500/40 w-full max-w-lg p-6 shadow-2xl relative rounded-[24px]">
            <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Select Film Genre</h3>
                <p className="text-xs text-gray-400 mt-0.5">Browse films by cinematic category</p>
              </div>
              <button
                type="button"
                onClick={() => setIsGenreModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
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
                    className={`p-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                      isSelected 
                        ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-lg' 
                        : 'bg-[#141420] border-cyan-500/10 hover:border-cyan-500/30 text-gray-300 hover:text-white'
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

      {/* MODAL COMPONENT */}
      <MovieModal 
        movieId={selectedMovieId} 
        mediaType={selectedMediaType} 
        onClose={closeModal} 
      />

    </div>
  );
}