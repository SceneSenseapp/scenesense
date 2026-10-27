// File: app/movie/[id]/page.jsx
"use client";

import { useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MovieModal from '@/components/MovieModal';

export default function MovieDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Safely resolve params ID for Next.js dynamic routing
  const rawId = params?.id;
  const id = useMemo(() => {
    if (Array.isArray(rawId)) return rawId[0];
    return rawId ? String(rawId) : null;
  }, [rawId]);

  const mediaType = searchParams?.get('type') || 'movie';

  const handleClose = () => {
    // If user arrived from inside the app, return back; otherwise go to where-to-watch
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
    } else {
      router.push('/where-to-watch');
    }
  };

  if (!id) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-[#050508] text-slate-100 flex flex-col items-center justify-center p-6 font-mono text-xs">
        <span className="text-3xl mb-3">📡</span>
        <p className="text-slate-400 uppercase tracking-widest">No target coordinates detected.</p>
        <Link
          href="/where-to-watch"
          className="mt-4 px-4 py-2 bg-[#080d1a] hover:bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 rounded-xl transition-all"
        >
          Return to Radar Scanner
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 py-6 px-4 flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Background Ambient Lighting Halos */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Floating Return Action */}
      <div className="w-full max-w-5xl mb-3 flex items-center justify-between z-20 font-mono text-xs">
        <button
          type="button"
          onClick={handleClose}
          className="px-3.5 py-1.5 bg-[#080d1a]/80 hover:bg-[#0c1426] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md"
        >
          <span>←</span>
          <span>Exit Dossier</span>
        </button>

        <span className="text-[10px] uppercase tracking-widest text-slate-500 bg-[#080d1a] px-3 py-1 rounded-xl border border-white/5">
          TARGET ID: {id} • {mediaType.toUpperCase()}
        </span>
      </div>

      {/* Primary Target Dossier Modal */}
      <div className="w-full flex items-center justify-center relative z-10">
        <MovieModal
          movieId={id}
          mediaType={mediaType}
          onClose={handleClose}
        />
      </div>

    </main>
  );
}