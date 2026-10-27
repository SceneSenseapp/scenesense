// File: app/terms/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service // SceneSense Studio',
  description: 'SceneSense terms of service, non-commercial usage policy, acceptable use, and third-party data attribution.',
};

export default function TermsPage() {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-[#050508] text-slate-100 px-4 sm:px-6 py-12 md:py-16 flex justify-center font-sans relative overflow-hidden">
      
      {/* Background Depth Halos */}
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
                TERMS OF SERVICE // PROTOCOL 04
              </span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight font-mono uppercase">
              Terms of Service
            </h1>
          </div>

          <div className="self-start sm:self-auto font-mono text-[10px] text-right bg-[#050811] border border-cyan-500/20 px-3.5 py-2 rounded-2xl">
            <span className="text-slate-500 block uppercase">EFFECTIVE DATE:</span>
            <span className="text-cyan-300 font-bold">OCTOBER 2026 // PRODUCTION</span>
          </div>
        </div>

        {/* Structured Terms Disclosures */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed font-light">
          
          {/* Section 01 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>01 //</span> Platform Purpose &amp; Non-Commercial Policy
            </h2>
            <p>
              SceneSense is an independent, non-commercial movie discovery utility and cinema telemetry platform. Access to all radar lookup features, streaming directory indexes, CineMind AI models, watchlist managers, and community review boards is provided free of charge for personal, non-commercial entertainment and research.
            </p>
          </section>

          {/* Section 02 */}
          <section className="space-y-3 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>02 //</span> Third-Party Data &amp; TMDB API Attribution
            </h2>
            <p>
              SceneSense utilizes verified cinematic metadata, actor profiles, poster artwork, and streaming platform indexes powered by The Movie Database (TMDB) API and JustWatch. 
            </p>
            <div className="bg-black/60 border border-cyan-500/30 rounded-xl p-3.5 text-xs font-mono text-cyan-300">
              This product uses the TMDB API but is not endorsed or certified by TMDB. SceneSense does not claim proprietary ownership over any poster images, plot synopses, character names, or studio trademarks delivered through third-party APIs[cite: 20].
            </div>
          </section>

          {/* Section 03 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>03 //</span> Zero-Hosting &amp; Outbound Streaming Direction
            </h2>
            <p>
              SceneSense does not host, upload, transcode, mirror, stream, or broadcast proprietary audio, video, or full-length motion picture files[cite: 20]. All streaming links and badges direct users exclusively to verified, licensed third-party platforms (e.g., Netflix, Prime Video, Apple TV, Criterion Channel) or authorized theater ticketing partners[cite: 20]. SceneSense bears no responsibility for external third-party content, paywall changes, or regional availability shifts[cite: 20].
            </p>
          </section>

          {/* Section 04 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>04 //</span> User Dispatches &amp; Community Conduct
            </h2>
            <p>
              By posting reviews, critiques, or discussion comments, you grant SceneSense a non-exclusive, royalty-free, worldwide license to display and format your submission across the application. You agree not to transmit content that is defamatory, abusive, unlawful, or infringing upon third-party copyrights. You must tag major narrative revelations with spoiler formatting (e.g., <code className="bg-black/50 px-1.5 py-0.5 rounded text-cyan-300 font-mono text-xs">||spoiler||</code>).
            </p>
          </section>

          {/* Section 05 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>05 //</span> Community Tip Jar &amp; Voluntary Contributions
            </h2>
            <p>
              Any voluntary contributions processed through the SceneSense Tip Jar (powered by Stripe) represent non-commercial gifts intended solely to offset server compute, database bandwidth, and domain uptime costs[cite: 20]. Voluntary tips <strong>do not</strong> purchase digital media, licensing rights, paywalled access, or functional privileges over non-tipping users[cite: 20].
            </p>
          </section>

          {/* Section 06 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>06 //</span> Acceptable Use &amp; Automated Access Restrictions
            </h2>
            <p>
              You agree not to engage in malicious conduct, including automated scraping, denial-of-service transmissions, brute-force credential stuffing, or unauthorized exploitation of proxy channels[cite: 20]. SceneSense reserves the right to suspend access credentials or permanently terminate accounts found violating platform integrity[cite: 20].
            </p>
          </section>

          {/* Section 07 */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>07 //</span> Disclaimer of Warranties &amp; Limitation of Liability
            </h2>
            <p>
              SceneSense is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We do not guarantee uninterrupted uptime, error-free API telemetry, or absolute accuracy of AI-generated screenplay lore. In no event shall SceneSense, its developers, or affiliates be liable for indirect, incidental, or consequential damages resulting from platform use.
            </p>
          </section>

          {/* Section 08 */}
          <section className="p-5 bg-black/60 border border-cyan-500/30 rounded-2xl font-mono text-xs space-y-2">
            <span className="text-cyan-400 font-bold block uppercase tracking-wider">
              Legal Notices &amp; Governance:
            </span>
            <p className="text-slate-300">
              These terms are governed by the laws of Ontario and the federal laws of Canada. Inquiries may be directed to <a href="mailto:support@scenesense.app" className="text-cyan-300 underline hover:text-white">support@scenesense.app</a>[cite: 20].
            </p>
          </section>

        </div>

        {/* Footer Cross-Links */}
        <div className="pt-6 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
              Privacy Policy ↗
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/disclaimer" className="hover:text-cyan-300 transition-colors">
              Content Disclaimer ↗
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/dmca" className="hover:text-cyan-300 transition-colors">
              DMCA Policy ↗
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