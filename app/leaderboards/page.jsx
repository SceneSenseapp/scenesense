// File: app/leaderboards/page.jsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { calculateRankAndSector } from '@/app/dashboard/data/objectives';

const LEADERBOARD_CATEGORIES = [
  { id: 'xp', label: 'Overall XP & Level', icon: '⚡', field: 'xp' },
  { id: 'reviews', label: 'Critique Dispatches', icon: '✍️', field: 'reviewCount' },
  { id: 'classics', label: 'Criterion Archivists', icon: '🏛️', field: 'classicCount' },
  { id: 'reputation', label: 'Community Trust', icon: '⭐', field: 'reputationScore' },
];

export default function LeaderboardPage() {
  const [user, setUser] = useState(null);
  const [activeBoard, setActiveBoard] = useState('xp');
  const [operatives, setOperatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Authentication & Route Protection
  useEffect(() => {
    if (!auth) return;
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubAuth();
  }, [router]);

  // Real-time Leaderboard Stream
  useEffect(() => {
    if (!db) return;

    setIsLoading(true);
    const q = query(collection(db, 'users'), limit(50));

    const unsub = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setOperatives(fetched);
      setIsLoading(false);
    }, (error) => {
      console.warn("Leaderboard stream warning:", error);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Sort and Rank Operatives by the Active Category
  const rankedOperatives = useMemo(() => {
    const list = [...operatives];
    const categoryObj = LEADERBOARD_CATEGORIES.find(c => c.id === activeBoard);
    const sortField = categoryObj ? categoryObj.field : 'xp';

    list.sort((a, b) => {
      const valA = Number(a[sortField]) || 0;
      const valB = Number(b[sortField]) || 0;
      if (valB !== valA) return valB - valA;
      // Secondary tiebreaker: XP
      return (Number(b.xp) || 0) - (Number(a.xp) || 0);
    });

    return list;
  }, [operatives, activeBoard]);

  // User's Personal Placement
  const userRankIndex = useMemo(() => {
    if (!user) return -1;
    return rankedOperatives.findIndex(op => op.id === user.uid);
  }, [rankedOperatives, user]);

  if (!user) return null;

  return (
    <main className="min-h-[calc(100vh-64px)] w-full bg-[#050508] text-slate-100 font-sans p-4 sm:p-8 flex flex-col items-center relative overflow-hidden">
      
      {/* Background Lighting Halos */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-5xl w-full relative z-10 space-y-6">
        
        {/* HEADER COMMAND HUD */}
        <header className="bg-[#080d1a]/80 backdrop-blur-xl border border-cyan-500/25 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-2xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center transition-all shadow-md group cursor-pointer"
              title="Return to Operative Dashboard"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform font-mono">←</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                  SECTOR COMPETITION // MATRIX
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono mt-1">
                Operative Global Standings
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Real-time competitive telemetry tracking studio XP, critique output, and archival preservers
              </p>
            </div>
          </div>

          {/* User's Standings Widget */}
          <div className="bg-[#050811] border border-cyan-500/25 px-4 py-2 rounded-2xl flex items-center gap-3 font-mono text-xs">
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">YOUR RANK</span>
              <span className="text-sm font-black text-cyan-300">
                {userRankIndex >= 0 ? `#${userRankIndex + 1}` : 'UNRANKED'}
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">TOTAL LOGGED</span>
              <span className="text-sm font-black text-amber-400">
                {operatives.length} OPERATIVES
              </span>
            </div>
          </div>
        </header>

        {/* CATEGORY SELECTOR SWITCHES */}
        <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-4 overflow-x-auto scrollbar-none font-mono text-xs">
          {LEADERBOARD_CATEGORIES.map((tab) => {
            const isActive = activeBoard === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveBoard(tab.id)}
                className={`relative px-4 py-2.5 rounded-2xl font-bold transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                    : 'bg-[#080d1a] text-slate-400 hover:text-white border border-cyan-500/15 hover:border-cyan-500/40'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* STANDINGS ROSTER */}
        <div className="bg-[#080d1a] border border-cyan-500/20 rounded-3xl p-4 sm:p-6 shadow-xl space-y-3 font-mono">
          
          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-widest text-slate-500 px-4 py-2 border-b border-white/5 font-bold">
            <span className="col-span-2 sm:col-span-1">Rank</span>
            <span className="col-span-6 sm:col-span-7">Operative Dossier</span>
            <span className="col-span-4 text-right">
              {activeBoard === 'xp' ? 'Rank & XP' :
               activeBoard === 'reviews' ? 'Dispatches Logged' :
               activeBoard === 'classics' ? 'Classics (<1980)' : 'Community Trust'}
            </span>
          </div>

          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-xs text-cyan-400 uppercase tracking-widest animate-pulse">
                Synchronizing Operative Telemetry...
              </span>
            </div>
          ) : rankedOperatives.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              No operative telemetry found in the database matrix.
            </div>
          ) : (
            <div className="space-y-2">
              {rankedOperatives.map((op, idx) => {
                const isMe = op.id === user.uid;
                const displayName = op.displayName || op.email?.split('@')[0] || `Operative ...${op.id.slice(-6)}`;
                const opRank = calculateRankAndSector(op.xp || 0);

                const isPodium = idx < 3;
                const podiumStyle = 
                  idx === 0 ? 'text-amber-300 font-black' :
                  idx === 1 ? 'text-slate-300 font-bold' :
                  idx === 2 ? 'text-amber-600 font-bold' : 'text-slate-400';

                return (
                  <div
                    key={op.id}
                    className={`grid grid-cols-12 gap-2 items-center p-3 sm:p-4 rounded-2xl border transition-all ${
                      isMe 
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
                        : 'bg-[#050811] border-cyan-500/15 hover:border-cyan-500/40'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`col-span-2 sm:col-span-1 flex items-center gap-1.5 text-xs sm:text-sm ${podiumStyle}`}>
                      {idx === 0 ? '👑 #1' : `#${idx + 1}`}
                    </div>

                    {/* Operative Info */}
                    <div className="col-span-6 sm:col-span-7 flex items-center gap-3 min-w-0">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-zinc-900 border border-cyan-500/30 shrink-0">
                        <Image
                          src={op.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=080d1a&color=06b6d4`}
                          alt={displayName}
                          fill
                          sizes="32px"
                          unoptimized
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-white truncate">
                            {displayName}
                          </p>
                          {isMe && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-cyan-500 text-black font-black rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate mt-0.5">
                          <span>{opRank.sector}</span>
                          {op.equippedTitle && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-400">[{op.equippedTitle}]</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metric Display */}
                    <div className="col-span-4 text-right">
                      {activeBoard === 'xp' ? (
                        <div className="space-y-0.5">
                          <span className="text-xs sm:text-sm font-black text-cyan-300 block">
                            LVL {opRank.level}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {Number(op.xp || 0).toLocaleString()} XP
                          </span>
                        </div>
                      ) : activeBoard === 'reviews' ? (
                        <div className="space-y-0.5">
                          <span className="text-xs sm:text-sm font-black text-amber-300 block">
                            {Number(op.reviewCount || 0)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Dispatches</span>
                        </div>
                      ) : activeBoard === 'classics' ? (
                        <div className="space-y-0.5">
                          <span className="text-xs sm:text-sm font-black text-indigo-300 block">
                            {Number(op.classicCount || 0)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Classics</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="text-xs sm:text-sm font-black text-emerald-300 block">
                            {Number(op.reputationScore || 0)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">Trust Score</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </main>
  );
}