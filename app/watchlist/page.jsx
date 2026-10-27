// File: app/watchlist/page.jsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import MovieModal from '@/components/MovieModal';

const ITEMS_PER_PAGE = 12;

export default function WatchlistPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { watchlist, removeFromWatchlist, toggleWatched } = useWatchlist();

  const [filter, setFilter] = useState('all'); // 'all' | 'watched' | 'unwatched'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [selectedMediaType, setSelectedMediaType] = useState('movie');

  // Verify operative authentication
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

  // Reset pagination on filter or view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, sortBy, viewMode]);

  // Handle Watched toggle seamlessly with hook persistence & local cache bridge
  const handleToggleWatched = (item, e) => {
    e.stopPropagation();
    const nextWatchedState = !item.watched;
    const targetId = item.id || item.movieId;

    if (typeof toggleWatched === 'function') {
      toggleWatched(targetId, nextWatchedState);
    }

    // Mirror to local map to ensure instant Profile Call Sheet progress updates
    try {
      const raw = localStorage.getItem('scenesense_watched_map');
      const map = raw ? JSON.parse(raw) : {};
      map[targetId] = nextWatchedState;
      localStorage.setItem('scenesense_watched_map', JSON.stringify(map));
    } catch (err) {
      console.warn("Storage sync warning:", err);
    }
  };

  const handleOpenDetails = (item, e) => {
    if (e) e.stopPropagation();
    setSelectedMovieId(item.movieId || item.id);
    setSelectedMediaType(item.media_type || item.mediaType || (item.title ? 'movie' : 'tv'));
  };

  // Export Watchlist as JSON
  const handleExportData = () => {
    if (!watchlist || watchlist.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(watchlist, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `scenesense-radar-export-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter and Sort Pipeline
  const filteredItems = useMemo(() => {
    let result = [...(watchlist || [])];

    if (filter === 'watched') {
      result = result.filter((item) => Boolean(item.watched));
    } else if (filter === 'unwatched') {
      result = result.filter((item) => !item.watched);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        (item.title || item.name || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const titleA = (a.title || a.name || '').toLowerCase();
      const titleB = (b.title || b.name || '').toLowerCase();
      const dateA = a.release_date || a.first_air_date || a.year || '';
      const dateB = b.release_date || b.first_air_date || b.year || '';

      if (sortBy === 'name-asc') return titleA.localeCompare(titleB);
      if (sortBy === 'name-desc') return titleB.localeCompare(titleA);
      if (sortBy === 'year-desc') return String(dateB).localeCompare(String(dateA));
      if (sortBy === 'year-asc') return String(dateA).localeCompare(String(dateB));
      if (sortBy === 'rating-desc') return (Number(b.vote_average) || 0) - (Number(a.vote_average) || 0);
      return 0;
    });

    return result;
  }, [watchlist, filter, search, sortBy]);

  // Paginated Slicing
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalCount = (watchlist || []).length;
  const watchedCount = (watchlist || []).filter((item) => Boolean(item.watched)).length;
  const unwatchedCount = totalCount - watchedCount;

  if (!user) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center bg-[#050508] text-cyan-400 font-mono text-xs uppercase tracking-widest">
        <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3" />
        Decrypting Radar Watchlist...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-6 md:mt-10 p-4 md:p-8 min-h-[85vh] flex flex-col bg-[#050508] border border-cyan-500/20 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.15)] relative overflow-hidden text-white font-sans">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-500/20 pb-6 mb-8 gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <button 
            type="button"
            onClick={() => router.push('/where-to-watch')}
            className="w-10 h-10 rounded-2xl bg-[#080d1a] border border-cyan-500/25 hover:border-cyan-400 text-cyan-400 flex items-center justify-center transition-all cursor-pointer shadow-md group shrink-0"
            title="Return to Where to Watch"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform font-mono">←</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight font-mono">
                Your Watchlist Radar
              </h1>
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-3 py-0.5 rounded-full ml-1">
                {totalCount} TITLES
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Active Radar Surveillance • <span className="text-cyan-300 font-bold">{unwatchedCount} Queued</span> • <span className="text-emerald-400 font-bold">{watchedCount} Confirmed Watched</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Filter Navigation Capsules */}
        <div className="flex flex-wrap items-center gap-2">
          {totalCount > 0 && (
            <button
              type="button"
              onClick={handleExportData}
              className="px-3.5 py-2 bg-[#080d1a] hover:bg-cyan-950/40 border border-cyan-500/25 hover:border-cyan-400 text-cyan-300 rounded-2xl font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              title="Export Watchlist Data (.JSON)"
            >
              <span>💾</span>
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-[#080d1a] p-1.5 rounded-2xl border border-cyan-500/25 font-mono text-xs">
            {[
              { id: 'all', label: `All (${totalCount})` },
              { id: 'unwatched', label: `Queued (${unwatchedCount})` },
              { id: 'watched', label: `Watched (${watchedCount})` }
            ].map((f) => {
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    isActive
                      ? f.id === 'watched'
                        ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SEARCH & CONTROLS HUD */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 relative z-10 font-mono text-xs">
        <div className="flex-1 sm:max-w-md relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search saved film & series titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#080d1a] border border-cyan-500/25 focus:border-cyan-400 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all shadow-inner font-mono"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#080d1a] border border-cyan-500/25 text-xs font-bold text-slate-200 rounded-2xl px-4 py-2.5 outline-none focus:border-cyan-400 cursor-pointer shadow-inner font-mono"
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="year-desc">Sort: Year (Newest)</option>
            <option value="year-asc">Sort: Year (Oldest)</option>
            <option value="rating-desc">Sort: Highest Rated</option>
          </select>

          <div className="flex items-center gap-1 bg-[#080d1a] p-1 rounded-2xl border border-cyan-500/25">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              田 Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              ☰ List
            </button>
          </div>
        </div>
      </div>

      {/* TITLES CONTAINER */}
      {paginatedItems.length > 0 ? (
        <div className="flex-1 flex flex-col justify-between">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 relative z-10">
              {paginatedItems.map((item) => {
                const isDone = Boolean(item.watched);
                const displayTitle = item.title || item.name || 'Untitled';
                const posterUrl = item.poster_path 
                  ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`)
                  : null;

                return (
                  <div 
                    key={item.id}
                    className={`bg-[#080d1a] border rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg relative ${
                      isDone 
                        ? 'border-emerald-500/40 bg-[#06100c]/60 shadow-[0_4px_20px_rgba(16,185,129,0.15)]' 
                        : 'border-cyan-500/20 hover:border-cyan-400/80 hover:shadow-[0_10px_30px_rgba(6,182,212,0.2)] hover:-translate-y-1'
                    }`}
                  >
                    <div 
                      onClick={() => handleOpenDetails(item)}
                      className="cursor-pointer"
                    >
                      <div className="relative aspect-[2/3] w-full bg-[#111624] overflow-hidden">
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={displayTitle}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16vw"
                            className={`object-cover transition-all duration-500 ${
                              isDone ? 'grayscale-40 opacity-80' : 'group-hover:scale-105'
                            }`}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-xs text-slate-500 p-2 text-center font-mono">
                            <span className="text-xl">🎬</span>
                            <span className="mt-1 line-clamp-2">{displayTitle}</span>
                          </div>
                        )}

                        <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-amber-400 border border-amber-500/30">
                          ★ {item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}
                        </div>
                      </div>

                      <div className="p-3 pb-2 font-mono">
                        <h3 
                          className="font-bold text-xs line-clamp-1 leading-snug text-white group-hover:text-cyan-300 transition-colors uppercase tracking-tight" 
                          title={displayTitle}
                        >
                          {displayTitle}
                        </h3>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                          <span>{(item.release_date || item.first_air_date || item.year || '').split('-')[0] || 'N/A'}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromWatchlist(item.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Remove from Watchlist"
                          >
                            Remove ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 pt-0 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenDetails(item, e)}
                        className="w-full py-2 px-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 text-center truncate"
                      >
                        ▶ Details
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleWatched(item, e)}
                        className={`w-full py-2 px-1 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 truncate ${
                          isDone
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : 'bg-[#080d1a] text-slate-300 border-white/10 hover:border-cyan-400 hover:text-cyan-300'
                        }`}
                        title={isDone ? 'Mark as Unwatched' : 'Mark as Watched'}
                      >
                        <span>{isDone ? '✓' : '○'}</span>
                        <span>{isDone ? 'Watched' : 'Watch'}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* COMPACT LIST VIEW ROW */
            <div className="flex flex-col gap-2.5 relative z-10">
              {paginatedItems.map((item) => {
                const isDone = Boolean(item.watched);
                const displayTitle = item.title || item.name || 'Untitled';
                const releaseYear = (item.release_date || item.first_air_date || item.year || '').split('-')[0] || 'N/A';
                const posterUrl = item.poster_path 
                  ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w200${item.poster_path}`)
                  : null;

                return (
                  <div 
                    key={item.id}
                    onClick={() => handleOpenDetails(item)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer group ${
                      isDone 
                        ? 'border-emerald-500/40 bg-[#06100c]/70 hover:bg-[#06100c]' 
                        : 'border-cyan-500/20 bg-[#080d1a] hover:bg-[#0c1426] hover:border-cyan-400'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-11 h-16 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-cyan-500/20">
                        {posterUrl ? (
                          <Image
                            src={posterUrl}
                            alt={displayTitle}
                            fill
                            sizes="44px"
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[10px] text-slate-500 font-mono">🎬</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors truncate uppercase tracking-tight font-mono">
                            {displayTitle}
                          </h3>
                          {isDone && (
                            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                              Watched
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 mt-1">
                          <span>{releaseYear}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <span>★</span> {item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                      <button
                        type="button"
                        onClick={(e) => handleOpenDetails(item, e)}
                        className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                      >
                        ▶ Details
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleWatched(item, e)}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          isDone
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                            : 'bg-[#080d1a] text-slate-300 border-white/10 hover:border-cyan-400 hover:text-cyan-300'
                        }`}
                      >
                        <span>{isDone ? '✓' : '○'}</span>
                        <span>{isDone ? 'Watched' : 'Watch'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(item.id);
                        }}
                        className="w-8 h-8 rounded-xl bg-black/60 hover:bg-rose-950/80 border border-white/10 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 text-xs flex items-center justify-center transition-all cursor-pointer"
                        title="Remove from Watchlist"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINATION TOOLBAR */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-cyan-500/20 pt-6 mt-8 relative z-10 font-mono text-xs gap-4">
              <span className="text-slate-400">
                Page <strong className="text-cyan-400">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({filteredItems.length} total titles)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="px-3.5 py-2 bg-[#080d1a] hover:bg-cyan-950/40 border border-cyan-500/25 hover:border-cyan-400 disabled:opacity-40 text-cyan-300 rounded-xl transition-all cursor-pointer"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCurrentPage(num)}
                      className={`w-8 h-8 rounded-xl font-bold transition-all cursor-pointer ${
                        currentPage === num
                          ? 'bg-cyan-500 text-black shadow-md'
                          : 'bg-[#080d1a] text-slate-400 hover:text-white border border-cyan-500/25'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="px-3.5 py-2 bg-[#080d1a] hover:bg-cyan-950/40 border border-cyan-500/25 hover:border-cyan-400 disabled:opacity-40 text-cyan-300 rounded-xl transition-all cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center font-mono space-y-3">
          <span className="text-4xl text-slate-600">📡</span>
          <p className="text-slate-400 text-sm">Your surveillance radar is clear. No saved titles found in this sector.</p>
          <button
            type="button"
            onClick={() => router.push('/where-to-watch')}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
          >
            Explore Cinema Feeds
          </button>
        </div>
      )}

      {/* DETAILED MOVIE MODAL */}
      {selectedMovieId && (
        <MovieModal 
          movieId={selectedMovieId} 
          mediaType={selectedMediaType}
          onClose={() => setSelectedMovieId(null)} 
        />
      )}

    </div>
  );
}