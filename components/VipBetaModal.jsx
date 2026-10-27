// File: components/VipBetaModal.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { playTerminalClick, playDeploySweep } from '@/components/utils/sfx';

export default function VipBetaModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      playTerminalClick();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleSendTip = async () => {
    setLoading(true);
    setErrorMessage(null);
    playDeploySweep();

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 5,
          userId: user?.uid || null,
          userEmail: user?.email || null,
        }),
      });

      const data = await res.json();

      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }

      const fallbackUrl = process.env.NEXT_PUBLIC_STRIPE_TIP_URL;
      if (fallbackUrl) {
        window.location.assign(fallbackUrl);
        return;
      }

      throw new Error(data?.error || 'Payment gateway unlinked.');
    } catch (error) {
      console.error("Support transmission notice:", error);
      const fallbackUrl = process.env.NEXT_PUBLIC_STRIPE_TIP_URL;
      if (fallbackUrl) {
        window.location.assign(fallbackUrl);
        return;
      }
      setErrorMessage("Stripe terminal momentarily unreachable. Re-scan in 60s.");
      setLoading(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      onClick={() => {
        playTerminalClick();
        onClose();
      }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fade-in font-sans select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#080d1a]/95 border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.25)] text-center space-y-6 overflow-hidden font-mono backdrop-blur-2xl"
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <button 
          type="button"
          onClick={() => {
            playTerminalClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#050811] border border-white/20 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors"
          title="Dismiss Modal (Esc)"
        >
          ✕
        </button>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-400/60 text-[9px] tracking-widest text-amber-300 font-bold uppercase shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            100% FREE &amp; OPEN ACCESS
          </span>
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
            Fuel SceneSense
          </h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed font-sans font-light">
            All features, AI curators, watchlist radars, and movie dossiers are completely free. If you enjoy using the platform, voluntary tips help offset monthly database and domain hosting bills.
          </p>
        </div>

        <div className="p-4.5 bg-[#050811] border border-cyan-500/20 rounded-2xl text-left space-y-2 relative overflow-hidden shadow-inner font-sans text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold font-mono">✓</span>
            <span>Zero paywalls on movie metadata, streaming links, or AI chat</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold font-mono">✓</span>
            <span>Community-driven and non-commercial</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold font-mono">✓</span>
            <span>Supporters receive a golden profile badge and commissary credits</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={handleSendTip}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-95 disabled:opacity-40 text-black font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.35)] cursor-pointer text-xs flex items-center justify-center gap-2 active:scale-95"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              <span>Connecting to Stripe Gateway...</span>
            </>
          ) : (
            'Send a $5 Coffee Tip via Stripe'
          )}
        </button>

        <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
          Voluntary tip • Does not purchase media data or subscriptions
        </span>
      </div>
    </div>
  );
}