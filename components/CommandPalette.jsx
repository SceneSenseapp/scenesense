// File: components/CommandPalette.jsx
"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  useStudioSession,
  STUDIO_LUTS,
  STREAMING_REGIONS,
} from "@/components/StudioSessionProvider";
import { openCineMind } from "@/components/CineMindModal";

const STUDIO_ROUTES = [
  { href: "/", label: "Discover Studio", desc: "AI mood oracle, personas & trending cinema", badge: "Core" },
  { href: "/arcade", label: "Arcade, Daily Spin & PvP Challenges", desc: "Daily prize wheel, spin shop, 4 cinema games & player duels", badge: "Arcade" },
  { href: "/where-to-watch", label: "Streaming Radar", desc: "Multi-region availability & provider filters", badge: "Radar" },
  { href: "/analyze", label: "Scene Analyzer AI", desc: "Multimodal frame vision, script ID & color LUTs", badge: "Vision AI" },
  { href: "/chat", label: "Watch Party & Screening Room", desc: "Synchronized playback, live chat & cinema trivia", badge: "Live" },
  { href: "/watchlist?swipeSession=PARTY", label: "Movie Night Matcher", desc: "Collaborative real-time swipe matching with friends", badge: "Social" },
  { href: "/watchlist", label: "My Studio Vault", desc: "Saved films, folders, JSON backup & ratings", badge: "Vault" },
  { href: "/reviews", label: "Community Critiques", desc: "Verified member reviews & film ratings", badge: "Critics" },
  { href: "/forums", label: "Cinema Discussions", desc: "Topic threads, theories & directorial debates", badge: "Forum" },
  { href: "/quests", label: "Quests & Progression Pass", desc: "Daily bounties, 50-tier pass & daily streak", badge: "Pass" },
  { href: "/armoury", label: "The Armoury Shop", desc: "Avatar frames, titles & Studio LUT themes", badge: "Shop" },
  { href: "/leaderboards", label: "Critic Leaderboards", desc: "Global rankings, player challenges & faction standings", badge: "Ranks" },
  { href: "/dashboard", label: "Integration & Telemetry Hub", desc: "Live API health, vault analytics & system status", badge: "System" },
  { href: "/profile", label: "Operative Profile", desc: "Account settings, badges & studio identity", badge: "Account" },
];

export default function CommandPalette() {
  const router = useRouter();
  const session = useStudioSession();
  const isOpen = Boolean(session?.isCommandPaletteOpen);
  const setIsOpen = session?.setIsCommandPaletteOpen;
  const openMediaModal = session?.openMediaModal;
  const activeLut = session?.activeLut || "default";
  const setStudioLut = session?.setStudioLut;
  const region = session?.region || "US";
  const setRegion = session?.setRegion;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const closePalette = useCallback(() => {
    setIsOpen?.(false);
    setQuery("");
    setResults([]);
    setIsSearching(false);
    setActiveIndex(0);
  }, [setIsOpen]);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          closePalette();
        } else {
          setActiveIndex(0);
          setIsOpen?.(true);
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closePalette();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen, closePalette]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Debounced TMDB multi-search through server proxy
  useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen || trimmed.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/tmdb?endpoint=search/multi&query=${encodeURIComponent(trimmed)}&include_adult=false`
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        if (!cancelled) {
          const filtered = (data.results || [])
            .filter(
              (item) =>
                (item.media_type === "movie" ||
                  item.media_type === "tv" ||
                  item.media_type === "person") &&
                (item.title || item.name)
            )
            .slice(0, 6);
          setResults(filtered);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  const filteredRoutes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STUDIO_ROUTES.slice(0, 7);
    return STUDIO_ROUTES.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.badge.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query]);

  const combinedItems = useMemo(() => {
    const list = [];
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      list.push({
        kind: "cinemind",
        id: "ask-cinemind",
        label: `Ask CineMind AI: "${trimmed}"`,
        prompt: trimmed,
      });
      for (const media of results) {
        list.push({ kind: "media", id: `${media.media_type}-${media.id}`, media });
      }
    }
    for (const route of filteredRoutes) {
      list.push({ kind: "route", id: route.href, route });
    }
    return list;
  }, [query, results, filteredRoutes]);

  const executeItem = (item) => {
    if (!item) return;
    closePalette();
    if (item.kind === "cinemind") {
      openCineMind({
        title: "Custom Query",
        autoPrompt: item.prompt,
      });
    } else if (item.kind === "media") {
      const m = item.media;
      if (m.media_type === "person") {
        router.push(`/person/${m.id}`);
      } else {
        openMediaModal?.(m.id, m.media_type);
      }
    } else if (item.kind === "route") {
      router.push(item.route.href);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[160] bg-black/75 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 animate-fadeIn"
      onClick={closePalette}
      role="dialog"
      aria-modal="true"
      aria-label="Studio Command Palette"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#090e1c]/95 border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[78vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5 text-cyan-400 shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              setActiveIndex(0);
              if (next.trim().length < 2) {
                setResults([]);
                setIsSearching(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) =>
                  combinedItems.length ? (i + 1) % combinedItems.length : 0
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) =>
                  combinedItems.length
                    ? (i - 1 + combinedItems.length) % combinedItems.length
                    : 0
                );
              } else if (e.key === "Enter" && combinedItems[activeIndex]) {
                e.preventDefault();
                executeItem(combinedItems[activeIndex]);
              }
            }}
            placeholder="Search movies, series, actors, or jump to any Studio tool..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {isSearching && (
            <span className="w-4 h-4 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin shrink-0" />
          )}
          <button
            type="button"
            onClick={closePalette}
            className="px-2 py-1 rounded-md bg-white/[0.06] border border-white/10 text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {combinedItems.map((item, idx) => {
            const isSelected = idx === activeIndex;

            if (item.kind === "cinemind") {
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => executeItem(item)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-violet-500/20 border border-violet-400/40 text-white"
                      : "hover:bg-white/[0.04] text-violet-200 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-xs font-mono font-bold text-violet-300 shrink-0">
                      AI
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">{item.label}</div>
                      <div className="text-[11px] text-slate-400">
                        Synthesize verified recommendations &amp; cinematic DNA
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-violet-300 shrink-0">
                    Ask ↵
                  </span>
                </button>
              );
            }

            if (item.kind === "media") {
              const m = item.media;
              const title = m.title || m.name;
              const year = (m.release_date || m.first_air_date || "").split("-")[0];
              const imgPath = m.poster_path || m.profile_path;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => executeItem(item)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500/15 border border-cyan-400/35 text-white"
                      : "hover:bg-white/[0.04] text-slate-200 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-8 h-11 rounded-md overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                      {imgPath ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${imgPath}`}
                          alt={title}
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-500">
                          {m.media_type === "person" ? "ACT" : "FLM"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="uppercase font-mono text-[10px] text-cyan-300">
                          {m.media_type}
                        </span>
                        {year && <span>• {year}</span>}
                        {typeof m.vote_average === "number" && m.vote_average > 0 && (
                          <span>• ★ {m.vote_average.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    Open Dossier ↵
                  </span>
                </button>
              );
            }

            const r = item.route;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => executeItem(item)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-white/[0.08] border border-white/15 text-white"
                    : "hover:bg-white/[0.04] text-slate-300 border border-transparent"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white">{r.label}</div>
                  <div className="text-[11px] text-slate-400 truncate">{r.desc}</div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] font-mono text-cyan-300 shrink-0">
                  {r.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Studio Preferences Footer (Instant LUT + Streaming Region Controls) */}
        <div className="px-4 py-3 border-t border-white/10 bg-[#060913] flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              LUT:
            </span>
            <div className="flex items-center gap-1.5">
              {STUDIO_LUTS.map((lut) => (
                <button
                  key={lut.id}
                  type="button"
                  onClick={() => setStudioLut?.(lut.id)}
                  title={`Color Grade: ${lut.label}`}
                  className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                    activeLut === lut.id
                      ? "ring-2 ring-white scale-110"
                      : "opacity-65 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: lut.swatch }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              Region:
            </span>
            <select
              value={region}
              onChange={(e) => setRegion?.(e.target.value)}
              aria-label="Streaming region"
              className="bg-white/[0.05] border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {STREAMING_REGIONS.map((reg) => (
                <option key={reg.id} value={reg.id} className="bg-[#090e1c] text-white">
                  {reg.id} — {reg.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
