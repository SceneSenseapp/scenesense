// File: app/dashboard/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useStudioSession } from "@/components/StudioSessionProvider";

import type { IntegrationStatusItem } from "@/app/api/integrations/status/route";

interface WatchlistItem {
  id: string | number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  media_type?: string;
  categoryTag?: string;
  watched?: boolean;
}

interface IntegrationStatusPayload {
  ok: boolean;
  timestamp: string;
  summary: {
    activeCount: number;
    totalCount: number;
    primaryModel: string;
    fallbackModel: string;
    supportedRegions: string[];
  };
  integrations: IntegrationStatusItem[];
}

const formatPosterSrc = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w500${path.startsWith("/") ? path : `/${path}`}`;
};

export default function DashboardPage() {
  const studioSession = useStudioSession() as {
    user?: { uid: string; displayName?: string | null; email?: string | null } | null;
    userProfile?: { coins?: number; xp?: number; tier?: string; isVip?: boolean } | null;
    region?: string;
    activeLut?: string;
    openMediaModal?: (id: string | number, type?: string) => void;
  } | null;

  const user = studioSession?.user || null;
  const userProfile = studioSession?.userProfile || null;
  const region = studioSession?.region || "CA";

  const { watchlist = [], isLoading, toggleWatched, removeFromWatchlist } =
    useWatchlist() as {
      watchlist: WatchlistItem[];
      isLoading: boolean;
      toggleWatched: (id: string | number, currentWatched?: boolean) => Promise<void>;
      removeFromWatchlist: (id: string | number) => Promise<void>;
    };

  const [telemetry, setTelemetry] = useState<IntegrationStatusPayload | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);

  const fetchTelemetry = useCallback(async () => {
    setLoadingTelemetry(true);
    try {
      const res = await fetch("/api/integrations/status", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as IntegrationStatusPayload;
        setTelemetry(data);
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fetchTelemetry();
    });
    return () => cancelAnimationFrame(frame);
  }, [fetchTelemetry]);

  const totalSaved = watchlist.length;
  const watchedCount = watchlist.filter((m) => m.watched).length;
  const completionRate =
    totalSaved > 0 ? Math.round((watchedCount / totalSaved) * 100) : 0;

  const integrationCards = Array.isArray(telemetry?.integrations)
    ? telemetry.integrations
    : [];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Live Platform Health & Vault Metrics"
        title="Studio"
        accent="Telemetry"
        subtitle={
          user
            ? `Signed in as ${user.displayName || user.email} • Active Region: ${region}`
            : `Public System Status & Local Vault Overview • Active Region: ${region}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchTelemetry}
              disabled={loadingTelemetry}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              {loadingTelemetry ? "Refreshing..." : "Refresh Status"}
            </button>
            <Link
              href="/analyze"
              className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 text-xs font-semibold transition-all"
            >
              Scene Analyzer
            </Link>
            <Link
              href="/watchlist"
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all"
            >
              Open Watchlist Vault
            </Link>
          </div>
        }
      />

      {/* Personal Operative Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="studio-panel p-5 rounded-2xl">
          <span className="text-[11px] font-mono uppercase text-slate-400 block">
            Vault Titles
          </span>
          <span className="text-2xl font-bold text-white font-mono mt-1 block">
            {totalSaved}
          </span>
        </div>
        <div className="studio-panel p-5 rounded-2xl">
          <span className="text-[11px] font-mono uppercase text-slate-400 block">
            Watched &amp; Logged
          </span>
          <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
            {watchedCount}
          </span>
        </div>
        <div className="studio-panel p-5 rounded-2xl">
          <span className="text-[11px] font-mono uppercase text-slate-400 block">
            Completion Rate
          </span>
          <span className="text-2xl font-bold text-cyan-300 font-mono mt-1 block">
            {completionRate}%
          </span>
        </div>
        <div className="studio-panel p-5 rounded-2xl">
          <span className="text-[11px] font-mono uppercase text-slate-400 block">
            {user ? "Studio Reserve" : "Account Status"}
          </span>
          {user ? (
            <span className="text-lg font-bold text-amber-300 font-mono mt-1 block">
              {userProfile?.coins ?? 100} Credits • {userProfile?.xp ?? 0} XP
            </span>
          ) : (
            <Link
              href="/login"
              className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 mt-1.5 inline-block"
            >
              Sign in for Cloud Sync →
            </Link>
          )}
        </div>
      </section>

      {/* Live Integration Matrix */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">
              Active Service Integrations
            </h2>
            <p className="text-xs text-slate-400">
              Real-time server probe across AI, metadata, streaming availability, payments, and database layers
            </p>
          </div>
          {telemetry?.timestamp && (
            <span className="text-[11px] font-mono text-slate-500">
              {telemetry.summary?.activeCount}/{telemetry.summary?.totalCount} Active • Checked{" "}
              {new Date(telemetry.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {loadingTelemetry && !telemetry ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="studio-panel rounded-2xl p-5 h-32 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrationCards.map((card) => {
              const isOnline = card.status === "online";
              const isHybrid = card.status === "hybrid";
              const statusLabel = isOnline
                ? "Online"
                : isHybrid
                  ? "Hybrid"
                  : "Standby";
              return (
                <div
                  key={card.id}
                  className="studio-panel rounded-2xl p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase border ${
                          isOnline
                            ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
                            : isHybrid
                              ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/30"
                              : "bg-amber-500/15 text-amber-300 border-amber-400/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isOnline
                              ? "bg-emerald-400"
                              : isHybrid
                                ? "bg-cyan-400"
                                : "bg-amber-400"
                          }`}
                        />
                        {statusLabel}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300 truncate max-w-[190px]">
                        {card.modeLabel}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      {card.name}
                    </h3>
                    <ul className="space-y-1 text-xs text-slate-400 leading-relaxed">
                      {card.capabilities.map((cap) => (
                        <li key={cap} className="flex items-start gap-1.5">
                          <span className="text-cyan-400 mt-0.5">•</span>
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Vault Preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Recent Watchlist Queue
          </h2>
          <Link
            href="/watchlist"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Manage Full Vault →
          </Link>
        </div>

        {isLoading ? (
          <div className="text-slate-400 font-mono text-xs py-12 text-center">
            Syncing watchlist vault...
          </div>
        ) : watchlist.length === 0 ? (
          <div className="studio-panel p-10 rounded-3xl text-center space-y-3">
            <p className="text-slate-300 text-sm">
              No titles saved in your queue yet. Use Streaming Radar or the AI Oracle to build your watchlist.
            </p>
            <Link
              href="/where-to-watch"
              className="inline-block px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all"
            >
              Explore Streaming Radar
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {watchlist.slice(0, 10).map((movie) => {
              const posterUrl = formatPosterSrc(movie.poster_path);
              const displayTitle = movie.title || movie.name || "Untitled";
              const isTv = movie.media_type === "tv";

              return (
                <div
                  key={String(movie.id)}
                  className="bg-[#0b101d] rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-400/50 transition-all group flex flex-col justify-between"
                >
                  <button
                    type="button"
                    onClick={() =>
                      studioSession?.openMediaModal?.(
                        movie.id,
                        isTv ? "tv" : "movie"
                      )
                    }
                    className="text-left cursor-pointer"
                  >
                    {posterUrl ? (
                      <div className="relative w-full aspect-[2/3]">
                        <Image
                          src={posterUrl}
                          alt={displayTitle}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 50vw, 20vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[2/3] bg-slate-900 flex items-center justify-center text-slate-500 text-xs font-mono">
                        No Poster
                      </div>
                    )}
                  </button>

                  <div className="p-3 space-y-2 border-t border-white/10">
                    <h3 className="font-semibold text-xs truncate text-white group-hover:text-cyan-300">
                      {displayTitle}
                    </h3>
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          toggleWatched(movie.id, Boolean(movie.watched))
                        }
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer border ${
                          movie.watched
                            ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                            : "bg-white/5 border-white/10 text-slate-300 hover:border-cyan-400/50"
                        }`}
                      >
                        {movie.watched ? "✓ Watched" : "Mark Watched"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromWatchlist(movie.id)}
                        className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-[10px] cursor-pointer"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
