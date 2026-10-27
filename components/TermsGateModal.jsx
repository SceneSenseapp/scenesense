// File: components/TermsGateModal.jsx
"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { playConfirmTone, playTerminalClick } from '@/components/utils/sfx';

export default function TermsGateModal({ isOpen, onAccept }) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef(null);

  // Prevent background scroll while gate modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!hasAgreed || isSubmitting) return;

    setIsSubmitting(true);
    playConfirmTone();

    try {
      // 1. Cache acceptance locally for fast boot clearance
      if (typeof window !== "undefined") {
        localStorage.setItem("scenesense_terms_accepted", "true");
        localStorage.setItem("scenesense_terms_accepted_at", new Date().toISOString());
      }

      // 2. Sync compliance telemetry to Firestore if authenticated
      const user = auth.currentUser;
      if (user && db) {
        await updateDoc(doc(db, "users", user.uid), {
          termsAccepted: true,
          termsAcceptedAt: serverTimestamp()
        }).catch((err) => {
          console.warn("User compliance telemetry notice:", err);
        });
      }

      onAccept?.();
    } catch (err) {
      console.error("Compliance registration interrupted:", err);
      onAccept?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 font-sans select-none animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-gate-title"
    >
      {/* Background Depth Halos */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="bg-[#080d1a]/95 border border-cyan-500/35 w-full max-w-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_80px_rgba(6,182,212,0.25)] text-slate-100 relative z-10 font-mono backdrop-blur-2xl">
        
        {/* Terminal Header */}
        <div className="space-y-2 text-center border-b border-cyan-500/20 pb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
              OPERATIONAL COMPLIANCE PROTOCOL // V2.6
            </span>
          </div>

          <h2 id="terms-gate-title" className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            Operational Terms &amp; Privacy Policy
          </h2>
          <p className="text-xs text-slate-300 font-sans font-light max-w-md mx-auto leading-relaxed">
            Prior to accessing the SceneSense Neural Cinema Engine, AI intelligence feeds, and satellite catalogs, review and verify our operating protocols.
          </p>
        </div>

        {/* Scrollable Telemetry Terms Contract */}
        <div 
          ref={scrollRef}
          className="bg-[#050811] border border-cyan-500/20 rounded-2xl p-4.5 h-48 overflow-y-auto text-[11px] text-slate-300 space-y-3 font-mono leading-relaxed shadow-inner scrollbar-thin scrollbar-thumb-cyan-500/30 pr-3"
        >
          <div>
            <span className="text-cyan-400 font-bold block mb-0.5">1. AI REASONING &amp; DATA ACCURACY</span>
            <p className="text-slate-400 font-sans font-light text-xs">
              Algorithmic recommendations, psychometric mood analyses, and script telemetry are generated using synthetic AI language models and third-party catalog feeds. Strict cinematic accuracy, factual runtime precision, or availability consensus is not warranted.
            </p>
          </div>

          <div>
            <span className="text-cyan-400 font-bold block mb-0.5">2. NON-COMMERCIAL SAFE HARBOR &amp; APIS</span>
            <p className="text-slate-400 font-sans font-light text-xs">
              SceneSense is a personal non-commercial discovery utility. This product utilizes the TMDB API but is neither endorsed nor certified by TMDB. Streaming telemetry is powered by JustWatch[cite: 20]. SceneSense does not host, upload, or broadcast proprietary media streams[cite: 20].
            </p>
          </div>

          <div>
            <span className="text-cyan-400 font-bold block mb-0.5">3. LIMITATION OF LIABILITY &amp; EXTERNAL RELAYS</span>
            <p className="text-slate-400 font-sans font-light text-xs">
              SceneSense assumes no liability for external hyperlinks, third-party provider subscriptions, box-office ticket acquisitions, or affiliate merchandise transactions conducted through external networks.
            </p>
          </div>

          <div>
            <span className="text-cyan-400 font-bold block mb-0.5">4. SECURITY, DOSSIERS &amp; WATCHLIST RADAR</span>
            <p className="text-slate-400 font-sans font-light text-xs">
              Operative authentication details, telemetry credits, saved watchlist targets, and published reviews are securely cataloged in encrypted cloud datastores to sustain your profile dossier.
            </p>
          </div>
        </div>

        {/* Affirmative Compliance Checkbox */}
        <div className="flex items-center gap-3 bg-[#050811] border border-cyan-500/25 p-3.5 rounded-2xl">
          <input 
            type="checkbox"
            id="terms-affirmation"
            checked={hasAgreed}
            onChange={(e) => {
              playTerminalClick();
              setHasAgreed(e.target.checked);
            }}
            className="w-4 h-4 rounded border-cyan-500/40 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-[#080d1a] cursor-pointer accent-cyan-500 shrink-0"
          />
          <label 
            htmlFor="terms-affirmation" 
            className="text-xs text-slate-200 cursor-pointer select-none leading-snug font-sans font-light"
          >
            I acknowledge and accept the <Link href="/terms" target="_blank" className="text-cyan-400 underline font-mono hover:text-cyan-300">Terms of Service</Link>, <Link href="/privacy" target="_blank" className="text-cyan-400 underline font-mono hover:text-cyan-300">Privacy Policy</Link>, and <Link href="/disclaimer" target="_blank" className="text-cyan-400 underline font-mono hover:text-cyan-300">API Disclaimers</Link>.
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-3 pt-1">
          <button
            type="button"
            disabled={!hasAgreed || isSubmitting}
            onClick={handleConfirm}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Validating Clearance...</span>
              </>
            ) : (
              'Accept Protocols & Authorize Clearance'
            )}
          </button>

          <p className="text-[10px] text-center text-slate-500 font-mono">
            Compliance records can be re-examined at any time via the studio footer directory.
          </p>
        </div>

      </div>
    </div>
  );
}