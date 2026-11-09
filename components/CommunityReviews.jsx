// File: components/CommunityReviews.jsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, query, limit, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import toast from 'react-hot-toast';

export default function CommunityReviews({ movieId, onWriteReview }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revealedSpoilers, setRevealedSpoilers] = useState({});
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, NO_SPOILERS, TOP_RATED
  const [userReactions, setUserReactions] = useState({});

  useEffect(() => {
    if (!movieId) return;

    let isMounted = true;
    const fetchCommunityReviews = async () => {
      setLoading(true);
      try {
        if (!db) {
          setLoading(false);
          return;
        }
        const q = query(collection(db, 'reviews'), limit(150));
        const snapshot = await getDocs(q);
        const targetStr = String(movieId);

        const fetched = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          .filter(
            (r) =>
              String(r.targetId || '') === targetStr ||
              String(r.movieId || '') === targetStr
          )
          .sort((a, b) => {
            const tA = a.createdAt?.seconds || (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() / 1000 : 0);
            const tB = b.createdAt?.seconds || (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() / 1000 : 0);
            return tB - tA;
          });

        if (isMounted) {
          setReviews(fetched);
        }
      } catch (error) {
        console.error('Failed to fetch community reviews:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCommunityReviews();
    return () => {
      isMounted = false;
    };
  }, [movieId]);

  const normalizedRatings = reviews
    .map((r) => {
      const val = Number(r.rating) || 0;
      return val <= 5 ? val * 2 : val;
    })
    .filter((v) => v > 0);

  const averageRating =
    normalizedRatings.length > 0
      ? (
          normalizedRatings.reduce((acc, v) => acc + v, 0) /
          normalizedRatings.length
        ).toFixed(1)
      : 'N/A';

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (filterMode === 'NO_SPOILERS') return !r.isSpoiler;
      if (filterMode === 'TOP_RATED') return (Number(r.rating) || 0) >= 4;
      return true;
    });
  }, [reviews, filterMode]);

  const handleReact = async (reviewId, emojiKey) => {
    if (!auth.currentUser) {
      toast.error("Please sign in to react to dispatches.");
      return;
    }

    const stateKey = `${reviewId}_${emojiKey}`;
    if (userReactions[stateKey]) return; // Already reacted in this session

    setUserReactions(prev => ({ ...prev, [stateKey]: true }));

    // Optimistically update local review reactions
    setReviews(prev => prev.map(r => {
      if (r.id !== reviewId) return r;
      const current = r.reactions || { fire: 0, mindblown: 0, popcorn: 0 };
      return {
        ...r,
        reactions: {
          ...current,
          [emojiKey]: (current[emojiKey] || 0) + 1
        }
      };
    }));

    try {
      const revRef = doc(db, 'reviews', reviewId);
      await updateDoc(revRef, {
        [`reactions.${emojiKey}`]: increment(1)
      });
      toast.success("Reaction broadcasted!", { icon: '📡' });
    } catch (err) {
      console.warn("Could not sync reaction to cloud:", err.message);
    }
  };

  const handleCopyQuote = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Critique quote copied to clipboard!", { icon: '📋' });
  };

  return (
    <div className="w-full space-y-4 pt-6 border-t border-cyan-500/20 text-left font-sans">
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h4 className="text-xs font-mono uppercase tracking-[0.2em] text-cyan-400 font-bold">
            💬 Community Transmissions &amp; Reviews
          </h4>
          <span className="text-[11px] bg-black/70 border border-amber-500/30 px-2.5 py-0.5 rounded-lg text-amber-400 font-mono font-bold">
            ★ {averageRating} / 10 ({reviews.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {reviews.length > 0 && (
            <div className="flex items-center gap-1 bg-[#0b0e17] border border-cyan-500/30 p-0.5 rounded-xl text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`px-2 py-1 rounded-lg transition-all ${filterMode === 'ALL' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('NO_SPOILERS')}
                className={`px-2 py-1 rounded-lg transition-all ${filterMode === 'NO_SPOILERS' ? 'bg-cyan-500 text-black font-black' : 'text-gray-400 hover:text-white'}`}
              >
                Shielded
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('TOP_RATED')}
                className={`px-2 py-1 rounded-lg transition-all ${filterMode === 'TOP_RATED' ? 'bg-amber-400 text-black font-black' : 'text-gray-400 hover:text-white'}`}
              >
                ★ 4+
              </button>
            </div>
          )}

          {onWriteReview && (
            <button
              type="button"
              onClick={onWriteReview}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border border-cyan-400/40 text-[10px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
            >
              ✍️ File Review
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 font-mono italic">
          Decrypting community telemetry...
        </p>
      ) : filteredReviews.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-2 scrollbar-thin">
          {filteredReviews.map((rev) => {
            const rawRating = Number(rev.rating) || 5;
            const displayRating = rawRating <= 5 ? `${rawRating}/5` : `${rawRating}/10`;
            const isBlurred = rev.isSpoiler && !revealedSpoilers[rev.id];
            const contentText = rev.reviewText || rev.content || rev.text || rev.comment || '';
            const reactions = rev.reactions || { fire: 0, mindblown: 0, popcorn: 0 };

            return (
              <div
                key={rev.id}
                className="bg-black/70 border border-cyan-500/20 hover:border-cyan-500/50 p-4 rounded-2xl flex flex-col justify-between gap-3 transition-all shadow-md group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {rev.userName || rev.authorName || rev.userDisplayName || 'Operative'}
                      </span>
                      {rev.verdictTags?.length > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-300 uppercase">
                          {rev.verdictTags[0]}
                        </span>
                      ) : rev.reviewTag ? (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-300 uppercase">
                          {rev.reviewTag}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-amber-400 font-mono font-bold">
                      ★ {displayRating}
                    </span>
                  </div>

                  <div className="relative">
                    <p
                      className={`text-xs text-gray-300 font-light leading-relaxed transition-all ${
                        isBlurred ? 'blur-md select-none' : ''
                      }`}
                    >
                      {contentText}
                    </p>
                    {isBlurred && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedSpoilers((prev) => ({ ...prev, [rev.id]: true }))
                          }
                          className="px-3 py-1 rounded-lg bg-rose-950/90 hover:bg-rose-800 border border-rose-500/50 text-rose-200 text-[10px] font-mono font-bold uppercase tracking-wider shadow-lg cursor-pointer"
                        >
                          ⚠️ Spoiler Shield — Reveal
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reaction Micro-Bar & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleReact(rev.id, 'fire')}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-orange-950/60 border border-white/10 hover:border-orange-500/40 text-gray-300 hover:text-orange-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Mark as Fire"
                    >
                      <span>🔥</span>
                      <span>{reactions.fire || 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReact(rev.id, 'mindblown')}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-purple-950/60 border border-white/10 hover:border-purple-500/40 text-gray-300 hover:text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Mind Blown"
                    >
                      <span>🤯</span>
                      <span>{reactions.mindblown || 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReact(rev.id, 'popcorn')}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-amber-950/60 border border-white/10 hover:border-amber-500/40 text-gray-300 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Grab Popcorn"
                    >
                      <span>🍿</span>
                      <span>{reactions.popcorn || 0}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyQuote(contentText)}
                    className="opacity-60 hover:opacity-100 text-gray-400 hover:text-cyan-300 transition-opacity p-1"
                    title="Copy Quote"
                  >
                    📋
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-gray-500 font-mono italic">
          {filterMode !== 'ALL' ? 'No dispatches match the selected filter.' : 'No community transmissions recorded for this title yet. Be the first to file a critique!'}
        </p>
      )}
    </div>
  );
}
