// File: components/ReviewModal.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { playTerminalClick, playDeploySweep, playCoinChime } from '@/components/utils/sfx';

const RATING_STEPS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
const QUICK_TAGS = ['Masterpiece', 'Visually Stunning', 'Mind-Bending', 'Exceptional Acting', 'Cult Classic'];

export default function ReviewModal({ 
  targetId, 
  targetTitle = 'Untitled Production', 
  posterPath = '', 
  mediaType = 'movie', 
  onClose,
  onReviewSubmitted 
}) {
  const [mounted, setMounted] = useState(false);
  const [rating, setRating] = useState(5.0);
  const [reviewText, setReviewText] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Escape key dismissal
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      playTerminalClick();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!mounted || !targetId) return null;

  const handleAppendTag = (tag) => {
    playTerminalClick();
    setReviewText((prev) => prev ? `${prev} #${tag}` : `#${tag} `);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!reviewText.trim() || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    playDeploySweep();

    try {
      const authorName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Operative';
      const authorAvatar = currentUser.photoURL || null;
      const cleanPoster = posterPath ? (posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`) : '';
      const text = reviewText.trim();

      // 1. Dispatch official review document to archive
      const docRef = await addDoc(collection(db, 'reviews'), {
        userId: currentUser.uid,
        userName: authorName,
        authorName: authorName,
        userPhoto: authorAvatar,
        authorAvatar: authorAvatar,
        movieId: targetId,
        tmdbId: targetId,
        movieTitle: targetTitle,
        moviePoster: posterPath || '',
        posterPath: cleanPoster,
        mediaType,
        rating: Number(rating) || 5.0,
        reviewText: text,
        text: text,
        containsSpoilers: Boolean(containsSpoilers),
        isPublic: Boolean(isPublic),
        createdAt: serverTimestamp()
      });

      // 2. Increment operative progression metrics & credit stipend
      if (db && currentUser.uid) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          reviewCount: increment(1),
          xp: increment(50),
          coins: increment(10)
        }).catch((err) => {
          console.warn("User profile telemetry sync notice:", err);
        });
        playCoinChime();
      }

      onReviewSubmitted?.({ id: docRef.id, rating, reviewText: text });
      setReviewText('');
      onClose();
    } catch (err) {
      console.error("Review dispatch failure:", err);
      setErrorMessage("Transmission failed: Network interference or node error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 font-sans text-slate-100 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        playTerminalClick();
        onClose();
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#080d1a]/95 border border-cyan-500/35 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-[0_0_80px_rgba(6,182,212,0.25)] space-y-6 font-mono overflow-hidden"
      >
        {/* Background Depth Halos */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Header HUD */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                File Verified Studio Critique
              </h3>
            </div>
            <p className="text-xs text-white font-bold tracking-tight truncate max-w-[320px] mt-1 uppercase">
              {targetTitle}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playTerminalClick();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#050811] border border-white/10 hover:border-rose-500/50 hover:bg-rose-950/80 flex items-center justify-center text-slate-400 hover:text-rose-300 transition-colors cursor-pointer text-xs"
            title="Dismiss Review Window (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmitReview} className="space-y-4 relative z-10 text-xs">
          
          {/* Target Poster & Info Pill */}
          {posterPath && (
            <div className="flex items-center gap-3.5 bg-[#050811] border border-cyan-500/25 p-3 rounded-2xl shadow-inner">
              <div className="relative w-11 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-cyan-500/30 shrink-0">
                <Image
                  src={posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w200${posterPath}`}
                  alt={targetTitle}
                  fill
                  unoptimized
                  sizes="44px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate uppercase tracking-tight">
                  {targetTitle}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">
                  Reward: +50 XP &bull; +10 Studio Credits 🪙
                </span>
              </div>
            </div>
          )}

          {/* Star Rating Scale (9-Step Half-Star Deck) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label className="text-slate-300 uppercase tracking-wider font-bold">
                Rating: {rating.toFixed(1)} / 5.0
              </label>
              <span className="text-amber-400 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                ★ {rating >= 4.5 ? 'Masterpiece' : rating >= 3.5 ? 'Recommended' : rating >= 2.5 ? 'Mixed' : 'Flawed'}
              </span>
            </div>

            <div className="grid grid-cols-9 gap-1">
              {RATING_STEPS.map((step) => {
                const isSelected = rating === step;
                return (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      playTerminalClick();
                      setRating(step);
                    }}
                    className={`py-1.5 rounded-lg border font-bold text-[10px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-950/70 border-amber-400 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)] scale-105 z-10'
                        : 'bg-[#050811] border-cyan-500/20 text-slate-400 hover:text-white hover:border-cyan-400/50'
                    }`}
                  >
                    {step.toFixed(1)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Tags Strip */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
              Quick Tags (Click to append)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAppendTag(tag)}
                  className="px-2 py-1 bg-[#050811] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 rounded-lg text-[10px] transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Review Text Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <label className="uppercase tracking-wider font-bold">Critique &amp; Transmission</label>
              <span>{reviewText.length} chars</span>
            </div>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Detail narrative pacing, cinematography, sound design, thematic motifs..."
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-2xl p-3.5 text-xs text-white placeholder-slate-600 outline-none resize-none shadow-inner font-sans leading-relaxed"
              required
            />
          </div>

          {/* Visibility & Spoiler Checkboxes */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[10px] text-slate-300 uppercase tracking-wider">
                Public Broadcast
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={containsSpoilers}
                onChange={(e) => setContainsSpoilers(e.target.checked)}
                className="accent-cyan-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[10px] text-rose-300 uppercase tracking-wider">
                ⚠️ Spoilers Included
              </span>
            </label>
          </div>

          {errorMessage && (
            <p className="text-[10px] text-rose-400 bg-rose-950/60 p-2 rounded-xl border border-rose-500/30">
              {errorMessage}
            </p>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || !reviewText.trim()}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-black font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.25)] active:scale-95 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                <span>Transmitting Dispatch...</span>
              </>
            ) : (
              'Deploy Critique (+50 XP, +10 🪙)'
            )}
          </button>

        </form>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}