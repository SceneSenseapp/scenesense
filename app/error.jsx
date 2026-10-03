'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Neural telemetry error intercepted:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="max-w-md space-y-4 bg-[#101010] border border-red-900/50 p-8 rounded-2xl shadow-2xl">
        <span className="text-3xl">⚠️</span>
        <h2 className="text-lg font-black tracking-tight">Transmission Interrupted</h2>
        <p className="text-xs text-gray-400 leading-relaxed">
          An unexpected anomaly occurred within the SceneSense neural grid. Our diagnostic protocols have logged the event.
        </p>
        <button
          onClick={() => reset()}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(220,38,38,0.3)]"
        >
          Re-engage Telemetry Feed
        </button>
      </div>
    </main>
  );
}