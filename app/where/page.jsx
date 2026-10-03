"use client";

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';

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

const AdSenseBlock = ({ view }) => (
  <div className={`bg-[#121212] border border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center p-4 min-h-[150px] relative overflow-hidden ${view === 'list' ? 'w-full mb-4' : 'w-full'}`}>
    <span className="absolute top-2 left-3 text-[9px] uppercase tracking-widest text-gray-600 font-bold">Advertisement</span>
    <div className="w-full h-full bg-[#1a1a1a] rounded-lg flex items-center justify-center text-gray-500 text-xs font-mono text-center px-4 py-6">
      [ Programmatic Native Ad Unit ]<br/>Passive Impression Revenue
    </div>
  </div>
);

export default function WhereToWatchPage() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [activeCategory, setActiveCategory] = useState('trending');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null); 
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [email, setEmail] = useState('');
  const [alertStatus, setAlertStatus] = useState('');

  const router = useRouter();
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/where'); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Hoisted function definitions placed before useEffect hooks
  const openMovieDetails = async (movie) => {
    setSelectedMovie(movie);
    setIsLoadingDetails(true);
    setMovieDetails(null);
    setEmail('');
    setAlertStatus('');

    window.history.pushState(null, '', `?movieId=${movie.id}`);

    try {
      const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${TMDB_API_KEY}`)
      ]);

      const details = await detailsRes.json();
      const credits = await creditsRes.json();
      const videos = await videosRes.json();
      const providers = await providersRes.json();

      const trailer = videos.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
      const regionProviders = providers.results?.CA || providers.results?.US || {};

      setSelectedMovie(prev => ({ ...prev, ...details }));

      setMovieDetails({
        ...details,
        cast: credits.cast?.slice(0, 6) || [],
        trailerKey: trailer ? trailer.key : null,
        providers: regionProviders
      });
    } catch (e) {
      console.error("Failed to fetch deep movie metadata:", e);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedMovie(null);
    window.history.pushState(null, '', window.location.pathname);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const movieId = params.get('movieId');
    if (movieId) {
      openMovieDetails({ id: movieId });
    }
  }, []);

  const fetchMovies = async (category, genreId) => {
    setIsLoadingSearch(true);
    try {
      let endpoint = `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&page=1`;

      if (genreId) {
        endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=1`;
      } else {
        if (category === 'top_rated') endpoint = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=1`;
        if (category === 'upcoming') endpoint = `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&page=1`;
        if (category === 'now_playing') endpoint = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&page=1`;
        if (category === 'popular') endpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=1`;
      }

      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (data.results) setMovies(data.results);
    } catch (e) {
      console.error("Failed to fetch feed:", e);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  useEffect(() => {
    setPage(1);
    if (!searchQuery.trim()) {
      fetchMovies(activeCategory, selectedGenre);
    }
  }, [activeCategory, selectedGenre]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    setPage(1);

    const fetchSearchResults = async () => {
      setIsLoadingSearch(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=1`);
        const data = await res.json();
        if (data.results) setMovies(data.results);
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setIsLoadingSearch(false);
      }
    };

    const timer = setTimeout(() => {
      fetchSearchResults();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setPage(1);
      fetchMovies(activeCategory, selectedGenre);
    }
  };

  const loadMoreMovies = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);

    let endpoint = `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&page=${nextPage}`;

    if (searchQuery.trim()) {
      endpoint = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&page=${nextPage}`;
    } else if (selectedGenre) {
      endpoint = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${selectedGenre}&sort_by=popularity.desc&page=${nextPage}`;
    } else {
      if (activeCategory === 'top_rated') endpoint = `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&page=${nextPage}`;
      if (activeCategory === 'upcoming') endpoint = `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&page=${nextPage}`;
      if (activeCategory === 'now_playing') endpoint = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&page=${nextPage}`;
      if (activeCategory === 'popular') endpoint = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${nextPage}`;
    }

    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.results) {
        setMovies(prev => [...prev, ...data.results]);
      }
    } catch (e) {
      console.error("Failed to fetch more movies:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleWatchlist = (movie, e) => {
    e.stopPropagation();
    const isSaved = watchlist.some(item => item.id === movie.id);
    if (isSaved) {
      removeFromWatchlist(movie.id);
    } else {
      saveToWatchlist(movie);
    }
  };

  const navigateToReviews = (movie) => {
    if (!movie) return;
    router.push(`/reviews/${movie.id}?title=${encodeURIComponent(movie.title)}&poster=${movie.poster_path}`);
  };

  const getAffiliateLink = (providerName, title) => {
    const encodedTitle = encodeURIComponent(title);
    const lowerName = providerName.toLowerCase();
    
    if (lowerName.includes('disney')) return `https://disneyplus.com/search?q=${encodedTitle}&affiliate=PENDING_LAUNCH`;
    if (lowerName.includes('hulu')) return `https://hulu.com/search?q=${encodedTitle}&affiliate=PENDING_LAUNCH`;
    if (lowerName.includes('paramount')) return `https://paramountplus.com/search?q=${encodedTitle}&affiliate=PENDING_LAUNCH`;
    if (lowerName.includes('apple')) return `https://tv.apple.com/search?term=${encodedTitle}&affiliate=PENDING_LAUNCH`;
    if (lowerName.includes('amazon')) return `https://www.amazon.com/s?k=${encodedTitle}+movie&tag=PENDING_LAUNCH`;
    
    return `https://www.justwatch.com/us/search?q=${encodedTitle}`; 
  };

  const isRecentTheatricalRelease = (releaseDate) => {
    if (!releaseDate) return false;
    const release = new Date(releaseDate);
    const now = new Date();
    const diffTime = now - release;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= -30 && diffDays <= 60;
  };

  if (!user) return null;

  const isCurrentSaved = selectedMovie ? watchlist.some(item => item.id === selectedMovie.id) : false;
  const inTheaters = selectedMovie ? isRecentTheatricalRelease(selectedMovie.release_date) : false;

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 min-h-[85vh] flex flex-col bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl shadow-2xl text-white">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#2a2a2a] pb-6 mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <span className="text-red-600 animate-pulse">📡</span> Radar & Where to Watch
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Real-time streaming availability & trailers</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-96">
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any movie..."
            className="flex-1 bg-[#141414] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-600 transition-colors"
          />
          {searchQuery && (
            <button 
              type="button"
              onClick={() => { setSearchQuery(''); fetchMovies(activeCategory, selectedGenre); }}
              className="px-3 py-2.5 bg-[#222] hover:bg-[#333] text-gray-300 text-xs rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
          <button 
            type="submit"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'trending', label: '🔥 Trending' },
            { id: 'popular', label: '🌟 Popular' },
            { id: 'top_rated', label: '⭐ Top Rated' },
            { id: 'now_playing', label: '🍿 Now Playing' },
            { id: 'upcoming', label: '🎬 Upcoming' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(cat.id);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                !searchQuery && !selectedGenre && activeCategory === cat.id 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' 
                  : 'bg-[#141414] text-gray-400 hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
        {GENRES.map((genre) => (
          <button
            key={genre.id ?? 'all'}
            onClick={() => {
              setSearchQuery('');
              setSelectedGenre(genre.id);
            }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedGenre === genre.id 
                ? 'bg-white text-black font-bold' 
                : 'bg-[#121212] text-gray-400 hover:text-white border border-[#2a2a2a]'
            }`}
          >
            {genre.label}
          </button>
        ))}
      </div>

      {searchQuery && (
        <div className="mb-4 text-xs text-red-500 font-medium">
          Showing search results for: &quot;{searchQuery}&quot;
        </div>
      )}

      {isLoadingSearch ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {movies.map((movie, index) => {
              const uniqueKey = `${movie.id}-${index}`;
              const isSaved = watchlist.some(item => item.id === movie.id);
              
              return (
                <Fragment key={uniqueKey}>
                  <div 
                    onClick={() => openMovieDetails(movie)}
                    className="bg-[#121212] border border-[#2a2a2a] rounded-xl overflow-hidden flex flex-col justify-between group hover:border-red-600 transition-all shadow-lg cursor-pointer relative"
                  >
                    <button
                      onClick={(e) => toggleWatchlist(movie, e)}
                      className={`absolute top-2 left-2 z-10 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                        isSaved ? 'bg-red-600 text-white' : 'bg-black/60 text-gray-300 hover:text-white'
                      }`}
                      title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                      ❤️
                    </button>

                    <div className="relative aspect-[2/3] w-full bg-[#1a1a1a]">
                      {movie.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          fill
                          sizes="200px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-500 p-2 text-center">{movie.title}</div>
                      )}
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-amber-400 border border-amber-500/30">
                        ★ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-grow justify-between">
                      <div>
                        <h3 className="font-bold text-xs line-clamp-1">{movie.title}</h3>
                        <p className="text-gray-400 text-[10px]">{movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
                      </div>
                      <span className="text-[11px] font-bold text-red-500 group-hover:underline">View Radar →</span>
                    </div>
                  </div>

                  {(index + 1) % 10 === 0 && (
                    <div className="col-span-full">
                      <AdSenseBlock view="grid" />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
          
          <div className="flex justify-center mt-12 mb-4">
            <button 
              onClick={loadMoreMovies} 
              disabled={isLoadingMore}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold transition-colors cursor-pointer"
            >
              {isLoadingMore ? 'Loading...' : 'See More Movies'}
            </button>
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-gray-500 text-sm">No signals found on the radar.</div>
      )}

      {selectedMovie && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={closeModal}
              className="text-gray-400 hover:text-white absolute top-5 right-5 text-xl font-bold z-10 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex flex-col gap-6">
              
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black mb-1">{selectedMovie.title}</h2>
                  <p className="text-gray-400 text-xs">
                    {selectedMovie.release_date ? selectedMovie.release_date.split('-')[0] : ''} • 
                    {selectedMovie.vote_average ? ` ★ ${selectedMovie.vote_average.toFixed(1)} / 10` : ''}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => navigateToReviews(selectedMovie)}
                    className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                  >
                    <span>💬 Log Review & Chat</span>
                  </button>

                  <button
                    onClick={(e) => toggleWatchlist(selectedMovie, e)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isCurrentSaved ? 'bg-red-600 text-white' : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                    }`}
                  >
                    <span>{isCurrentSaved ? '❤️ In Watchlist' : '🤍 Add to Watchlist'}</span>
                  </button>
                </div>
              </div>

              {isLoadingDetails ? (
                <div className="w-full aspect-video bg-[#1a1a1a] rounded-xl flex items-center justify-center animate-pulse">
                  <p className="text-xs text-gray-400">Loading radar transmission...</p>
                </div>
              ) : movieDetails?.trailerKey ? (
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-[#2a2a2a]">
                  <iframe
                    src={`https://www.youtube.com/embed/${movieDetails.trailerKey}`}
                    title="Movie Trailer"
                    className="w-full h-full"
                    allowFullScreen
                  ></iframe>
                </div>
              ) : (
                <div className="w-full py-10 bg-[#181818] rounded-xl text-center text-xs text-gray-500">
                  No official trailer transmission available for this title.
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-1">Synopsis</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{selectedMovie.overview || "No overview available."}</p>
              </div>

              {inTheaters && (
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-amber-400 uppercase tracking-widest">Now Playing in Theaters</h4>
                    <p className="text-xs text-gray-400 mt-1">Secure your seat for the premiere.</p>
                  </div>
                  <a 
                    href={`https://www.fandango.com/search?q=${encodeURIComponent(selectedMovie.title)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.4)] cursor-pointer text-center"
                  >
                    🎟️ Get Tickets
                  </a>
                </div>
              )}

              {movieDetails?.cast && movieDetails.cast.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Key Cast</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {movieDetails.cast.map((actor) => (
                      <div key={actor.id} className="bg-[#181818] border border-[#2a2a2a] rounded-lg p-2 flex flex-col items-center text-center">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-[#222] mb-1.5 flex-shrink-0">
                          {actor.profile_path ? (
                            <Image 
                              src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`} 
                              alt={actor.name} 
                              fill 
                              sizes="50px"
                              className="object-cover" 
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] text-gray-500">N/A</div>
                          )}
                        </div>
                        <p className="text-[11px] font-bold line-clamp-1">{actor.name}</p>
                        <p className="text-[9px] text-gray-400 line-clamp-1">{actor.character}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {movieDetails?.providers && (
                <div className="flex flex-col gap-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-500">Where to Watch</h4>
                  
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1.5">Stream / Subscription</p>
                    <div className="flex flex-wrap gap-2">
                      {movieDetails.providers.flatrate?.length > 0 ? (
                        movieDetails.providers.flatrate.map((provider) => (
                          <a 
                            key={provider.provider_id} 
                            href={getAffiliateLink(provider.provider_name, selectedMovie.title)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500 px-3 py-1.5 rounded-lg transition-colors cursor-pointer group shadow-sm"
                          >
                            {provider.logo_path && (
                              <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} alt={provider.provider_name} className="w-4 h-4 rounded object-cover" />
                            )}
                            <span className="text-xs font-bold group-hover:text-emerald-500 transition-colors">{provider.provider_name}</span>
                          </a>
                        ))
                      ) : (
                        <div className="flex items-center gap-2 w-full max-w-sm">
                          <input type="email" placeholder="Email me when streaming..." value={email} onChange={e=>setEmail(e.target.value)} className="bg-[#141414] border border-[#333] text-xs px-3 py-1.5 rounded-lg flex-1 focus:border-red-500 outline-none" />
                          <button onClick={() => setAlertStatus('saved')} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer">
                            {alertStatus === 'saved' ? 'Saved ✓' : 'Notify Me'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                    <div>
                      <p className="text-[11px] text-gray-400 mb-1.5">Rent</p>
                      <div className="flex flex-wrap gap-2">
                        {movieDetails.providers.rent?.length > 0 ? (
                          movieDetails.providers.rent.map((provider) => (
                            <a 
                              key={provider.provider_id} 
                              href={getAffiliateLink(provider.provider_name, selectedMovie.title)}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer group"
                            >
                              {provider.logo_path && <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} alt={provider.provider_name} className="w-3.5 h-3.5 rounded" />}
                              <span className="group-hover:text-emerald-500 transition-colors">{provider.provider_name}</span>
                            </a>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">None</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-gray-400 mb-1.5">Buy</p>
                      <div className="flex flex-wrap gap-2">
                        {movieDetails.providers.buy?.length > 0 ? (
                          movieDetails.providers.buy.map((provider) => (
                            <a 
                              key={provider.provider_id} 
                              href={getAffiliateLink(provider.provider_name, selectedMovie.title)}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-[#181818] border border-[#2a2a2a] hover:border-emerald-500 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer group"
                            >
                              {provider.logo_path && <img src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} alt={provider.provider_name} className="w-3.5 h-3.5 rounded" />}
                              <span className="group-hover:text-emerald-500 transition-colors">{provider.provider_name}</span>
                            </a>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-[#2a2a2a] mt-2">
                <a 
                  href={`https://www.amazon.com/s?k=${encodeURIComponent(selectedMovie.title)}+movie+merchandise&tag=PENDING_LAUNCH`}
                  target="_blank" rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                >
                  <span>🛒</span> Collector&apos;s Vault
                </a>

                <button 
                  onClick={closeModal}
                  className="px-5 py-2 bg-[#222] hover:bg-[#333] text-gray-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Close Radar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}