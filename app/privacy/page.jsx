// app/privacy/page.jsx
import Link from 'next/link';

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-light">
          <p>
            SceneSense handles user telemetry strictly for authentication, watchlist curation, and localized search experience optimization.
          </p>
          <p>
            We do not monetize or distribute personal user identifiers to unauthorized external third parties.
          </p>
        </div>
      </div>
    </div>
  );
}