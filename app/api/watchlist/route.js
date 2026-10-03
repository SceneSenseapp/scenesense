"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { useWatchlist } from '@/hooks/useWatchlist';
import Image from 'next/image';

const AdSenseBlock = ({ view }) => (
  <div className={`bg-[#0a0a0a] border border-dashed border-white/20 rounded-2xl flex flex-col items-center justify-center p-4 min-h-[250px] relative overflow-hidden ${view === 'list' ? 'w-full flex-row gap-6' : 'w-full'}`}>
    <span className="absolute top-2 left-3 text-[9px] uppercase tracking-widest text-gray-600 font-bold">Advertisement</span>
    <div className="w-full h-full bg-white/5 rounded-xl flex items-center justify-center text-gray-500 text-xs font-mono text-center px-4">
      [ Google AdSense / Mediavine Native Unit ]<br/>Passive Impression Revenue
    </div>
  </div>
);

export default function WatchlistPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); 
  const [listSearch, setListSearch] = useState('');
  const [listSort, setListSort] = useState('az'); 
  const [listView, setListView] = useState('grid'); 
  
  const router = useRouter();
  const { watchlist, removeFromWatchlist, toggleWatched } = useWatchlist();

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

  const filteredWatchlist = watchlist.filter(item => {
    if (activeTab === 'watched') return item.watched;
    if (activeTab === 'unwatched') return !item.watched;
    return true;
  });

  const processedWatchlist = filteredWatchlist
    .filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(listSearch.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (listSort === 'az') return (a.title || '').localeCompare(b.title || '');
      if (listSort === 'za') return (b.title || '').localeCompare(a.title || '');
      if (listSort === 'year_new') {
        const yearA = parseInt(a.release_date || a.year || '0', 10);
        const yearB = parseInt(b.release_date || b.year || '0', 10);
        return yearB - yearA;
      }
      if (listSort === 'year_old') {
        const yearA = parseInt(a.release_date || a.year || '0', 10);
        const yearB = parseInt(b.release_date || b.year || '0', 10);
        return yearA - yearB;
      }
      if (listSort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
      return 0;
    });

  const totalWatchlist = watchlist.length;

  const isRecentTheatricalRelease = (releaseDate) => {
    if (!releaseDate) return false;
    const release = new Date(releaseDate);
    const now = new Date(); 
    const diffTime = Math.abs(now - release);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 60;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a0808] via-[#0a0a0a] to-black py-10 px-4 font-sans selection:bg-red-500/30">
      <main className="max-w-7xl mx-auto p-8 flex flex-col bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(220,38,38,0.07)] text-white relative min-h-[85vh]">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-6 mb-6 gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/profile')}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              ←
            </button>
            <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight text-white">
              <span className="drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">📋</span> Your Watchlist 
              <span className="text-gray-500 text-xl font-medium bg-white/5 px-4 py-1.5 rounded-full">{totalWatchlist} Titles</span>
            </h1>
          </div>
          
          <div className="flex bg-black/80 border border-white/10 rounded-xl p-1.5 gap-1 shadow-inner">
            {['all', 'watched', 'unwatched'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all cursor-pointer ${
                  activeTab === tab 
                    ? (tab === 'watched' ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' : tab === 'all' ? 'bg-white text-black shadow-md' : 'bg-gray-700 text-white shadow-md') 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-8 items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 relative z-10">
          <input 
            type="text" 
            placeholder="Search your movies..." 
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            className="w-full lg:w-1/3 bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-sm text-white font-medium focus:outline-none focus:border-red-500 transition-colors placeholder-gray-500"
          />

          <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
            <select 
              value={listSort}
              onChange={(e) => setListSort(e.target.value)}
              className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-gray-300 focus:outline-none focus:border-red-500 cursor-pointer appearance-none"
            >
              <option value="az">Sort: Name (A-Z)</option>
              <option value="za">Sort: Name (Z-A)</option>
              <option value="year_new">Sort: Year (Newest)</option>
              <option value="year_old">Sort: Year (Oldest)</option>
              <option value="rating">Sort: Highest Rated</option>
            </select>
            <div className="flex bg-black/80 border border-white/10 rounded-xl p-1 shadow-inner">
              <button onClick={() => setListView('grid')} className={`px-4 py-2.5 rounded-lg text-lg transition-all cursor-pointer ${listView === 'grid' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}>⊞</button>
              <button onClick={() => setListView('list')} className={`px-4 py-2.5 rounded-lg text-lg transition-all cursor-pointer ${listView === 'list' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}>☰</button>
            </div>
          </div>
        </div>

        <div className="flex-grow relative z-10">
          {processedWatchlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 text-4xl shadow-inner border border-white/5">👻</div>
              <p className="text-gray-300 text-xl font-bold">No movies found in this sector.</p>
              <button 
                onClick={() => router.push('/where')} 
                className="mt-8 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all cursor-pointer"
              >
                Explore Radar
              </button>
            </div>
          ) : listView === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-6">
              {processedWatchlist.map((movie, index) => {
                const inTheaters = isRecentTheatricalRelease(movie.release_date);
                return (
                  <div key={movie.id} className="contents">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between group hover:border-red-500/50 hover:shadow-[0_15px_30px_rgba(220,38,38,0.15)] transition-all duration-300">
                      <div className="relative aspect-[2/3] w-full bg-[#111]">
                        {movie.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt={movie.title}
                            fill
                            sizes="250px"
                            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out opacity-90 group-hover:opacity-100"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-sm font-bold text-gray-600 p-4 text-center uppercase tracking-wider">{movie.title}</div>
                        )}
                        <div className="absolute top-2 right-2 bg-black/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-black text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                          ★ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}
                        </div>
                      </div>

                      <div className="p-4 flex flex-col gap-2.5 bg-gradient-to-t from-black via-[#0a0a0a] to-transparent">
                        <h4 className="font-bold text-sm line-clamp-1 text-white tracking-wide mb-1">{movie.title}</h4>
                        
                        {inTheaters ? (
                          <a 
                            href={`https://www.fandango.com/search?q=${encodeURIComponent(movie.title)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-[11px] text-center font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.4)] cursor-pointer block"
                          >
                            🎟️ Get Tickets
                          </a>
                        ) : (
                          <button
                            onClick={() => router.push(`/where?movieId=${movie.id}`)}
                            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] cursor-pointer transform hover:-translate-y-0.5"
                          >
                            ▶ Stream / Trial
                          </button>
                        )}

                        <a 
                          href={`https://www.amazon.com/s?k=${encodeURIComponent(movie.title)}+movie+merchandise&tag=YOUR_AMAZON_TAG`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-[10px] text-center font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer block"
                        >
                          🛒 Collector&apos;s Vault
                        </a>

                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => toggleWatched(movie.id, !movie.watched)}
                            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border ${
                              movie.watched ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/50 shadow-inner' : 'bg-transparent text-gray-400 border-white/20 hover:bg-white/10'
                            }`}
                          >
                            {movie.watched ? '✓ Done' : '○ Mark'}
                          </button>
                          <button
                            onClick={() => removeFromWatchlist(movie.id)}
                            className="px-4 py-2 bg-transparent hover:bg-red-950/50 border border-white/20 hover:border-red-900/50 text-gray-400 hover:text-red-400 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>

                    {(index + 1) % 10 === 0 && (
                      <div className="col-span-full md:col-span-2 lg:col-span-2 xl:col-span-3">
                         <AdSenseBlock view="grid" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-6">
              {processedWatchlist.map((movie, index) => {
                const inTheaters = isRecentTheatricalRelease(movie.release_date);
                return (
                  <div key={movie.id} className="contents">
                    <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-red-500/50 hover:bg-white/5 transition-all duration-300 group">
                      <div className="flex items-center gap-6">
                        <div className="relative w-20 h-28 rounded-xl overflow-hidden bg-[#111] flex-shrink-0 shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                          {movie.poster_path && (
                            <Image src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} alt={movie.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-xl text-white tracking-wide group-hover:text-red-100 transition-colors">{movie.title}</h4>
                          <p className="text-sm font-medium text-gray-400 mt-2 flex items-center gap-3">
                            <span className="text-amber-400 font-bold bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-900/50 shadow-inner">★ {movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                            {movie.release_date && <span className="opacity-70">{movie.release_date.split('-')[0]}</span>}
                            {movie.genre && <span className="opacity-70">• {movie.genre}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        
                        <a 
                          href={`https://www.amazon.com/s?k=${encodeURIComponent(movie.title)}+movie+merchandise&tag=YOUR_AMAZON_TAG`}
                          target="_blank" rel="noopener noreferrer"
                          className="px-4 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                        >
                          🛒 Merch
                        </a>

                        {inTheaters ? (
                           <a 
                             href={`https://www.fandango.com/search?q=${encodeURIComponent(movie.title)}`}
                             target="_blank" rel="noopener noreferrer"
                             className="flex-1 sm:flex-none px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(217,119,6,0.4)] block text-center"
                           >
                             🎟️ Get Tickets
                           </a>
                        ) : (
                          <button
                            onClick={() => router.push(`/where?movieId=${movie.id}`)}
                            className="flex-1 sm:flex-none px-6 py-4 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white text-sm font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] transform hover:-translate-y-0.5"
                          >
                            ▶ Stream / Trial
                          </button>
                        )}
                        
                        <button
                          onClick={() => toggleWatched(movie.id, !movie.watched)}
                          className={`px-5 py-4 rounded-xl text-sm font-bold transition-colors cursor-pointer border ${
                            movie.watched ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/50' : 'bg-transparent text-gray-300 border-white/20 hover:bg-white/10'
                          }`}
                        >
                          {movie.watched ? '✓ Watched' : '○ Mark Watched'}
                        </button>
                        <button
                          onClick={() => removeFromWatchlist(movie.id)}
                          className="px-5 py-4 bg-transparent hover:bg-red-950/50 border border-white/20 hover:border-red-900/50 text-gray-400 hover:text-red-400 text-sm font-bold rounded-xl cursor-pointer transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {(index + 1) % 10 === 0 && <AdSenseBlock view="list" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}