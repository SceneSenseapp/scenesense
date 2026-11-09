// app/watchlist/page.jsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useWatchlist } from '@/hooks/useWatchlist';
import MovieModal from '@/components/MovieModal';
import TVModal from '@/components/TVModal';
import CollaborativeSwipeMatcher from '@/components/CollaborativeSwipeMatcher';
import { openCineMind } from '@/components/CineMindModal';

const ITEMS_PER_PAGE = 12;

const FOLDER_CATEGORIES = [
  'All Folders',
  'Must Watch Tonight',
  'Weekend Binge',
  'Sci-Fi & Mind-Benders',
  'Masterpieces',
];

export default function WatchlistPage() {
  const {
    watchlist = [],
    saveToWatchlist,
    removeFromWatchlist,
    toggleWatched,
    updateMovieCategory,
    exportWatchlistAsJson,
    importWatchlistFromJson,
    clearAllWatched,
    markAllAsWatched,
    stats,
    isLoading: loading = false,
  } = useWatchlist();

  const [filter, setFilter] = useState('all'); // 'all' | 'watched' | 'unwatched'
  const [activeFolder, setActiveFolder] = useState('All Folders');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState(null); // { id, mediaType }
  const [roulettePick, setRoulettePick] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showSwipeMatcher, setShowSwipeMatcher] = useState(false);
  const [initialSwipeCode, setInitialSwipeCode] = useState(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  const handleLoadStarterPack = () => {
    const starters = [
      {
        id: 27205,
        title: 'Inception',
        poster_path: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
        release_date: '2010-07-15',
        vote_average: 8.4,
        media_type: 'movie',
        categoryTag: 'Sci-Fi & Mind-Benders',
        overview: 'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life.',
      },
      {
        id: 329865,
        title: 'Arrival',
        poster_path: '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
        release_date: '2016-11-10',
        vote_average: 7.6,
        media_type: 'movie',
        categoryTag: 'Sci-Fi & Mind-Benders',
        overview: 'Taking place after alien crafts land around the world, an expert linguist is recruited by the military to determine whether they come in peace or are a threat.',
      },
      {
        id: 545611,
        title: 'Everything Everywhere All at Once',
        poster_path: '/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
        release_date: '2022-03-24',
        vote_average: 7.8,
        media_type: 'movie',
        categoryTag: 'Masterpieces',
        overview: 'An aging Chinese immigrant is swept up in an insane adventure, where she alone can save what is important to her by connecting with the lives she could have led in other universes.',
      },
      {
        id: 155,
        title: 'The Dark Knight',
        poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        release_date: '2008-07-16',
        vote_average: 8.5,
        media_type: 'movie',
        categoryTag: 'Must Watch Tonight',
        overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.',
      },
      {
        id: 693134,
        title: 'Dune: Part Two',
        poster_path: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        release_date: '2024-02-27',
        vote_average: 8.2,
        media_type: 'movie',
        categoryTag: 'Weekend Binge',
        overview: 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge.',
      },
    ];

    starters.forEach((m) => {
      if (typeof saveToWatchlist === 'function') {
        saveToWatchlist(m);
      }
    });
    toast.success('Added 5 Starter Masterpieces to your Watchlist! 🍿');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('swipeSession');
    if (code) {
      const id = window.setTimeout(() => {
        setInitialSwipeCode(code);
        setShowSwipeMatcher(true);
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, []);

  const [localWatchedMap, setLocalWatchedMap] = useState(() => {
    try {
      return typeof window === 'undefined'
        ? {}
        : JSON.parse(localStorage.getItem('scenesense_watched_map') || '{}');
    } catch (e) {
      console.warn("Watched state initialization notice:", e);
      return {};
    }
  });
  const router = useRouter();

  // 1. Sync watched state between Firestore watchlist items and persistent localStorage
  useEffect(() => {
    const syncWatchedState = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('scenesense_watched_map');
        const initialLocal = saved ? JSON.parse(saved) : {};

        const merged = { ...initialLocal };
        if (Array.isArray(watchlist)) {
          watchlist.forEach((item) => {
            if (item.watched !== undefined) {
              merged[item.id] = Boolean(item.watched);
            }
          });
        }
        setLocalWatchedMap(merged);
      } catch (e) {
        console.warn("Watched state initialization notice:", e);
      }
    }, 0);

    return () => window.clearTimeout(syncWatchedState);
  }, [watchlist]);

  const handleToggleWatched = (item, e) => {
    e.stopPropagation();
    const currentStatus = Boolean(localWatchedMap[item.id] ?? item.watched);
    const nextStatus = !currentStatus;

    setLocalWatchedMap((prev) => {
      const updated = { ...prev, [item.id]: nextStatus };
      try {
        localStorage.setItem('scenesense_watched_map', JSON.stringify(updated));
      } catch (err) {
        console.warn("Local storage write notice:", err);
      }
      return updated;
    });

    if (typeof toggleWatched === 'function') {
      toggleWatched(item.id, currentStatus);
    }
  };

  // Tonight's Screening Roulette Picker
  const handleSpinRoulette = () => {
    const unwatchedPool = (watchlist || []).filter(
      (item) => !(localWatchedMap[item.id] ?? item.watched)
    );
    const pool = unwatchedPool.length > 0 ? unwatchedPool : watchlist || [];
    if (pool.length === 0) {
      toast.error("Add some titles to your Watchlist first!");
      return;
    }

    setIsSpinning(true);
    let ticks = 0;
    const interval = window.setInterval(() => {
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      setRoulettePick(randomItem);
      ticks += 1;
      if (ticks >= 10) {
        window.clearInterval(interval);
        setIsSpinning(false);
        toast.success(`Tonight's Screening Pick: ${randomItem.title || randomItem.name}!`, {
          icon: '🎲',
        });
      }
    }, 90);
  };

  // Export Watchlist as CSV or JSON
  const handleExportWatchlist = (format = 'csv') => {
    if (!watchlist || watchlist.length === 0) {
      toast.error("Nothing in Watchlist to export yet.");
      return;
    }

    try {
      let content = '';
      let mime = 'text/csv;charset=utf-8;';
      let ext = 'csv';

      if (format === 'json') {
        content = JSON.stringify(watchlist, null, 2);
        mime = 'application/json;charset=utf-8;';
        ext = 'json';
      } else {
        const headers = ['ID', 'Title', 'Type', 'ReleaseDate', 'Rating', 'Folder', 'Watched'];
        const rows = watchlist.map((item) => [
          item.id,
          `"${(item.title || item.name || '').replace(/"/g, '""')}"`,
          item.media_type || 'movie',
          item.release_date || item.first_air_date || '',
          item.vote_average || '',
          `"${item.categoryTag || 'Must Watch Tonight'}"`,
          Boolean(localWatchedMap[item.id] ?? item.watched) ? 'Yes' : 'No',
        ]);
        content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      }

      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scenesense-watchlist-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${watchlist.length} titles as .${ext.toUpperCase()}!`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export watchlist.");
    }
  };

  // Reset to page 1 whenever filters change
  useEffect(() => {
    const resetPageTimeout = window.setTimeout(() => setCurrentPage(1), 0);
    return () => window.clearTimeout(resetPageTimeout);
  }, [filter, activeFolder, search, sortBy, viewMode]);

  const filteredItems = useMemo(() => {
    let result = [...(watchlist || [])];

    if (filter === 'watched') {
      result = result.filter((item) => localWatchedMap[item.id] ?? item.watched);
    } else if (filter === 'unwatched') {
      result = result.filter((item) => !(localWatchedMap[item.id] ?? item.watched));
    }

    if (activeFolder !== 'All Folders') {
      result = result.filter(
        (item) => (item.categoryTag || 'Must Watch Tonight') === activeFolder
      );
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
  }, [watchlist, filter, activeFolder, search, sortBy, localWatchedMap]);

  // Paginated slice
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalCount = (watchlist || []).length;
  const watchedCount = (watchlist || []).filter(
    (item) => localWatchedMap[item.id] ?? item.watched
  ).length;
  const unwatchedCount = totalCount - watchedCount;

  const getVisiblePages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className="max-w-7xl mx-auto mt-6 md:mt-10 p-4 md:p-8 min-h-[85vh] flex flex-col bg-[#050508] border border-cyan-500/20 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.15)] relative overflow-hidden text-white font-sans">
      
      {/* Background Ambient Glow Accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-cyan-500/20 pb-6 mb-6 gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => router.push('/where-to-watch')}
            className="w-9 h-9 rounded-xl bg-[#0e0e16] border border-cyan-500/20 hover:border-cyan-400 text-cyan-300 flex items-center justify-center transition-all cursor-pointer shadow-inner active:scale-95"
            title="Return to Where to Watch"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2 flex-wrap">
              <span>📋</span> Watchlist Dossier
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                {totalCount} Queued
              </span>
            </h1>
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Active Radar Surveillance • {unwatchedCount} Pending • {watchedCount} Confirmed Watched
              {totalCount > 0 && (
                <span className="text-emerald-400 font-bold ml-2">
                  ({stats?.completionPercent ?? Math.round((watchedCount / totalCount) * 100)}% Complete)
                </span>
              )}
              {stats?.avgRating && (
                <span className="text-amber-400 font-bold ml-2">
                  • Avg Rating: ★ {stats.avgRating}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action & Status Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Collaborative Movie Night Matcher Button */}
          <button
            type="button"
            onClick={() => setShowSwipeMatcher(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:from-pink-500 hover:to-amber-400 text-white text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_25px_rgba(236,72,153,0.4)] cursor-pointer transition-all active:scale-95"
          >
            <span>🎬</span>
            <span>Movie Night Matcher</span>
          </button>

          {/* Tools & Export Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className="px-3.5 py-2 rounded-xl bg-[#0e0e16] hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-inner cursor-pointer"
            >
              <span>⚙️ Tools & Actions</span>
              <span className={`text-[9px] transition-transform ${isToolsOpen ? 'rotate-180 text-cyan-200' : 'text-cyan-400'}`}>▼</span>
            </button>

            {isToolsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsToolsOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#090d1a] border border-cyan-500/40 shadow-2xl p-2 z-50 space-y-1 font-mono text-xs animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      openCineMind(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-cyan-500/20 text-slate-200 hover:text-white transition-all text-left cursor-pointer"
                  >
                    <span>🧠</span>
                    <span>Brief CineMind AI</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSpinning || totalCount === 0}
                    onClick={() => {
                      setIsToolsOpen(false);
                      handleSpinRoulette();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-cyan-500/20 text-slate-200 hover:text-white transition-all text-left cursor-pointer disabled:opacity-40"
                  >
                    <span>🎲</span>
                    <span>Tonight&apos;s Roulette</span>
                  </button>

                  {unwatchedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        markAllAsWatched();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 transition-all text-left cursor-pointer"
                    >
                      <span>🍿</span>
                      <span>Mark All as Watched</span>
                    </button>
                  )}

                  {watchedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsOpen(false);
                        if (window.confirm("Confirm purging watched titles from vault?")) {
                          clearAllWatched();
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition-all text-left cursor-pointer"
                    >
                      <span>🧹</span>
                      <span>Clear Watched</span>
                    </button>
                  )}

                  <div className="border-t border-white/10 my-1 pt-1">
                    <button
                      type="button"
                      disabled={totalCount === 0}
                      onClick={() => {
                        setIsToolsOpen(false);
                        handleExportWatchlist('csv');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-cyan-500/20 text-slate-300 hover:text-white transition-all text-left cursor-pointer disabled:opacity-40"
                    >
                      <span>📥</span>
                      <span>Export to CSV</span>
                    </button>

                    <button
                      type="button"
                      disabled={totalCount === 0}
                      onClick={() => {
                        setIsToolsOpen(false);
                        exportWatchlistAsJson();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-cyan-500/20 text-slate-300 hover:text-white transition-all text-left cursor-pointer disabled:opacity-40"
                    >
                      <span>💾</span>
                      <span>Backup Archive (.json)</span>
                    </button>

                    <label className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-emerald-500/20 text-emerald-300 hover:text-emerald-200 transition-all text-left cursor-pointer">
                      <span>📦</span>
                      <span>Restore from JSON</span>
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          setIsToolsOpen(false);
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            importWatchlistFromJson(evt.target?.result);
                          };
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Status Dropdown Selector */}
          <div className="flex items-center gap-1.5">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#0e0e16] border border-cyan-500/30 text-xs font-mono font-bold text-white rounded-xl px-3 py-2 outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
            >
              <option value="all" className="bg-[#0e0e16] text-white">All Titles ({totalCount})</option>
              <option value="unwatched" className="bg-[#0e0e16] text-cyan-300">⏳ Pending ({unwatchedCount})</option>
              <option value="watched" className="bg-[#0e0e16] text-emerald-300">✓ Watched ({watchedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* ROULETTE WINNER BANNER */}
      {roulettePick && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-950/80 via-[#0e0c24] to-cyan-950/80 border border-violet-400/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <span className="text-2xl">🎰</span>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-violet-300 font-bold block">
                Tonight&apos;s Screening Roulette Selection
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                {roulettePick.title || roulettePick.name}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/movie/${roulettePick.id}?type=${roulettePick.media_type === 'tv' ? 'tv' : 'movie'}`}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-black uppercase"
            >
              Open Theater Page ↗
            </Link>
            <button
              type="button"
              onClick={() => setRoulettePick(null)}
              className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* FOLDER TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-white/5 relative z-10 scrollbar-none">
        {FOLDER_CATEGORIES.map((folder) => (
          <button
            key={folder}
            type="button"
            onClick={() => setActiveFolder(folder)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
              activeFolder === folder
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-[#0e0e16] border-white/10 text-gray-400 hover:text-white'
            }`}
          >
            📁 {folder}
          </button>
        ))}
      </div>

      {/* SEARCH & SORT TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex-1 sm:max-w-md relative">
          <input
            type="text"
            placeholder="Search saved titles..."
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

      {/* TITLES CONTAINER */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-28 text-cyan-400 font-mono text-xs gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing Surveillance Logs...</span>
        </div>
      ) : paginatedItems.length > 0 ? (
        <div className="flex-1 flex flex-col justify-between">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 relative z-10">
              {paginatedItems.map((item) => {
                const isDone = Boolean(localWatchedMap[item.id] ?? item.watched);
                const displayTitle = item.title || item.name || 'Untitled';
                const isTV = item.media_type === 'tv' || Boolean(item.first_air_date && !item.release_date);

                return (
                  <div 
                    key={item.id}
                    className={`bg-[#0e0e16] border rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-lg relative ${
                      isDone 
                        ? 'border-emerald-500/40 bg-[#06100c]/60 shadow-[0_4px_20px_rgba(16,185,129,0.15)]' 
                        : 'border-cyan-500/20 hover:border-cyan-400 hover:shadow-[0_10px_30px_rgba(6,182,212,0.2)] hover:-translate-y-1'
                    }`}
                  >
                    <div 
                      onClick={() => setSelectedMedia({ id: item.id, mediaType: isTV ? 'tv' : 'movie' })}
                      className="cursor-pointer"
                    >
                      <div className="relative aspect-[2/3] w-full bg-[#141420] overflow-hidden">
                        {item.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                            alt={displayTitle}
                            fill
                            unoptimized
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

                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono font-bold border border-white/10 uppercase tracking-widest text-cyan-400">
                          {isTV ? 'TV' : 'FILM'}
                        </div>

                        <Link
                          href={`/movie/${item.id}?type=${isTV ? 'tv' : 'movie'}`}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-2 right-2 bg-black/80 hover:bg-cyan-500 hover:text-black text-cyan-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-cyan-500/40 transition-colors"
                          title="Open Full Theater Page"
                        >
                          ↗
                        </Link>
                      </div>

                      <div className="p-3.5 pb-2">
                        <h3 
                          className="font-bold text-xs line-clamp-2 h-8 leading-snug text-white group-hover:text-cyan-300 transition-colors flex items-start" 
                          title={displayTitle}
                        >
                          {displayTitle}
                        </h3>
                        <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-gray-400">
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <span>★</span> {item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromWatchlist(item.id);
                            }}
                            className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove from Watchlist"
                          >
                            Remove ✕
                          </button>
                        </div>

                        {/* Folder Selector */}
                        {typeof updateMovieCategory === 'function' && (
                          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={item.categoryTag || 'Must Watch Tonight'}
                              onChange={(e) => updateMovieCategory(item.id, e.target.value)}
                              className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono text-amber-300 outline-none cursor-pointer"
                            >
                              {FOLDER_CATEGORIES.slice(1).map((cat) => (
                                <option key={cat} value={cat} className="bg-[#0e0e16] text-white">
                                  📁 {cat}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 pt-0 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMedia({ id: item.id, mediaType: isTV ? 'tv' : 'movie' })}
                        className="w-full py-2 px-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95 text-center truncate"
                      >
                        ▶ Dossier
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleWatched(item, e)}
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
            /* COMPACT LIST VIEW ROW LAYOUT */
            <div className="flex flex-col gap-2.5 relative z-10">
              {paginatedItems.map((item) => {
                const isDone = Boolean(localWatchedMap[item.id] ?? item.watched);
                const displayTitle = item.title || item.name || 'Untitled';
                const releaseYear = (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A';
                const isTV = item.media_type === 'tv' || Boolean(item.first_air_date && !item.release_date);

                return (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedMedia({ id: item.id, mediaType: isTV ? 'tv' : 'movie' })}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                      isDone 
                        ? 'border-emerald-500/40 bg-[#06100c]/70 hover:bg-[#06100c]' 
                        : 'border-cyan-500/20 bg-[#0e0e16] hover:bg-[#141420] hover:border-cyan-400'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-[#141420] shrink-0 border border-cyan-500/20">
                        {item.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                            alt={displayTitle}
                            fill
                            unoptimized
                            sizes="40px"
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-[10px] text-gray-500 font-mono">🎬</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors truncate uppercase tracking-tight">
                            {displayTitle}
                          </h3>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/60 border border-white/10 text-cyan-400">
                            {isTV ? 'TV' : 'FILM'}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
                            📁 {item.categoryTag || 'Must Watch Tonight'}
                          </span>
                          {isDone && (
                            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded">
                              Watched
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400 mt-1">
                          <span>{releaseYear}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <span>★</span> {item.vote_average ? Number(item.vote_average).toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/movie/${item.id}?type=${isTV ? 'tv' : 'movie'}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-cyan-500 hover:text-black border border-white/10 rounded-lg text-[10px] font-mono font-bold text-cyan-300 transition-all"
                        title="Open Full Theater Page"
                      >
                        ↗
                      </Link>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMedia({ id: item.id, mediaType: isTV ? 'tv' : 'movie' });
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                      >
                        ▶ Dossier
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleWatched(item, e)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          isDone
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                            : 'bg-[#141420] text-gray-300 border-white/10 hover:border-cyan-400 hover:text-cyan-300'
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
                        className="w-7 h-7 rounded-lg bg-black/60 hover:bg-red-950/80 border border-white/10 hover:border-red-500/50 text-gray-400 hover:text-red-400 text-xs flex items-center justify-center transition-all cursor-pointer"
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

          {/* PAGINATION CONTROLS BAR */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-cyan-500/20 pt-6 mt-8 relative z-10 font-mono text-xs gap-4">
              <span className="text-gray-400">
                Page <strong className="text-cyan-400">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({filteredItems.length} filtered items)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="px-3 py-1.5 bg-[#0e0e16] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 disabled:opacity-40 text-cyan-300 rounded-lg transition-all cursor-pointer"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1">
                  {getVisiblePages().map((pageNum, idx) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`dots-${idx}`} className="px-2 text-gray-500 font-bold">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-cyan-500 text-black shadow-md'
                            : 'bg-[#0e0e16] text-gray-400 hover:text-white border border-cyan-500/20'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="px-3 py-1.5 bg-[#0e0e16] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 disabled:opacity-40 text-cyan-300 rounded-lg transition-all cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 px-4 text-center text-gray-400 text-sm font-mono flex flex-col items-center justify-center gap-5 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-3xl text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            🍿
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-white font-sans">
              Your Watchlist is Ready for Movie Night
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Save films and series here to organize folders, spin tonight&rsquo;s screening roulette, or launch Movie Night Matcher with a co-watcher!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button
              type="button"
              onClick={handleLoadStarterPack}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-mono font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg cursor-pointer"
            >
              + Add 5 Starter Masterpieces
            </button>
            <button
              type="button"
              onClick={() => setShowSwipeMatcher(true)}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-mono font-black text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg cursor-pointer"
            >
              🎬 Movie Night Matcher
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono pt-2">
            <button
              type="button"
              onClick={() => router.push('/where-to-watch')}
              className="text-cyan-400 hover:text-white underline cursor-pointer"
            >
              Search Streaming Radar →
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => openCineMind(null)}
              className="text-purple-400 hover:text-white underline cursor-pointer"
            >
              Ask CineMind AI →
            </button>
          </div>
        </div>
      )}

      {/* DYNAMIC MEDIA MODAL (MOVIE OR TV) */}
      {selectedMedia && selectedMedia.mediaType === 'tv' && (
        <TVModal 
          tvId={selectedMedia.id} 
          showId={selectedMedia.id} 
          onClose={() => setSelectedMedia(null)} 
        />
      )}

      {selectedMedia && selectedMedia.mediaType !== 'tv' && (
        <MovieModal 
          movieId={selectedMedia.id} 
          onClose={() => setSelectedMedia(null)} 
        />
      )}

      {/* COLLABORATIVE MOVIE NIGHT MATCHER MODAL */}
      <CollaborativeSwipeMatcher
        isOpen={showSwipeMatcher}
        onClose={() => setShowSwipeMatcher(false)}
        userWatchlist={watchlist}
        initialSessionCode={initialSwipeCode}
      />

    </div>
  );
}
