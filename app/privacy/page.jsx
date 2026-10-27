// File: app/privacy/page.jsx
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy & Data Telemetry // SceneSense Studio',
  description: 'SceneSense privacy policy, data telemetry protection protocols, third-party API disclosures, and user rights.',
};

export default function PrivacyPage() {
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
                DATA PRIVACY // PROTOCOL 03
              </span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight font-mono uppercase">
              Privacy Policy
            </h1>
          </div>

          <div className="self-start sm:self-auto font-mono text-[10px] text-right bg-[#050811] border border-cyan-500/20 px-3.5 py-2 rounded-2xl">
            <span className="text-slate-500 block uppercase">LAST AUDITED:</span>
            <span className="text-cyan-300 font-bold">OCTOBER 2026 // PRODUCTION</span>
          </div>
        </div>

        {/* Structured Privacy Disclosures */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed font-light">
          
          {/* Section 01: Core Commitment */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>01 //</span> Core Privacy Commitment
            </h2>
            <p>
              SceneSense is built on a non-commercial, telemetry-minimized model. We collect only the information necessary to provide authentication, save personalized watchlist targets, synchronize community dispatches, and process voluntary server fuel contributions[cite: 4, 19]. We do not sell, rent, or monetize your personal information or viewing history to data brokers or advertising exchanges.
            </p>
          </section>

          {/* Section 02: Information We Collect */}
          <section className="space-y-3 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>02 //</span> Telemetry &amp; Information We Collect
            </h2>
            <ul className="space-y-2 font-mono text-xs text-slate-400 list-none pl-1">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong className="text-slate-200">Account Credentials:</strong> Email address, encrypted authentication hashes, and display aliases managed via Google Firebase Authentication.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong className="text-slate-200">Curated Telemetry:</strong> Titles added to your Active Radar Watchlist, watched confirmation markers, star ratings, and published critique reviews.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong className="text-slate-200">AI Prompt Transmissions:</strong> Ephemeral prompt queries transmitted to CineMind, The Oracle, and Script Doctor for film discovery and script analysis[cite: 4].</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong className="text-slate-200">Regional Preference Settings:</strong> Country locale identifiers stored in local storage to surface correct regional streaming provider availability[cite: 4].</span>
              </li>
            </ul>
          </section>

          {/* Section 03: Third-Party Service Providers */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>03 //</span> Third-Party Service Subprocessors
            </h2>
            <p>
              SceneSense interfaces with trusted infrastructure providers to power specific studio operations[cite: 4]:
            </p>
            <ul className="space-y-1.5 font-mono text-xs text-slate-400 list-none pl-1">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">→</span>
                <span><strong className="text-slate-200">Google Firebase / Firestore:</strong> Secure cloud authentication, database storage, and real-time synchronization[cite: 4].</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">→</span>
                <span><strong className="text-slate-200">The Movie Database (TMDB):</strong> Dynamic API metadata, cast filmographies, and poster artwork[cite: 4].</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">→</span>
                <span><strong className="text-slate-200">Google Gemini AI:</strong> Generative natural language analysis for CineMind and scene doctor features[cite: 4].</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">→</span>
                <span><strong className="text-slate-200">Stripe:</strong> 256-bit encrypted checkout processor for voluntary Community Tip Jar contributions[cite: 4]. SceneSense never stores raw payment card numbers[cite: 4].</span>
              </li>
            </ul>
          </section>

          {/* Section 04: Cookies & Storage */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>04 //</span> Local Storage &amp; Cookies
            </h2>
            <p>
              SceneSense uses browser local storage strictly for functional application state (such as preserving dark mode theme LUTs, cached filter selections, and active session tokens)[cite: 4]. We do not deploy invasive third-party cross-site tracking cookies.
            </p>
          </section>

          {/* Section 05: Data Rights & Account Purging */}
          <section className="space-y-2.5 bg-[#050811] p-5 rounded-2xl border border-cyan-500/15">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <span>05 //</span> Your Data Rights &amp; Deletion
            </h2>
            <p>
              Under applicable privacy statutes (including GDPR and CCPA), you retain full ownership of your data. You may request an export of your saved watchlist and critique history, or request a complete purge of your account records from our database by contacting our privacy desk[cite: 4].
            </p>
          </section>

          {/* Section 06: Contact Desk */}
          <section className="p-5 bg-black/60 border border-cyan-500/30 rounded-2xl font-mono text-xs space-y-2">
            <span className="text-cyan-400 font-bold block uppercase tracking-wider">
              Privacy Inquiries &amp; Data Deletion Requests:
            </span>
            <p className="text-slate-300">
              Email: <a href="mailto:privacy@scenesense.app" className="text-cyan-300 underline hover:text-white">privacy@scenesense.app</a>
              <span className="text-slate-600 mx-2">|</span>
              General Desk: <a href="mailto:support@scenesense.app" className="text-cyan-300 underline hover:text-white">support@scenesense.app</a>
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
            <Link href="/disclaimer" className="hover:text-cyan-300 transition-colors">
              Legal Disclaimer ↗
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/dmca" className="hover:text-cyan-300 transition-colors">
              DMCA Policy ↗
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