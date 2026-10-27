// File: components/AdSenseBlock.jsx
"use client";

import { useEffect, useRef, useState } from 'react';

const DEFAULT_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-0000000000000000";

export default function AdSenseBlock({ 
  slot = "0000000000", 
  client = DEFAULT_CLIENT_ID,
  format = "auto",
  responsive = true,
  view = "grid",
  className = "",
  showFallbackOnBlock = true
}) {
  const adRef = useRef(null);
  const isPushedRef = useRef(false);
  const [adBlocked, setAdBlocked] = useState(false);

  useEffect(() => {
    // Only execute on browser client
    if (typeof window === "undefined") return;

    // Check if client is standard placeholder
    if (client === "ca-pub-0000000000000000" || !slot || slot === "0000000000") {
      setAdBlocked(true);
      return;
    }

    try {
      if (!isPushedRef.current) {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        isPushedRef.current = true;
      }
    } catch (err) {
      // AdSense tag error or ad-blocker interception caught gracefully
      console.warn("AdSense telemetry notice:", err);
      setAdBlocked(true);
    }
  }, [client, slot]);

  // If ad is blocked and fallback mode is disabled, collapse cleanly
  if (adBlocked && !showFallbackOnBlock) {
    return null;
  }

  // Fallback HUD spotlight when publisher ID is unassigned or blocked
  if (adBlocked && showFallbackOnBlock) {
    return (
      <div 
        className={`bg-[#080d1a] border border-cyan-500/20 rounded-2xl flex flex-col items-center justify-center p-5 relative overflow-hidden group shadow-lg transition-all hover:border-cyan-500/40 ${
          view === 'list' ? 'w-full mb-6' : 'w-full my-3'
        } ${className}`}
      >
        {/* Terminal Header */}
        <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-cyan-500/15 font-mono text-[9px]">
          <span className="uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            PARTNER RELAY // SPONSORED TRANSMISSION
          </span>
          <span className="text-slate-500 uppercase tracking-wider">
            SCENESENSE COMMISSARY
          </span>
        </div>

        {/* Content Box */}
        <div className="w-full bg-[#050811] rounded-xl flex flex-col items-center justify-center text-slate-300 text-xs font-mono text-center p-4 border border-cyan-500/10 shadow-inner group-hover:border-cyan-400/30 transition-colors">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-amber-400 text-sm">🎟️</span>
            <span className="font-bold text-white uppercase tracking-wider">
              Studio Supporter Spotlight
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans max-w-md leading-relaxed font-light">
            Empower independent cinema discovery. Support high-fidelity surveillance algorithms and community dispatches via our Tip Jar.
          </p>
        </div>
      </div>
    );
  }

  // Production AdSense Script Container
  return (
    <div 
      className={`bg-[#080d1a] border border-cyan-500/20 rounded-2xl flex flex-col items-center justify-center p-4 relative overflow-hidden shadow-lg ${
        view === 'list' ? 'w-full mb-6' : 'w-full my-3'
      } ${className}`}
    >
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/15 font-mono text-[9px] text-slate-500">
        <span className="uppercase tracking-widest text-cyan-400/80">
          SPONSORED TRANSMISSION
        </span>
        <span>ADVERTISEMENT</span>
      </div>

      <div ref={adRef} className="w-full flex items-center justify-center min-h-[90px] overflow-hidden">
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", textAlign: "center" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      </div>
    </div>
  );
}