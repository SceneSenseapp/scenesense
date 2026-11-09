// File: components/arcade/DailySpinWheel.jsx
"use client";

import { useState, useEffect } from "react";
import { doc, setDoc, increment, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/firebase";
import { trackQuestEvent } from "@/lib/quest-tracker";
import {
  DAILY_SPIN_SEGMENTS,
  SPIN_SHOP_BUNDLES,
  pickWeightedSpinIndex,
  getTodayUtcDateKey,
  getUtcMidnightCountdown,
  writeGuestEconomy,
} from "@/lib/arcade-engine";

const RARITY_BADGE_STYLES = {
  COMMON: "bg-slate-500/20 text-slate-200 border-slate-400/30",
  RARE: "bg-cyan-500/20 text-cyan-200 border-cyan-400/40",
  EPIC: "bg-violet-500/20 text-violet-200 border-violet-400/40",
  MYTHIC: "bg-pink-500/25 text-pink-200 border-pink-400/50",
};

export default function DailySpinWheel({
  user,
  walletCoins = 150,
  xpMultiplier = 1.0,
  spinTickets = 0,
  freeSpinAvailable = true,
  pityCounter = 0,
  onEconomyChange,
}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wonResult, setWonResult] = useState(null);
  const [spinHistory, setSpinHistory] = useState([]);
  const [countdown, setCountdown] = useState("00:00:00");
  const [buyingBundleId, setBuyingBundleId] = useState(null);

  // Live UTC midnight countdown timer for Daily Spin reset
  useEffect(() => {
    const updateClock = () => {
      setCountdown(getUtcMidnightCountdown(Date.now()));
    };
    const raf = requestAnimationFrame(updateClock);
    const interval = setInterval(updateClock, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
  }, []);

  const conicStops = DAILY_SPIN_SEGMENTS.map((seg, i) => {
    const start = i * 45;
    const end = (i + 1) * 45;
    return `${seg.color} ${start}deg ${end}deg`;
  }).join(", ");

  // Purchase Extra Spin Bundle with SceneCents
  const handleBuySpinBundle = async (bundle) => {
    if (isSpinning || buyingBundleId) return;
    if (walletCoins < bundle.cost) {
      toast.error(
        `Not enough SceneCents! You need ${bundle.cost} 🪙 (you have ${walletCoins.toLocaleString()} 🪙).`
      );
      return;
    }

    setBuyingBundleId(bundle.id);
    const boostedBonusXp = Math.round(bundle.bonusXp * xpMultiplier);

    onEconomyChange?.({
      deltaCoins: -bundle.cost,
      deltaXp: boostedBonusXp,
      deltaTickets: bundle.spins,
    });

    toast.success(
      `Purchased +${bundle.spins} Spin Ticket${bundle.spins > 1 ? "s" : ""}${
        boostedBonusXp > 0 ? ` & +${boostedBonusXp} XP` : ""
      }!`,
      { icon: "🎟️" }
    );

    if (user && db) {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            coins: increment(-bundle.cost),
            xp: increment(boostedBonusXp),
            spinTickets: increment(bundle.spins),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // Non-fatal sync fallback
      }
    }
    setBuyingBundleId(null);
  };

  // Execute a Daily Spin, Spin Ticket, or Direct 75-SceneCents Spin
  const handleExecuteSpin = async () => {
    if (isSpinning) return;

    const SINGLE_SPIN_COST = 75;
    let paymentMode = "daily_free"; // 'daily_free' | 'ticket' | 'coins'
    let upfrontCoinCost = 0;
    let ticketDelta = 0;

    if (freeSpinAvailable) {
      paymentMode = "daily_free";
    } else if (spinTickets > 0) {
      paymentMode = "ticket";
      ticketDelta = -1;
    } else {
      if (walletCoins < SINGLE_SPIN_COST) {
        toast.error(
          `Your Free Daily Spin is used. You need ${SINGLE_SPIN_COST} SceneCents (or a Spin Ticket) to spin again!`
        );
        return;
      }
      paymentMode = "coins";
      upfrontCoinCost = SINGLE_SPIN_COST;
    }

    setIsSpinning(true);
    setWonResult(null);

    const todayKey = getTodayUtcDateKey(Date.now());
    const nextPity = pityCounter + 1;
    const isGuaranteedEpic = nextPity >= 10;

    // Select winning slice with weighted RNG + 10-spin Epic/Mythic pity guarantee
    const prizeIdx = pickWeightedSpinIndex(() => Math.random(), isGuaranteedEpic);
    const segment = DAILY_SPIN_SEGMENTS[prizeIdx];
    const resolvedPity =
      segment.rarity === "EPIC" || segment.rarity === "MYTHIC" ? 0 : nextPity;

    // Deduct spin cost or consume daily/ticket immediately so UI is responsive & tamper-safe
    onEconomyChange?.({
      deltaCoins: -upfrontCoinCost,
      deltaXp: 0,
      deltaTickets: ticketDelta,
      markDailySpinDate: paymentMode === "daily_free" ? todayKey : undefined,
      nextPityCounter: resolvedPity,
    });

    if (typeof window !== "undefined" && paymentMode === "daily_free") {
      localStorage.setItem("scenesense_wheel_date", todayKey);
    }

    // Exact landing angle calculation (center of prizeIdx wedge under top 0deg pointer)
    const sliceAngle = 360 / DAILY_SPIN_SEGMENTS.length; // 45deg
    const wedgeCenter = prizeIdx * sliceAngle + sliceAngle / 2;
    const desiredMod = (360 - wedgeCenter) % 360;
    const currentMod = ((wheelRotation % 360) + 360) % 360;
    const deltaToTarget = (desiredMod - currentMod + 360) % 360;
    const jitter = (Math.random() - 0.5) * 14; // organic variance safely inside 45deg slice
    const nextRotation = wheelRotation + 6 * 360 + deltaToTarget + jitter;

    setWheelRotation(nextRotation);
    trackQuestEvent("daily_wheel_spin", 1);

    // Sync upfront cost / daily claim to Firestore
    if (user && db) {
      try {
        const deductPayload = {
          pityCounter: resolvedPity,
          updatedAt: serverTimestamp(),
        };
        if (paymentMode === "daily_free") {
          deductPayload.lastDailySpinDate = todayKey;
        } else if (paymentMode === "ticket") {
          deductPayload.spinTickets = increment(-1);
        } else if (upfrontCoinCost > 0) {
          deductPayload.coins = increment(-upfrontCoinCost);
        }
        await setDoc(doc(db, "users", user.uid), deductPayload, { merge: true });
      } catch {
        // Non-fatal
      }
    }

    setTimeout(async () => {
      const boostedXp = Math.round(segment.xp * xpMultiplier);
      const earnedTickets = segment.bonusSpins || 0;

      onEconomyChange?.({
        deltaCoins: segment.coins,
        deltaXp: boostedXp,
        deltaTickets: earnedTickets,
        unlockCosmetic: segment.unlockItem || null,
      });

      const outcomeRecord = {
        id: `spin_${Date.now()}`,
        icon: segment.icon,
        label: segment.label,
        rarity: segment.rarity,
        coins: segment.coins,
        boostedXp,
        bonusSpins: earnedTickets,
        wasPity: isGuaranteedEpic,
        modeUsed: paymentMode,
      };

      setWonResult(outcomeRecord);
      setSpinHistory((prev) => [outcomeRecord, ...prev.slice(0, 5)]);
      setIsSpinning(false);

      toast.success(
        `Daily Reel Landed: ${segment.label} (+${boostedXp} XP)!`,
        { icon: segment.icon }
      );

      if (user && db) {
        try {
          const rewardPayload = {
            coins: increment(segment.coins),
            xp: increment(boostedXp),
          };
          if (earnedTickets > 0) {
            rewardPayload.spinTickets = increment(earnedTickets);
          }
          await setDoc(doc(db, "users", user.uid), rewardPayload, { merge: true });
        } catch {
          // Non-fatal
        }
      } else {
        writeGuestEconomy({ pityCounter: resolvedPity });
      }
    }, 3200);
  };

  const spinsUntilGuaranteedEpic = Math.max(1, 10 - (pityCounter % 10));

  return (
    <div className="space-y-6">
      {/* Top Status Strip */}
      <div className="studio-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-amber-400/25">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
            🎡
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white">
                35mm Daily Prize Wheel
              </h3>
              {freeSpinAvailable ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono font-bold uppercase text-emerald-300 animate-pulse">
                  ✓ 1 Free Daily Spin Ready
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/15 text-[10px] font-mono text-slate-300">
                  Next Free Spin in {countdown}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Claim 1 free spin every day, or spend SceneCents on single spins and discounted multi-spin bundles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-amber-500/30 text-xs font-mono">
            <span className="text-slate-400 mr-1.5">Balance:</span>
            <strong className="text-amber-300">{walletCoins.toLocaleString()} 🪙</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-cyan-500/30 text-xs font-mono">
            <span className="text-slate-400 mr-1.5">Spin Tickets:</span>
            <strong className="text-cyan-300">{spinTickets} 🎟️</strong>
          </div>
        </div>
      </div>

      {/* Main Two-Column Wheel + Spin Shop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT (7 cols): Precision Segmented Wheel + Primary CTA */}
        <div className="lg:col-span-7 studio-panel rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-between space-y-6 relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Guaranteed Epic+ Luck Meter */}
          <div className="w-full max-w-md space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-violet-300 font-semibold">
                ✨ Epic / Mythic Guarantee Meter
              </span>
              <span className="text-amber-300 font-bold">
                {spinsUntilGuaranteedEpic === 1
                  ? "NEXT SPIN GUARANTEED EPIC+!"
                  : `${spinsUntilGuaranteedEpic} spins until Guaranteed Epic+`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-black/60 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 transition-all duration-500"
                style={{ width: `${Math.min(100, ((pityCounter % 10) / 10) * 100)}%` }}
              />
            </div>
          </div>

          {/* Physical 35mm Wheel Assembly */}
          <div className="relative flex items-center justify-center my-2">
            {/* Top Jeweled Pointer */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
              <div className="w-4 h-4 rounded-full bg-amber-300 border-2 border-slate-950 shadow-[0_0_15px_#fbbf24]" />
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-amber-400 -mt-1 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]" />
            </div>

            {/* Outer Bezel with Marquee Studs */}
            <div className="p-3 rounded-full bg-gradient-to-b from-amber-300/30 via-slate-900 to-amber-500/30 border-2 border-amber-400/60 shadow-[0_0_60px_rgba(245,158,11,0.22)]">
              <div
                style={{
                  background: `conic-gradient(from 0deg, ${conicStops})`,
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning
                    ? "transform 3.15s cubic-bezier(0.12, 0.86, 0.18, 1)"
                    : "none",
                }}
                className="w-72 h-72 sm:w-84 sm:h-84 rounded-full relative overflow-hidden border-4 border-slate-950 shadow-inner"
              >
                {/* Crisp Radial Slice Lines */}
                {DAILY_SPIN_SEGMENTS.map((seg, idx) => (
                  <div
                    key={`line_${seg.id}`}
                    style={{ transform: `rotate(${idx * 45}deg)` }}
                    className="absolute top-0 left-1/2 w-[2px] h-1/2 -ml-[1px] bg-slate-950/75 origin-bottom pointer-events-none"
                  />
                ))}

                {/* Inner Vignette for Readability */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(5,8,18,0.18)_35%,rgba(5,8,18,0.52)_100%)] pointer-events-none" />

                {/* Wedge Icons & Labels Centered in Each 45deg Slice */}
                {DAILY_SPIN_SEGMENTS.map((seg, idx) => {
                  const centerDeg = idx * 45 + 22.5;
                  return (
                    <div
                      key={seg.id}
                      style={{ transform: `rotate(${centerDeg}deg)` }}
                      className="absolute inset-0 flex flex-col items-center justify-start pt-4 sm:pt-5 pointer-events-none"
                    >
                      <span className="text-xl sm:text-2xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                        {seg.icon}
                      </span>
                      <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950/85 border border-white/20 text-[10px] font-mono font-black text-white tracking-tight shadow">
                        {seg.shortLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center Hub Button */}
            <button
              type="button"
              disabled={isSpinning}
              onClick={handleExecuteSpin}
              className="absolute z-20 w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 border-4 border-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.6)] flex flex-col items-center justify-center text-slate-950 font-mono font-black uppercase cursor-pointer hover:scale-105 active:scale-95 transition-transform disabled:opacity-75"
              title="Spin the Daily Prize Wheel"
            >
              <span className="text-xs leading-none">
                {isSpinning ? "..." : "SPIN"}
              </span>
              <span className="text-[9px] font-bold opacity-80 mt-0.5">
                {freeSpinAvailable ? "FREE" : spinTickets > 0 ? "1 🎟️" : "75 🪙"}
              </span>
            </button>
          </div>

          {/* Result Callout Banner */}
          {wonResult && (
            <div className="w-full max-w-md p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0">{wonResult.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono uppercase text-emerald-300 font-bold">
                    {wonResult.wasPity ? "✨ Guaranteed Pity Drop!" : "Latest Reel Drop"}
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {wonResult.label}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-black/50 text-amber-300 text-xs font-mono font-bold shrink-0">
                +{wonResult.boostedXp} XP
              </span>
            </div>
          )}

          {/* Primary Full-Width Spin Button */}
          <div className="w-full max-w-md space-y-2">
            <button
              type="button"
              disabled={isSpinning}
              onClick={handleExecuteSpin}
              className={`w-full py-3.5 px-6 rounded-2xl font-mono text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer active:scale-[0.99] shadow-lg ${
                freeSpinAvailable
                  ? "bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-300 text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.35)]"
                  : spinTickets > 0
                    ? "bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.3)]"
                    : "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 shadow-[0_0_25px_rgba(251,191,36,0.3)]"
              } disabled:opacity-60`}
            >
              {isSpinning
                ? "🎡 Spinning 35mm Daily Reel..."
                : freeSpinAvailable
                  ? "🎡 Claim Your FREE Daily Spin"
                  : spinTickets > 0
                    ? `🎟️ Spin Now Using 1 Ticket (${spinTickets} Available)`
                    : "🪙 Buy & Spin Instantly (75 SceneCents)"}
            </button>
            <p className="text-[11px] text-center font-mono text-slate-400">
              {freeSpinAvailable
                ? "Daily reset at 00:00 UTC • Multiplier active on all XP prizes"
                : `Free Daily Spin claimed • Resets in ${countdown} • Extra spins always available with SceneCents`}
            </p>
          </div>
        </div>

        {/* RIGHT (5 cols): Buy Spins with SceneCents + Wheel Odds & History */}
        <div className="lg:col-span-5 space-y-5">
          {/* SceneCents Spin Shop */}
          <div className="studio-panel rounded-3xl p-5 sm:p-6 space-y-4 border border-amber-400/30">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                  🎟️ SceneCents Spin Shop
                </span>
                <h4 className="text-base font-bold text-white mt-0.5">
                  Buy Extra Spins with SceneCents
                </h4>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/30 text-[11px] font-mono text-amber-300 font-bold">
                {walletCoins.toLocaleString()} 🪙
              </span>
            </div>

            <div className="space-y-2.5">
              {SPIN_SHOP_BUNDLES.map((bundle) => {
                const canAfford = walletCoins >= bundle.cost;
                return (
                  <div
                    key={bundle.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-amber-400/40 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">
                          +{bundle.spins} Spin{bundle.spins > 1 ? "s" : ""}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[9px] font-mono text-cyan-300 font-semibold">
                          {bundle.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {bundle.desc}
                        {bundle.savings ? ` (${bundle.savings})` : ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isSpinning || buyingBundleId === bundle.id || !canAfford}
                      onClick={() => handleBuySpinBundle(bundle)}
                      className={`px-3.5 py-2 rounded-xl font-mono text-xs font-black uppercase shrink-0 transition-all cursor-pointer ${
                        canAfford
                          ? "bg-amber-400 hover:bg-amber-300 text-slate-950 shadow"
                          : "bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {bundle.cost} 🪙
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prize Table & Odds */}
          <div className="studio-panel rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">
                Wheel Wedges &amp; Drop Tiers
              </h4>
              <span className="text-[10px] font-mono text-emerald-300">
                {xpMultiplier}x XP Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DAILY_SPIN_SEGMENTS.map((seg) => (
                <div
                  key={seg.id}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">{seg.icon}</span>
                    <span className="font-medium text-slate-200 truncate text-[11px]">
                      {seg.label}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-bold shrink-0 ${
                      RARITY_BADGE_STYLES[seg.rarity] || RARITY_BADGE_STYLES.COMMON
                    }`}
                  >
                    {seg.rarity}
                  </span>
                </div>
              ))}
            </div>

            {spinHistory.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  Recent Spins This Session
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {spinHistory.map((item) => (
                    <span
                      key={item.id}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-slate-200"
                    >
                      {item.icon} {item.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
