// File: components/Footer.jsx
"use client";

import Link from "next/link";
import { useStudioSession } from "@/components/StudioSessionProvider";

export default function Footer() {
  const session = useStudioSession();
  const openCommandPalette = () => session?.setIsCommandPaletteOpen?.(true);

  return (
    <footer className="w-full border-t border-white/10 bg-[#04060d]/95 backdrop-blur-xl text-slate-400 text-xs relative z-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Top 4-Column Master Studio Directory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: Brand & System Status */}
          <div className="space-y-3.5">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5 text-cyan-400 group-hover:rotate-90 transition-transform duration-500"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" />
              </svg>
              <span className="font-bold text-sm tracking-wider uppercase text-white">
                SceneSense Studio
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI-curated cinema discovery, optical scene deconstruction, and multi-region streaming intelligence.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-mono text-emerald-300 hover:border-emerald-400/50 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Integrations Online</span>
              </Link>
              <button
                type="button"
                onClick={openCommandPalette}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
              >
                Quick Search ⌘K
              </button>
            </div>
          </div>

          {/* Column 2: Discovery & AI Suite */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-200">
              Discovery &amp; AI Suite
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-cyan-300 transition-colors">
                  Mood Oracle &amp; Personas
                </Link>
              </li>
              <li>
                <Link href="/where-to-watch" className="hover:text-cyan-300 transition-colors">
                  Multi-Region Streaming Radar
                </Link>
              </li>
              <li>
                <Link href="/analyze" className="hover:text-cyan-300 transition-colors">
                  Optical Scene Analyzer AI
                </Link>
              </li>
              <li>
                <Link href="/watchlist?swipeSession=PARTY" className="hover:text-cyan-300 transition-colors">
                  Movie Night Swipe Matcher
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-cyan-300 transition-colors">
                  Watch Party Screening Room
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Community & Studio */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-200">
              Community &amp; Studio
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/arcade" className="hover:text-cyan-300 transition-colors">
                  Daily Spin, Games &amp; PvP Challenges
                </Link>
              </li>
              <li>
                <Link href="/quests" className="hover:text-cyan-300 transition-colors">
                  Daily Quests &amp; 50-Tier Pass
                </Link>
              </li>
              <li>
                <Link href="/leaderboards" className="hover:text-cyan-300 transition-colors">
                  Global Critic Leaderboards
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="hover:text-cyan-300 transition-colors">
                  Personal Watchlist Vault
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-cyan-300 transition-colors">
                  Verified Member Reviews
                </Link>
              </li>
              <li>
                <Link href="/forums" className="hover:text-cyan-300 transition-colors">
                  Cinema Discussion Forums
                </Link>
              </li>
              <li>
                <Link href="/armoury" className="hover:text-cyan-300 transition-colors">
                  The Armoury &amp; Studio LUTs
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Governance & Support */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-200">
              Governance &amp; Support
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-cyan-300 transition-colors">
                  System &amp; API Telemetry
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cyan-300 transition-colors">
                  Contact Studio Support
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-cyan-300 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-cyan-300 transition-colors">
                  API &amp; Content Disclaimer
                </Link>
              </li>
              <li>
                <Link href="/dmca" className="hover:text-cyan-300 transition-colors">
                  DMCA Notice
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Mandatory TMDB Attribution & Copyright Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5 max-w-2xl">
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 hover:opacity-90 transition-opacity"
              title="The Movie Database (TMDB)"
            >
              <svg
                className="w-10 h-7"
                viewBox="0 0 185.06 81.44"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="185.06" height="81.44" rx="14" fill="#032541" />
                <path
                  d="M21.28 24.5h33.88v8.68H43.12v23.76h-9.8V33.18H21.28V24.5zm48.58 0h13.72l9.52 18.06 9.38-18.06h13.72v32.44h-9.38V37.8l-8.54 15.68h-10.22L79.24 37.8v19.14h-9.38V24.5zm55.44 0h17.5c5.32 0 9.52 1.4 12.6 4.2 3.08 2.8 4.62 6.86 4.62 12.18 0 5.46-1.54 9.52-4.62 12.18-3.08 2.66-7.28 3.88-12.6 3.88h-17.5V24.5zm9.8 8.12v16.2h7.42c2.66 0 4.62-.7 5.88-2.1 1.26-1.4 1.82-3.5 1.82-6 0-2.66-.56-4.62-1.82-6.02-1.26-1.4-3.22-2.08-5.88-2.08h-7.42z"
                  fill="#01b4e4"
                />
              </svg>
            </a>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This product uses the TMDB API but is not endorsed or certified by TMDB. SceneSense does not host, upload, or broadcast copyrighted video files; all streaming links direct to official licensed platforms.
            </p>
          </div>

          <div className="text-[11px] font-mono text-slate-500 shrink-0">
            &copy; {new Date().getFullYear()} SceneSense Studio •{" "}
            <a href="mailto:support@scenesense.app" className="text-slate-300 hover:text-cyan-300">
              support@scenesense.app
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
