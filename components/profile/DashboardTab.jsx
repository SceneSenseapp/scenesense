import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

const AFFILIATE_TAG = "scenesense-20";

export default function DashboardTab({ 
  user, 
  userRank, 
  activeTheme, 
  compactMode, 
  hoverGlow, 
  recentActivity, 
  radarItems, 
  activeBounties, 
  claimedBounties,
  showToast 
}) {
  const router = useRouter();
  const [imageErrors, setImageErrors] = useState({});

  const topMovieTitle = recentActivity?.[0]?.title || "sci-fi cyberpunk";
  const amazonAffiliateLink = `https://www.amazon.com/s?k=${encodeURIComponent(`${topMovieTitle} 4k steelbook bluray`)}&tag=${AFFILIATE_TAG}`;

  const claimBounty = async (bounty) => {
    if (!user) return;
    try {
      const claimRef = doc(collection(db, `users/${user.uid}/claims`));
      await setDoc(claimRef, {
        bountyId: bounty.id,
        movieId: bounty.movieId,
        movieTitle: bounty.movieTitle,
        pointsAwarded: bounty.rewardPoints,
        claimedAt: serverTimestamp()
      });
      showToast(`HVT Eliminated. ${bounty.rewardPoints} points transferred.`, "success");
    } catch (error) {
      console.error("Failed to secure bounty:", error);
      showToast("Bounty verification failed.", "error");
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
    <div className={`p-8 grid grid-cols-1 lg:grid-cols-3 gap-10 bg-[#0f0f0f]/80 ${compactMode ? 'py-4 gap-6' : ''}`}>
      <div className="lg:col-span-2">
        
        {/* OPERATIONAL BOUNTY BOARD */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <span className="text-amber-500 animate-pulse">🎯</span> High-Value Targets
            </h2>
          </div>
          
          {activeBounties.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No active targets on the board.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeBounties.map(bounty => {
                const isClaimed = claimedBounties.includes(bounty.id);
                return (
                  <div key={bounty.id} className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${isClaimed ? 'bg-green-950/20 border-green-900/50' : 'bg-[#141414] border-white/10 hover:border-amber-500/50 shadow-lg'}`}>
                     <div>
                       <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Target Identity</p>
                       <h3 className={`text-sm font-black truncate ${isClaimed ? 'text-gray-400 line-through' : 'text-white'}`}>{bounty.movieTitle}</h3>
                       <p className="text-xs text-amber-400 font-bold mt-2">REWARD: {bounty.rewardPoints} PTS</p>
                     </div>
                     <button 
                       onClick={() => claimBounty(bounty)} 
                       disabled={isClaimed} 
                       className={`mt-4 w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                         isClaimed 
                           ? 'bg-green-900/30 text-green-500 cursor-not-allowed border border-green-900/50' 
                           : 'bg-amber-600 hover:bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                       }`}
                     >
                       {isClaimed ? '✓ Bounty Secured' : 'Verify Kill'}
                     </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* TRANSMISSION LOG GRID */}
        <h2 className="text-sm font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${activeTheme.dot} animate-pulse`}></span> {userRank}&apos;s Transmission Log
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recentActivity.map((movie, index) => {
            const posterSrc = getImageUrl(movie.poster_path, 'w500');
            const uniqueKey = movie.id ? `${movie.id}-${index}` : index;
            const hasError = imageErrors[movie.id];

            return (
              <div key={uniqueKey} className="flex flex-col group cursor-pointer" onClick={() => router.push(`/movie/${movie.id}`)}>
                <div style={{ position: 'relative', aspectRatio: '2/3' }} className="w-full rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/5 transition-all duration-500 shadow-xl mb-3">
                  {movie.poster_path && !hasError ? (
                    <Image 
                      src={posterSrc} 
                      alt={movie.title} 
                      fill 
                      sizes="150px" 
                      priority={index < 5} 
                      onError={() => handleImageError(movie.id)}
                      className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-[10px] text-gray-400 p-2 text-center bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]">
                      {movie.title}
                    </div>
                  )}
                </div>
                <h3 className="text-xs font-bold text-white leading-tight line-clamp-1">{movie.title}</h3>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="space-y-8">
        {/* RADAR TARGETS */}
        <div>
          <h2 className="text-sm font-black text-white mb-6 uppercase tracking-widest">Active Radar</h2>
          <div className="grid grid-cols-3 gap-3">
            {radarItems.map((movie, index) => {
              const radarSrc = getImageUrl(movie.poster_path, 'w200');
              const uniqueKey = movie.id ? `radar-${movie.id}-${index}` : `radar-${index}`;
              const hasError = imageErrors[`radar-${movie.id}`];

              return (
                <div key={uniqueKey} onClick={() => router.push(`/movie/${movie.id}`)} className="flex flex-col items-center group cursor-pointer">
                  <div style={{ position: 'relative', aspectRatio: '3/4' }} className={`w-full rounded-lg overflow-hidden bg-[#1a1a1a] border border-white/5 transition-all duration-300 shadow-md mb-2 ${hoverGlow ? activeTheme.borderGlow : ''}`}>
                    {movie.poster_path && !hasError ? (
                      <Image 
                        src={radarSrc} 
                        alt={movie.title} 
                        fill 
                        sizes="100px" 
                        onError={() => handleImageError(`radar-${movie.id}`)}
                        className="object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[9px] text-gray-500 text-center p-1">
                        {movie.title}
                      </div>
                    )}
                  </div>
                  <h3 className="text-[10px] font-semibold text-gray-400 text-center line-clamp-1 group-hover:text-white transition-colors">
                    {movie.title}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* AFFILIATE MONETIZATION */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-amber-500/30 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-500/10 transition-colors"></div>
          <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-2 relative z-10">Armoury Requisition</h3>
          <p className="text-[11px] text-gray-400 mb-4 font-medium leading-relaxed relative z-10">
            Secure the limited 4K Steelbook archive for <span className="text-white font-bold">{topMovieTitle}</span>.
          </p>
          <a 
            href={amazonAffiliateLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block w-full py-2.5 bg-amber-500/10 border border-amber-500/40 text-amber-400 text-center text-xs font-black uppercase tracking-widest rounded-lg hover:bg-amber-500/20 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all relative z-10"
          >
            Access Armoury ↗
          </a>
        </div>
      </div>
    </div>
  );
}