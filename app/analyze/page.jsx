// File: app/analyze/page.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Loading from "@/components/Loading";

const PRESET_SCENES = [
  {
    label: "Rain-Slicked Noir Confrontation",
    prompt: "An atmospheric night confrontation under flickering streetlights in a neon-drenched alleyway. Two detectives debate whether to burn an evidence briefcase before sunrise as sirens approach."
  },
  {
    label: "Claustrophobic Sci-Fi Airlock",
    prompt: "A tense decompression sequence aboard an orbital research station. Oxygen levels sit at 4%, the manual door release is jammed from the outside, and communications with ground control have dropped."
  },
  {
    label: "Auteur Arthouse Kitchen Silence",
    prompt: "A quiet, devastating three-minute single-take kitchen sequence where an estranged couple prepares morning coffee in near silence, communicating grievances through subtle physical gestures and silverware clicks."
  }
];

export default function Analyze() {
  const [scene, setScene] = useState("");
  const [analysisType, setAnalysisType] = useState("full"); // 'full' | 'subtext' | 'cinematography' | 'pacing'
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  async function analyzeScene() {
    if (!scene.trim()) return;

    setLoading(true);
    setErrorMessage("");
    setResult("");

    try {
      const augmentedPrompt = 
        analysisType === "subtext" 
          ? `[FOCUS: PSYCHOLOGICAL SUBTEXT & CHARACTER MOTIVATION]\n${scene.trim()}`
          : analysisType === "cinematography"
            ? `[FOCUS: LIGHTING, CAMERA ANGLES, LENS CHOICE & COLOR PALETTE]\n${scene.trim()}`
            : analysisType === "pacing"
              ? `[FOCUS: DRAMATIC TENSION, PACING & SCENE EDITING RHYTHM]\n${scene.trim()}`
              : `[FOCUS: COMPREHENSIVE CINEMATIC BREAKDOWN]\n${scene.trim()}`;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: augmentedPrompt })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Neural telemetry link interrupted.");
      }

      setResult(data.reply || "No breakdown returned from analysis engine.");
    } catch (err) {
      console.error("Analysis failure:", err);
      setErrorMessage(err.message || "Failed to analyze script sector. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setScene("");
    setResult("");
    setErrorMessage("");
  };

  return (
    <main className="min-h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans p-4 sm:p-8 flex flex-col items-center relative overflow-hidden">
      
      {/* Background Ambient Lighting */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-4xl w-full relative z-10 space-y-6">
        
        {/* TOP HEADER HUD */}
        <div className="bg-[#080d1a]/80 backdrop-blur-xl border border-cyan-500/25 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 rounded-2xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center transition-all shadow-md group cursor-pointer"
              title="Return to Studio Uplink"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                  NEURAL SCRIPT DOCTOR // 01
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono mt-1">
                Cinematic Scene Analyzer
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Deconstruct screenplay sequences into dramatic tension, pacing curves, and visual subtext
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
            <span className="text-slate-500 text-[10px] uppercase">STATUS:</span>
            <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
              ENGINE READY
            </span>
          </div>
        </div>

        {/* INPUT DECK */}
        <div className="bg-[#080d1a] border border-cyan-500/25 rounded-3xl p-6 shadow-xl space-y-5">
          
          {/* Analysis Lens Toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-500/15">
            <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              ANALYSIS LENS:
            </label>
            <div className="flex flex-wrap gap-1.5 font-mono text-xs">
              {[
                { id: "full", label: "Full Breakdown" },
                { id: "subtext", label: "Psychological Subtext" },
                { id: "cinematography", label: "Camera & Lighting" },
                { id: "pacing", label: "Pacing & Stakes" }
              ].map((lens) => (
                <button
                  key={lens.id}
                  type="button"
                  onClick={() => setAnalysisType(lens.id)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    analysisType === lens.id
                      ? "bg-cyan-600 text-white font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      : "bg-[#050811] text-slate-400 hover:text-white border border-cyan-500/20"
                  }`}
                >
                  {lens.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Preset Scene Prompts */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold block">
              QUICK-LOAD ARCHETYPE PROMPTS:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_SCENES.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setScene(preset.prompt)}
                  className="px-3 py-1 bg-[#050811] hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-400 text-slate-300 hover:text-cyan-200 text-[11px] font-mono rounded-xl transition-colors cursor-pointer"
                >
                  ⚡ {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Screenplay Input Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 uppercase tracking-wider">SCREENPLAY / SCENE DRAFT</span>
              <span className="text-slate-500">{scene.length} characters</span>
            </div>

            <textarea
              className="w-full p-4 rounded-2xl bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 text-slate-100 text-xs sm:text-sm font-mono leading-relaxed outline-none resize-none shadow-inner transition-colors placeholder:text-slate-600"
              rows={7}
              placeholder="Paste or write your screenplay beat, script excerpt, or visual sequence description here..."
              value={scene}
              onChange={(e) => setScene(e.target.value)}
            />
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!scene && !result}
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/25 text-slate-400 hover:text-white text-xs font-mono font-bold transition-all disabled:opacity-30 cursor-pointer"
            >
              Clear Workspace
            </button>

            <button
              type="button"
              onClick={analyzeScene}
              disabled={loading || !scene.trim()}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Subtext...</span>
                </>
              ) : (
                <>
                  <span>✦</span>
                  <span>Analyze Scene</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="p-8 rounded-3xl bg-[#080d1a] border border-cyan-500/20 flex flex-col items-center justify-center space-y-3">
            <Loading />
            <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest animate-pulse">
              Running neural script doctor analysis...
            </p>
          </div>
        )}

        {/* ERROR DISPLAY */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center justify-between animate-fade-in shadow-lg">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              className="text-slate-400 hover:text-white ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* RESULTS DECK */}
        {result && (
          <div className="bg-[#080d1a] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-mono text-sm">✦</span>
                <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-white">
                  Scene Diagnostic &amp; Script Notes
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-1.5 bg-[#050811] hover:bg-cyan-950/50 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-[11px] font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{copied ? "✓" : "📋"}</span>
                <span>{copied ? "Copied" : "Copy Notes"}</span>
              </button>
            </div>

            <div className="p-5 bg-[#050811] border border-cyan-500/20 rounded-2xl text-slate-200 text-xs sm:text-sm font-mono leading-relaxed whitespace-pre-wrap shadow-inner">
              {result}
            </div>
          </div>
        )}

      </div>

    </main>
  );
}