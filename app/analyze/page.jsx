// File: app/analyze/page.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import MovieModal from "@/components/MovieModal";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useStudioSession } from "@/components/StudioSessionProvider";
import { trackQuestEvent } from "@/lib/quest-tracker";

const SAMPLE_SCENES = [
  {
    label: "Neon Baseline Interrogation",
    prompt:
      "A lone detective in a rain-soaked dystopian city sits inside a stark brutalist cell, reciting rapid-fire baseline psychological questions ('Cells. Within cells interlinked.') while neon cyan and magenta holograms flicker outside in the smog.",
  },
  {
    label: "Zero-Gravity Rotating Corridor",
    prompt:
      "A man in a sharp tailored suit fights security guards inside a warm-lit hotel hallway as the entire corridor physically rotates 360 degrees, shifting gravity from the floor to the walls and ceiling while time slows down.",
  },
  {
    label: "West Texas Gas Station Coin Toss",
    prompt:
      "Dead silence in a sun-bleached roadside gas station. A terrifying hitman with a bowl cut places a quarter on the counter and calmly tells the nervous elderly proprietor: 'Call it. You need to call it. I can't call it for you.'",
  },
  {
    label: "Red Corridor Hammer Brawl",
    prompt:
      "A single unbroken side-scrolling tracking shot in a dingy green-and-amber corridor where an imprisoned man armed only with a claw hammer fights through two dozen thugs in visceral, exhausting close-quarters combat.",
  },
  {
    label: "Frozen Beach Memory Erasure",
    prompt:
      "Two lovers reunite on a snowy winter beach in Montauk as the house around them literally crumbles and vanishes at the edges of the frame while their shared memories are being erased inside his subconscious.",
  },
];

const HISTORY_STORAGE_KEY = "scenesense_scene_analyzer_history_v2";

function createHistoryEntry(promptText, resultObj, hadFrame = false) {
  const topTitle =
    resultObj?.identifiedMedia?.[0]?.title ||
    (hadFrame ? "Frame Vision Scan" : "Scene Scan");
  const now = new Date();
  const timestamp = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    prompt: promptText || "Uploaded Still Frame Analysis",
    topMatch: topTitle,
    timestamp,
    data: resultObj,
  };
}

function compressImageFileToDataUrl(file, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Unsupported image format."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.84),
          width,
          height,
          name: file.name,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function AnalyzePage() {
  const [scene, setScene] = useState("");
  const [mode, setMode] = useState("deep"); // 'deep' | 'director' | 'identify'
  const [framePreview, setFramePreview] = useState(null); // { dataUrl, width, height, name }
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentHistory, setRecentHistory] = useState([]);
  const [copiedHex, setCopiedHex] = useState(null);
  const [selectedMediaModal, setSelectedMediaModal] = useState(null);

  const fileInputRef = useRef(null);
  const studioSession = useStudioSession();
  const user = studioSession?.user || null;
  const { isSaved, toggleWatchlist } = useWatchlist();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (saved) {
          setRecentHistory(JSON.parse(saved).slice(0, 6));
        }
      } catch {
        // Ignore storage error
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const saveToHistory = (promptText, resultObj, hadFrame) => {
    try {
      const entry = createHistoryEntry(promptText, resultObj, hadFrame);
      const updated = [
        entry,
        ...recentHistory.filter((h) => h.prompt !== entry.prompt),
      ].slice(0, 6);
      setRecentHistory(updated);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage quota
    }
  };

  const handleImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a JPEG, PNG, or WebP image frame.");
      return;
    }
    try {
      setError("");
      const compressed = await compressImageFileToDataUrl(file, 1024);
      setFramePreview(compressed);
    } catch (err) {
      setError(err.message || "Failed to process still frame.");
    }
  };

  async function analyzeScene(overridePrompt) {
    const targetScene = (
      typeof overridePrompt === "string" ? overridePrompt : scene
    ).trim();

    if (!targetScene && !framePreview?.dataUrl) {
      setError(
        "Enter a scene description or attach a movie/series still frame to analyze."
      );
      return;
    }

    if (typeof overridePrompt === "string") {
      setScene(overridePrompt);
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scene: targetScene,
          mode,
          imageDataUrl: framePreview?.dataUrl || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to analyze the scene. Please try again."
        );
      }

      setAnalysis(data);
      saveToHistory(targetScene, data, Boolean(framePreview?.dataUrl));
      trackQuestEvent(user?.uid, "oracle_consult_3", 1);
    } catch (err) {
      console.error("Scene analysis error:", err);
      setError(
        err.message || "An unexpected error occurred during scene analysis."
      );
    } finally {
      setLoading(false);
    }
  }

  const handleCopyHex = (hex, name) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      toast.success(`Copied ${name} (${hex})`, {
        icon: "🎨",
        style: {
          background: "#0b101d",
          color: "#fff",
          border: "1px solid rgba(34,211,238,0.35)",
        },
      });
      setTimeout(() => setCopiedHex(null), 1800);
    }
  };

  return (
    <PageShell maxWidth="max-w-6xl">
      <PageHeader
        eyebrow="Gemini 3.8 Multimodal Vision & Script Lab"
        title="Scene &"
        accent="Frame Analyzer"
        subtitle="Upload any movie still frame or describe a remembered scene, camera movement, color grade, or quote. CineMind identifies matching titles and dissects the cinematography, LUT swatches, and soundscape."
        actions={
          <div className="flex items-center gap-2">
            <label
              htmlFor="analyze-mode-select"
              className="text-xs font-mono text-slate-400 uppercase"
            >
              Mode
            </label>
            <select
              id="analyze-mode-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="bg-[#0b101d] border border-white/15 text-xs font-semibold text-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="deep">Full Cinematography Breakdown</option>
              <option value="identify">Rapid Title Identification</option>
              <option value="director">DP, Lens &amp; Lighting Focus</option>
            </select>
          </div>
        }
      />

      {/* Input Workbench */}
      <section className="studio-panel rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <label
              htmlFor="analyze-sample-select"
              className="text-xs font-mono uppercase text-cyan-400 font-semibold"
            >
              Sample Scenes:
            </label>
            <select
              id="analyze-sample-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  analyzeScene(e.target.value);
                  e.target.value = "";
                }
              }}
              className="bg-[#070b14] border border-white/15 text-xs font-medium text-slate-200 rounded-xl px-3 py-2 outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="" disabled>
                Load a sample scene prompt...
              </option>
              {SAMPLE_SCENES.map((sample) => (
                <option key={sample.label} value={sample.prompt}>
                  {sample.label}
                </option>
              ))}
            </select>
          </div>

          {(scene || framePreview) && (
            <button
              type="button"
              onClick={() => {
                setScene("");
                setFramePreview(null);
                setError("");
              }}
              className="text-xs font-medium text-slate-400 hover:text-rose-400 cursor-pointer"
            >
              Clear Workbench ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Text Description */}
          <div className="lg:col-span-8 flex flex-col">
            <textarea
              className="w-full flex-1 min-h-[150px] p-4 rounded-2xl bg-[#070b14] border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all resize-y text-sm leading-relaxed"
              rows={5}
              placeholder="Describe a scene you remember (dialogue, camera movement, lighting, or plot moment) — or pair optional notes with an uploaded frame..."
              value={scene}
              onChange={(e) => {
                setScene(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  analyzeScene();
                }
              }}
            />
          </div>

          {/* Multimodal Frame Dropzone */}
          <div className="lg:col-span-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
                e.target.value = "";
              }}
              className="hidden"
            />

            {framePreview ? (
              <div className="h-full min-h-[150px] rounded-2xl bg-[#070b14] border border-cyan-400/40 p-3 flex flex-col justify-between gap-2">
                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black">
                  <Image
                    src={framePreview.dataUrl}
                    alt="Uploaded frame preview"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="text-cyan-300 truncate">
                    {framePreview.width}×{framePreview.height}px Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => setFramePreview(null)}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleImageFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`h-full min-h-[150px] rounded-2xl border border-dashed p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all ${
                  isDragging
                    ? "bg-cyan-500/10 border-cyan-400 text-cyan-200"
                    : "bg-[#070b14] border-white/15 hover:border-cyan-400/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-2xl">🖼️</span>
                <p className="text-xs font-semibold text-slate-200">
                  Attach Still Frame (Optional)
                </p>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Drop a screenshot/poster or click to upload for Gemini 3.8 Vision ID &amp; LUT extraction
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>{scene.length} / 4000 chars</span>
            {framePreview && (
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                + Vision Frame Attached
              </span>
            )}
            <span className="hidden sm:inline text-slate-500">
              Ctrl + Enter to run
            </span>
          </div>

          <button
            type="button"
            onClick={() => analyzeScene()}
            disabled={loading || (!scene.trim() && !framePreview)}
            className="px-7 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer"
          >
            {loading
              ? "Analyzing Telemetry..."
              : framePreview
              ? "Run Multimodal Frame & Scene Scan"
              : "Analyze Scene & Identify"}
          </button>
        </div>

        {recentHistory.length > 0 && (
          <div className="pt-3 border-t border-white/10 flex items-center gap-2.5 flex-wrap">
            <label
              htmlFor="analyze-history-select"
              className="text-xs font-mono uppercase text-slate-400"
            >
              Recent Scans:
            </label>
            <select
              id="analyze-history-select"
              defaultValue=""
              onChange={(e) => {
                const selected = recentHistory.find(
                  (h) => h.id === e.target.value
                );
                if (selected) {
                  setScene(selected.prompt);
                  setAnalysis(selected.data);
                }
                e.target.value = "";
              }}
              className="bg-[#070b14] border border-white/15 text-xs text-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="" disabled>
                Restore from {recentHistory.length} previous scan
                {recentHistory.length === 1 ? "" : "s"}...
              </option>
              {recentHistory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.topMatch} ({item.timestamp})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="studio-panel py-14 flex flex-col items-center justify-center space-y-4 rounded-3xl">
          <Loading />
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-300 animate-pulse">
            Cross-referencing scene geometry, color LUTs &amp; TMDB archives...
          </p>
        </div>
      )}

      {/* Structured Analysis Output */}
      {analysis && !loading && (
        <div className="space-y-8 animate-fadeIn">
          {/* 1. Executive Briefing */}
          <section className="studio-panel-accent rounded-3xl p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-300">
                  Executive Scene Dossier
                  {analysis.visionAnalyzed ? " • Multimodal Vision" : ""}
                </h2>
              </div>

              {Array.isArray(analysis.cinematicThemes) &&
                analysis.cinematicThemes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.cinematicThemes.map((theme) => (
                      <span
                        key={theme}
                        className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300"
                      >
                        #{theme}
                      </span>
                    ))}
                  </div>
                )}
            </div>

            <p className="text-base sm:text-lg text-slate-100 leading-relaxed">
              {analysis.aiSummary || analysis.reply}
            </p>

            {analysis.directorsOrStyle && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-semibold block">
                  Directorial &amp; Cinematography Signature
                </span>
                <p className="text-xs sm:text-sm text-slate-200 mt-1 leading-relaxed">
                  {analysis.directorsOrStyle}
                </p>
              </div>
            )}
          </section>

          {/* 2. Identified Matches */}
          {Array.isArray(analysis.identifiedMedia) &&
            analysis.identifiedMedia.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">
                    Identified Media Matches
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    Verified TMDB Metadata
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {analysis.identifiedMedia.map((item, idx) => {
                    const mediaId = item.id || item.tmdbId;
                    const saved = mediaId ? isSaved(mediaId) : false;
                    const score =
                      item.matchScore ||
                      (item.confidence === "High"
                        ? 95
                        : item.confidence === "Medium"
                        ? 84
                        : 72);
                    const isTv =
                      item.mediaType === "tv" || item.media_type === "tv";

                    return (
                      <div
                        key={`${item.title}-${idx}`}
                        className={`group rounded-3xl overflow-hidden border transition-all flex flex-col justify-between bg-[#0b101d] ${
                          idx === 0
                            ? "border-cyan-400/60 shadow-xl"
                            : "border-white/10 hover:border-cyan-400/40"
                        }`}
                      >
                        <div>
                          <div className="relative h-52 w-full bg-slate-900 overflow-hidden">
                            {item.backdrop_path || item.poster_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w780${
                                  item.backdrop_path || item.poster_path
                                }`}
                                alt={item.title}
                                fill
                                unoptimized
                                className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                              />
                            ) : (
                              <div className="inset-0 absolute flex items-center justify-center text-xs font-mono text-slate-500">
                                Archive Match #{idx + 1}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0b101d] via-[#0b101d]/40 to-transparent" />

                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase backdrop-blur-md border ${
                                  idx === 0
                                    ? "bg-cyan-500 text-slate-950 border-cyan-300"
                                    : "bg-black/75 text-cyan-300 border-white/15"
                                }`}
                              >
                                {idx === 0
                                  ? "Primary Match"
                                  : `Match #${idx + 1}`}{" "}
                                • {score}%
                              </span>

                              <span className="px-2 py-0.5 rounded-md bg-black/75 border border-white/15 text-[10px] font-mono uppercase text-slate-200">
                                {isTv ? "Series" : "Film"} • {item.year || "N/A"}
                              </span>
                            </div>

                            <div className="absolute bottom-3 left-4 right-4">
                              <h3 className="text-lg font-bold text-white leading-tight">
                                {item.title}
                              </h3>
                              {item.timestampHint && (
                                <span className="text-[11px] font-mono text-cyan-300 block mt-0.5">
                                  {item.timestampHint}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-5 space-y-3">
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {item.sceneSummary || item.overview}
                            </p>

                            {Array.isArray(item.keyActors) &&
                              item.keyActors.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {item.keyActors.map((actor) => (
                                    <span
                                      key={actor}
                                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300"
                                    >
                                      {actor}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>

                        <div className="p-4 pt-0 flex items-center gap-2">
                          {mediaId && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleWatchlist({
                                    id: mediaId,
                                    title: item.title,
                                    poster_path: item.poster_path,
                                    release_date:
                                      item.release_date || `${item.year}-01-01`,
                                    vote_average: item.vote_average || 8.0,
                                    media_type: isTv ? "tv" : "movie",
                                  })
                                }
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                                  saved
                                    ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-200"
                                }`}
                              >
                                {saved ? "✓ Saved" : "+ Watchlist"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedMediaModal({
                                    id: mediaId,
                                    mediaType: isTv ? "tv" : "movie",
                                  })
                                }
                                className="py-2 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-xs font-semibold text-cyan-200 transition-all cursor-pointer"
                              >
                                Inspect
                              </button>

                              <Link
                                href={`/movie/${mediaId}?type=${
                                  isTv ? "tv" : "movie"
                                }`}
                                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 transition-all"
                                title="Open Standalone Dossier"
                              >
                                ↗
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

          {/* 3. Color Grade LUT Palette */}
          {Array.isArray(analysis.colorPalette) &&
            analysis.colorPalette.length > 0 && (
              <section className="studio-panel rounded-3xl p-6 sm:p-8 space-y-5">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Extracted Scene Color Grade &amp; LUT Swatches
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Click any swatch to copy its HEX code for grading or moodboards
                  </p>
                </div>

                <div className="h-4 w-full rounded-full overflow-hidden flex border border-white/15">
                  {analysis.colorPalette.map((swatch, idx) => (
                    <div
                      key={`${swatch.hex}-${idx}`}
                      style={{ backgroundColor: swatch.hex }}
                      className="flex-1 h-full transition-all duration-300 hover:flex-[1.5]"
                      title={`${swatch.name} (${swatch.hex})`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {analysis.colorPalette.map((swatch, idx) => (
                    <button
                      key={`${swatch.name}-${idx}`}
                      type="button"
                      onClick={() => handleCopyHex(swatch.hex, swatch.name)}
                      className="group p-3 rounded-2xl bg-[#070b14] border border-white/10 hover:border-cyan-400/50 text-left transition-all cursor-pointer flex flex-col justify-between gap-3"
                    >
                      <div
                        className="w-full h-14 rounded-xl border border-white/15 flex items-end justify-end p-1.5"
                        style={{ backgroundColor: swatch.hex }}
                      >
                        <span className="px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-mono text-white">
                          {copiedHex === swatch.hex ? "COPIED" : swatch.hex}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                          {swatch.name}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {swatch.role}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

          {/* 4. Four-Pillar Breakdown */}
          {analysis.visualBreakdown && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  key: "cinematography",
                  title: "Camera, Lenses & Blocking",
                  value: analysis.visualBreakdown.cinematography,
                },
                {
                  key: "lightingAndMood",
                  title: "Lighting Ratio & Atmosphere",
                  value: analysis.visualBreakdown.lightingAndMood,
                },
                {
                  key: "pacing",
                  title: "Editing Rhythm & Pacing",
                  value: analysis.visualBreakdown.pacing,
                },
                {
                  key: "audioDesign",
                  title: "Score & Diegetic Soundscape",
                  value: analysis.visualBreakdown.audioDesign,
                },
              ].map((pillar) => (
                <div
                  key={pillar.key}
                  className="studio-panel p-6 rounded-3xl space-y-2"
                >
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                    {pillar.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {pillar.value || "Telemetry nominal."}
                  </p>
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {selectedMediaModal && (
        <MovieModal
          movieId={selectedMediaModal.id}
          mediaType={selectedMediaModal.mediaType}
          onClose={() => setSelectedMediaModal(null)}
        />
      )}
    </PageShell>
  );
}
