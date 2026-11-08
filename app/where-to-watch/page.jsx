// File: app/where-to-watch/page.jsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWatchlist } from "@/hooks/useWatchlist";
import {
  useStudioSession,
  STREAMING_REGIONS,
} from "@/components/StudioSessionProvider";
import { trackQuestEvent } from "@/lib/quest-tracker";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import MovieModal from "@/components/MovieModal";

const GENRES = [
  { id: null, label: "All Genres" },
  { id: 28, label: "Action" },
  { id: 12, label: "Adventure" },
  { id: 16, label: "Animation" },
  { id: 35, label: "Comedy" },
  { id: 80, label: "Crime" },
  { id: 99, label: "Documentary" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Family" },
  { id: 14, label: "Fantasy" },
  { id: 27, label: "Horror" },
  { id: 9648, label: "Mystery" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Sci-Fi" },
  { id: 53, label: "Thriller" },
];

const MEDIA_TYPES = [
  { id: "all", label: "All Formats" },
  { id: "movie", label: "Movies" },
  { id: "tv", label: "TV Series" },
];

export default function WhereToWatchPage() {
  const studioSession = useStudioSession();
  const user = studioSession?.user || null;
  const selectedRegion = studioSession?.region || "CA";
  const setSelectedRegion = studioSession?.setRegion;

  const [searchQuery, setSearchQuery] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [movies, setMovies] = useState([]);
  const [activeCategory, setActiveCategory] = useState("trending");
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [providerList, setProviderList] = useState([]);
  const [isWatchlistOnly, setIsWatchlistOnly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isGenreModalOpen, setIsGenreModalOpen] = useState(false);

  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(true);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newBatchStartIndex, setNewBatchStartIndex] = useState(null);

  const newBatchRef = useRef(null);
  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load regional providers via server-side /api/tmdb proxy (zero client key exposure)
  useEffect(() => {
    let isCancelled = false;
    const fetchProviders = async () => {
      try {
        const providerType = mediaType === "tv" ? "tv" : "movie";
        const res = await fetch(
          `/api/tmdb?endpoint=watch/providers/${providerType}&watch_region=${selectedRegion}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && Array.isArray(data.results)) {
            const targetIds = [8, 9, 337, 387, 15, 350, 230, 531, 386, 2, 119, 283];
            const filtered = data.results.filter(
              (p) =>
                targetIds.includes(p.provider_id) ||
                (p.display_priority !== undefined && p.display_priority < 25)
            );

            const formatted = [
              { id: null, label: "All Services", logo: null },
              ...filtered.map((p) => ({
                id: p.provider_id,
                label: p.provider_name,
                logo: p.logo_path,
              })),
            ];
            setProviderList(formatted);
          }
        }
      } catch (e) {
        console.warn("Failed to load live watch providers:", e);
      }
    };
    fetchProviders();
    return () => {
      isCancelled = true;
    };
  }, [selectedRegion, mediaType]);

  const openModal = (item) => {
    const itemType =
      item.media_type ||
      (mediaType === "all" ? (item.title ? "movie" : "tv") : mediaType);
    setSelectedMedia({ id: item.id, type: itemType });
    trackQuestEvent(user?.uid, "where_to_watch_5", 1);
    window.history.pushState(null, "", `?movieId=${item.id}&type=${itemType}`);
  };

  const closeModal = () => {
    setSelectedMedia(null);
    window.history.pushState(null, "", window.location.pathname);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncModalStateFromURL = () => {
      const params = new URLSearchParams(window.location.search);
      const movieId = params.get("movieId");
      const type = params.get("type") || "movie";
      if (movieId) {
        setSelectedMedia({ id: movieId, type });
      } else {
        setSelectedMedia(null);
      }
    };

    syncModalStateFromURL();
    window.addEventListener("popstate", syncModalStateFromURL);
    return () => window.removeEventListener("popstate", syncModalStateFromURL);
  }, []);

  const buildProxyUrl = useCallback(
    (targetPage, targetType, cat, genre, prov, reg, sort) => {
      const today = new Date().toISOString().split("T")[0];
      const hasCustomFilters = genre || prov || sort !== "popularity.desc";
      const params = new URLSearchParams();
      params.set("page", String(targetPage));

      if (hasCustomFilters || cat === "upcoming" || cat === "now_playing") {
        params.set("endpoint", `discover/${targetType}`);

        let finalSort = sort;
        if (cat === "top_rated" && sort === "popularity.desc") {
          finalSort = "vote_average.desc";
          params.set("vote_count.gte", "300");
        }
        params.set("sort_by", finalSort);

        if (genre) params.set("with_genres", String(genre));
        if (prov) {
          params.set("with_watch_providers", String(prov));
          params.set("watch_region", reg);
        } else if (reg) {
          params.set("watch_region", reg);
        }

        if (reg && targetType === "movie") {
          params.set("region", reg);
        }

        if (cat === "upcoming") {
          if (targetType === "tv") {
            params.set("first_air_date.gte", today);
          } else {
            params.set("primary_release_date.gte", today);
          }
        } else if (cat === "now_playing") {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const pastDate = lastMonth.toISOString().split("T")[0];

          if (targetType === "movie") {
            params.set("primary_release_date.gte", pastDate);
            params.set("primary_release_date.lte", today);
            params.set("with_release_type", "2|3");
          } else {
            params.set("air_date.gte", pastDate);
            params.set("air_date.lte", today);
          }
        }

        return `/api/tmdb?${params.toString()}`;
      }

      if (cat === "popular") {
        params.set("endpoint", `${targetType}/popular`);
        params.set("region", reg);
      } else if (cat === "top_rated") {
        params.set("endpoint", `${targetType}/top_rated`);
        params.set("region", reg);
      } else {
        params.set("endpoint", `trending/${targetType}/day`);
      }

      return `/api/tmdb?${params.toString()}`;
    },
    []
  );

  const fetchTitlesBatch = useCallback(
    async (targetPage) => {
      if (searchQuery.trim()) {
        const searchEndpoint =
          mediaType === "all" ? "search/multi" : `search/${mediaType}`;
        const params = new URLSearchParams({
          endpoint: searchEndpoint,
          query: searchQuery.trim(),
          page: String(targetPage),
        });

        const res = await fetch(`/api/tmdb?${params.toString()}`);
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || [])
          .filter((item) => item.media_type !== "person")
          .map((item) => ({
            ...item,
            media_type:
              item.media_type ||
              (mediaType === "all" ? (item.title ? "movie" : "tv") : mediaType),
          }));
      }

      if (
        activeCategory === "trending" &&
        mediaType === "all" &&
        !selectedGenre &&
        !selectedProvider
      ) {
        const res = await fetch(
          `/api/tmdb?endpoint=trending/all/day&page=${targetPage}`
        );
        if (!res.ok) return [];
        const data = await res.json();
        return (data.results || [])
          .filter((item) => item.media_type !== "person")
          .map((item) => ({
            ...item,
            media_type: item.media_type || (item.title ? "movie" : "tv"),
          }));
      }

      if (mediaType === "all") {
        const movieUrl = buildProxyUrl(
          targetPage,
          "movie",
          activeCategory,
          selectedGenre,
          selectedProvider,
          selectedRegion,
          sortBy
        );
        const tvUrl = buildProxyUrl(
          targetPage,
          "tv",
          activeCategory,
          selectedGenre,
          selectedProvider,
          selectedRegion,
          sortBy
        );

        const [movieRes, tvRes] = await Promise.all([
          fetch(movieUrl),
          fetch(tvUrl),
        ]);
        const [movieData, tvData] = await Promise.all([
          movieRes.ok ? movieRes.json() : { results: [] },
          tvRes.ok ? tvRes.json() : { results: [] },
        ]);

        const moviesList = (movieData.results || []).map((m) => ({
          ...m,
          media_type: "movie",
        }));
        const tvList = (tvData.results || []).map((t) => ({
          ...t,
          media_type: "tv",
        }));

        const combined = [];
        const maxLength = Math.max(moviesList.length, tvList.length);
        for (let i = 0; i < maxLength; i++) {
          if (moviesList[i]) combined.push(moviesList[i]);
          if (tvList[i]) combined.push(tvList[i]);
        }
        return combined;
      }

      const endpoint = buildProxyUrl(
        targetPage,
        mediaType,
        activeCategory,
        selectedGenre,
        selectedProvider,
        selectedRegion,
        sortBy
      );
      const res = await fetch(endpoint);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).map((item) => ({
        ...item,
        media_type: mediaType,
      }));
    },
    [
      searchQuery,
      mediaType,
      activeCategory,
      selectedGenre,
      selectedProvider,
      selectedRegion,
      sortBy,
      buildProxyUrl,
    ]
  );

  const fetchMovies = useCallback(async () => {
    setIsLoadingSearch(true);
    try {
      const results = await fetchTitlesBatch(1);
      const filtered = results.filter(
        (item) => item.poster_path || item.backdrop_path
      );
      setMovies(filtered);
      setNewBatchStartIndex(null);
    } catch (e) {
      console.warn("Streaming radar feed warning:", e);
    } finally {
      setIsLoadingSearch(false);
    }
  }, [fetchTitlesBatch]);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchMovies();
      },
      searchQuery.trim() ? 300 : 0
    );
    return () => clearTimeout(timer);
  }, [
    searchQuery,
    mediaType,
    activeCategory,
    selectedGenre,
    selectedProvider,
    selectedRegion,
    sortBy,
    fetchMovies,
  ]);

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
        const filtered = results.filter(
          (item) => item.poster_path || item.backdrop_path
        );
        setNewBatchStartIndex(movies.length);
        setMovies((prev) => [...prev, ...filtered]);

        setTimeout(() => {
          newBatchRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
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

    const isSaved = (watchlist || []).some(
      (item) => String(item.id) === String(movie.id)
    );
    if (isSaved) {
      removeFromWatchlist(movie.id);
    } else {
      saveToWatchlist(movie);
    }
  };

  const resetAllFilters = () => {
    setSearchQuery("");
    setSelectedGenre(null);
    setSelectedProvider(null);
    setIsWatchlistOnly(false);
    setSortBy("popularity.desc");
    setMediaType("all");
    setActiveCategory("trending");
    setPage(1);
  };

  const currentProviderObj = providerList.find(
    (p) => p.id === selectedProvider
  );
  const currentGenreObj = GENRES.find((g) => g.id === selectedGenre);

  const displayedMovies = isWatchlistOnly
    ? movies.filter((m) =>
        (watchlist || []).some((w) => String(w.id) === String(m.id))
      )
    : movies;

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedGenre !== null ||
      selectedProvider !== null ||
      isWatchlistOnly ||
      mediaType !== "all" ||
      sortBy !== "popularity.desc"
  );

  const isSearchActive = Boolean(searchQuery.trim());

  return (
    <PageShell>
      <PageHeader
        eyebrow={`Regional Streaming Intelligence • ${selectedRegion}`}
        title="Streaming"
        accent="Radar"
        subtitle="Cross-reference live regional streaming catalogs across Netflix, Prime Video, Disney+, Apple TV+, Max, Crave, and theatrical releases."
        actions={
          <div className="flex items-center gap-2.5">
            <select
              value={selectedRegion}
              onChange={(e) => {
                setPage(1);
                if (setSelectedRegion) setSelectedRegion(e.target.value);
              }}
              aria-label="Streaming Region"
              className="bg-[#0b101d] border border-white/15 text-xs font-semibold text-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
            >
              {STREAMING_REGIONS.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.label} ({reg.id})
                </option>
              ))}
            </select>

            <select
              value={mediaType}
              onChange={(e) => {
                setPage(1);
                setMediaType(e.target.value);
              }}
              aria-label="Media Format"
              className="bg-[#0b101d] border border-white/15 text-xs font-semibold text-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
            >
              {MEDIA_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Filter & Search Workbench */}
      <section className="studio-panel rounded-3xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setPage(1);
                setSearchQuery(e.target.value);
                if (
                  e.target.value.trim() &&
                  (selectedGenre || selectedProvider)
                ) {
                  setSelectedGenre(null);
                  setSelectedProvider(null);
                }
              }}
              placeholder={
                mediaType === "all"
                  ? "Search any movie or series title..."
                  : `Search ${mediaType === "movie" ? "movies" : "series"}...`
              }
              className="w-full bg-[#070b14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  setSearchQuery("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </form>

          <div className="flex items-center gap-2.5 flex-wrap">
            <select
              aria-label="Catalog Category"
              value={isWatchlistOnly ? "watchlist" : activeCategory}
              onChange={(e) => {
                setPage(1);
                setSearchQuery("");
                if (e.target.value === "watchlist") {
                  setIsWatchlistOnly(true);
                } else {
                  setIsWatchlistOnly(false);
                  setActiveCategory(e.target.value);
                }
              }}
              className="bg-[#070b14] border border-white/10 text-xs font-semibold text-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="trending">Trending Today</option>
              <option value="popular">Most Popular</option>
              <option value="top_rated">Top Rated All-Time</option>
              <option value="now_playing">In Theaters / Airing</option>
              <option value="upcoming">Upcoming Releases</option>
              <option value="watchlist">
                My Watchlist ({watchlist?.length || 0})
              </option>
            </select>

            <button
              type="button"
              disabled={isSearchActive}
              onClick={() => setIsProviderModalOpen(true)}
              className={`flex items-center gap-2 border px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isSearchActive
                  ? "bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed"
                  : selectedProvider
                  ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-200 cursor-pointer"
                  : "bg-[#070b14] border-white/10 hover:border-white/25 text-slate-200 cursor-pointer"
              }`}
            >
              {currentProviderObj?.logo ? (
                <div className="relative w-4 h-4 rounded overflow-hidden bg-white/10 shrink-0">
                  <Image
                    src={`https://image.tmdb.org/t/p/w92${currentProviderObj.logo}`}
                    alt={currentProviderObj.label}
                    fill
                    unoptimized
                    sizes="16px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <span>
                {currentProviderObj ? currentProviderObj.label : "All Services"}
              </span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            <button
              type="button"
              disabled={isSearchActive}
              onClick={() => setIsGenreModalOpen(true)}
              className={`flex items-center gap-2 border px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isSearchActive
                  ? "bg-white/[0.02] border-white/5 text-slate-600 cursor-not-allowed"
                  : selectedGenre
                  ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-200 cursor-pointer"
                  : "bg-[#070b14] border-white/10 hover:border-white/25 text-slate-200 cursor-pointer"
              }`}
            >
              <span>
                {currentGenreObj ? currentGenreObj.label : "All Genres"}
              </span>
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            <select
              aria-label="Sort Titles"
              value={sortBy}
              onChange={(e) => {
                setPage(1);
                setSortBy(e.target.value);
              }}
              className="bg-[#070b14] border border-white/10 text-xs font-semibold text-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="popularity.desc">Sort: Popular</option>
              <option value="vote_average.desc">Sort: Highest Rated</option>
              <option value="primary_release_date.desc">Sort: Newest</option>
              <option value="revenue.desc">Sort: Box Office</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/10 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400 uppercase">
              Active Filters:
            </span>
            {searchQuery && (
              <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-slate-200 rounded-lg text-xs flex items-center gap-1.5">
                <span>&ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedProvider && !searchQuery && (
              <span className="px-2.5 py-1 bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 rounded-lg text-xs flex items-center gap-1.5">
                <span>{currentProviderObj?.label}</span>
                <button
                  type="button"
                  onClick={() => setSelectedProvider(null)}
                  className="hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedGenre && !searchQuery && (
              <span className="px-2.5 py-1 bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 rounded-lg text-xs flex items-center gap-1.5">
                <span>{currentGenreObj?.label}</span>
                <button
                  type="button"
                  onClick={() => setSelectedGenre(null)}
                  className="hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {isWatchlistOnly && (
              <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-400/30 text-amber-200 rounded-lg text-xs flex items-center gap-1.5">
                <span>Watchlist Only</span>
                <button
                  type="button"
                  onClick={() => setIsWatchlistOnly(false)}
                  className="hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-medium text-rose-400 hover:text-rose-300 ml-2 cursor-pointer"
            >
              Reset All
            </button>
          </div>
        )}
      </section>

      {/* Titles Grid */}
      {isLoadingSearch ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="studio-panel rounded-2xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[2/3] w-full bg-white/[0.04]" />
              <div className="p-3.5 space-y-2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-2.5 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayedMovies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {displayedMovies.map((item, index) => {
              const uniqueKey = `${item.id}-${item.media_type || "title"}-${index}`;
              const isSaved = (watchlist || []).some(
                (w) => String(w.id) === String(item.id)
              );
              const displayTitle = item.title || item.name || "Untitled";
              const releaseYear =
                (item.release_date || item.first_air_date || "").slice(0, 4) ||
                "N/A";
              const numericRating = item.vote_average
                ? Number(item.vote_average)
                : 0;
              const rating = numericRating ? numericRating.toFixed(1) : null;
              const isFirstOfNewBatch = index === newBatchStartIndex;
              const itemType =
                item.media_type || (item.title ? "movie" : "tv");

              return (
                <div
                  key={uniqueKey}
                  ref={isFirstOfNewBatch ? newBatchRef : null}
                  className="bg-[#0b101d] border border-white/10 hover:border-cyan-400/50 rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 shadow-lg"
                >
                  <div
                    onClick={() => openModal(item)}
                    className="cursor-pointer relative overflow-hidden"
                  >
                    <div className="relative aspect-[2/3] w-full bg-slate-900 overflow-hidden">
                      {item.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                          alt={displayTitle}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 50vw, 220px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-slate-500 p-3 text-center font-mono">
                          {displayTitle}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/75 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                        <p className="text-xs text-slate-200 line-clamp-4 leading-relaxed mb-2">
                          {item.overview || "Click to inspect streaming options."}
                        </p>
                        <span className="text-[11px] font-mono font-semibold text-cyan-300">
                          Check {selectedRegion} Streams →
                        </span>
                      </div>

                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        <span className="bg-black/80 text-slate-200 border border-white/15 px-2 py-0.5 rounded-md text-[10px] font-mono uppercase backdrop-blur-md">
                          {itemType === "tv" ? "Series" : "Movie"}
                        </span>
                        {rating && (
                          <span className="bg-black/80 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold backdrop-blur-md">
                            ★ {rating}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 pb-1">
                      <h3
                        className="font-semibold text-xs sm:text-sm line-clamp-1 text-white group-hover:text-cyan-300 transition-colors"
                        title={displayTitle}
                      >
                        {displayTitle}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {releaseYear}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 pt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={(e) =>
                        toggleWatchlist({ ...item, media_type: itemType }, e)
                      }
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSaved
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
                          : "bg-white/[0.04] text-slate-200 border-white/10 hover:border-cyan-400/50 hover:text-white"
                      }`}
                    >
                      {isSaved ? "✓ Saved" : "+ Watchlist"}
                    </button>
                    <Link
                      href={`/movie/${item.id}?type=${itemType}`}
                      className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-white flex items-center justify-center transition-all"
                      title="Open Full Dossier"
                    >
                      ↗
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-center pt-6 gap-2.5">
            <button
              type="button"
              onClick={loadMoreMovies}
              disabled={isLoadingMore}
              className="px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            >
              {isLoadingMore ? "Loading More Titles..." : "Load More Titles"}
            </button>
            <span className="text-[11px] text-slate-500">
              Regional streaming data powered by TMDB &amp; JustWatch ({selectedRegion}).
            </span>
          </div>
        </>
      ) : (
        <div className="studio-panel rounded-3xl py-24 text-center flex flex-col items-center justify-center gap-3 px-6">
          <span className="text-3xl">📡</span>
          <p className="text-sm text-slate-300 font-medium">
            {isWatchlistOnly && (!watchlist || watchlist.length === 0)
              ? user
                ? "Your watchlist is currently empty. Save movies or series to filter them here."
                : "Sign in or add titles to your watchlist to filter by saved items."
              : "No titles matched your current streaming filters."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-4 py-2 mt-1 bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/15 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      )}

      {/* Scroll to Top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-20 right-5 z-40 w-10 h-10 bg-[#0f172a] hover:bg-cyan-500 text-slate-200 hover:text-slate-950 border border-white/15 rounded-xl flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer ${
          showScrollTop
            ? "translate-y-0 opacity-100"
            : "translate-y-12 opacity-0 pointer-events-none"
        }`}
        aria-label="Scroll back to top"
      >
        ↑
      </button>

      {/* Streaming Providers Modal */}
      {isProviderModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1100] flex items-center justify-center p-4">
          <div className="bg-[#0b101d] border border-white/15 w-full max-w-lg p-6 shadow-2xl rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">
                  Filter by Streaming Platform
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Active catalogs in {selectedRegion}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProviderModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {providerList.map((prov) => {
                const isSelected = selectedProvider === prov.id;
                return (
                  <button
                    key={prov.id ?? "all-modal"}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setSelectedProvider(prov.id);
                      setIsProviderModalOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left border ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400 text-white"
                        : "bg-white/[0.03] border-white/10 hover:border-white/25 text-slate-300 hover:text-white"
                    }`}
                  >
                    {prov.logo ? (
                      <div className="relative w-6 h-6 rounded overflow-hidden bg-white/10 shrink-0">
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${prov.logo}`}
                          alt={prov.label}
                          fill
                          unoptimized
                          sizes="24px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[9px] font-mono font-bold shrink-0">
                        ALL
                      </div>
                    )}
                    <span className="truncate">{prov.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Genres Modal */}
      {isGenreModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1100] flex items-center justify-center p-4">
          <div className="bg-[#0b101d] border border-white/15 w-full max-w-lg p-6 shadow-2xl rounded-3xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div>
                <h3 className="text-base font-bold text-white">
                  Filter by Genre
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a genre category
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGenreModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {GENRES.map((genre) => {
                const isSelected = selectedGenre === genre.id;
                return (
                  <button
                    key={genre.id ?? "all-genre-modal"}
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setSelectedGenre(genre.id);
                      setIsGenreModalOpen(false);
                    }}
                    className={`p-3 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center border ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400 text-white"
                        : "bg-white/[0.03] border-white/10 hover:border-white/25 text-slate-300 hover:text-white"
                    }`}
                  >
                    {genre.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedMedia && (
        <MovieModal
          movieId={selectedMedia.id}
          mediaType={selectedMedia.type}
          onClose={closeModal}
        />
      )}
    </PageShell>
  );
}
