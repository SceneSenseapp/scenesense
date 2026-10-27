// components/CommunityReviews.jsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

export default function CommunityReviews({ movieId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movieId || !db) return;

    setLoading(true);
    const strId = String(movieId);
    const numId = Number(movieId);
    const validTargets = !isNaN(numId) && strId !== String(numId) ? [strId] : Array.from(new Set([strId, numId]));

    const reviewsRef = collection(db, 'reviews');
    // Compound query to catch both string and integer TMDB IDs
    const q = query(
      reviewsRef,
      where('movieId', 'in', validTargets),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReviews(fetched);
        setLoading(false);
      },
      (error) => {
        console.warn("Compound review query notice, falling back without orderBy:", error);
        // Fallback without index requirement
        const fallbackQ = query(
          reviewsRef,
          where('movieId', 'in', validTargets)
        );
        onSnapshot(fallbackQ, (fallbackSnap) => {
          const fallbackData = fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          fallbackData.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });
          setReviews(fallbackData);
          setLoading(false);
        });
      }
    );

    return () => unsubscribe();
  }, [movieId]);

  // Standardize ratings to SceneSense 5.0 scale
  const getNormalizedRating = (val) => {
    const raw = Number(val || 0);
    return raw > 5 ? raw / 2 : raw;
  };

  const { averageRating, hasConsensus } = useMemo(() => {
    if (reviews.length === 0) return { averageRating: 'N/A', hasConsensus: false };
    const sum = reviews.reduce((acc, r) => acc + getNormalizedRating(r.rating), 0);
    const avg = (sum / reviews.length).toFixed(1);
    return {
      averageRating: avg,
      hasConsensus: reviews.length >= 7
    };
  }, [reviews]);

  const renderTextWithSpoilers = (text) => {
    if (!text) return null;
    const parts = text.split(/(\|\|[\s\S]*?\|\|)/g);
    return parts.map((part, i) => {
      if (part.startsWith('||') && part.endsWith('||')) {
        return (
          <span 
            key={i} 
            onClick={(e) => e.currentTarget.classList.toggle('text-transparent')}
            className="bg-black/90 border border-cyan-500/40 text-transparent hover:text-cyan-200 cursor-pointer rounded px-1.5 py-0.5 transition-colors select-none font-mono text-[10px] inline-block"
            title="Click to decrypt spoiler"
          >
            {part.slice(2, -2)}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <section aria-label="Community Critiques & Reviews" className="w-full space-y-4 pt-6 border-t border-cyan-500/20 text-left font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h4 className="text-[11px] uppercase tracking-widest text-cyan-400 font-bold">
            Community Transmissions &amp; Critiques
          </h4>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#050811] border border-amber-500/30 px-3 py-1 rounded-xl text-amber-300 font-bold shadow-inner">
            <span>★</span>
            <span>{averageRating} / 5.0</span>
            <span className="text-slate-500 text-[10px]">({reviews.length} Logged)</span>
          </div>

          <span className={`text-[10px] px-2.5 py-1 rounded-xl border uppercase tracking-wider ${
            hasConsensus
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 font-bold'
              : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-400/80 font-medium'
          }`}>
            {hasConsensus ? '✓ Consensus Verified' : `${reviews.length}/7 to Consensus`}
          </span>
        </div>
      </div>

      {/* Review Feed */}
      {loading ? (
        <div className="flex items-center gap-2.5 py-6 text-xs text-cyan-400 font-mono animate-pulse">
          <span className="w-3.5 h-3.5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <span>Decrypting sector transmissions...</span>
        </div>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-72 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-cyan-500/30">
          {reviews.map((rev) => {
            const author = rev.displayName || rev.userName || rev.authorName || 'Operative';
            const textContent = rev.reviewText || rev.text || rev.comment || '';
            const normalizedScore = getNormalizedRating(rev.rating).toFixed(1);

            return (
              <div 
                key={rev.id} 
                className="bg-[#050811] border border-cyan-500/20 hover:border-cyan-400/50 p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-md transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {rev.userPhoto || rev.authorAvatar ? (
                        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-cyan-500/30 shrink-0">
                          <Image 
                            src={rev.userPhoto || rev.authorAvatar} 
                            alt={author} 
                            fill 
                            unoptimized 
                            sizes="24px" 
                            className="object-cover" 
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-[10px] font-mono text-cyan-300 font-bold uppercase shrink-0">
                          {author.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-bold text-white truncate font-mono">
                        {author}
                      </span>
                    </div>

                    <span className="text-xs text-amber-400 font-mono font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg shrink-0">
                      ★ {normalizedScore}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-light leading-relaxed font-sans">
                    {renderTextWithSpoilers(textContent)}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1">
                  <span>
                    {rev.createdAt?.seconds 
                      ? new Date(rev.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Verified Entry'}
                  </span>
                  {rev.containsSpoilers && (
                    <span className="text-rose-400 font-bold">⚠️ Spoilers</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#050811] border border-cyan-500/15 text-center font-mono text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-300 uppercase tracking-wider">No sector dispatches logged yet.</p>
          <p className="text-[11px] text-slate-500">
            Be the first operative to publish analytical feedback on this target.
          </p>
        </div>
      )}
    </section>
  );
}