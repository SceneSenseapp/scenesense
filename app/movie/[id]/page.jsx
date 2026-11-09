// File: app/movie/[id]/page.jsx
"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useStudioSession } from "@/components/StudioSessionProvider";
import ActorModal from "@/components/ActorModal";
import ReviewModal from "@/components/ReviewModal";
import CommunityReviews from "@/components/CommunityReviews";
import UniversalMediaPlayer from "@/components/UniversalMediaPlayer";
import { openCineMind } from "@/components/CineMindModal";
import { trackQuestEvent } from "@/lib/quest-tracker";

const REGIONS = [
  { id: "CA", label: "Canada 🇨🇦" },
  { id: "US", label: "United States 🇺🇸" },
  { id: "GB", label: "United Kingdom 🇬🇧" },
  { id: "AU", label: "Australia 🇦🇺" },
  { id: "FR", label: "France 🇫🇷" },
  { id: "DE", label: "Germany 🇩🇪" },
  { id: "JP", label: "Japan 🇯🇵" },
];

const WATCHLIST_FOLDERS = [
  "Must Watch Tonight",
  "Weekend Binge",
  "Sci-Fi & Mind-Benders",
  "Masterpieces",
];

const getProviderDirectUrl = (providerName, title) => {
  const encodedTitle = encodeURIComponent(title || "");
  const normalized = (providerName || "").toLowerCase().trim();

  if (normalized.includes("prime") || normalized.includes("amazon")) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodedTitle}`;
  }
  if (normalized.includes("netflix")) return `https://www.netflix.com/search?q=${encodedTitle}`;
  if (normalized.includes("disney")) return `https://www.disneyplus.com/search?q=${encodedTitle}`;
  if (normalized.includes("apple")) return `https://tv.apple.com/search?term=${encodedTitle}`;
  if (normalized.includes("max") || normalized.includes("hbo")) return `https://play.max.com/search?q=${encodedTitle}`;
  if (normalized.includes("hulu")) return `https://www.hulu.com/search?q=${encodedTitle}`;
  if (normalized.includes("paramount")) return `https://www.paramountplus.com/search/?query=${encodedTitle}`;
  if (normalized.includes("peacock")) return `https://www.peacocktv.com/search?q=${encodedTitle}`;
  if (normalized.includes("crave")) return `https://www.crave.ca/en/search?q=${encodedTitle}`;
  if (normalized.includes("tubi")) return `https://tubitv.com/search/${encodedTitle}`;
  if (normalized.includes("youtube") || normalized.includes("google")) {
    return `https://www.youtube.com/results?search_query=${encodedTitle}+movie`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`watch "${title}" on ${providerName}`)}`;
};

function MovieDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id;
  const mediaType = searchParams?.get("type") === "tv" ? "tv" : "movie";
  const isTv = mediaType === "tv";

  const { user, region: studioRegion, setRegion: setStudioRegion } = useStudioSession();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedRegion = studioRegion || "CA";
  const setSelectedRegion = setStudioRegion;
  const [deepLinks, setDeepLinks] = useState([]);
  const [activeVideoKey, setActiveVideoKey] = useState(null);
  const [lightsOut, setLightsOut] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(WATCHLIST_FOLDERS[0]);
  const [activePersonId, setActivePersonId] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const { isSaved, saveToWatchlist, removeFromWatchlist } = useWatchlist();
  const saved = media ? isSaved(media.id) : false;

  useEffect(() => {
    if (!id) return;
    let active = true;
    const frame = requestAnimationFrame(() => {
      setLoading(true);
      setError("");
    });

    fetch(`/api/movie/${encodeURIComponent(id)}?type=${mediaType}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to retrieve media dossier.");
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setMedia(data);
        const vids = data?.videos?.results?.filter((v) => v.site === "YouTube") || [];
        const mainTrailer =
          vids.find((v) => v.type === "Trailer" && v.official) ||
          vids.find((v) => v.type === "Trailer") ||
          vids[0];
        if (mainTrailer) {
          setActiveVideoKey(mainTrailer.key);
        }
        if (user?.uid) {
          trackQuestEvent(user.uid, "where_to_watch_5", 1);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Error loading title details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [id, mediaType, user?.uid]);

  // Fetch Watchmode regional deep links when region or id changes
  useEffect(() => {
    if (!id) return;
    let active = true;
    fetch(`/api/streaming?tmdbId=${encodeURIComponent(id)}&mediaType=${mediaType}&region=${selectedRegion}`)
      .then((r) => (r.ok ? r.json() : { sources: [] }))
      .then((data) => {
        if (active && Array.isArray(data.sources)) {
          setDeepLinks(data.sources);
        }
      })
      .catch(() => {
        if (active) setDeepLinks([]);
      });
    return () => {
      active = false;
    };
  }, [id, mediaType, selectedRegion]);

  const videos = useMemo(() => {
    return (media?.videos?.results || []).filter((v) => v.site === "YouTube").slice(0, 6);
  }, [media]);

  const cast = useMemo(() => {
    return (media?.credits?.cast || []).slice(0, 14);
  }, [media]);

  const keyCrew = useMemo(() => {
    const crewList = media?.credits?.crew || [];
    const directors = crewList.filter((c) => c.job === "Director").map((c) => c.name);
    const writers = crewList
      .filter((c) => c.job === "Screenplay" || c.job === "Writer" || c.department === "Writing")
      .map((c) => c.name);
    const dp = crewList
      .filter((c) => c.job === "Director of Photography" || c.job === "Cinematography")
      .map((c) => c.name);
    const composers = crewList
      .filter((c) => c.job === "Original Music Composer" || c.job === "Music")
      .map((c) => c.name);

    return {
      directors: [...new Set(directors)].slice(0, 2),
      writers: [...new Set(writers)].slice(0, 3),
      dp: [...new Set(dp)].slice(0, 2),
      composers: [...new Set(composers)].slice(0, 2),
    };
  }, [media]);

  const certification = useMemo(() => {
    if (!media) return "NR";
    if (isTv) {
      const ratings = media.content_ratings?.results || [];
      const reg = ratings.find((r) => r.iso_3166_1 === selectedRegion) || ratings.find((r) => r.iso_3166_1 === "US");
      return reg?.rating || "TV-14";
    }
    const rels = media.release_dates?.results || [];
    const reg = rels.find((r) => r.iso_3166_1 === selectedRegion) || rels.find((r) => r.iso_3166_1 === "US");
    const cert = reg?.release_dates?.find((d) => d.certification)?.certification;
    return cert || "PG-13";
  }, [media, isTv, selectedRegion]);

  const regionProviders = useMemo(() => {
    const results = media?.["watch/providers"]?.results || {};
    return results[selectedRegion] || results.US || results.CA || null;
  }, [media, selectedRegion]);

  const similarTitles = useMemo(() => {
    const recs = media?.recommendations?.results || [];
    const sim = media?.similar?.results || [];
    const combined = [...recs, ...sim];
    const seen = new Set();
    return combined
      .filter((item) => {
        if (!item?.id || !item?.poster_path || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 12);
  }, [media]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04050a] flex flex-col items-center justify-center space-y-4 text-white font-mono">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-cyan-300">
          Decrypting Studio Master Reel...
        </span>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="min-h-screen bg-[#04050a] flex flex-col items-center justify-center p-6 text-center space-y-4 text-white">
        <p className="text-red-400 font-mono text-sm">⚠️ {error || "Title not found."}</p>
        <button
          type="button"
          onClick={() => router.push("/where-to-watch")}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold uppercase cursor-pointer"
        >
          ← Return to Where to Watch
        </button>
      </div>
    );
  }

  const displayTitle = media.title || media.name || "Untitled";
  const releaseYear = (media.release_date || media.first_air_date || "").split("-")[0] || "N/A";
  const runtimeLabel = isTv
    ? `${media.number_of_seasons || 1} Season${(media.number_of_seasons || 1) > 1 ? "s" : ""} • ${media.number_of_episodes || 0} Eps`
    : media.runtime
      ? `${Math.floor(media.runtime / 60)}h ${media.runtime % 60}m`
      : "Feature Film";

  const ext = media.externalRatings || {};

  return (
    <div
      className={`min-h-screen transition-colors duration-700 font-sans pb-20 ${
        lightsOut ? "bg-black text-white" : "bg-[#04060d] text-slate-100"
      }`}
    >
      {/* Lights-Out Overlay Backdrop */}
      {lightsOut && (
        <div
          onClick={() => setLightsOut(false)}
          className="fixed inset-0 bg-black/90 z-30 backdrop-blur-md transition-opacity cursor-pointer"
          title="Click anywhere to restore studio lights"
        />
      )}

      {/* HERO BANNER */}
      <section className="relative w-full min-h-[540px] flex items-end overflow-hidden border-b border-cyan-500/25">
        {media.backdrop_path && (
          <Image
            src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`}
            alt={displayTitle}
            fill
            priority
            unoptimized
            className="object-cover opacity-35 scale-105 blur-[1px]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04060d] via-[#04060d]/60 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 pt-10 pb-10 flex flex-col md:flex-row gap-8 items-start md:items-end">
          {/* Poster Card */}
          <div className="relative w-44 sm:w-56 aspect-[2/3] rounded-3xl overflow-hidden border-2 border-cyan-400/50 shadow-[0_0_40px_rgba(6,182,212,0.3)] shrink-0 bg-[#0b1120]">
            {media.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                alt={displayTitle}
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <div className="inset-0 absolute flex items-center justify-center text-xs font-mono text-slate-500">
                NO POSTER
              </div>
            )}
          </div>

          {/* Primary Metadata & Ratings Deck */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[11px] font-mono uppercase text-cyan-300 cursor-pointer"
              >
                ← Back
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-400/40 text-[10px] font-mono font-bold uppercase text-cyan-300">
                {isTv ? "Television Series" : "Feature Film"}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-[10px] font-mono font-bold uppercase text-white">
                {certification}
              </span>
              <span className="text-xs font-mono text-slate-300">
                {releaseYear} • {runtimeLabel}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {displayTitle}
            </h1>

            {media.tagline && (
              <p className="text-sm sm:text-base italic text-cyan-300/90 font-medium">
                &ldquo;{media.tagline}&rdquo;
              </p>
            )}

            {/* Genre Pills */}
            {Array.isArray(media.genres) && media.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {media.genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-3 py-1 rounded-full bg-[#0d1527] border border-cyan-500/30 text-xs font-mono text-slate-200"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Multi-Source Ratings Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="px-3.5 py-2 rounded-2xl bg-[#0a1122] border border-amber-400/50 flex items-center gap-2">
                <span className="text-amber-400 text-base">★</span>
                <div>
                  <span className="text-xs font-black text-white block leading-none">
                    {media.vote_average ? media.vote_average.toFixed(1) : "N/A"} / 10
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase">
                    TMDB ({(media.vote_count || 0).toLocaleString()})
                  </span>
                </div>
              </div>

              {ext.imdbRating && (
                <div className="px-3.5 py-2 rounded-2xl bg-[#141105] border border-yellow-500/50 flex items-center gap-2">
                  <span className="text-yellow-400 font-black text-xs font-mono">IMDb</span>
                  <span className="text-xs font-black text-white">{ext.imdbRating}</span>
                </div>
              )}

              {ext.rottenTomatoes && (
                <div className="px-3.5 py-2 rounded-2xl bg-[#1a0a0a] border border-red-500/50 flex items-center gap-2">
                  <span className="text-sm">🍅</span>
                  <span className="text-xs font-black text-red-200">{ext.rottenTomatoes}</span>
                </div>
              )}

              {ext.metacritic && (
                <div className="px-3.5 py-2 rounded-2xl bg-[#091710] border border-emerald-500/50 flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Metascore</span>
                  <span className="text-xs font-black text-white">{ext.metacritic}</span>
                </div>
              )}

              {ext.boxOffice && (
                <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/15">
                  <span className="text-[9px] font-mono uppercase text-slate-400 block">Box Office</span>
                  <span className="text-xs font-bold text-emerald-300">{ext.boxOffice}</span>
                </div>
              )}

              {ext.awards && ext.awards !== "N/A" && (
                <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-400/30 max-w-xs">
                  <span className="text-[9px] font-mono uppercase text-amber-300 block">Awards &amp; Honors</span>
                  <span className="text-xs font-semibold text-white truncate block" title={ext.awards}>
                    🏆 {ext.awards}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed pt-1">
              {media.overview}
            </p>

            {/* Primary Action Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!saved ? (
                <div className="flex items-center gap-1.5 bg-[#091122] p-1 rounded-2xl border border-cyan-500/40">
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="bg-transparent text-xs font-mono text-cyan-200 px-2.5 py-2 focus:outline-none cursor-pointer"
                  >
                    {WATCHLIST_FOLDERS.map((folder) => (
                      <option key={folder} value={folder} className="bg-[#091122] text-white">
                        📁 {folder}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      saveToWatchlist(
                        {
                          id: media.id,
                          title: displayTitle,
                          poster_path: media.poster_path,
                          release_date: media.release_date || media.first_air_date,
                          vote_average: media.vote_average,
                          media_type: mediaType,
                        },
                        selectedFolder
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-mono font-black text-xs uppercase cursor-pointer transition-all"
                  >
                    + Save to Watchlist
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => removeFromWatchlist(media.id)}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-950/90 border border-emerald-400 text-emerald-300 font-mono font-bold text-xs uppercase cursor-pointer"
                >
                  ✓ Saved in Watchlist (Remove)
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-300 font-mono font-bold text-xs uppercase cursor-pointer transition-all"
              >
                ✍️ File Review Dispatch
              </button>

              <button
                type="button"
                onClick={() =>
                  openCineMind({
                    type: mediaType,
                    id: media.id,
                    title: displayTitle,
                    year: releaseYear,
                    overview: media.overview || "",
                    genres: (media.genres || []).map((g) => g.name).join(", "),
                  })
                }
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase cursor-pointer transition-all shadow-lg flex items-center gap-1.5"
              >
                <span>🧠</span>
                <span>Brief CineMind</span>
              </button>

              <Link
                href="/analyze"
                className="px-4 py-2.5 rounded-2xl bg-violet-600/20 hover:bg-violet-600/35 border border-violet-400/50 text-violet-200 font-mono font-bold text-xs uppercase transition-all"
              >
                🔬 Scene Analyzer
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 space-y-12">
        {/* 1. TRAILER & VIDEO THEATER */}
        {videos.length > 0 && (
          <section
            className={`relative rounded-3xl p-6 sm:p-8 border transition-all ${
              lightsOut
                ? "z-40 bg-[#050710] border-cyan-400 shadow-[0_0_80px_rgba(6,182,212,0.4)]"
                : "bg-[#080b16] border-cyan-500/30 shadow-xl"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>📽️</span> Screening Room &amp; Trailers
                </h2>
                <p className="text-xs font-mono text-slate-400">
                  Switch between trailers, teasers, and behind-the-scenes featurettes
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLightsOut((prev) => !prev)}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                  lightsOut
                    ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                    : "bg-white/5 hover:bg-white/10 text-cyan-300 border-cyan-500/40"
                }`}
              >
                {lightsOut ? "💡 Restore Studio Lights" : "🕶️ Cinema Lights-Out Mode"}
              </button>
            </div>

            {activeVideoKey && (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl">
                <UniversalMediaPlayer
                  videoKey={activeVideoKey}
                  title={displayTitle}
                  controls={true}
                />
              </div>
            )}

            {videos.length > 1 && (
              <div className="pt-4 flex items-center gap-2.5">
                <label htmlFor="movie-video-select" className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                  <span>🎬</span> Video Reel:
                </label>
                <select
                  id="movie-video-select"
                  value={activeVideoKey || ""}
                  onChange={(e) => setActiveVideoKey(e.target.value)}
                  className="bg-[#050710] border border-cyan-500/30 text-xs font-mono font-bold text-white rounded-xl px-3.5 py-2 outline-none focus:border-cyan-400 cursor-pointer shadow-inner max-w-md truncate"
                >
                  {videos.map((v) => (
                    <option key={v.id} value={v.key} className="bg-[#050710] text-white">
                      ▶ {v.type}: {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>
        )}

        {/* 2. REGIONAL STREAMING & DEEP-LINK TELEMETRY */}
        <section className="bg-[#080b16] border border-cyan-500/25 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>📡</span> Where to Watch &amp; Regional Deep-Links
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Live streaming availability across Subscription, Free, Rent, and Digital Purchase
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="movie-region-select" className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <span>🌐</span> Region:
              </label>
              <select
                id="movie-region-select"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-[#05070f] border border-cyan-500/30 text-xs font-mono font-bold text-white rounded-xl px-3 py-2 outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
              >
                {REGIONS.map((reg) => (
                  <option key={reg.id} value={reg.id} className="bg-[#05070f] text-white">
                    {reg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Watchmode Direct Deep Links if available */}
          {deepLinks.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Verified Direct Launch Links ({selectedRegion})
              </span>
              <div className="flex flex-wrap gap-2.5">
                {deepLinks.map((src, idx) => (
                  <a
                    key={`${src.source_id}-${idx}`}
                    href={src.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-400/50 text-xs font-mono text-emerald-200 flex items-center gap-2 transition-all"
                  >
                    <span className="font-bold">{src.name}</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-black/50 text-amber-300">
                      {src.type} • {src.format || "HD"}
                    </span>
                    <span>↗</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* TMDB Watch Providers Grid */}
          {regionProviders &&
          (regionProviders.flatrate || regionProviders.free || regionProviders.rent || regionProviders.buy) ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { label: "Stream / Subscription", items: [...(regionProviders.flatrate || []), ...(regionProviders.free || [])] },
                { label: "Digital Rental", items: regionProviders.rent || [] },
                { label: "Digital Purchase", items: regionProviders.buy || [] },
              ].map((group) => (
                <div key={group.label} className="p-4 rounded-2xl bg-[#05070f] border border-white/10 space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                    {group.label}
                  </span>
                  {group.items.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {group.items.slice(0, 8).map((prov) => (
                        <a
                          key={prov.provider_id}
                          href={getProviderDirectUrl(prov.provider_name, displayTitle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/50 transition-all"
                        >
                          {prov.logo_path && (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${prov.logo_path}`}
                              alt={prov.provider_name}
                              width={22}
                              height={22}
                              unoptimized
                              className="rounded-md"
                            />
                          )}
                          <span className="text-xs font-medium text-white">{prov.provider_name}</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-slate-500">None listed in {selectedRegion}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-[#05070f] border border-white/10 text-center space-y-2">
              <p className="text-xs font-mono text-slate-400">
                No direct regional streaming catalog indexed for {selectedRegion}.
              </p>
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(`where to stream ${displayTitle} (${releaseYear})`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-xs font-mono text-cyan-300 hover:bg-cyan-500/30"
              >
                Search Global Showtimes &amp; VOD ↗
              </a>
            </div>
          )}
        </section>

        {/* 3. KEY CREW & CAST EXPLORER */}
        <section className="space-y-6">
          {/* Key Production Crew */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { role: "Director", names: keyCrew.directors },
              { role: "Screenplay / Story", names: keyCrew.writers },
              { role: "Cinematography (DP)", names: keyCrew.dp },
              { role: "Original Score", names: keyCrew.composers },
            ].map((c) => (
              <div key={c.role} className="p-4 rounded-2xl bg-[#080b16] border border-white/10">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 block">
                  {c.role}
                </span>
                <p className="text-xs sm:text-sm font-bold text-white mt-1">
                  {c.names.length > 0 ? c.names.join(", ") : "Studio Unit"}
                </p>
              </div>
            ))}
          </div>

          {/* Interactive Cast Reel */}
          {cast.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span>🎭</span> Principal Cast (Click for Full Actor Dossier)
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3.5">
                {cast.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setActivePersonId(person.id)}
                    className="group text-left rounded-2xl overflow-hidden bg-[#080b16] border border-white/10 hover:border-cyan-400/60 transition-all cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-[3/4] w-full bg-[#0d1324] overflow-hidden">
                      {person.profile_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w342${person.profile_path}`}
                          alt={person.name}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="inset-0 absolute flex items-center justify-center text-xs font-mono text-slate-500">
                          🎭
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                        {person.name}
                      </p>
                      <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                        {person.character || "Cast"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 4. COMMUNITY REVIEWS & DISPATCHES */}
        <section className="bg-[#080b16] border border-cyan-500/25 rounded-3xl p-6 sm:p-8 shadow-xl">
          <CommunityReviews
            movieId={media.id}
            onWriteReview={() => setIsReviewModalOpen(true)}
          />
        </section>

        {/* 5. SIMILAR & RECOMMENDED REELS */}
        {similarTitles.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>🎞️</span> Related Sonic &amp; Thematic Matches
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {similarTitles.map((item) => {
                const itemType = item.media_type || (item.first_air_date ? "tv" : mediaType);
                const itemTitle = item.title || item.name || "Untitled";
                return (
                  <Link
                    key={item.id}
                    href={`/movie/${item.id}?type=${itemType}`}
                    className="group rounded-2xl overflow-hidden bg-[#080b16] border border-white/10 hover:border-cyan-400/60 transition-all flex flex-col"
                  >
                    <div className="relative aspect-[2/3] w-full bg-[#0d1324] overflow-hidden">
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                        alt={itemTitle}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                        {itemTitle}
                      </p>
                      <span className="text-[10px] font-mono text-amber-400">
                        ★ {item.vote_average ? item.vote_average.toFixed(1) : "N/A"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Actor Dossier Modal */}
      {activePersonId && (
        <ActorModal
          personId={activePersonId}
          onClose={() => setActivePersonId(null)}
          onSelectMovie={(newId, newType) => {
            setActivePersonId(null);
            router.push(`/movie/${newId}?type=${newType || "movie"}`);
          }}
        />
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          prefilledMovie={{
            id: media.id,
            title: displayTitle,
            poster_path: media.poster_path,
            release_date: media.release_date || media.first_air_date,
            media_type: mediaType,
          }}
        />
      )}
    </div>
  );
}

export default function MovieDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#04050a] flex items-center justify-center text-cyan-400 font-mono text-xs">
          LOADING DOSSIER...
        </div>
      }
    >
      <MovieDetailContent />
    </Suspense>
  );
}
