// File: components/MovieModal.jsx
"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useWatchlist } from "@/hooks/useWatchlist";
import {
  useStudioSession,
  STREAMING_REGIONS,
} from "@/components/StudioSessionProvider";
import ActorModal from "@/components/ActorModal";
import ReviewModal from "@/components/ReviewModal";
import CommunityReviews from "@/components/CommunityReviews";
import UniversalMediaPlayer from "@/components/UniversalMediaPlayer";
import { openCineMind } from "@/components/CineMindModal";

const emptySubscribe = () => () => {};

const REGION_CITY_FALLBACK = {
  CA: "Toronto, Canada",
  US: "New York, US",
  GB: "London, UK",
  AU: "Sydney, Australia",
  FR: "Paris, France",
  DE: "Berlin, Germany",
  JP: "Tokyo, Japan",
};

export default function MovieModal({
  movieId: initialMovieId,
  mediaType: initialMediaType = "movie",
  onClose,
}) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const studioSession = useStudioSession();
  const globalRegion = studioSession?.region || "US";
  const setGlobalRegion = studioSession?.setRegion;

  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const prevInitialIdRef = useRef(null);

  const [media, setMedia] = useState(null);
  const [cast, setCast] = useState([]);
  const [crew, setCrew] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [allSimilar, setAllSimilar] = useState([]);
  const [similarDisplayLimit, setSimilarDisplayLimit] = useState(12);
  const [externalRatings, setExternalRatings] = useState(null);
  const [streamingSources, setStreamingSources] = useState([]);
  const [releaseDatesData, setReleaseDatesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRegion, setIsRefreshingRegion] = useState(false);
  const [playingTrailer, setPlayingTrailer] = useState(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const [showtimesText, setShowtimesText] = useState("");
  const [showtimesSources, setShowtimesSources] = useState([]);
  const [isLoadingShowtimes, setIsLoadingShowtimes] = useState(false);
  const [hasScannedShowtimes, setHasScannedShowtimes] = useState(false);
  const [noShowtimesFound, setNoShowtimesFound] = useState(false);

  const { watchlist, saveToWatchlist, removeFromWatchlist } = useWatchlist();

  const isSaved = media
    ? (watchlist || []).some((item) => String(item.id) === String(media.id))
    : false;

  useEffect(() => {
    if (
      initialMovieId &&
      String(initialMovieId) !== String(prevInitialIdRef.current)
    ) {
      prevInitialIdRef.current = initialMovieId;
      queueMicrotask(() => {
        setHistory([
          { kind: "movie", id: initialMovieId, mediaType: initialMediaType },
        ]);
        setHistoryIdx(0);
        setMedia(null);
        setIsLoading(true);
      });
    }
  }, [initialMovieId, initialMediaType]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const currentItem =
    history[historyIdx] ||
    (initialMovieId
      ? { kind: "movie", id: initialMovieId, mediaType: initialMediaType }
      : null);
  const isViewingPerson = currentItem?.kind === "person";
  const currentMovieId = isViewingPerson ? null : currentItem?.id;
  const currentMediaType = currentItem?.mediaType || "movie";
  const isTv = currentMediaType === "tv";

  const pushHistory = (item) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIdx + 1);
      return [...trimmed, item];
    });
    setHistoryIdx((prev) => prev + 1);
  };

  const handleSelectMovie = (id, type = "movie") => {
    pushHistory({ kind: "movie", id, mediaType: type });
  };

  const handleSelectPerson = (personId) => {
    pushHistory({ kind: "person", id: personId });
  };

  const goBack = () => {
    if (historyIdx > 0) setHistoryIdx((prev) => prev - 1);
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) setHistoryIdx((prev) => prev + 1);
  };

  useEffect(() => {
    if (initialMovieId) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [initialMovieId]);

  // Unified Server-Side Media Intelligence Hub Fetch
  useEffect(() => {
    if (!currentMovieId || isViewingPerson) return;

    let isActive = true;
    queueMicrotask(() => {
      if (isActive) {
        setPlayingTrailer(false);
        setSimilarDisplayLimit(12);
        setShowtimesText("");
        setShowtimesSources([]);
        setHasScannedShowtimes(false);
        setNoShowtimesFound(false);
      }
    });

    const fetchMediaData = async () => {
      setIsLoading(true);
      const endpoint = isTv ? "tv" : "movie";
      try {
        const res = await fetch(
          `/api/movie/${currentMovieId}?type=${endpoint}&region=${globalRegion}`
        );
        if (!res.ok) throw new Error("Failed to load media dossier");
        const data = await res.json();

        if (!isActive) return;

        const videos = data.videos?.results || [];
        const trailer =
          videos.find(
            (v) => v.type === "Trailer" && v.site === "YouTube" && v.official
          ) ||
          videos.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
          videos.find((v) => v.site === "YouTube");

        const rawCast = data.credits?.cast || [];
        const consolidatedCast = rawCast
          .reduce((acc, current) => {
            const existing = acc.find((item) => item.id === current.id);
            if (existing) {
              if (
                current.character &&
                !existing.roles.includes(current.character)
              ) {
                existing.roles.push(current.character);
              }
            } else {
              acc.push({
                id: current.id,
                name: current.name,
                profile_path: current.profile_path,
                roles: current.character ? [current.character] : ["Cast"],
              });
            }
            return acc;
          }, [])
          .slice(0, 18);

        const rawCrew = (data.credits?.crew || []).filter((c) =>
          [
            "Director",
            "Writer",
            "Screenplay",
            "Producer",
            "Executive Producer",
            "Creator",
            "Director of Photography",
          ].includes(c.job)
        );
        const consolidatedCrew = rawCrew
          .reduce((acc, current) => {
            const existing = acc.find((item) => item.id === current.id);
            if (existing) {
              if (current.job && !existing.roles.includes(current.job)) {
                existing.roles.push(current.job);
              }
            } else {
              acc.push({
                id: current.id,
                name: current.name,
                profile_path: current.profile_path,
                roles: current.job ? [current.job] : ["Production"],
              });
            }
            return acc;
          }, [])
          .slice(0, 12);

        const combinedRecs = [
          ...(data.recommendations?.results || []),
          ...(data.similar?.results || []),
        ];
        const uniqueSimilarMap = new Map();
        for (const item of combinedRecs) {
          if (item?.id && !uniqueSimilarMap.has(item.id)) {
            uniqueSimilarMap.set(item.id, item);
          }
        }

        setMedia(data);
        setCast(consolidatedCast);
        setCrew(consolidatedCrew);
        setTrailerKey(trailer ? trailer.key : null);
        setAllSimilar(Array.from(uniqueSimilarMap.values()));
        setExternalRatings(data.externalRatings || null);
        setStreamingSources(
          Array.isArray(data.streamingSources) ? data.streamingSources : []
        );
        setReleaseDatesData(data.release_dates?.results || []);
      } catch (error) {
        console.error("Failed to fetch cinematic telemetry:", error);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchMediaData();

    return () => {
      isActive = false;
    };
    // Intentionally fetch full dossier on ID/type change; region changes use lightweight /api/streaming below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMovieId, isTv, isViewingPerson]);

  const handleRegionChange = async (nextRegion) => {
    if (setGlobalRegion) setGlobalRegion(nextRegion);
    setHasScannedShowtimes(false);
    setNoShowtimesFound(false);
    setShowtimesText("");
    setShowtimesSources([]);

    if (!currentMovieId || !media) return;
    setIsRefreshingRegion(true);
    try {
      const title = media.title || media.name || "";
      const res = await fetch(
        `/api/streaming?tmdbId=${currentMovieId}&mediaType=${
          isTv ? "tv" : "movie"
        }&region=${nextRegion}&title=${encodeURIComponent(title)}`
      );
      if (res.ok) {
        const json = await res.json();
        setStreamingSources(Array.isArray(json.sources) ? json.sources : []);
      }
    } catch {
      // Keep existing list on transient network error
    } finally {
      setIsRefreshingRegion(false);
    }
  };

  const regionRelease = releaseDatesData.find(
    (r) => r.iso_3166_1 === globalRegion
  );
  const theatricalRelease = regionRelease?.release_dates?.find(
    (d) => d.type === 3 || d.type === 2
  );
  const isCurrentlyInTheaters = !isTv && Boolean(theatricalRelease);

  const handleScanShowtimes = async () => {
    if (!media) return;
    setIsLoadingShowtimes(true);
    setHasScannedShowtimes(true);
    setNoShowtimesFound(false);

    try {
      const title = media.title || media.name;
      const locationQuery =
        REGION_CITY_FALLBACK[globalRegion] || "Toronto, Canada";
      const res = await fetch("/api/showtimes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, location: locationQuery }),
      });

      const json = await res.json().catch(() => ({}));

      if (json.success && json.showtimesText?.trim()) {
        setShowtimesText(json.showtimesText);
        setShowtimesSources(json.sources || []);
      } else {
        setNoShowtimesFound(true);
        setShowtimesText("");
        setShowtimesSources(json.sources || []);
      }
    } catch (e) {
      console.error("Failed to load live showtimes:", e);
      setNoShowtimesFound(true);
    } finally {
      setIsLoadingShowtimes(false);
    }
  };

  if (!initialMovieId || !isClient) return null;

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAskCineMind = () => {
    if (!media) return;
    const title = media.title || media.name;
    const dateStr = media.release_date || media.first_air_date || "";
    openCineMind({
      type: currentMediaType || "movie",
      id: media.id,
      title,
      year: dateStr.split("-")[0],
      overview: media.overview || "",
      genres: (media.genres || []).map((g) => g.name).join(", "),
    });
  };

  const toggleWatchlistForItem = (item, e) => {
    if (e) e.stopPropagation();
    if (!item) return;
    const itemWithMediaType = { ...item, media_type: currentMediaType };
    const isAlreadySaved = (watchlist || []).some(
      (w) => String(w.id) === String(item.id)
    );
    if (isAlreadySaved) {
      removeFromWatchlist(item.id);
    } else {
      saveToWatchlist(itemWithMediaType);
    }
  };

  const subscriptionSources = streamingSources.filter(
    (s) => s.type === "sub" || s.type === "free" || s.type === "tve"
  );
  const transactionalSources = streamingSources.filter(
    (s) => s.type === "rent" || s.type === "buy"
  );

  const displayedSimilar = allSimilar.slice(0, similarDisplayLimit);
  const mediaTitle = media ? media.title || media.name : "";
  const releaseYear = media
    ? (media.release_date || media.first_air_date || "").split("-")[0]
    : "";

  const modalContent = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-2 sm:p-4 md:p-6 overflow-y-auto scrollbar-stealth-pill font-sans"
      role="dialog"
      aria-modal="true"
    >
      {isViewingPerson ? (
        <ActorModal
          personId={currentItem.id}
          onClose={onClose}
          onSelectMovie={handleSelectMovie}
          canGoBack={historyIdx > 0}
          canGoForward={historyIdx < history.length - 1}
          onGoBack={goBack}
          onGoForward={goForward}
        />
      ) : (
        <>
          {media?.backdrop_path && (
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-25 z-0">
              <Image
                src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`}
                alt=""
                fill
                unoptimized
                priority
                className="object-cover blur-3xl scale-110"
              />
            </div>
          )}

          <div className="bg-[#090d16]/95 border border-white/10 w-full max-w-6xl rounded-3xl p-6 sm:p-10 relative shadow-2xl my-4 text-white z-10">
            {/* Navigation & Control Bar */}
            <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-8 gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={historyIdx <= 0}
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">Back</span>
                </button>
                <button
                  type="button"
                  onClick={goForward}
                  disabled={historyIdx >= history.length - 1}
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="hidden sm:inline">Forward</span>
                  <span>→</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {media && (
                  <Link
                    href={`/movie/${media.id}?type=${currentMediaType}`}
                    onClick={onClose}
                    className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span>Standalone Dossier ↗</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Write Review
                </button>

                <button
                  type="button"
                  onClick={handleAskCineMind}
                  className="px-3.5 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Brief CineMind AI
                </button>

                <button
                  type="button"
                  onClick={() => toggleWatchlistForItem(media)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isSaved
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                      : "bg-cyan-500 text-slate-950 border-cyan-400 hover:bg-cyan-400 font-bold"
                  }`}
                >
                  <span>{isSaved ? "✓ In Watchlist" : "+ Save to Vault"}</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close Media Dossier"
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 flex items-center justify-center text-slate-300 hover:text-rose-200 text-sm font-bold transition-all cursor-pointer ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                  Loading {isTv ? "Series" : "Film"} Intelligence...
                </span>
              </div>
            ) : !media ? (
              <div className="text-center py-24 text-slate-400 text-sm">
                Title details could not be loaded.
              </div>
            ) : (
              <div className="space-y-10 max-h-[75vh] overflow-y-auto pr-2 scrollbar-stealth-pill">
                {/* Hero Header */}
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  <div className="relative w-48 sm:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-slate-900 border border-white/15 shrink-0 shadow-2xl">
                    {media.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                        alt={mediaTitle}
                        fill
                        priority
                        unoptimized
                        sizes="224px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono">
                        No Poster
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-4 flex-1 text-center md:text-left">
                    <div>
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-[10px] uppercase font-semibold">
                          {isTv ? "Television Series" : "Feature Film"}
                        </span>
                        {releaseYear && (
                          <span className="text-xs font-mono text-slate-400">
                            {releaseYear}
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-400">
                          •{" "}
                          {isTv
                            ? `${media.number_of_seasons || 1} Season${
                                media.number_of_seasons === 1 ? "" : "s"
                              } (${media.number_of_episodes || 0} Eps)`
                            : media.runtime
                            ? `${media.runtime} min`
                            : "Runtime N/A"}
                        </span>
                      </div>

                      <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
                        {mediaTitle}
                      </h1>
                      {media.tagline && (
                        <p className="text-sm text-cyan-300/80 italic mt-1.5">
                          &ldquo;{media.tagline}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Multi-Source Critic & Audience Score Bar */}
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                      <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          TMDB
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          ★{" "}
                          {media.vote_average
                            ? media.vote_average.toFixed(1)
                            : "N/A"}
                        </span>
                      </div>

                      {externalRatings?.imdbRating && (
                        <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase text-amber-300 font-semibold">
                            IMDb
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {externalRatings.imdbRating}/10
                          </span>
                        </div>
                      )}

                      {externalRatings?.rottenTomatoes && (
                        <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase text-rose-300 font-semibold">
                            Rotten Tomatoes
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {externalRatings.rottenTomatoes}
                          </span>
                        </div>
                      )}

                      {externalRatings?.metacritic && (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase text-emerald-300 font-semibold">
                            Metacritic
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {externalRatings.metacritic}
                          </span>
                        </div>
                      )}
                    </div>

                    {media.genres && media.genres.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                        {media.genres.map((g) => (
                          <span
                            key={g.id}
                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-300"
                          >
                            {g.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      {media.overview || "No synopsis available."}
                    </p>

                    {externalRatings?.awards && (
                      <p className="text-xs font-mono text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2">
                        🏆 {externalRatings.awards}
                      </p>
                    )}
                  </div>
                </div>

                {/* Video Trailer */}
                {trailerKey && (
                  <div className="w-full max-w-4xl mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-white/15 shadow-2xl relative group">
                    {playingTrailer ? (
                      <UniversalMediaPlayer
                        videoKey={trailerKey}
                        title={`${mediaTitle} Trailer`}
                        playing={true}
                        controls={true}
                        className="w-full h-full absolute inset-0"
                      />
                    ) : (
                      <div
                        onClick={() => setPlayingTrailer(true)}
                        className="w-full h-full relative cursor-pointer flex items-center justify-center bg-cover bg-center group"
                        style={{
                          backgroundImage: `url('https://img.youtube.com/vi/${trailerKey}/maxresdefault.jpg')`,
                        }}
                      >
                        <div className="absolute inset-0 bg-black/45 group-hover:bg-black/25 transition-colors" />
                        <div className="relative z-10 w-16 h-16 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                          ▶
                        </div>
                        <span className="absolute bottom-4 left-4 text-xs font-mono font-semibold text-white bg-black/75 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/15">
                          Play Official Trailer
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Theatrical Showtimes Panel */}
                {isCurrentlyInTheaters && (
                  <div className="bg-rose-950/25 border border-rose-500/35 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-rose-500/20 pb-4">
                      <div>
                        <span className="px-2.5 py-0.5 bg-rose-600 text-white font-mono text-[10px] font-bold uppercase rounded tracking-wider">
                          In Theaters ({globalRegion})
                        </span>
                        <h4 className="text-base font-bold text-white mt-1.5">
                          Live Local Showtimes &amp; Ticketing
                        </h4>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleScanShowtimes}
                          disabled={isLoadingShowtimes}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                          {isLoadingShowtimes
                            ? "Scanning..."
                            : hasScannedShowtimes
                            ? "Refresh Showtimes"
                            : "Scan Live Showtimes"}
                        </button>

                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(
                            mediaTitle + " showtimes tickets near me"
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-semibold rounded-xl transition-all"
                        >
                          Direct Tickets ↗
                        </a>
                      </div>
                    </div>

                    {hasScannedShowtimes &&
                      !isLoadingShowtimes &&
                      showtimesText && (
                        <div className="space-y-3">
                          <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed bg-black/40 p-4 rounded-xl border border-white/10 font-mono">
                            {showtimesText}
                          </div>
                          {showtimesSources.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {showtimesSources.map((chunk, i) => {
                                const href = chunk.url || chunk.web?.uri;
                                const label =
                                  chunk.title ||
                                  chunk.web?.title ||
                                  "Cinema Partner";
                                if (!href) return null;
                                return (
                                  <a
                                    key={i}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] font-mono px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg text-rose-200 truncate max-w-[220px]"
                                  >
                                    {label} ↗
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                    {hasScannedShowtimes &&
                      !isLoadingShowtimes &&
                      noShowtimesFound && (
                        <div className="text-xs text-slate-300 bg-black/40 p-3.5 rounded-xl border border-white/10 flex flex-wrap items-center gap-2">
                          <span>Check regional ticketing partners:</span>
                          {showtimesSources.map((chunk, i) => {
                            const href = chunk.url || chunk.web?.uri;
                            const label = chunk.title || "Ticketing";
                            if (!href) return null;
                            return (
                              <a
                                key={i}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-mono px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/15 rounded-lg text-cyan-300"
                              >
                                {label} ↗
                              </a>
                            );
                          })}
                        </div>
                      )}
                  </div>
                )}

                {/* Regional Streaming Deep-Links Hub */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3.5 flex-wrap gap-3">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-cyan-400 font-semibold">
                        Where to Stream ({globalRegion})
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Direct regional platform links &amp; format availability
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isRefreshingRegion && (
                        <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      )}
                      <select
                        value={globalRegion}
                        onChange={(e) => handleRegionChange(e.target.value)}
                        aria-label="Select Streaming Region"
                        className="bg-[#0f1626] border border-white/15 text-xs font-semibold text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        {STREAMING_REGIONS.map((reg) => (
                          <option key={reg.id} value={reg.id}>
                            {reg.label} ({reg.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] font-mono uppercase text-slate-400 mb-2.5">
                        Subscription &amp; Free Streaming
                      </p>
                      {subscriptionSources.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {subscriptionSources.map((src, idx) => (
                            <a
                              key={`${src.source_id}-${src.type}-${idx}`}
                              href={src.web_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2.5 bg-[#111827] hover:bg-[#192338] border border-white/10 hover:border-cyan-400/50 px-3.5 py-2.5 rounded-xl transition-all group"
                            >
                              {src.logo_path && (
                                <div className="relative w-6 h-6 rounded-md overflow-hidden bg-white/10 shrink-0">
                                  <Image
                                    src={`https://image.tmdb.org/t/p/w92${src.logo_path}`}
                                    alt={src.name}
                                    fill
                                    unoptimized
                                    sizes="24px"
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <span className="text-xs font-semibold text-slate-100 group-hover:text-white">
                                {src.name}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 uppercase">
                                {src.type === "free" ? "Free" : src.format || "HD"}
                              </span>
                              <span className="text-xs text-cyan-400 opacity-70 group-hover:opacity-100">
                                ↗
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Not currently on subscription platforms in{" "}
                          {globalRegion}.
                        </p>
                      )}
                    </div>

                    {transactionalSources.length > 0 && (
                      <div className="pt-3.5 border-t border-white/10">
                        <p className="text-[11px] font-mono uppercase text-slate-400 mb-2.5">
                          Digital Rent &amp; Purchase
                        </p>
                        <div className="flex flex-wrap gap-2.5">
                          {transactionalSources.map((src, idx) => (
                            <a
                              key={`${src.source_id}-${src.type}-${idx}`}
                              href={src.web_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white transition-all"
                            >
                              {src.logo_path && (
                                <div className="relative w-5 h-5 rounded overflow-hidden bg-white/10 shrink-0">
                                  <Image
                                    src={`https://image.tmdb.org/t/p/w92${src.logo_path}`}
                                    alt={src.name}
                                    fill
                                    unoptimized
                                    sizes="20px"
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <span className="font-medium">{src.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 uppercase">
                                {src.type}
                                {src.price ? ` $${src.price}` : ""}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                ↗
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 text-[11px] text-slate-500 border-t border-white/5 flex items-center justify-between flex-wrap gap-2">
                      <span>
                        Regional availability aggregated via TMDB / JustWatch
                        &amp; Watchmode.
                      </span>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(
                          `watch ${mediaTitle} ${releaseYear} online`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        Search Web Availability ↗
                      </a>
                    </div>
                  </div>
                </div>

                {/* Production & Box Office Telemetry */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-center font-mono">
                  {isTv ? (
                    <>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Seasons
                        </p>
                        <p className="text-xs font-semibold text-white mt-0.5">
                          {media.number_of_seasons || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Episodes
                        </p>
                        <p className="text-xs font-semibold text-white mt-0.5">
                          {media.number_of_episodes || "N/A"}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Budget
                        </p>
                        <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                          {formatCurrency(media.budget)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">
                          Box Office
                        </p>
                        <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                          {externalRatings?.boxOffice ||
                            formatCurrency(media.revenue)}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">
                      Language
                    </p>
                    <p className="text-xs font-semibold uppercase text-white mt-0.5">
                      {media.original_language || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">
                      Status
                    </p>
                    <p className="text-xs font-semibold text-cyan-400 mt-0.5">
                      {media.status || "Released"}
                    </p>
                  </div>
                </div>

                {/* Key Crew */}
                {crew.length > 0 && (
                  <div className="pt-6 border-t border-white/10">
                    <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-slate-300 mb-4 font-semibold">
                      Directors &amp; Key Creators
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                      {crew.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelectPerson(member.id)}
                          className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-24 text-center cursor-pointer"
                        >
                          <div className="relative aspect-[2/3] w-20 rounded-xl overflow-hidden border border-white/10 group-hover:border-cyan-400/60 transition-all bg-slate-900">
                            {member.profile_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w300${member.profile_path}`}
                                alt={member.name}
                                fill
                                unoptimized
                                sizes="80px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono font-bold">
                                {member.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-200 mt-2 truncate w-full group-hover:text-cyan-300 transition-colors">
                            {member.name}
                          </span>
                          <span className="text-[10px] text-cyan-400/90 truncate w-full font-mono mt-0.5">
                            {member.roles.join(", ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cast */}
                {cast.length > 0 && (
                  <div className="pt-6 border-t border-white/10">
                    <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-slate-300 mb-4 font-semibold">
                      Featured Cast
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                      {cast.map((actor) => (
                        <button
                          key={actor.id}
                          type="button"
                          onClick={() => handleSelectPerson(actor.id)}
                          className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-24 text-center cursor-pointer"
                        >
                          <div className="relative aspect-[2/3] w-20 rounded-xl overflow-hidden border border-white/10 group-hover:border-cyan-400/60 transition-all bg-slate-900">
                            {actor.profile_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w300${actor.profile_path}`}
                                alt={actor.name}
                                fill
                                unoptimized
                                sizes="80px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-slate-500 font-mono font-bold">
                                {actor.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-200 mt-2 truncate w-full group-hover:text-cyan-300 transition-colors">
                            {actor.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate w-full font-mono mt-0.5">
                            {actor.roles.join(", ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Reviews */}
                <CommunityReviews
                  movieId={media.id}
                  onWriteReview={() => setIsReviewModalOpen(true)}
                />

                {/* Similar Titles */}
                {allSimilar.length > 0 && (
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-slate-300 font-semibold">
                        Related {isTv ? "Series" : "Films"}
                      </h3>
                      {similarDisplayLimit < allSimilar.length && (
                        <button
                          type="button"
                          onClick={() =>
                            setSimilarDisplayLimit((prev) =>
                              Math.min(prev + 8, allSimilar.length)
                            )
                          }
                          className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-medium rounded-xl transition-all cursor-pointer"
                        >
                          Show More
                        </button>
                      )}
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                      {displayedSimilar.map((sim) => {
                        const isSimSaved = (watchlist || []).some(
                          (w) => String(w.id) === String(sim.id)
                        );
                        const simTitle = sim.title || sim.name || "Untitled";
                        const simYear =
                          (sim.release_date || sim.first_air_date || "").split(
                            "-"
                          )[0] || "N/A";
                        const simRating = sim.vote_average
                          ? Number(sim.vote_average).toFixed(1)
                          : null;

                        return (
                          <div
                            key={sim.id}
                            onClick={() =>
                              handleSelectMovie(
                                sim.id,
                                sim.media_type || currentMediaType
                              )
                            }
                            className="snap-start shrink-0 w-36 sm:w-40 bg-white/[0.03] border border-white/10 hover:border-cyan-400/50 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all group hover:-translate-y-1"
                          >
                            <div>
                              <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-900 mb-2 border border-white/10">
                                {sim.poster_path ? (
                                  <Image
                                    src={`https://image.tmdb.org/t/p/w342${sim.poster_path}`}
                                    alt={simTitle}
                                    fill
                                    unoptimized
                                    sizes="160px"
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-[10px] text-slate-500 font-mono">
                                    N/A
                                  </div>
                                )}
                              </div>
                              <p
                                className="text-xs font-semibold text-slate-100 line-clamp-2 h-8 leading-snug group-hover:text-cyan-300 transition-colors mb-1.5 px-0.5"
                                title={simTitle}
                              >
                                {simTitle}
                              </p>
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5 mb-2">
                                <span>{simYear}</span>
                                {simRating && Number(simRating) > 0 && (
                                  <span className="text-amber-400 font-semibold">
                                    ★ {simRating}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => toggleWatchlistForItem(sim, e)}
                              className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all cursor-pointer border ${
                                isSimSaved
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                                  : "bg-white/5 text-slate-200 border-white/10 hover:bg-cyan-500 hover:text-slate-950 hover:border-cyan-400"
                              }`}
                            >
                              {isSimSaved ? "✓ Saved" : "+ Watchlist"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {isReviewModalOpen && media && (
        <ReviewModal
          targetId={media.id}
          targetTitle={mediaTitle}
          posterPath={media.poster_path}
          mediaType={currentMediaType}
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
