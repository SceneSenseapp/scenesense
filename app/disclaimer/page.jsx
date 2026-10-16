// app/disclaimer/page.jsx
import Link from 'next/link';

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 px-6 py-16 flex justify-center">
      <div className="max-w-3xl w-full bg-[#0a0a14] border border-cyan-500/20 rounded-2xl p-8 md:p-12 shadow-2xl relative">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-8"
        >
          ← Return to Studio Radar
        </Link>

        <h1 className="text-3xl font-black text-white tracking-tight mb-6">
          Legal Disclaimer
        </h1>
        
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-light">
          <p>
            SceneSense is an independent movie intelligence and telemetry aggregator. All film metadata, poster artwork, and descriptions are furnished via third-party APIs (including TMDB) and remain the intellectual property of their respective owners.
          </p>
          <p>
            SceneSense does not host, upload, or broadcast pirated video streams. Any links to external platforms or affiliate providers are provided solely for convenience.
          </p>
        </div>
      </div>
    </div>
  );
}