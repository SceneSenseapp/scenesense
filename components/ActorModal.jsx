// File: components/ActorModal.jsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { openCineMind } from "@/components/CineMindModal";

export default function ActorModal({
  personId,
  onClose,
  onSelectMovie,
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
}) {
  const [personData, setPersonData] = useState(null);
  const [personCredits, setPersonCredits] = useState([]);
  const [backdropPath, setBackdropPath] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    if (!personId) return;

    let isActive = true;

    const fetchPersonDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/actor/${personId}`);
        if (!res.ok) throw new Error("Failed to load talent dossier");
        const pData = await res.json();

        if (!isActive) return;

        setPersonData(pData);

        const cData = pData.combined_credits || { cast: [], crew: [] };
        const allRawCredits = [...(cData.cast || []), ...(cData.crew || [])];

        const validCredits = allRawCredits.filter((item) => {
          if (item.adult) return false;
          const title = (item.title || item.name || "").toLowerCase();
          const adultKeywords = ["porn", "xxx", "adult video", "erotic"];
          if (adultKeywords.some((kw) => title.includes(kw))) return false;
          return (
            (item.title || item.name) &&
            (item.release_date || item.first_air_date) &&
            item.poster_path
          );
        });

        const topBackdrop =
          validCredits.find((c) => c.backdrop_path)?.backdrop_path || null;
        setBackdropPath(topBackdrop);

        const consolidatedMap = new Map();

        validCredits.forEach((credit) => {
          const mediaKey = `${credit.media_type || "movie"}-${credit.id}`;
          const currentRole = credit.character || credit.job || "Contributor";

          if (consolidatedMap.has(mediaKey)) {
            const existing = consolidatedMap.get(mediaKey);
            if (!existing.roles.includes(currentRole)) {
              existing.roles.push(currentRole);
            }
          } else {
            consolidatedMap.set(mediaKey, {
              id: credit.id,
              media_type: credit.media_type || "movie",
              title: credit.title || credit.name,
              release_date: credit.release_date || credit.first_air_date,
              poster_path: credit.poster_path,
              vote_average: credit.vote_average || 0,
              popularity: credit.popularity || 0,
              roles: [currentRole],
            });
          }
        });

        const sortedCredits = Array.from(consolidatedMap.values()).sort(
          (a, b) => b.popularity - a.popularity
        );

        setPersonCredits(sortedCredits);
      } catch (e) {
        console.error("Failed to fetch person telemetry:", e);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchPersonDetails();

    return () => {
      isActive = false;
    };
  }, [personId]);

  if (!personId) return null;

  const handleAskCineMindActor = () => {
    if (!personData) return;
    openCineMind({
      type: "person",
      id: personData.id,
      name: personData.name,
      title: personData.name,
      department: personData.known_for_department || "Artist",
      biography: personData.biography || "",
      autoPrompt: `Brief me on ${personData.name} (${
        personData.known_for_department || "Artist"
      }) — analyze their signature career performances and return a TMDB grid of 6 essential films or series showcasing their best work or similar creative DNA.`,
    });
  };

  const handleCreditClick = (item) => {
    if (typeof onSelectMovie === "function") {
      onSelectMovie(item.id, item.media_type || "movie");
    } else {
      router.push(`/movie/${item.id}?type=${item.media_type || "movie"}`);
    }
  };

  return (
    <div className="w-full relative">
      {backdropPath && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
          <Image
            src={`https://image.tmdb.org/t/p/original${backdropPath}`}
            alt=""
            fill
            unoptimized
            priority
            className="object-cover blur-3xl scale-110"
          />
        </div>
      )}

      <div className="bg-[#090d16]/95 border border-white/10 w-full max-w-6xl rounded-3xl p-6 sm:p-10 relative shadow-2xl my-4 text-white z-10 mx-auto">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-8 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {(canGoBack || canGoForward) && (
              <>
                <button
                  type="button"
                  onClick={onGoBack}
                  disabled={!canGoBack}
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>←</span>
                  <span className="hidden sm:inline">Back</span>
                </button>
                <button
                  type="button"
                  onClick={onGoForward}
                  disabled={!canGoForward}
                  className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400/50 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="hidden sm:inline">Forward</span>
                  <span>→</span>
                </button>
              </>
            )}
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 font-semibold px-2">
              Talent Dossier
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {personData && typeof onSelectMovie === "function" && (
              <Link
                href={`/person/${personData.id}`}
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <span>Open Standalone Page ↗</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleAskCineMindActor}
              className="px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Brief CineMind AI</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Talent Dossier"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 flex items-center justify-center text-slate-300 hover:text-rose-200 text-sm font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28 space-y-3">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
              Loading Filmography...
            </span>
          </div>
        ) : personData ? (
          <div className="space-y-10 max-h-[75vh] overflow-y-auto pr-2 scrollbar-stealth-pill">
            <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start border-b border-white/10 pb-8">
              <div className="relative w-36 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden border border-white/15 shadow-xl shrink-0 bg-slate-900">
                {personData.profile_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${personData.profile_path}`}
                    alt={personData.name}
                    fill
                    unoptimized
                    priority
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-2xl font-mono font-bold text-slate-500">
                    {personData.name
                      ? personData.name.slice(0, 2).toUpperCase()
                      : "N/A"}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 text-center sm:text-left flex-1">
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  {personData.name}
                </h2>
                <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                  {personData.known_for_department || "Artist"}
                  {personData.birthday ? ` • Born ${personData.birthday}` : ""}
                  {personData.place_of_birth
                    ? ` • ${personData.place_of_birth}`
                    : ""}
                </p>

                <div className="text-sm text-slate-300 leading-relaxed mt-2 space-y-3 max-h-60 overflow-y-auto pr-2">
                  {personData.biography ? (
                    personData.biography
                      .split("\n\n")
                      .map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
                  ) : (
                    <p className="italic text-slate-500">
                      No biography recorded in TMDB archives for this artist.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-slate-300 font-semibold">
                  Notable Filmography &amp; Television Credits
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  {personCredits.length} Titles
                </span>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                {personCredits.map((item) => {
                  const date = item.release_date;
                  const year = date ? date.split("-")[0] : "N/A";
                  const rating = item.vote_average
                    ? Number(item.vote_average).toFixed(1)
                    : null;

                  return (
                    <div
                      key={`${item.media_type}-${item.id}`}
                      onClick={() => handleCreditClick(item)}
                      className="snap-start shrink-0 w-36 sm:w-40 bg-white/[0.03] border border-white/10 hover:border-cyan-400/50 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all group hover:-translate-y-1"
                    >
                      <div>
                        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-slate-900 mb-2 border border-white/10">
                          {item.poster_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                              alt={item.title}
                              fill
                              unoptimized
                              sizes="160px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-[10px] text-slate-500 font-mono">
                              N/A
                            </div>
                          )}
                        </div>

                        <p
                          className="text-xs font-semibold text-slate-100 line-clamp-2 h-8 leading-snug group-hover:text-cyan-300 transition-colors mb-1.5 px-0.5"
                          title={item.title}
                        >
                          {item.title}
                        </p>
                      </div>

                      <div className="mt-1 space-y-0.5 border-t border-white/10 pt-1.5">
                        <p
                          className="text-[10px] font-mono text-cyan-300/90 truncate"
                          title={item.roles.join(", ")}
                        >
                          {item.roles.join(", ")}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>
                            {year} •{" "}
                            <span className="uppercase">{item.media_type}</span>
                          </span>
                          {rating && Number(rating) > 0 && (
                            <span className="text-amber-400 font-semibold">
                              ★ {rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-24 text-slate-400 text-sm">
            Talent profile unavailable.
          </div>
        )}
      </div>
    </div>
  );
}
