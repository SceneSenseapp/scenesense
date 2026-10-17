// File: components/ReviewModal.jsx
"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function ReviewModal({ targetId, targetTitle, posterPath, mediaType = 'movie', onClose }) {
  const [mounted, setMounted] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!mounted || !targetId) return null;

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !auth.currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        userId: auth.currentUser.uid,
        movieId: targetId,
        movieTitle: targetTitle || 'Untitled Production',
        posterPath: posterPath || '',
        mediaType,
        rating,
        reviewText: reviewText.trim(),
        createdAt: new Date().toISOString()
      });

      alert("Review dispatched and verified successfully!");
      setReviewText('');
      onClose();
    } catch (err) {
      console.error("Review dispatch failure:", err);
      alert("Failed to submit review: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 font-sans text-white">
      <div className="bg-[#07070d] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-[0_0_60px_rgba(6,182,212,0.3)] space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div>
            <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-300 font-bold">
              File Verified Studio Review
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[340px]">
              {targetTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmitReview} className="space-y-4">
          
          {/* Poster & Title Banner if available */}
          {posterPath && (
            <div className="flex items-center gap-3 bg-[#0d0d18] border border-cyan-500/20 p-3 rounded-2xl">
              <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-black/40 shrink-0">
                <Image
                  src={`https://image.tmdb.org/t/p/w200${posterPath}`}
                  alt={targetTitle}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div>
                <span className="text-xs font-bold text-white block line-clamp-1">{targetTitle}</span>
                <span className="text-[10px] font-mono text-cyan-400">Global Review Uplink</span>
              </div>
            </div>
          )}

          {/* Rating Scale */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block">Star Rating</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full bg-[#0e0e18] border border-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value={5}>★★★★★ (5/5 Masterpiece)</option>
              <option value={4}>★★★★☆ (4/5 Excellent)</option>
              <option value={3}>★★★☆☆ (3/5 Standard)</option>
              <option value={2}>★★☆☆☆ (2/5 Flawed)</option>
              <option value={1}>★☆☆☆☆ (1/5 Critical Failure)</option>
            </select>
          </div>

          {/* Review Text Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block">Critique &amp; Transmission</label>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Enter your official critique or broadcast transmission..."
              className="w-full bg-[#090912] border border-cyan-500/30 focus:border-cyan-400 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 outline-none font-mono resize-none shadow-inner"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !reviewText.trim()}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
          >
            {isSubmitting ? 'Transmitting Dispatch...' : 'Submit Critique & Earn Stipend'}
          </button>

        </form>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}