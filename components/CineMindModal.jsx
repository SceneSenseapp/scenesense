/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useStudioSession } from '@/components/StudioSessionProvider';
import UniversalMediaPlayer from '@/components/UniversalMediaPlayer';

const STORAGE_KEY = 'scenesense_cinemind_persistent_v1';

const CATEGORIZED_PROMPT_PRESETS = [
  { label: '🌀 90s Plot Twist', prompt: 'Find me a sci-fi mind-bender from the 90s with a massive plot twist' },
  { label: '🍿 Date Night Pick', prompt: 'Charming romantic comedy or witty mystery with great dialogue and chemistry' },
  { label: '⚡ Cyberpunk & Neon', prompt: 'Rain-soaked cyberpunk neo-noir with incredible cinematography and practical effects' },
  { label: '🤣 Laugh-Out-Loud', prompt: 'Hilarious laugh-out-loud comedy or mockumentary that never drags' },
  { label: '👻 Psychological Horror', prompt: 'Atmospheric psychological horror or mystery with an unforgettable final reveal' },
  { label: '🚀 Cosmic Space Epic', prompt: 'Visually stunning space odyssey dealing with time dilation and cosmic mysteries' },
];

const HYPER_SPECIFIC_PROMPTS = CATEGORIZED_PROMPT_PRESETS.map((p) => p.prompt);

/**
 * Helper to trigger the persistent CineMind Conversational AI Modal from anywhere in the app.
 * @param {Object|null} context Optional movie, tv, or person context object
 */
export function openCineMind(context = null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('scenesense:open-cinemind', { detail: context })
  );
}

export default function CineMindModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeContext, setActiveContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTrailer, setActiveTrailer] = useState(null); // { title, videoKey }
  const [loadingTrailerId, setLoadingTrailerId] = useState(null);

  const { watchlist = [], saveToWatchlist, removeFromWatchlist } = useWatchlist();
  const studioSession = useStudioSession();
  const region = studioSession?.region || 'US';
  const scrollEndRef = useRef(null);
  const inputRef = useRef(null);

  // Hydrate persistent chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages);
        }
        if (parsed.activeContext) {
          setActiveContext(parsed.activeContext);
        }
      } else {
        setMessages([
          {
            id: 'welcome_init',
            role: 'assistant',
            text: 'CineMind Neural Archive online. Lock onto any film, series, or talent file with **Brief CineMind**, or enter a hyper-specific prompt below (e.g., *"Find me a sci-fi mind-bender from the 90s with a massive plot twist"*) to synthesize a verified TMDB dossier grid.',
            followUpPrompts: HYPER_SPECIFIC_PROMPTS.slice(0, 3),
            recommendations: [],
          },
        ]);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Persist messages & activeContext to localStorage
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          messages: messages.slice(-20),
          activeContext,
        })
      );
    } catch {
      // Ignore quota errors
    }
  }, [messages, activeContext]);

  const sendPromptToCineMind = useCallback(
    async (promptText, overrideContext = undefined) => {
      const cleanPrompt = String(promptText || '').trim();
      if (!cleanPrompt || isGenerating) return;

      const contextToUse =
        overrideContext !== undefined ? overrideContext : activeContext;

      const userMsg = {
        id: `user_${Date.now()}`,
        role: 'user',
        text: cleanPrompt,
        contextSnapshot: contextToUse
          ? `${contextToUse.title || contextToUse.name}${
              contextToUse.year ? ` (${contextToUse.year})` : ''
            }`
          : null,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputPrompt('');
      setIsGenerating(true);

      setTimeout(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);

      try {
        const res = await fetch('/api/cinemind', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: cleanPrompt,
            context: contextToUse,
            region,
            messages: messages.slice(-6).map((m) => ({
              role: m.role,
              text: m.text,
            })),
            watchlistTitles: (watchlist || [])
              .slice(0, 20)
              .map((w) => w.title || w.name)
              .filter(Boolean),
          }),
        });

        const data = await res.json();
        const aiMsg = {
          id: `ai_${Date.now()}`,
          role: 'assistant',
          text:
            data.reply ||
            'Telemetry synthesized. Inspect the verified TMDB grid below.',
          followUpPrompts: Array.isArray(data.followUpPrompts)
            ? data.followUpPrompts
            : HYPER_SPECIFIC_PROMPTS.slice(0, 3),
          recommendations: Array.isArray(data.recommendations)
            ? data.recommendations
            : [],
        };

        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            text: 'Neural relay encountered interference. Try transmitting your query again.',
            followUpPrompts: HYPER_SPECIFIC_PROMPTS.slice(0, 3),
            recommendations: [],
          },
        ]);
      } finally {
        setIsGenerating(false);
        setTimeout(() => {
          scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    },
    [activeContext, isGenerating, messages, region, watchlist]
  );

  // Listen for global 'scenesense:open-cinemind' events triggered by "Brief CineMind" buttons
  useEffect(() => {
    const handleOpenEvent = (event) => {
      const ctx = event.detail || null;
      setIsOpen(true);
      if (ctx && (ctx.title || ctx.name)) {
        setActiveContext(ctx);
        const targetLabel = `${ctx.title || ctx.name}${
          ctx.year ? ` (${ctx.year})` : ''
        }`;
        const autoPrompt =
          ctx.autoPrompt ||
          `Brief me on "${targetLabel}" — analyze its cinematic DNA, themes, and give me a TMDB grid of 6 films or series with a similar vibe and twist factor.`;
        sendPromptToCineMind(autoPrompt, ctx);
      } else {
        setTimeout(() => inputRef.current?.focus(), 120);
      }
    };

    window.addEventListener('scenesense:open-cinemind', handleOpenEvent);
    return () =>
      window.removeEventListener('scenesense:open-cinemind', handleOpenEvent);
  }, [sendPromptToCineMind]);

  // Fetch & play trailer inline via UniversalMediaPlayer (react-player)
  const handlePlayItemTrailer = async (item) => {
    setLoadingTrailerId(item.id);
    try {
      const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
      const res = await fetch(
        `/api/tmdb?endpoint=${mediaType}/${item.id}/videos`
      );
      const data = res.ok ? await res.json() : null;
      const results = Array.isArray(data?.results) ? data.results : [];
      const trailer =
        results.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
        results.find((v) => v.site === 'YouTube');

      if (trailer?.key) {
        setActiveTrailer({
          title: item.title || item.name,
          videoKey: trailer.key,
        });
      } else {
        // Fallback to high-concept trailer reel if TMDB has no video key on file
        setActiveTrailer({
          title: `${item.title || item.name} (Preview Stream)`,
          videoKey: 'Way9Dexny3w',
        });
      }
    } catch {
      setActiveTrailer({
        title: `${item.title || item.name} (Preview Stream)`,
        videoKey: 'Way9Dexny3w',
      });
    } finally {
      setLoadingTrailerId(null);
    }
  };

  const handleToggleWatchlist = (item) => {
    const exists = (watchlist || []).some(
      (w) => String(w.id) === String(item.id)
    );
    if (exists) {
      removeFromWatchlist(item.id);
    } else {
      saveToWatchlist({
        id: item.id,
        title: item.title || item.name,
        name: item.name || item.title,
        poster_path: item.poster_path,
        release_date: item.release_date || item.first_air_date,
        vote_average: item.vote_average,
        media_type: item.media_type || 'movie',
        overview: item.overview || item.hook || '',
      });
    }
  };

  const handleClearHistory = () => {
    const resetMsg = [
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        text: 'CineMind memory buffer cleared. Ready for your next hyper-specific cinema query.',
        followUpPrompts: HYPER_SPECIFIC_PROMPTS.slice(0, 3),
        recommendations: [],
      },
    ];
    setMessages(resetMsg);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <>
      {/* PERSISTENT FLOATING "BRIEF CINEMIND" LAUNCHER PILL */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-[180] px-4 py-2.5 rounded-2xl bg-[#0c1324]/95 hover:bg-[#131d36] backdrop-blur-xl text-white font-sans text-xs font-semibold tracking-wide shadow-2xl border border-cyan-400/35 hover:border-cyan-400/70 flex items-center gap-2.5 cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
          title="Open Persistent CineMind AI Concierge"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          <span>CineMind AI</span>
          {activeContext && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">
              Locked
            </span>
          )}
        </button>
      )}

      {/* PERSISTENT CONVERSATIONAL AI MODAL */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/85 backdrop-blur-xl p-2 sm:p-4 md:p-6 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-label="Brief CineMind Conversational AI"
        >
          <div className="bg-[#090d16] border border-white/15 rounded-3xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden relative text-white">
            
            {/* HEADER */}
            <header className="px-5 py-4 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-base shrink-0">
                  🧠
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                      CineMind Conversational Concierge
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 font-mono text-[10px] font-semibold">
                      Gemini 3.8 + Live TMDB ({region})
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    Context-aware film &amp; TV intelligence • Ask for eras, plot twists, or directorial styles
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono text-[11px] cursor-pointer transition-all"
                  title="Reset Conversation History"
                >
                  🗑️ Clear Memory
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-rose-600/80 border border-white/15 flex items-center justify-center text-white font-mono text-sm cursor-pointer transition-all"
                  title="Minimize CineMind (Conversation Persists)"
                >
                  ✕
                </button>
              </div>
            </header>

            {/* ACTIVE LOCKED CONTEXT BAR */}
            {activeContext && (
              <div className="px-5 py-2.5 bg-purple-950/40 border-b border-purple-500/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-bold uppercase shrink-0">
                    🎯 Context Locked
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {activeContext.title || activeContext.name}
                    {activeContext.year ? ` (${activeContext.year})` : ''}
                  </span>
                  {activeContext.genres && (
                    <span className="text-[11px] font-mono text-purple-300 truncate hidden sm:inline">
                      • {activeContext.genres}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      sendPromptToCineMind(
                        `Find 6 mind-bending titles that share the best themes and atmosphere of ${
                          activeContext.title || activeContext.name
                        }.`,
                        activeContext
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-mono text-[10px] font-bold cursor-pointer"
                  >
                    ⚡ Find Similar DNA
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveContext(null)}
                    className="text-[10px] font-mono text-slate-400 hover:text-rose-300 px-2 py-0.5 rounded bg-black/40 border border-white/10 cursor-pointer"
                  >
                    Unlock Context ✕
                  </button>
                </div>
              </div>
            )}

            {/* INLINE UNIVERSAL TRAILER PLAYER DRAWER (WHEN USER CLICKS PLAY TRAILER ON A CARD) */}
            {activeTrailer && (
              <div className="p-4 bg-black/95 border-b border-cyan-500/40 shrink-0">
                <div className="max-w-3xl mx-auto space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-300 font-bold flex items-center gap-2">
                      <span>📽️</span> Now Screening Trailer: <strong className="text-white">{activeTrailer.title}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTrailer(null)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-200 font-mono text-[10px] font-bold cursor-pointer"
                    >
                      Close Player ✕
                    </button>
                  </div>
                  <div className="w-full aspect-video max-h-[34vh] rounded-2xl overflow-hidden border border-cyan-500/30">
                    <UniversalMediaPlayer
                      videoKey={activeTrailer.videoKey}
                      title={activeTrailer.title}
                      playing={true}
                      controls={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CONVERSATION STREAM + FORMATTED TMDB GRIDS */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isUser ? 'items-end' : 'items-start'
                    } space-y-3`}
                  >
                    {/* Message Bubble */}
                    <div
                      className={`max-w-3xl rounded-2xl p-4 ${
                        isUser
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none shadow-lg'
                          : 'bg-[#0d1224] border border-cyan-500/30 text-slate-100 rounded-tl-none shadow-[0_0_25px_rgba(6,182,212,0.1)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-cyan-300">
                          {isUser ? '👤 Operative Prompt' : '🧠 CineMind AI'}
                        </span>
                        {msg.contextSnapshot && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 text-purple-200 border border-white/15">
                            🎯 {msg.contextSnapshot}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                        {msg.text}
                      </p>
                    </div>

                    {/* FORMATTED TMDB GRID */}
                    {!isUser &&
                      Array.isArray(msg.recommendations) &&
                      msg.recommendations.length > 0 && (
                        <div className="w-full space-y-2.5 pt-1">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                              🎬 Verified TMDB Telemetry Grid ({msg.recommendations.length} Matches)
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {msg.recommendations.map((item) => {
                              const isSaved = (watchlist || []).some(
                                (w) => String(w.id) === String(item.id)
                              );
                              const title = item.title || item.name;
                              const isContextual =
                                activeContext &&
                                String(activeContext.id) === String(item.id);

                              return (
                                <div
                                  key={`${msg.id}_${item.id}`}
                                  className="bg-[#0b0f1e] border border-cyan-500/25 hover:border-cyan-400/70 rounded-2xl overflow-hidden flex flex-col justify-between transition-all shadow-lg group"
                                >
                                  <div className="flex gap-3.5 p-3.5">
                                    {/* Poster */}
                                    <div className="relative w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                                      {item.poster_path ? (
                                        <Image
                                          src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                                          alt={title}
                                          fill
                                          unoptimized
                                          sizes="96px"
                                          className="object-cover group-hover:scale-105 transition-transform"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-500 text-center p-2">
                                          No Poster
                                        </div>
                                      )}
                                      {item.matchScore && (
                                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-500 text-black font-mono font-black text-[9px] shadow">
                                          {item.matchScore}%
                                        </span>
                                      )}
                                    </div>

                                    {/* Metadata & Hook */}
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold">
                                          {item.media_type === 'tv' ? 'TV' : 'MOVIE'}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">
                                          {item.year}
                                        </span>
                                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                                          ★ {item.vote_average || '7.8'}
                                        </span>
                                      </div>

                                      <h4 className="text-sm font-black text-white mt-1 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                                        {title}
                                      </h4>

                                      <p className="text-[11px] text-slate-300 leading-snug line-clamp-3 mt-1.5">
                                        {item.hook || item.overview}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Card Action Footer */}
                                  <div className="px-3.5 py-2.5 bg-[#070a14] border-t border-white/10 flex items-center justify-between gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleWatchlist(item)}
                                      className={`px-2.5 py-1.5 rounded-xl font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                                        isSaved
                                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                                          : 'bg-white/5 hover:bg-cyan-500/20 border-white/15 text-slate-200'
                                      }`}
                                    >
                                      {isSaved ? '✓ Watchlist' : '+ Watchlist'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handlePlayItemTrailer(item)}
                                      disabled={loadingTrailerId === item.id}
                                      className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      {loadingTrailerId === item.id
                                        ? '...'
                                        : '▶ Trailer'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActiveContext({
                                          type: item.media_type || 'movie',
                                          id: item.id,
                                          title,
                                          year: item.year,
                                          overview: item.overview || item.hook,
                                        })
                                      }
                                      className={`px-2 py-1.5 rounded-xl font-mono text-[10px] border cursor-pointer transition-all ${
                                        isContextual
                                          ? 'bg-purple-500 text-black font-black border-purple-300'
                                          : 'bg-purple-500/15 hover:bg-purple-500/30 border-purple-500/30 text-purple-200'
                                      }`}
                                      title="Lock this title as conversation context"
                                    >
                                      🎯 Lock
                                    </button>

                                    <Link
                                      href={`/movie/${item.id}?type=${
                                        item.media_type || 'movie'
                                      }`}
                                      onClick={() => setIsOpen(false)}
                                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 font-mono text-[10px] font-bold"
                                    >
                                      Dossier ↗
                                    </Link>

                                    <a
                                      href={`https://www.google.com/search?q=${encodeURIComponent(
                                        title + ' movie where to watch stream'
                                      )}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 font-mono text-[10px] font-bold"
                                      title="Search streaming availability"
                                    >
                                      🔍 Stream
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Follow-Up Prompt Chips */}
                    {!isUser &&
                      Array.isArray(msg.followUpPrompts) &&
                      msg.followUpPrompts.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {msg.followUpPrompts.map((chip, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => sendPromptToCineMind(chip)}
                              disabled={isGenerating}
                              className="px-3 py-1.5 rounded-xl bg-[#0e1326] hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-400 text-purple-200 text-[11px] font-mono transition-all cursor-pointer text-left"
                            >
                              ✨ {chip}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                );
              })}

              {isGenerating && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#0d1224] border border-cyan-500/30 max-w-md animate-pulse">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-xs font-mono text-cyan-300">
                    CineMind is synthesizing Gemini telemetry &amp; hydrating TMDB grid...
                  </span>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>

            {/* FOOTER INPUT BAR */}
            <footer className="p-4 bg-[#090d1b] border-t border-purple-500/30 space-y-2.5 shrink-0">
              {/* Quick Hyper-Specific Categorized Prompt Examples */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold shrink-0">
                  ⚡ Try Vibe:
                </span>
                {CATEGORIZED_PROMPT_PRESETS.map((sample, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendPromptToCineMind(sample.prompt)}
                    disabled={isGenerating}
                    className="px-2.5 py-1 rounded-xl bg-[#070b16] hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-400 text-[11px] font-mono text-purple-200 hover:text-white shrink-0 cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                  >
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendPromptToCineMind(inputPrompt);
                }}
                className="flex items-center gap-2.5"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder={
                    activeContext
                      ? `Ask CineMind about ${
                          activeContext.title || activeContext.name
                        } or request a custom TMDB grid...`
                      : 'e.g., "Find me a sci-fi mind-bender from the 90s with a massive plot twist"...'
                  }
                  disabled={isGenerating}
                  className="flex-1 bg-[#050811] border border-purple-500/40 focus:border-cyan-400 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isGenerating}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-40 text-white font-mono font-black text-xs uppercase tracking-wider cursor-pointer transition-all shrink-0 shadow-lg"
                >
                  {isGenerating ? 'Scanning...' : 'Transmit →'}
                </button>
              </form>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
