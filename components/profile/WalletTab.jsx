// components/profile/WalletTab.jsx
"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { calculateRankAndSector } from '@/app/dashboard/data/objectives';

export default function WalletTab({ 
  user, 
  userWalletBalance = 0, 
  userXp = 0, 
  setUserWalletBalance, 
  showToast 
}) {
  const [isToptingUp, setIsToptingUp] = useState(false);
  const router = useRouter();

  // Compute canonical progression using SceneSense 50-level exponential curve
  const rankStats = useMemo(() => {
    return calculateRankAndSector(userXp || 0);
  }, [userXp]);

  const handleTopUp = async (amount) => {
    if (!user || !db || isToptingUp) return;
    setIsToptingUp(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Update canonical 'coins' field matching Armoury & Profile schema
      await updateDoc(userRef, {
        coins: increment(amount)
      });

      // Record transaction ledger entry
      await addDoc(collection(db, `users/${user.uid}/claims`), {
        type: 'Studio Top-Up',
        amount: Number(amount),
        item: `${amount} Studio Credit Pack`,
        claimedAt: serverTimestamp()
      });

      if (typeof setUserWalletBalance === 'function') {
        setUserWalletBalance(prev => (Number(prev) || 0) + amount);
      }

      showToast?.(`Requisition Approved: +${amount} Studio Credits transferred to your commissary vault! 🪙`, "success");
    } catch (error) {
      console.error("Top-up transaction failed:", error);
      showToast?.("Token top-up transmission failed. Verify node uplink.", "error");
    } finally {
      setIsToptingUp(false);
    }
  };

  const mockTransactions = [
    { id: 1, type: 'Peer Tip Sent', amount: -10, recipient: 'Operative @lucas.vance', date: 'Oct 24, 2026' },
    { id: 2, type: 'Prop Requisition', amount: -250, item: 'Cyberpunk Neon 35mm Frame', date: 'Oct 22, 2026' },
    { id: 3, type: 'Commissary Top-Up', amount: +100, item: 'Studio Production Pack', date: 'Oct 20, 2026' },
    { id: 4, type: 'Critique Bounty', amount: +10, item: 'Verified Review Dispatch: Blade Runner 2049', date: 'Oct 18, 2026' },
    { id: 5, type: 'Peer Tip Received', amount: +10, sender: 'Operative @maya_sterling', date: 'Oct 15, 2026' }
  ];

  return (
    <div className="p-6 sm:p-8 bg-[#080d1a]/95 backdrop-blur-2xl min-h-[500px] max-w-4xl mx-auto rounded-3xl border border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.85)] font-sans text-slate-100 space-y-8">
      
      {/* HEADER DECK */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-cyan-500/20 gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2.5 py-0.5 rounded-lg">
              FINANCIAL LEDGER // COMMISSARY
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-mono mt-1">
            Studio Credits &amp; Treasury
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Manage your utility balance, peer micro-tips, and commissary prop acquisitions.
          </p>
        </div>
        
        {/* ACTION BUTTONS & ACTIVE BALANCE PILL */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          <button 
            type="button"
            onClick={() => router.push('/arcade')}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer transition-all active:scale-95"
          >
            🎰 Studio Arcade
          </button>

          <Link
            href="/armoury"
            className="px-4 py-2.5 bg-[#050811] hover:bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm"
          >
            Prop Dept ↗
          </Link>
        </div>
      </div>

      {/* BALANCE HUD & REQUISITION ROW */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 font-mono">
        
        {/* Large Balance Card */}
        <div className="md:col-span-5 bg-[#050811] border border-amber-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] uppercase tracking-widest text-slate-400">AVAILABLE VAULT BALANCE</span>
            <span className="text-2xl">🪙</span>
          </div>

          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-amber-400">
                {userWalletBalance}
              </span>
              <span className="text-xs text-amber-500/80 font-bold uppercase">CREDITS</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Active currency across SceneSense Backlot &amp; Lounges
            </span>
          </div>

          <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px] relative z-10">
            <span className="text-slate-400">Requisition Credits:</span>
            <div className="flex items-center gap-1.5">
              {[50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={isToptingUp}
                  onClick={() => handleTopUp(amt)}
                  className="px-2.5 py-1 bg-amber-950/70 hover:bg-amber-900/90 border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40"
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Studio Rank & Progression Card */}
        <div className="md:col-span-7 bg-[#050811] border border-cyan-500/25 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block">CURRENT SECTOR RANK</span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mt-0.5">
                {rankStats.sector}
              </h3>
            </div>
            <span className="text-xl font-black text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-2xl shadow-inner">
              LVL {rankStats.level}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">EXPERIENCE PROGRESSION</span>
              <span className="text-cyan-300 font-bold">
                {rankStats.currentExp} / {rankStats.nextLevelExp} XP
              </span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all duration-700" 
                style={{ width: `${rankStats.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between text-[10px] text-slate-400">
            <span>{rankStats.isMaxLevel ? 'Maximum Clearance Reached' : `Next Rank at Level ${rankStats.level + 1}`}</span>
            <span className="text-cyan-400 font-bold">{rankStats.progressPercent}% Calibrated</span>
          </div>
        </div>

      </div>

      {/* ECONOMIC UTILITY BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <div className="p-4 bg-[#050811] border border-cyan-500/20 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-cyan-300 font-bold uppercase text-[11px]">
            <span>🤝</span> Peer Micro-Tips
          </div>
          <p className="text-[11px] text-slate-400 font-sans font-light leading-relaxed">
            Award 10 Studio Credits directly to fellow critics in community chats and forum threads to recognize insightful film analysis.
          </p>
        </div>

        <div className="p-4 bg-[#050811] border border-cyan-500/20 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-amber-300 font-bold uppercase text-[11px]">
            <span>🎟️</span> Prop Department
          </div>
          <p className="text-[11px] text-slate-400 font-sans font-light leading-relaxed">
            Acquire visual prestige honors including glowing 35mm film borders, screen credits, and emerald phosphor terminal color grades.
          </p>
        </div>

        <div className="p-4 bg-[#050811] border border-cyan-500/20 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-300 font-bold uppercase text-[11px]">
            <span>🩺</span> AI Script Diagnostics
          </div>
          <p className="text-[11px] text-slate-400 font-sans font-light leading-relaxed">
            Deploy Script Doctor and DirectorBot in discussion channels for 5 credits to analyze narrative subtext and dialogue cadence.
          </p>
        </div>
      </div>

      {/* TRANSACTION AUDIT LEDGER */}
      <div className="space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <span>📜</span> Recent Telemetry Ledger
          </h3>
          <span className="text-[10px] text-slate-500">Real-Time Verification</span>
        </div>

        <div className="bg-[#050811] border border-cyan-500/20 rounded-2xl overflow-hidden divide-y divide-cyan-500/10 shadow-lg">
          {mockTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 text-xs transition-colors hover:bg-white/5">
              <div className="space-y-0.5">
                <span className="font-bold text-white block uppercase tracking-tight">
                  {tx.type}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {tx.recipient || tx.sender || tx.item} • {tx.date}
                </span>
              </div>
              <span className={`font-mono font-black text-sm ${tx.amount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 🪙
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}