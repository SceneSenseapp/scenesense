// app/watchlist/page.jsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useWatchlist } from '@/hooks/useWatchlist';
import MovieModal from '@/components/MovieModal';

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [filter, setFilter] = useState('all'); // 'all' | 'watched' | 'unwatched'
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [watchedMap, setWatchedMap] = useState({});
  const router = useRouter();

  // Load saved watched state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('scenesense_watched_map');
      if (saved) {
        setWatchedMap(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load watched state", e);
    }
  }, []);

  const toggleWatched = (id, e) => {
    e.stopPropagation();
    setWatchedMap(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('scenesense_watched_map', JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save watched state", err);
      }
      return updated;
    });
  };

  const filteredItems = useMemo(() => {
    let result = [...(watchlist || [])];

    if (filter === 'watched') {
      result = result.filter(item => watchedMap[item.id]);
    } else if (filter === 'unwatched') {
      result = result.filter(item => !watchedMap[item.id]);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item => (item.title || item.name || '').toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      const titleA = (a.title || a.name || '').toLowerCase();
      const titleB = (b.title || b.name || '').toLowerCase();
      const dateA = a.release_date || a.first_air_date || '';
      const dateB = b.release_date || b.first_air_date || '';

      if (sortBy === 'name-asc') return titleA.localeCompare(titleB);
      if (sortBy === 'name-desc') return titleB.localeCompare(titleA);
      if (sortBy === 'year-desc') return dateB.localeCompare(dateA);
      if (sortBy === 'year-asc') return dateA.localeCompare(dateB);
      if (sortBy === 'rating-desc') return (b.vote_average || 0) - (a.vote_average || 0);
      return 0;
    });

    return result;
  }, [watchlist, filter, search, sortBy, watchedMap]);

  const totalCount = (watchlist || []).length;
  const watchedCount = (watchlist || []).filter(item => watchedMap[item.id]).length;
  const unwatchedCount = totalCount - watchedCount;

  return (
    <div className="max-w-7xl mx-auto mt-6 md:mt-10 p-4 md:p-8 min-h-[85vh] flex flex-col bg-[#050508] border border-cyan-500/20 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)] relative overflow-hidden text-white font-sans">
      
      {/* Background Ambient Glow Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-500/20 pb-6 mb-8 gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.push('/where')}
            className="w-9 h-9 rounded-xl bg-[#0e0e16] border border-cyan-500/20 hover:border-cyan-400 text-cyan-300 flex items-center justify-center transition-all cursor-pointer shadow-inner"
            title="Return to Where to Watch"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
              <span>📋</span> Your Watchlist
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full ml-2">
                {totalCount} Titles
              </span>
            </h1>
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Active Radar Surveillance • {unwatchedCount} Queued • {watchedCount} Confirmed Watched
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#0e0e16] p-1 rounded-xl border border-cyan-500/20">
          {[
            { id: 'all', label: `All (${totalCount})` },
            { id: 'unwatched', label: `Queued (${unwatchedCount})` },
            { id: 'watched', label: `Watched (${watchedCount})` }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                filter === f.id
                  ? f.id === 'watched' 
                    ? 'bg-emerald-500 text-black shadow-md' 
                    : 'bg-cyan-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH & SORT TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex-1 sm:max-w-md relative">
          <input
            type="text"
            placeholder="Search your movies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0e0e16] border border-cyan-500/20 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0e0e16] border border-cyan-500/20 text-xs font-mono font-bold text-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="year-desc">Sort: Year (Newest)</option>
            <option value="year-asc">Sort: Year (Oldest)</option>
            <option value="rating-desc">Sort: Highest Rated</option>
          </select>

          <div className="flex items-center gap-1 bg-[#0e0e16] p-1 rounded-xl border border-cyan-500/20">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              田
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg text-xs transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* TITLES GRID */}
      {filteredItems.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 relative z-10" 
          : "flex flex-col gap-3 relative z-10"
        }>
          {filteredItems.map((item) => {
            const isDone = Boolean(watchedMap[item.id]);
            const displayTitle = item.title || item.name || 'Untitled';

            return (
              <div 
                key={item.id}
                className={`bg-[#0e0e16] border rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg relative ${
                  isDone 
                    ? 'border-emerald-500/40 bg-[#06100c]/60 shadow-[0_4px_20px_rgba(16,185,129,0.15)]' 
                    : 'border-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_10px_30px_rgba(6,182,212,0.2)] hover:-translate-y-1'
                }`}
              >
                {/* Poster & Badges Container */}
                <div 
                  onClick={() => setSelectedMovieId(item.id)}
                  className="cursor-pointer"
                >
                  <div className="relative aspect-[2/3] w-full bg-[#141420] overflow-hidden">
                    {item.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                        alt={displayTitle}
                        fill
                        sizes="(max-width: 768px) 100vw, 200px"
                        className={`object-cover transition-all duration-500 ${
                          isDone ? 'grayscale-40 opacity-80' : 'group-hover:scale-105'
                        }`}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-gray-500 p-2 text-center font-mono">
                        {displayTitle}
                      </div>
                    )}

                    {/* Star Rating Badge (Moved left of the X button) */}
                    <div className="absolute top-2.5 right-10 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-black text-amber-400 border border-amber-500/30 shadow-lg z-10">
                      ★ {item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}
                    </div>

                    {/* Floating Delete Button on Poster */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(item.id);
                      }}
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-black/85 hover:bg-red-950/90 border border-white/20 hover:border-red-500/50 text-gray-300 hover:text-red-400 text-xs flex items-center justify-center transition-all cursor-pointer z-20 shadow-md"
                      title="Remove from Watchlist"
                    >
                      ✕
                    </button>

                    {/* Watched Banner Overlay */}
                    {isDone && (
                      <div className="absolute top-2.5 left-2.5 bg-emerald-950/90 border border-emerald-400/50 text-emerald-300 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold flex items-center gap-1 shadow-md z-10">
                        <span>✓</span> Watched
                      </div>
                    )}
                  </div>

                  {/* Title with Fixed 2-Line Height */}
                  <div className="p-3.5 pb-2">
                    <h3 
                      className="font-bold text-xs line-clamp-2 h-8 leading-snug text-white group-hover:text-cyan-300 transition-colors flex items-start" 
                      title={displayTitle}
                    >
                      {displayTitle}
                    </h3>
                  </div>
                </div>

                {/* Bottom Actions Bar (2 Equal Columns) */}
                <div className="p-3 pt-0 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMovieId(item.id)}
                    className="w-full py-2 px-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 text-center truncate"
                  >
                    ▶ Details
                  </button>

                  <button
                    type="button"
                    onClick={(e) => toggleWatched(item.id, e)}
                    className={`w-full py-2 px-1 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 truncate ${
                      isDone
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'bg-[#141420] text-gray-300 border-white/10 hover:border-cyan-400 hover:text-cyan-300'
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
        <div className="py-32 text-center text-gray-500 text-sm font-mono">
          Your radar is clear. No saved titles found.
        </div>
      )}

      {/* MOVIE MODAL */}
      {selectedMovieId && (
        <MovieModal 
          movieId={selectedMovieId} 
          onClose={() => setSelectedMovieId(null)} 
        />
      )}

    </div>
  );
}