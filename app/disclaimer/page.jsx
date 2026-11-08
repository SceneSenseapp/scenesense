// app/disclaimer/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'Legal Disclaimer',
  description: 'SceneSense legal disclaimer, TMDB data attribution, and non-commercial cinema aggregation.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#050508] text-slate-200 px-4 sm:px-6 py-16 flex justify-center font-sans">
      <div className="max-w-3xl w-full bg-[#0a0a14] border border-cyan-500/20 rounded-3xl p-8 md:p-12 shadow-2xl relative">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-8 cursor-pointer"
        >
          <span>←</span>
          <span>Return to Studio Radar</span>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
          Legal Disclaimer
        </h1>
        <p className="text-xs font-mono text-gray-500 mb-8 uppercase tracking-widest">
          Attribution &amp; Non-Commercial Indexing Notice
        </p>
        
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-light">
          <p>
            SceneSense is an independent movie intelligence and telemetry aggregator. All film metadata, poster artwork, and descriptions are furnished via third-party APIs (including TMDB and Watchmode) and remain the intellectual property of their respective copyright holders.
          </p>
          <p>
            SceneSense does not host, upload, or broadcast video streams. Any links to external platforms, ticketing providers, or streaming services are provided solely for editorial and discoverability convenience.
          </p>
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 font-mono text-xs text-cyan-200">
            🎬 This product uses the TMDB API but is not endorsed or certified by TMDB.
          </div>
        </div>
      </div>
    </div>
  );
}
