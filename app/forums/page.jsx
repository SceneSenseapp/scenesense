// File: app/forums/page.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import ForumSector from "@/components/ForumSector";
import MovieModal from "@/components/MovieModal";

const FEATURED_BOARDS = [
  {
    id: 693134,
    title: "Dune: Part Two",
    year: "2024",
    tag: "Sci-Fi Epic",
    poster_path: "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  },
  {
    id: 335984,
    title: "Blade Runner 2049",
    year: "2017",
    tag: "Neo-Noir",
    poster_path: "/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
  },
  {
    id: 545611,
    title: "Everything Everywhere All at Once",
    year: "2022",
    tag: "Multiverse",
    poster_path: "/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
  },
  {
    id: 27205,
    title: "Inception",
    year: "2010",
    tag: "Mind-Bender",
    poster_path: "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
  },
  {
    id: 329865,
    title: "Arrival",
    year: "2016",
    tag: "First Contact",
    poster_path: "/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
  },
  {
    id: 157336,
    title: "Interstellar",
    year: "2014",
    tag: "Hard Sci-Fi",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
];

export default function CinemaForumsPage() {
  const [selectedBoard, setSelectedBoard] = useState(FEATURED_BOARDS[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inspectMovieId, setInspectMovieId] = useState(null);

  const handleSearchMovies = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    try {
      const res = await fetch(
        `/api/tmdb?endpoint=search/movie&query=${encodeURIComponent(q)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults((data.results || []).slice(0, 6));
      }
    } catch (err) {
      console.warn("Forum film search warning:", err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Community Intelligence • Live Film Threads"
        title="Cinema Discussion"
        accent="Forums"
        subtitle="Select any film sector to read deep-dive theories, post structured reviews or questions, chat live with fellow cinephiles, and run AI DirectorBot or Script Doctor thread briefings."
        actions={
          <>
            <Link
              href="/reviews"
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono font-semibold text-slate-200 transition-all"
            >
              ★ Critic &amp; Community Reviews
            </Link>
            <Link
              href="/chat"
              className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-xs font-mono font-semibold text-cyan-200 transition-all"
            >
              🎬 Live Watch Party Rooms
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT SIDEBAR: FILM SECTOR DIRECTORY & SEARCH */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="studio-panel rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-300">
                Open Any Film Board
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Search any movie in the TMDB catalog to jump into its dedicated thread board.
              </p>
            </div>

            <form onSubmit={handleSearchMovies} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search film title..."
                className="flex-1 bg-black/50 border border-white/10 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-xs font-mono font-bold text-cyan-200 cursor-pointer disabled:opacity-50"
              >
                {searching ? "..." : "Find"}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Search Matches
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchResults([])}
                    className="text-[10px] font-mono text-slate-500 hover:text-white cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                {searchResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedBoard({
                        id: m.id,
                        title: m.title,
                        year: (m.release_date || "").slice(0, 4) || "Film",
                        tag: "Custom Sector",
                        poster_path: m.poster_path,
                      });
                      setSearchResults([]);
                    }}
                    className="w-full flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] hover:bg-cyan-500/15 border border-white/5 hover:border-cyan-400/30 text-left transition-all cursor-pointer"
                  >
                    <div className="relative w-8 h-12 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                      {m.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${m.poster_path}`}
                          alt={m.title}
                          fill
                          unoptimized
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-slate-600">
                          N/A
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">
                        {m.title}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400">
                        {(m.release_date || "").slice(0, 4) || "TBA"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="studio-panel rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
              Featured Discussion Sectors
            </h2>
            <div className="space-y-2">
              {FEATURED_BOARDS.map((board) => {
                const isActive = String(selectedBoard.id) === String(board.id);
                return (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => setSelectedBoard(board)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? "bg-cyan-500/15 border-cyan-400/40 shadow-lg"
                        : "bg-white/[0.02] hover:bg-white/[0.05] border-white/5"
                    }`}
                  >
                    <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-white/10">
                      {board.poster_path && (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${board.poster_path}`}
                          alt={board.title}
                          fill
                          unoptimized
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">
                        {board.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          {board.year}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-cyan-300 border border-white/10">
                          {board.tag}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* MAIN BOARD AREA */}
        <section className="lg:col-span-8 space-y-4">
          <div className="studio-panel rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {selectedBoard.poster_path && (
                <div className="relative w-12 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${selectedBoard.poster_path}`}
                    alt={selectedBoard.title}
                    fill
                    unoptimized
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                    Active Board #{selectedBoard.id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    • {selectedBoard.year}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {selectedBoard.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInspectMovieId(selectedBoard.id)}
                className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-slate-200 cursor-pointer transition-all"
              >
                Film Dossier
              </button>
              <Link
                href={`/movie/${selectedBoard.id}?type=movie`}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-xs font-mono font-semibold text-cyan-200 transition-all"
              >
                Theater Page ↗
              </Link>
            </div>
          </div>

          <ForumSector movieId={selectedBoard.id} />
        </section>
      </div>

      {inspectMovieId && (
        <MovieModal
          movieId={inspectMovieId}
          mediaType="movie"
          onClose={() => setInspectMovieId(null)}
        />
      )}
    </PageShell>
  );
}
