// components/profile/DashboardTab.jsx
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, updateDoc, increment, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

const AFFILIATE_TAG = "scenesense-20";

export default function DashboardTab({ 
  user, 
  userRank = 'Operative', 
  activeTheme = { dot: 'bg-cyan-400', borderGlow: 'hover:border-cyan-400' }, 
  compactMode = false, 
  hoverGlow = true, 
  recentActivity = [], 
  radarItems = [], 
  activeBounties = [], 
  claimedBounties = [],
  showToast 
}) {
  const router = useRouter();
  const [imageErrors, setImageErrors] = useState({});
  const [claimingId, setClaimingId] = useState(null);

  const topMovieTitle = recentActivity?.[0]?.title || radarItems?.[0]?.title || "Blade Runner 2049";
  const amazonAffiliateLink = `https://www.amazon.com/s?k=${encodeURIComponent(`${topMovieTitle} 4k steelbook bluray`)}&tag=${AFFILIATE_TAG}`;

  const claimBounty = async (bounty) => {
    if (!user || !db || claimingId) return;
    setClaimingId(bounty.id);

    try {
      const rewardCoins = Number(bounty.rewardPoints) || 50;
      const rewardXp = Math.round(rewardCoins * 2.5);

      // Record detailed claim audit
      const claimRef = doc(collection(db, `users/${user.uid}/claims`));
      await setDoc(claimRef, {
        bountyId: bounty.id,
        movieId: bounty.movieId || null,
        movieTitle: bounty.movieTitle || 'Target',
        coinsAwarded: rewardCoins,
        xpAwarded: rewardXp,
        claimedAt: serverTimestamp()
      });

      // Directly increment user balance and XP in user document
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: increment(rewardCoins),
        xp: increment(rewardXp)
      });

      showToast?.(`Bounty Secured: +${rewardCoins} Studio Credits and +${rewardXp} XP transferred!`, "success");
    } catch (error) {
      console.error("Failed to secure bounty:", error);
      showToast?.("Bounty verification failed: Network interference.", "error");
    } finally {
      setClaimingId(null);
    }
  };

  const getImageUrl = (posterPath, size = 'w500') => {
    if (!posterPath) return '';
    if (posterPath.startsWith('http')) return posterPath;
    return `https://image.tmdb.org/t/p/${size}${posterPath.startsWith('/') ? '' : '/'}${posterPath}`;
  };

  const handleImageError = (id) => {
    setImageErrors(prev => ({ ...prev, [id]: true }));
  };

  return (
    <div className={`p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-[#080d1a]/95 backdrop-blur-2xl rounded-3xl border border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.85)] font-sans text-slate-100 ${compactMode ? 'py-4 gap-5' : ''}`}>
      
      {/* LEFT MAIN DECK */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* OPERATIONAL BOUNTY BOARD */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-5 font-mono">
            <div className="flex items-center gap-2.5">
              <span className="text-base">🎯</span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Daily Call Sheet &amp; Priority Bounties
              </h2>
            </div>
            <span className="text-[10px] text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded">
              SECTOR REWARDS ACTIVE
            </span>
          </div>
          
          {activeBounties.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#050811] border border-cyan-500/15 text-center font-mono text-xs text-slate-500">
              No active priority targets on the board. Explore the global archive to initiate scouting dispatches.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeBounties.map(bounty => {
                const isClaimed = claimedBounties.includes(bounty.id);
                const isProcessing = claimingId === bounty.id;
                const rewardPts = bounty.rewardPoints || 50;

                return (
                  <div 
                    key={bounty.id} 
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 font-mono ${
                      isClaimed 
                        ? 'bg-[#06100c]/60 border-emerald-500/30 opacity-75' 
                        : 'bg-[#050811] border-cyan-500/20 hover:border-cyan-400 shadow-lg'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest mb-1">
                        <span>Target Assignment</span>
                        <span className="text-amber-400 font-bold">+{rewardPts} 🪙</span>
                      </div>
                      <h3 className={`text-sm font-bold truncate ${isClaimed ? 'text-slate-400 line-through' : 'text-white'}`}>
                        {bounty.movieTitle || 'Classified Objective'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 font-sans font-light">
                        {bounty.description || 'Confirm film viewing or publish a verified critique to claim bounty credits.'}
                      </p>
                    </div>

                    <button 
                      type="button"
                      onClick={() => claimBounty(bounty)} 
                      disabled={isClaimed || isProcessing} 
                      className={`mt-4 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                        isClaimed 
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 cursor-default' 
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : isClaimed ? (
                        '✓ Bounty Claimed'
                      ) : (
                        `Secure Bounty (+${rewardPts} 🪙)`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TRANSMISSION LOG GRID */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-5 font-mono">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${activeTheme?.dot || 'bg-cyan-400'} animate-pulse`} />
              <span>{userRank}&apos;s Surveillance Activity</span>
            </h2>
            <Link
              href="/where-to-watch"
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
            >
              Explore Feeds →
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#050811] border border-cyan-500/15 text-center font-mono text-xs text-slate-500 space-y-2">
              <p>No recent surveillance logs recorded.</p>
              <Link
                href="/where-to-watch"
                className="inline-block px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold uppercase transition-all shadow"
              >
                Scan Cinema Feeds
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recentActivity.map((movie, index) => {
                const posterSrc = getImageUrl(movie.poster_path, 'w500');
                const uniqueKey = movie.id ? `${movie.id}-${index}` : index;
                const hasError = imageErrors[movie.id];
                const displayTitle = movie.title || movie.name || 'Untitled';

                return (
                  <div 
                    key={uniqueKey} 
                    className="flex flex-col group cursor-pointer" 
                    onClick={() => router.push(`/movie/${movie.id}`)}
                  >
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#050811] border border-cyan-500/20 group-hover:border-cyan-400 transition-all duration-300 shadow-md mb-2">
                      {movie.poster_path && !hasError ? (
                        <Image 
                          src={posterSrc} 
                          alt={displayTitle} 
                          fill 
                          sizes="150px" 
                          priority={index < 5} 
                          onError={() => handleImageError(movie.id)}
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-[10px] text-slate-500 p-2 text-center font-mono">
                          {displayTitle}
                        </div>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors leading-tight truncate font-mono uppercase tracking-tight">
                      {displayTitle}
                    </h3>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
      
      {/* RIGHT TELEMETRY RAIL */}
      <div className="space-y-6">
        
        {/* ACTIVE RADAR TARGETS */}
        <div className="bg-[#050811] border border-cyan-500/25 p-5 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20 font-mono">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>📡</span> Active Radar ({radarItems.length})
            </h2>
            <Link href="/watchlist" className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline">
              View All →
            </Link>
          </div>

          {radarItems.length === 0 ? (
            <p className="text-xs font-mono text-slate-500 text-center py-6">
              Radar empty. Add titles from Where to Watch.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {radarItems.slice(0, 6).map((movie, index) => {
                const radarSrc = getImageUrl(movie.poster_path, 'w200');
                const uniqueKey = movie.id ? `radar-${movie.id}-${index}` : `radar-${index}`;
                const hasError = imageErrors[`radar-${movie.id}`];
                const title = movie.title || movie.name || 'Untitled';

                return (
                  <div 
                    key={uniqueKey} 
                    onClick={() => router.push(`/movie/${movie.id}`)} 
                    className="flex flex-col items-center group cursor-pointer"
                  >
                    <div className={`relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-[#101424] border border-cyan-500/20 transition-all duration-300 shadow-sm mb-1.5 ${hoverGlow ? 'group-hover:border-cyan-400 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]' : ''}`}>
                      {movie.poster_path && !hasError ? (
                        <Image 
                          src={radarSrc} 
                          alt={title} 
                          fill 
                          sizes="80px" 
                          onError={() => handleImageError(`radar-${movie.id}`)}
                          className="object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-[9px] text-slate-500 text-center p-1 font-mono">
                          🎬
                        </div>
                      )}
                    </div>
                    <h3 className="text-[10px] font-mono text-slate-400 text-center truncate w-full group-hover:text-white transition-colors">
                      {title}
                    </h3>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AFFILIATE MONETIZATION & ARMOURY REQUISITION */}
        <div className="bg-gradient-to-br from-[#0c1424] to-[#050811] border border-amber-500/30 p-5 rounded-3xl relative overflow-hidden group shadow-xl font-mono">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-2 relative z-10">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>🎟️</span> Studio Requisition
            </span>
            <span className="text-[9px] bg-amber-950/80 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded">
              PHYSICAL ARCHIVE
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed relative z-10">
            Acquire the limited 4K Ultra HD Steelbook physical media archive for <strong className="text-white font-mono">{topMovieTitle}</strong>.
          </p>

          <div className="space-y-2 relative z-10">
            <a 
              href={amazonAffiliateLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-center text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)] active:scale-95 cursor-pointer"
            >
              Order 4K Steelbook ↗
            </a>

            <Link
              href="/armoury"
              className="block w-full py-2 bg-[#050811] hover:bg-white/5 border border-cyan-500/25 hover:border-cyan-400 text-cyan-300 text-center text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors"
            >
              Visit Prop Department &amp; Backlot
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}