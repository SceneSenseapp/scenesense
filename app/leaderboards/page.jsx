// app/leaderboard/page.jsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function LeaderboardPage() {
  const [user, setUser] = useState(null);
  const [operatives, setOperatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchLeaderboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), limit(20));
      const querySnapshot = await getDocs(q);
      const fetchedOperatives = [];
      querySnapshot.forEach((docSnap) => {
        fetchedOperatives.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setOperatives(fetchedOperatives);
    } catch (error) {
      console.error("Failed to retrieve operative telemetry:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchLeaderboardData();
      } else {
        router.push('/where');
      }
    });
    return () => unsubscribe();
  }, [router, fetchLeaderboardData]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 min-h-[85vh] flex flex-col bg-[#0a0a0a] border border-red-950/60 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.12)] relative overflow-hidden text-white">
      
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-950 via-red-600 to-red-950 animate-pulse"></div>

      <div className="border-b border-[#2a2a2a] pb-4 mb-6 flex items-center justify-between z-10">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
            <span className="text-red-600 animate-pulse">🏆</span> Operative Faction Leaderboard
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest mt-1">Global Cinema Oracle Faction Rankings</p>
        </div>
        <button
          onClick={() => router.push('/mood')}
          className="px-4 py-2 bg-red-900/40 hover:bg-red-600 border border-red-800 text-xs font-bold rounded-xl text-red-200 transition-all cursor-pointer shadow-md"
        >
          🔮 Consult Oracle
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-28 space-y-4 flex-1">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Synchronizing Global Operative Data...</span>
        </div>
      ) : operatives.length > 0 ? (
        <div className="space-y-4 z-10 flex-1 overflow-y-auto pr-2 scrollbar-thin">
          <div className="grid grid-cols-12 gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-500 px-4 pb-2 border-b border-white/10">
            <span className="col-span-2">Rank</span>
            <span className="col-span-6">Operative UID / Handle</span>
            <span className="col-span-4 text-right">Assigned Faction</span>
          </div>

          {operatives.map((op, idx) => (
            <div 
              key={op.id}
              className={`grid grid-cols-12 gap-2 items-center p-4 rounded-xl border transition-all ${
                op.id === user.uid 
                  ? 'bg-red-950/30 border-red-500/60 shadow-[0_0_15px_rgba(220,38,38,0.2)]' 
                  : 'bg-[#121212] border-[#2a2a2a]'
              }`}
            >
              <div className="col-span-2 flex items-center gap-2 font-mono font-bold text-sm text-red-400">
                <span>#{idx + 1}</span>
                {idx === 0 && <span>👑</span>}
              </div>
              <div className="col-span-6">
                <p className="text-xs font-bold text-white truncate">{op.email || `Operative ...${op.id.slice(-6)}`}</p>
                <p className="text-[10px] font-mono text-gray-400">Status: Active Link</p>
              </div>
              <div className="col-span-4 text-right">
                <span className="px-3 py-1 bg-red-950/60 border border-red-900/50 rounded-full text-[10px] font-mono font-bold uppercase text-red-300">
                  {op.faction || 'Unassigned'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-400 text-xs flex-1 flex flex-col items-center justify-center">
          <p>No operative telemetry found in the database matrix.</p>
          <button
            onClick={() => router.push('/mood')}
            className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Be the First Operative Ranked
          </button>
        </div>
      )}

    </div>
  );
}