// File: components/Footer.jsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-[#050508] border-t border-cyan-500/20 relative z-10 font-sans text-slate-400 overflow-hidden">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-1/4 w-[400px] h-20 bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-20 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 flex flex-col items-center justify-center gap-6 relative z-10 text-center">
        
        {/* Top Node Status Banner */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-cyan-400 font-bold uppercase tracking-widest">
            SCENESENSE STUDIO // PRODUCTION TELEMETRY ACTIVE
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500 uppercase">LONDON, ON, CA</span>
        </div>

        {/* Primary Functional & Tactical Directory Links */}
        <div className="flex items-center gap-4 sm:gap-6 text-slate-300 flex-wrap justify-center font-mono text-xs font-semibold">
          <Link href="/where-to-watch" className="hover:text-cyan-300 transition-colors">
            Radar Scanner
          </Link>
          <span className="text-slate-700 select-none">•</span>
          <Link href="/armoury" className="hover:text-amber-300 transition-colors">
            Prop Department
          </Link>
          <span className="text-slate-700 select-none">•</span>
          <Link href="/reviews" className="hover:text-cyan-300 transition-colors">
            Critique Archives
          </Link>
          <span className="text-slate-700 select-none">•</span>
          <Link href="/forums" className="hover:text-cyan-300 transition-colors">
            Cinema Forums
          </Link>
          <span className="text-slate-700 select-none">•</span>
          <Link href="/mood" className="hover:text-cyan-300 transition-colors">
            Oracle Nexus
          </Link>
        </div>

        {/* Legal & Compliance Safeguards */}
        <nav 
          aria-label="Legal & Policies"
          className="flex items-center gap-4 sm:gap-6 text-slate-400 flex-wrap justify-center font-mono text-[11px]"
        >
          <Link href="/terms" className="hover:text-cyan-300 transition-colors">
            Terms of Service
          </Link>
          <span className="text-slate-700 select-none">•</span>
          <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-slate-700 select-none">•</span>
          <Link href="/dmca" className="hover:text-cyan-300 transition-colors">
            DMCA Safe Harbor
          </Link>
          <span className="text-slate-700 select-none">•</span>
          <Link href="/disclaimer" className="hover:text-cyan-300 transition-colors">
            API Disclaimer
          </Link>
          <span className="text-slate-700 select-none">•</span>
          <Link href="/contact" className="hover:text-cyan-300 transition-colors">
            Comms Desk
          </Link>
        </nav>

        {/* Official TMDB & JustWatch Attribution Badge */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-[#080d1a] border border-cyan-500/20 px-5 py-3.5 rounded-2xl shadow-xl max-w-2xl w-full">
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 group flex items-center justify-center cursor-pointer"
            title="The Movie Database (TMDB) API Partner"
          >
            {/* Official TMDB Vector Emblem */}
            <svg 
              className="w-12 h-8 text-[#01b4e4] group-hover:scale-105 transition-transform" 
              viewBox="0 0 185.06 81.44" 
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M0 0h185.06v81.44H0z" fill="#032541" rx="14"/>
              <path d="M21.28 24.5h33.88v8.68H43.12v23.76h-9.8V33.18H21.28V24.5zm48.58 0h13.72l9.52 18.06 9.38-18.06h13.72v32.44h-9.38V37.8l-8.54 15.68h-10.22L79.24 37.8v19.14h-9.38V24.5zm55.44 0h17.5c5.32 0 9.52 1.4 12.6 4.2 3.08 2.8 4.62 6.86 4.62 12.18 0 5.46-1.54 9.52-4.62 12.18-3.08 2.66-7.28 3.88-12.6 3.88h-17.5V24.5zm9.8 8.12v16.2h7.42c2.66 0 4.62-.7 5.88-2.1 1.26-1.4 1.82-3.5 1.82-6 0-2.66-.56-4.62-1.82-6.02-1.26-1.4-3.22-2.08-5.88-2.08h-7.42z" fill="#01b4e4"/>
            </svg>
          </a>

          <p className="text-[11px] text-slate-400 font-mono text-center sm:text-left leading-relaxed font-light">
            This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming telemetry is powered by JustWatch[cite: 20]. SceneSense is a non-commercial cinema discovery platform and does not host, upload, or broadcast proprietary media streams.
          </p>
        </div>

        {/* Studio Disclaimer & Support Relays */}
        <div className="max-w-2xl space-y-1 text-[11px] text-slate-500 font-mono">
          <p>
            SceneSense is free to use for personal film research and watchlist curation[cite: 20, 28]. All trademarks, film titles, character names, and promotional stills remain the exclusive property of their respective studio copyright holders[cite: 20, 28].
          </p>
          <p>
            Communications Relay: <a href="mailto:support@scenesense.app" className="text-cyan-400 hover:text-cyan-300 underline font-semibold">support@scenesense.app</a>[cite: 20, 28]
          </p>
        </div>

        {/* Global Copyright & Legal Notice */}
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pt-4 border-t border-cyan-500/15 w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} SceneSense Studio. All rights reserved.</span>
          <span>DOMICILE: LONDON, ONTARIO, CANADA</span>
        </div>

      </div>
    </footer>
  );
}