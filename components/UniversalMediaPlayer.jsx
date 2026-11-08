"use client";

import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import ReactPlayer from "react-player";

/**
 * Normalizes any video source (TMDB YouTube key, YouTube embed/watch/short URL,
 * Vimeo, Twitch, HLS .m3u8, DASH .mpd, or direct MP4/WebM URL) into a canonical URL
 * compatible with react-player.
 */
export function normalizeMediaUrl(rawInput, videoKey = null) {
  if (videoKey && typeof videoKey === "string" && videoKey.trim()) {
    const cleanKey = videoKey.trim();
    if (cleanKey.startsWith("http://") || cleanKey.startsWith("https://")) {
      return normalizeMediaUrl(cleanKey, null);
    }
    return `https://www.youtube.com/watch?v=${cleanKey}`;
  }

  if (!rawInput || typeof rawInput !== "string") return "";
  const trimmed = rawInput.trim();
  if (!trimmed) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/watch?v=${trimmed}`;
  }

  const embedMatch = trimmed.match(
    /(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (embedMatch && embedMatch[1]) {
    return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
  }

  return trimmed;
}

const UniversalMediaPlayer = forwardRef(function UniversalMediaPlayer(
  {
    url,
    src,
    videoKey,
    title = "SceneSense Media Stream",
    poster,
    light = false,
    playing = false,
    controls = true,
    muted = false,
    loop = false,
    playsInline = true,
    width = "100%",
    height = "100%",
    className = "",
    style = {},
    onPlay,
    onPause,
    onSeeked,
    onEnded,
    onReady,
    onTimeUpdate,
    config,
    ...rest
  },
  ref
) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const playerRef = useRef(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      get currentTime() {
        const el = playerRef.current;
        if (!el) return 0;
        if (typeof el.currentTime === "number") return el.currentTime;
        if (typeof el.getCurrentTime === "function") return el.getCurrentTime() || 0;
        return 0;
      },
      set currentTime(val) {
        const el = playerRef.current;
        if (!el || typeof val !== "number") return;
        try {
          if ("currentTime" in el) {
            el.currentTime = val;
          } else if (typeof el.seekTo === "function") {
            el.seekTo(val, "seconds");
          }
        } catch {
          // Ignore seek errors before media ready
        }
      },
      get paused() {
        const el = playerRef.current;
        if (!el) return !playing;
        if (typeof el.paused === "boolean") return el.paused;
        return !playing;
      },
      play() {
        const el = playerRef.current;
        if (el && typeof el.play === "function") {
          try {
            const res = el.play();
            return res instanceof Promise ? res : Promise.resolve();
          } catch (err) {
            return Promise.reject(err);
          }
        }
        return Promise.resolve();
      },
      pause() {
        const el = playerRef.current;
        if (el && typeof el.pause === "function") {
          try {
            el.pause();
          } catch {
            // Ignore pause error
          }
        }
      },
    }),
    [playing]
  );

  const resolvedSrc = normalizeMediaUrl(src || url, videoKey);

  if (!isMounted || !resolvedSrc) {
    return (
      <div
        className={`w-full h-full bg-black flex flex-col items-center justify-center text-slate-400 font-mono text-xs ${className}`}
        style={{ width, height, ...style }}
      >
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2" />
        <span>Initializing Universal Stream Player...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={`w-full h-full bg-[#060913] border border-cyan-500/20 flex flex-col items-center justify-center p-6 text-center gap-3 ${className}`}
        style={{ width, height, ...style }}
      >
        <span className="text-2xl">📡</span>
        <p className="text-xs font-mono text-slate-300">
          External stream could not be embedded directly.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHasError(false)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold cursor-pointer"
          >
            Retry Stream
          </button>
          <a
            href={resolvedSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold"
          >
            Open Direct Link ↗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full bg-black overflow-hidden ${className}`}
      style={{ width, height, ...style }}
      title={title}
    >
      <ReactPlayer
        ref={playerRef}
        src={resolvedSrc}
        poster={poster}
        light={light}
        playing={playing}
        controls={controls}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        width="100%"
        height="100%"
        onPlay={onPlay}
        onPause={onPause}
        onSeeked={onSeeked}
        onEnded={onEnded}
        onReady={onReady}
        onTimeUpdate={onTimeUpdate}
        onError={() => setHasError(true)}
        config={{
          youtube: {
            rel: 0,
            modestbranding: 1,
          },
          ...config,
        }}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        {...rest}
      />
    </div>
  );
});

export default UniversalMediaPlayer;
