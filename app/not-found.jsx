// File: app/not-found.jsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full studio-panel rounded-3xl p-8 text-center space-y-6">
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-semibold uppercase tracking-widest text-cyan-300">
            Reel 404 • Missing Frame
          </span>
          <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300 pt-1">
            404
          </h1>
          <h2 className="text-xl font-bold text-white">
            Page Not Found
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The route or title dossier you requested could not be found in the SceneSense archive.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider hover:opacity-95 transition-opacity"
          >
            Open Discover Studio
          </Link>
          <Link
            href="/where-to-watch"
            className="w-full py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            Browse Streaming Radar
          </Link>
        </div>
      </div>
    </div>
  );
}
