// File: app/error.jsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error("SceneSense boundary caught error:", error);
  }, [error]);

  const errorMessage = error?.message || "Unexpected rendering or network interruption.";
  const errorDigest = error?.digest ? `DIGEST: ${error.digest}` : "RUNTIME EXCEPTION";

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full studio-panel rounded-3xl p-8 text-center space-y-6">
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono font-semibold uppercase tracking-widest text-rose-300">
            Studio Recovery
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Something interrupted this scene
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            We logged the interruption so your watchlist and session stay safe. Retry below or return to the Discovery Studio.
          </p>
        </div>

        <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-left font-mono text-[11px] text-slate-400 overflow-hidden">
          <div className="text-rose-300 font-semibold mb-0.5 truncate">{errorDigest}</div>
          <div className="line-clamp-2 text-slate-500">{errorMessage}</div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer"
          >
            Retry Current View
          </button>
          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Return to Discover Studio
          </Link>
        </div>
      </div>
    </div>
  );
}
