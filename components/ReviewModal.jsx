// File: components/ReviewModal.jsx
"use client";

import { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import toast from 'react-hot-toast';
import { trackQuestEvent } from '@/lib/quest-tracker';

const emptySubscribe = () => () => {};

const QUICK_VERDICTS = [
  'Masterpiece',
  'Visually Stunning',
  'Mind-Bending',
  'Exceptional Acting',
  'Cult Classic',
  'Crowd Pleaser',
];

export default function ReviewModal({
  targetId,
  targetTitle,
  posterPath,
  mediaType = 'movie',
  prefilledMovie,
  onClose,
}) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [selectedTags, setSelectedTags] = useState(['Masterpiece']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedId = targetId || prefilledMovie?.id;
  const resolvedTitle = targetTitle || prefilledMovie?.title || prefilledMovie?.name || 'Untitled Production';
  const resolvedPoster = posterPath || prefilledMovie?.poster_path || '';
  const resolvedType = prefilledMovie?.media_type || mediaType || 'movie';

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!isClient || !resolvedId) return null;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag].slice(0, 3)
    );
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !auth.currentUser) {
      toast.error("Please sign in and enter your critique.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Studio Critic',
        userPhoto: user.photoURL || '',
        movieId: resolvedId,
        targetId: resolvedId,
        movieTitle: resolvedTitle,
        posterPath: resolvedPoster,
        mediaType: resolvedType,
        rating,
        reviewText: reviewText.trim(),
        content: reviewText.trim(),
        isSpoiler,
        verdictTags: selectedTags,
        reactions: { fire: 1, mindblown: 0, popcorn: 0 },
        createdAt: new Date().toISOString()
      });

      // Reward stipend (+25 SceneCents, +75 XP) and track quest
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          coins: increment(25),
          xp: increment(75)
        });
      } catch {}

      trackQuestEvent('file_review_2', 1);
      toast.success("Critique filed! +25 SceneCents & +75 XP earned.", { icon: '✍️' });
      setReviewText('');
      onClose();
    } catch (err) {
      console.error("Review dispatch failure:", err);
      toast.error("Failed to submit review: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 font-sans text-white" role="dialog" aria-modal="true">
      <div className="bg-[#07070d] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-[0_0_60px_rgba(6,182,212,0.3)] space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
          <div>
            <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-300 font-bold">
              File Verified Studio Review
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[340px]">
              {resolvedTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close critique modal"
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:border-cyan-400 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmitReview} className="space-y-4">
          
          {/* Poster & Title Banner if available */}
          {resolvedPoster && (
            <div className="flex items-center gap-3 bg-[#0d0d18] border border-cyan-500/20 p-3 rounded-2xl">
              <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-black/40 shrink-0">
                <Image
                  src={`https://image.tmdb.org/t/p/w200${resolvedPoster}`}
                  alt={resolvedTitle}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div>
                <span className="text-xs font-bold text-white block line-clamp-1">{resolvedTitle}</span>
                <span className="text-[10px] font-mono text-amber-400">+25 SceneCents &amp; +75 XP Critic Stipend</span>
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
              <option value={5}>★★★★★ (5.0 Masterpiece)</option>
              <option value={4.5}>★★★★½ (4.5 Exceptional)</option>
              <option value={4}>★★★★☆ (4.0 Excellent)</option>
              <option value={3.5}>★★★½☆ (3.5 Solid)</option>
              <option value={3}>★★★☆☆ (3.0 Standard)</option>
              <option value={2}>★★☆☆☆ (2.0 Flawed)</option>
              <option value={1}>★☆☆☆☆ (1.0 Critical Failure)</option>
            </select>
          </div>

          {/* Verdict Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block">Verdict Tags (Up to 3)</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_VERDICTS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase transition-all cursor-pointer border ${
                      active
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Review Text Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block">Critique &amp; Transmission</label>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Enter your official critique, cinematography notes, or broadcast transmission..."
              className="w-full bg-[#090912] border border-cyan-500/30 focus:border-cyan-400 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 outline-none font-mono resize-none shadow-inner"
              required
            />
          </div>

          {/* Spoiler Toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={(e) => setIsSpoiler(e.target.checked)}
              className="accent-amber-400 w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-xs font-mono text-amber-300">
              ⚠️ Contains Plot Spoilers (Enable Spoiler Blur Shield)
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !reviewText.trim()}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-black font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
          >
            {isSubmitting ? 'Transmitting Dispatch...' : 'Submit Critique & Earn +25 🪙'}
          </button>

        </form>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
