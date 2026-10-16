// components/AdSenseBlock.jsx
"use client";

export default function AdSenseBlock({ view = 'grid' }) {
  return (
    <div className={`bg-[#121212] border border-dashed border-red-500/30 rounded-2xl flex flex-col items-center justify-center p-6 min-h-[160px] relative overflow-hidden group shadow-lg ${view === 'list' ? 'w-full mb-6' : 'w-full my-2'}`}>
      <span className="absolute top-2 left-4 text-[9px] font-mono uppercase tracking-widest text-red-500 font-bold">Sponsored Transmission</span>
      <div className="w-full h-full bg-[#181822] rounded-xl flex flex-col items-center justify-center text-gray-400 text-xs font-mono text-center px-4 py-6 border border-white/5 group-hover:border-red-500/50 transition-colors">
        <span className="text-sm mb-1">📢 [ Programmatic Native Ad Unit ]</span>
        <span className="text-[10px] text-gray-500">Passive Impression Revenue &amp; Partner Spotlight</span>
      </div>
    </div>
  );
}