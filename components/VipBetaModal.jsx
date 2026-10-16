// File: components/VipBetaModal.jsx
"use client";

import { useState } from 'react';

export default function VipBetaModal({ isOpen, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleClaimBetaDeal = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to initialize Stripe checkout uplink.');
      }

      // Route operative directly to the encrypted Stripe terminal
      window.location.assign(data.url);
    } catch (error) {
      console.error("VIP Enrollment Failed:", error);
      setErrorMessage(error.message || 'Payment terminal unreachable.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-sans">
      <div className="relative w-full max-w-lg bg-[#0b1120] border-2 border-amber-400/70 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.25)] text-center space-y-6 overflow-hidden">
        
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Dismiss trigger */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-gray-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
        >
          ✕
        </button>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-400/50 text-[9px] font-mono tracking-widest text-amber-300 font-bold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            FOUNDER BETA ALLOCATION ACTIVE
          </span>
          <h3 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
            Unlock VIP Founders Pass
          </h3>
          <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
            Step up from standard access and unlock all VIP Genre Curators, custom AI personas, and advanced streaming radar telemetry.
          </p>
        </div>

        {/* Pricing Specification Card */}
        <div className="p-4 bg-black/70 border border-amber-500/40 rounded-2xl text-left space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                Early Adopter Allocation
              </span>
              <span className="text-lg font-black text-white uppercase">
                Founder VIP Access
              </span>
            </div>
            <span className="px-2.5 py-1 bg-amber-500 text-black font-black text-[9px] uppercase tracking-widest rounded-md">
              Limited Tier
            </span>
          </div>

          <div className="space-y-2 border-t border-white/10 pt-3 text-xs text-gray-300 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Locked-in Founder rate for the life of active membership</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Real-time cross-platform radar alerts across major services</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>Unlimited custom AI director personas &amp; priority telemetry</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleClaimBetaDeal}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-90 disabled:opacity-50 text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer text-xs flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin"></span>
          ) : (
            'Proceed to Stripe Checkout'
          )}
        </button>

        <span className="text-[10px] font-mono text-gray-500 block uppercase tracking-wider">
          256-bit encrypted checkout • Zero commitment • Cancel anytime
        </span>

      </div>
    </div>
  );
}