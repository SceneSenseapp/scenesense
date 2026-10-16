// components/CommunityReviews.jsx
"use client";

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

export default function CommunityReviews({ movieId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!movieId) return;

    const fetchCommunityReviews = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'reviews'),
          where('movieId', '==', String(movieId)),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReviews(fetched);
      } catch (error) {
        console.error("Failed to fetch community reviews:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunityReviews();
  }, [movieId]);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1) 
    : 'N/A';

  return (
    <div className="w-full space-y-4 pt-6 border-t border-white/10 text-left">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-500 font-bold">Community Transmissions &amp; Reviews</h4>
        <div className="text-xs bg-black/60 border border-white/10 px-3 py-1 rounded-xl text-amber-400 font-mono font-bold">
          ★ {averageRating} / 10 ({reviews.length} Operatives)
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 font-mono italic">Decrypting community telemetry...</p>
      ) : reviews.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-black/60 border border-white/10 p-4 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{rev.userDisplayName || 'Anonymous Operative'}</span>
                <span className="text-xs text-amber-400 font-mono">★ {rev.rating}/10</span>
              </div>
              <p className="text-xs text-gray-300 font-light leading-relaxed">{rev.reviewText || rev.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 font-mono italic">No community transmissions recorded for this title yet. Be the first to review via your profile dashboard.</p>
      )}
    </div>
  );
}