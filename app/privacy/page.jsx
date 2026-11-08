// app/privacy/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'SceneSense privacy policy, telemetry handling, and data encryption protocols.',
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-xs font-mono text-gray-500 mb-8 uppercase tracking-widest">
          Last Updated: October 2026 • Studio Telemetry Guidelines
        </p>
        
        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-light">
          <p>
            SceneSense handles user telemetry strictly for authentication, watchlist curation, personalized AI recommendation vectors, and localized search experience optimization.
          </p>
          <p>
            We do not monetize, rent, or distribute personal user identifiers to unauthorized external third parties.
          </p>
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 font-mono text-xs text-cyan-200">
            🔒 Local telemetry such as active session history and color grading LUTs are cached in your device’s browser storage for instant retrieval.
          </div>
        </div>
      </div>
    </div>
  );
}
