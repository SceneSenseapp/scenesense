// File: app/disclaimer/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'Legal & API Content Disclaimer // SceneSense Studio',
  description: 'SceneSense legal disclaimer, third-party data attribution, and non-commercial cinema aggregation terms.',
};

export default function DisclaimerPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050508] text-slate-100 px-4 sm:px-6 py-12 md:py-16 flex justify-center font-sans relative overflow-hidden">
      
      {/* Background Ambient Lighting */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-4xl w-full bg-[#080d1a] border border-cyan-500/25 rounded-3xl p-6 sm:p-10 md:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative z-10 space-y-8">
        
        {/* Navigation & Header HUD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-cyan-500/20">
          <div className="space-y-2">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer group mb-1"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
              <span>Return to Studio Radar</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                LEGAL COMPLIANCE // PROTOCOL 01
              </span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight font-mono uppercase">
              Legal &amp; Content Disclaimer
            </h1>
          </div>

          <div className="self-start sm:self-auto font-mono text-[10px] text-right bg-[#050811] border border-cyan-500/20 px-3.5 py-2 rounded-2xl">
            <span className="text-slate-500 block uppercase">LAST AUDIT:</span>
            <span className="text-cyan-300 font-bold">OCTOBER 2026 // PRODUCTION</span>
          </div>
        </div>

        {/* Structured Legal Disclosures */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed font-light">
          
          {/* Section 01 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>01 //</span> Independent Telemetry &amp; Non-Commercial Policy
            </h2>
            <p>
              SceneSense is an independent, non-commercial movie intelligence, curation, and telemetry aggregator. All features—including AI-driven recommendation prompts, streaming directory lookups, watchlists, and community discussion boards—are provided strictly for personal, educational, and cinematic discovery purposes.
            </p>
          </section>

          {/* Section 02 */}
          <section className="space-y-3 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>02 //</span> Third-Party Metadata &amp; TMDB API Attribution
            </h2>
            <p>
              This product uses the TMDB API but is not endorsed or certified by TMDB. All motion picture and television titles, artwork, character names, actor biographies, and release metadata remain the sole intellectual property of their respective production studios, copyright holders, and distributors.
            </p>
            <div className="p-3 bg-black/60 border border-cyan-500/30 rounded-xl text-xs font-mono text-cyan-300/90">
              TMDB Attribution Notice: Verified metadata and poster artwork rendered on SceneSense are sourced dynamically from The Movie Database (TMDB) in full accordance with their non-commercial API Guidelines.
            </div>
          </section>

          {/* Section 03 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>03 //</span> Zero Media Hosting &amp; Anti-Piracy Notice
            </h2>
            <p>
              SceneSense does not host, upload, store, encode, or broadcast video or audio files. SceneSense does not operate streaming servers or mirror copyrighted media. All outbound streaming references and availability badges direct users strictly to licensed third-party providers (such as Netflix, Prime Video, Apple TV, Disney+, and Criterion Channel) or legitimate ticketing partners.
            </p>
          </section>

          {/* Section 04 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>04 //</span> AI Generative Analysis &amp; Screening Predictions
            </h2>
            <p>
              CineMind, The Oracle, Script Doctor, and DirectorBot features utilize generative machine learning models (including Google Gemini AI). While designed to deliver high-signal cinematic lore and dramatic analysis, predictions, script subtext ratings, and thematic interpretations are generated for entertainment and reflective inquiry. Accuracy is not warranted.
            </p>
          </section>

          {/* Section 05 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>05 //</span> Affiliate Disclosures &amp; Voluntary Community Fuel
            </h2>
            <p>
              Certain external merchandise links (such as 4K Steelbook listings or official physical media) may contain affiliate tags that generate nominal commissions to offset server compute and hosting costs. Voluntary contributions made through the Community Tip Jar represent non-commercial gifts that do not purchase licensed media or paywalled privileges.
            </p>
          </section>

        </div>

        {/* Footer Cross-Links */}
        <div className="pt-6 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-cyan-300 transition-colors">
              Terms of Service ↗
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
              Privacy Policy ↗
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/contact" className="hover:text-cyan-300 transition-colors">
              Comms Desk ↗
            </Link>
          </div>

          <span className="text-slate-500 text-[11px]">
            SCENESENSE STUDIO // COMPLIANCE ARCHIVE
          </span>
        </div>

      </div>
    </main>
  );
}