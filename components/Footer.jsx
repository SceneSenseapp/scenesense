// components/Footer.jsx
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full max-w-7xl mx-auto px-6 py-10 border-t border-cyan-500/20 text-gray-400 text-xs flex flex-col items-center justify-center gap-6 relative z-10 backdrop-blur-2xl bg-black text-center font-sans">
      
      {/* Primary Navigation & Informational Links */}
      <nav className="flex items-center gap-6 text-gray-300 flex-wrap justify-center font-medium">
        <Link href="/terms" className="hover:text-cyan-300 transition-colors">
          Terms of Service
        </Link>
        <span className="text-gray-700 select-none">•</span>
        <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
          Privacy Policy
        </Link>
        <span className="text-gray-700 select-none">•</span>
        <Link href="/contact" className="hover:text-cyan-300 transition-colors">
          Community Support
        </Link>
        <span className="text-gray-700 select-none">•</span>
        <Link href="/disclaimer" className="hover:text-cyan-300 transition-colors">
          API &amp; Content Disclaimer
        </Link>
      </nav>

      {/* Official TMDB Attribution Badge (Mandatory for Free Non-Commercial Use) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 bg-[#0a0a12] border border-cyan-500/20 px-5 py-3 rounded-2xl shadow-inner max-w-2xl">
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 group flex items-center justify-center"
          title="The Movie Database (TMDB)"
        >
          {/* Official TMDB Vector Emblem */}
          <svg 
            className="w-10 h-7 text-[#01b4e4] group-hover:scale-105 transition-transform" 
            viewBox="0 0 185.06 81.44" 
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 0h185.06v81.44H0z" fill="#032541" rx="14"/>
            <path d="M21.28 24.5h33.88v8.68H43.12v23.76h-9.8V33.18H21.28V24.5zm48.58 0h13.72l9.52 18.06 9.38-18.06h13.72v32.44h-9.38V37.8l-8.54 15.68h-10.22L79.24 37.8v19.14h-9.38V24.5zm55.44 0h17.5c5.32 0 9.52 1.4 12.6 4.2 3.08 2.8 4.62 6.86 4.62 12.18 0 5.46-1.54 9.52-4.62 12.18-3.08 2.66-7.28 3.88-12.6 3.88h-17.5V24.5zm9.8 8.12v16.2h7.42c2.66 0 4.62-.7 5.88-2.1 1.26-1.4 1.82-3.5 1.82-6 0-2.66-.56-4.62-1.82-6.02-1.26-1.4-3.22-2.08-5.88-2.08h-7.42z" fill="#01b4e4"/>
          </svg>
        </a>
        <p className="text-[11px] text-gray-400 font-mono text-left leading-snug">
          This product uses the TMDB API but is not endorsed or certified by TMDB. SceneSense is a non-commercial cinema utility and does not host, stream, upload, or broadcast proprietary media files.
        </p>
      </div>

      {/* Non-Commercial Community Disclaimer */}
      <div className="max-w-2xl space-y-1.5 text-[11px] text-gray-500 font-mono">
        <p>
          SceneSense is free to use for personal film discovery. All trademarks, titles, character names, and promotional artwork belong to their respective copyright holders.
        </p>
        <p>
          Contact: <a href="mailto:support@scenesense.app" className="text-cyan-400 hover:underline">support@scenesense.app</a>
        </p>
      </div>

      {/* Copyright */}
      <div className="text-[10px] text-gray-600 uppercase tracking-widest pt-2 border-t border-white/5 w-full">
        &copy; {new Date().getFullYear()} SceneSense Studio. All rights reserved. London, Ontario, Canada.
      </div>
    </footer>
  );
}