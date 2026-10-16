// app/terms/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service // SceneSense Studio',
  description: 'SceneSense terms of service, non-commercial usage policy, and third-party data attribution.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 px-4 sm:px-6 py-16 flex justify-center font-sans">
      <div className="max-w-3xl w-full bg-[#0a0a14] border border-cyan-500/20 rounded-3xl p-8 md:p-12 shadow-2xl relative">
        
        {/* Navigation Backlink */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-8 cursor-pointer"
        >
          <span>←</span>
          <span>Return to Studio Radar</span>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-xs font-mono text-gray-500 mb-8 uppercase tracking-widest">
          Effective Date: October 2026 • Non-Commercial Cinema Utility
        </p>
        
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed font-light">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider text-cyan-400">
              1. Platform Purpose &amp; Non-Commercial Policy
            </h2>
            <p>
              SceneSense is an independent, non-commercial movie discovery utility and personal cinema portfolio suite. Access to all search features, streaming availability indexes, AI prompts, and community review boards is provided free of charge for personal, non-commercial use.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider text-cyan-400">
              2. Third-Party Data &amp; TMDB Attribution
            </h2>
            <p>
              SceneSense utilizes verified cinematic metadata, artwork, and streaming platform indexing powered by The Movie Database (TMDB) API and JustWatch. 
            </p>
            <div className="bg-black/50 border border-cyan-500/20 rounded-xl p-4 text-xs font-mono text-cyan-300">
              This product uses the TMDB API but is not endorsed or certified by TMDB. SceneSense does not claim ownership over any poster images, plot summaries, character names, or distributor trademarks provided through third-party APIs.
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider text-cyan-400">
              3. No Media Hosting or Streaming
            </h2>
            <p>
              SceneSense does not host, upload, archive, stream, or broadcast proprietary audio, video, or full-length motion picture files. All streaming links direct users exclusively to verified external platforms (e.g., Netflix, Prime Video, Apple TV) or legitimate third-party services. SceneSense bears no responsibility for external third-party content or regional availability changes.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider text-cyan-400">
              4. Community Tip Jar &amp; Financial Support
            </h2>
            <p>
              Any voluntary contributions made through the SceneSense Tip Jar (processed via Stripe) represent non-commercial gifts intended solely to offset server hosting, domain registration, and infrastructure uptime costs. 
            </p>
            <p>
              Voluntary tips <strong>do not</strong> purchase digital media, content licenses, paywalled access, or functional privileges over non-tipping users. All platform features remain open and accessible to all registered operatives.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider text-cyan-400">
              5. Acceptable Use &amp; Automated Access
            </h2>
            <p>
              Users agree not to engage in malicious activity, including automated scraping, denial-of-service attempts, unauthorized reverse-engineering of proxy channels, or abuse of third-party rate limits. Violations will result in permanent suspension of access credentials.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t border-white/5 pt-6 text-xs text-gray-400">
            <p>
              For legal inquiries, copyright concerns, or data requests, contact our production desk at: <a href="mailto:support@scenesense.app" className="text-cyan-400 underline hover:text-cyan-300">support@scenesense.app</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}