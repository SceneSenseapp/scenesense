// File: components/arcade/SoloGamesHub.jsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { doc, setDoc, increment } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/firebase";
import { trackQuestEvent } from "@/lib/quest-tracker";
import {
  MASTER_CINEMA_CATALOG,
  FALLBACK_STILL,
  buildSeededCinemaRounds,
  buildSeededClashPairs,
  computeReel21Total,
  drawSeededReel21Card,
  createSeededRng,
} from "@/lib/arcade-engine";

const FOCUS_STAGES = [
  { stage: 1, label: "Tight Optical Crop", coins: 45, xp: 130, scale: 2.55, blurPx: 11 },
  { stage: 2, label: "Medium Lens Pull", coins: 32, xp: 95, scale: 1.75, blurPx: 4 },
  { stage: 3, label: "Wide 35mm Frame", coins: 22, xp: 70, scale: 1.08, blurPx: 0 },
  { stage: 4, label: "Full Dossier Reveal", coins: 14, xp: 45, scale: 1.0, blurPx: 0 },
];

const CIPHER_DIFFICULTIES = [
  { id: "indie", label: "Indie (1.0x)", seconds: 18, mult: 1.0 },
  { id: "auteur", label: "Auteur (1.5x)", seconds: 13, mult: 1.5 },
  { id: "kubrick", label: "Kubrick (2.2x)", seconds: 9, mult: 2.2 },
];

export default function SoloGamesHub({
  user,
  walletCoins = 150,
  xpMultiplier = 1.0,
  initialGame = "focus",
  onEconomyChange,
  onSwitchToPvp,
}) {
  const [activeGame, setActiveGame] = useState(initialGame); // 'focus' | 'cipher' | 'clash' | 'reel21'
  const [cinemaPool, setCinemaPool] = useState(MASTER_CINEMA_CATALOG);
  const [deckSource, setDeckSource] = useState("verified_master_catalog");

  // Shared grant/deduct helper synced with parent + Firestore
  const applyRewardDelta = useCallback(
    async (deltaCoins, rawXp = 0) => {
      const boostedXp = rawXp > 0 ? Math.round(rawXp * xpMultiplier) : 0;
      onEconomyChange?.({ deltaCoins, deltaXp: boostedXp });
      if (user && db && (deltaCoins !== 0 || boostedXp > 0)) {
        try {
          const payload = {};
          if (deltaCoins !== 0) payload.coins = increment(deltaCoins);
          if (boostedXp > 0) payload.xp = increment(boostedXp);
          await setDoc(doc(db, "users", user.uid), payload, { merge: true });
        } catch {
          // Non-fatal
        }
      }
      return boostedXp;
    },
    [user, xpMultiplier, onEconomyChange]
  );

  // Hydrate live TMDB + Master cinema pool
  useEffect(() => {
    let cancelled = false;
    const raf = requestAnimationFrame(async () => {
      try {
        const res = await fetch("/api/arcade/deck");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.items) && data.items.length >= 12) {
          setCinemaPool(data.items);
          setDeckSource(data.source || "tmdb_live_hybrid");
        }
      } catch {
        // Offline master catalog already active
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  // =========================================================================
  // GAME 1: FRAME FOCUS (PROGRESSIVE BLUR & CROP REVEAL)
  // =========================================================================
  const [focusDeckSeed, setFocusDeckSeed] = useState(101);
  const [focusRoundIdx, setFocusRoundIdx] = useState(0);
  const [focusStage, setFocusStage] = useState(1); // 1..4
  const [focusStreak, setFocusStreak] = useState(0);
  const [focusSolvedCount, setFocusSolvedCount] = useState(0);
  const [focusSelected, setFocusSelected] = useState(null);

  const focusRounds = useMemo(
    () => buildSeededCinemaRounds(cinemaPool, `solo_focus_${focusDeckSeed}`, 16),
    [cinemaPool, focusDeckSeed]
  );
  const currentFocusRound = focusRounds[focusRoundIdx % focusRounds.length];
  const currentStageMeta = FOCUS_STAGES[focusStage - 1] || FOCUS_STAGES[0];

  const handleFocusGuess = async (option) => {
    if (focusSelected || !currentFocusRound) return;
    setFocusSelected(option);
    const isCorrect = option === currentFocusRound.answer;

    if (isCorrect) {
      const nextStreak = focusStreak + 1;
      const streakBonus = Math.min(35, focusStreak * 7);
      const earnedCoins = currentStageMeta.coins + streakBonus;
      const boostedXp = await applyRewardDelta(earnedCoins, currentStageMeta.xp);
      setFocusStreak(nextStreak);
      setFocusSolvedCount((c) => c + 1);
      trackQuestEvent(["trivia_duel_3", "week_trivia_master_15"], 1);
      toast.success(
        `Sharp Eye (Stage ${focusStage})! +${earnedCoins} 🪙 & +${boostedXp} XP`,
        { icon: "🎬" }
      );
    } else {
      setFocusStreak(0);
      setFocusStage(4); // Show full clear frame on miss
      toast.error(`Missed frame! That was "${currentFocusRound.answer}".`);
    }

    setTimeout(() => {
      setFocusSelected(null);
      setFocusStage(1);
      if (focusRoundIdx + 1 >= focusRounds.length) {
        setFocusDeckSeed((s) => s + 1);
        setFocusRoundIdx(0);
      } else {
        setFocusRoundIdx((i) => i + 1);
      }
    }, 1500);
  };

  // =========================================================================
  // GAME 2: CINEMA CIPHER PRO (TIMED COMBO + 3 TACTICAL LIFELINES)
  // =========================================================================
  const [cipherDiff, setCipherDiff] = useState(CIPHER_DIFFICULTIES[0]);
  const [cipherSeed, setCipherSeed] = useState(202);
  const [cipherIdx, setCipherIdx] = useState(0);
  const [cipherStreak, setCipherStreak] = useState(0);
  const [cipherSelected, setCipherSelected] = useState(null);
  const [cipherEliminated, setCipherEliminated] = useState([]);
  const [cipherClueShown, setCipherClueShown] = useState(false);
  const [cipherTimeLeft, setCipherTimeLeft] = useState(18);
  const [cipherClockFrozen, setCipherClockFrozen] = useState(false);
  const cipherTimerRef = useRef(null);

  const cipherRounds = useMemo(
    () => buildSeededCinemaRounds(cinemaPool, `solo_cipher_${cipherSeed}`, 20),
    [cinemaPool, cipherSeed]
  );
  const currentCipher = cipherRounds[cipherIdx % cipherRounds.length];

  const advanceCipherRound = useCallback(
    (nextDiffSeconds) => {
      setCipherSelected(null);
      setCipherEliminated([]);
      setCipherClueShown(false);
      setCipherClockFrozen(false);
      setCipherTimeLeft(nextDiffSeconds ?? cipherDiff.seconds);
      setCipherIdx((prev) => {
        if (prev + 1 >= cipherRounds.length) {
          setCipherSeed((s) => s + 1);
          return 0;
        }
        return prev + 1;
      });
    },
    [cipherDiff.seconds, cipherRounds.length]
  );

  useEffect(() => {
    if (activeGame !== "cipher" || cipherSelected || cipherClockFrozen) return;
    cipherTimerRef.current = setInterval(() => {
      setCipherTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(cipherTimerRef.current);
          setCipherSelected("__TIMEOUT__");
          setCipherStreak(0);
          toast.error("Shot clock expired!");
          setTimeout(() => {
            advanceCipherRound();
          }, 1300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(cipherTimerRef.current);
  }, [activeGame, cipherIdx, cipherSelected, cipherClockFrozen, advanceCipherRound]);

  const handleCipherChoice = async (opt) => {
    if (cipherSelected || !currentCipher) return;
    clearInterval(cipherTimerRef.current);
    setCipherSelected(opt);

    const isCorrect = opt === currentCipher.answer;
    if (isCorrect) {
      const nextStreak = cipherStreak + 1;
      const comboMult = nextStreak >= 6 ? 2.5 : nextStreak >= 3 ? 1.6 : 1.0;
      const speedBonus = Math.round(cipherTimeLeft * 1.5);
      const earnedCoins = Math.round((22 + speedBonus) * cipherDiff.mult * comboMult);
      const baseXp = Math.round((75 + cipherTimeLeft * 4) * cipherDiff.mult);
      const boostedXp = await applyRewardDelta(earnedCoins, baseXp);
      setCipherStreak(nextStreak);
      trackQuestEvent(["trivia_duel_3", "week_trivia_master_15"], 1);
      toast.success(
        `Cipher Solved (${nextStreak}x Combo)! +${earnedCoins} 🪙 & +${boostedXp} XP`,
        { icon: "🔐" }
      );
    } else {
      setCipherStreak(0);
      toast.error(`Incorrect! Correct title: "${currentCipher.answer}".`);
    }

    setTimeout(() => {
      advanceCipherRound();
    }, 1400);
  };

  const handleCipher5050 = () => {
    if (cipherEliminated.length > 0 || cipherSelected || !currentCipher) return;
    const rng = createSeededRng(`5050_${currentCipher.id}`);
    const wrong = currentCipher.options
      .filter((o) => o !== currentCipher.answer)
      .sort(() => rng() - 0.5)
      .slice(0, 2);
    setCipherEliminated(wrong);
    toast("50/50 Splice removed 2 decoys!", { icon: "✂️" });
  };

  const handleFreezeClock = async () => {
    if (cipherClockFrozen || cipherSelected) return;
    if (walletCoins < 15) {
      toast.error("Need 15 SceneCents to freeze the shot clock!");
      return;
    }
    await applyRewardDelta(-15, 0);
    setCipherClockFrozen(true);
    setCipherTimeLeft((t) => t + 8);
    toast("Shot clock frozen & +8s added (-15 🪙)!", { icon: "❄️" });
  };

  // =========================================================================
  // GAME 3: BOX OFFICE & RATING CLASH (RISK-OR-BANK STREAK POT)
  // =========================================================================
  const [clashMetric, setClashMetric] = useState("boxoffice"); // 'boxoffice' | 'rating'
  const [clashSeed, setClashSeed] = useState(303);
  const [clashStep, setClashStep] = useState(0);
  const [clashStreak, setClashStreak] = useState(0);
  const [clashPotCoins, setClashPotCoins] = useState(0);
  const [clashShieldActive, setClashShieldActive] = useState(false);
  const [clashRevealed, setClashRevealed] = useState(false);
  const [clashLastOutcome, setClashLastOutcome] = useState(null);

  const clashPairs = useMemo(
    () => buildSeededClashPairs(cinemaPool, `solo_clash_${clashSeed}`, clashMetric, 24),
    [cinemaPool, clashSeed, clashMetric]
  );
  const activePair = clashPairs[clashStep % clashPairs.length];

  const handleClashGuess = async (direction) => {
    if (clashRevealed || !activePair) return;
    const valLeft =
      clashMetric === "boxoffice"
        ? activePair.left.grossMillions
        : activePair.left.rating;
    const valRight =
      clashMetric === "boxoffice"
        ? activePair.right.grossMillions
        : activePair.right.rating;

    const isHigher = valRight >= valLeft;
    const isLower = valRight <= valLeft;
    const isWin = direction === "higher" ? isHigher : isLower;

    setClashRevealed(true);

    if (isWin) {
      const nextStreak = clashStreak + 1;
      const stepReward = 25 + nextStreak * 15;
      const nextPot = clashPotCoins + stepReward;
      setClashStreak(nextStreak);
      setClashPotCoins(nextPot);
      setClashLastOutcome("win");
      await applyRewardDelta(0, 55 + nextStreak * 15);
      trackQuestEvent(["trivia_duel_3", "week_trivia_master_15"], 1);
      toast.success(`Correct! Run Pot grew to ${nextPot} 🪙 — Bank it or Press On!`, {
        icon: "📈",
      });
    } else if (clashShieldActive) {
      setClashShieldActive(false);
      setClashLastOutcome("shielded");
      toast("Run Shield absorbed the miss! Your Pot is safe!", { icon: "🛡️" });
    } else {
      const lostPot = clashPotCoins;
      setClashStreak(0);
      setClashPotCoins(0);
      setClashLastOutcome("loss");
      toast.error(
        lostPot > 0
          ? `Missed! Unbanked ${lostPot} 🪙 Run Pot busted.`
          : "Missed! Starting a fresh Clash run."
      );
    }

    setTimeout(() => {
      setClashRevealed(false);
      setClashLastOutcome(null);
      if (clashStep + 1 >= clashPairs.length) {
        setClashSeed((s) => s + 1);
        setClashStep(0);
      } else {
        setClashStep((s) => s + 1);
      }
    }, 1550);
  };

  const handleBankClashPot = async () => {
    if (clashPotCoins <= 0 || clashRevealed) return;
    const banked = clashPotCoins;
    const bonusXp = clashStreak * 30;
    setClashPotCoins(0);
    setClashStreak(0);
    const boostedXp = await applyRewardDelta(banked, bonusXp);
    toast.success(`Banked +${banked} SceneCents & +${boostedXp} XP into your wallet!`, {
      icon: "🏦",
    });
  };

  const handleBuyClashShield = async () => {
    if (clashShieldActive) return;
    if (walletCoins < 40) {
      toast.error("Need 40 SceneCents for a Run Shield!");
      return;
    }
    await applyRewardDelta(-40, 0);
    setClashShieldActive(true);
    toast.success("Run Shield armed! Protects your streak pot from 1 miss.", {
      icon: "🛡️",
    });
  };

  // =========================================================================
  // GAME 4: REEL 21 PRO (TRUE ACE 1/11 MATH + PEEK + 5-REEL CHARLIE)
  // =========================================================================
  const [r21Stake, setR21Stake] = useState(50);
  const [r21ActiveStake, setR21ActiveStake] = useState(0);
  const [r21PlayerHand, setR21PlayerHand] = useState([]);
  const [r21DealerHand, setR21DealerHand] = useState([]);
  const [r21State, setR21State] = useState("idle"); // 'idle' | 'playing' | 'finished'
  const [r21SafeUsed, setR21SafeUsed] = useState(false);
  const [r21Peeked, setR21Peeked] = useState(false);
  const [r21Summary, setR21Summary] = useState("");
  const r21RngRef = useRef(() => Math.random());

  const startReel21Hand = async () => {
    if (walletCoins < r21Stake) {
      toast.error(`You need ${r21Stake} SceneCents to deal a ${r21Stake} 🪙 hand!`);
      return;
    }
    await applyRewardDelta(-r21Stake, 0);
    const rng = createSeededRng(`r21_${Date.now()}_${walletCoins}`);
    r21RngRef.current = rng;

    const p1 = drawSeededReel21Card(rng);
    const p2 = drawSeededReel21Card(rng);
    const d1 = drawSeededReel21Card(rng);
    const d2 = drawSeededReel21Card(rng);

    const pHand = [p1, p2];
    const dHand = [d1, d2];
    setR21PlayerHand(pHand);
    setR21DealerHand(dHand);
    setR21ActiveStake(r21Stake);
    setR21SafeUsed(false);
    setR21Peeked(false);
    setR21Summary("");

    const pScore = computeReel21Total(pHand).total;
    if (pScore === 21) {
      // Instant Natural 21 (2.5x payout!)
      const naturalPayout = Math.round(r21Stake * 2.5);
      const boosted = await applyRewardDelta(naturalPayout, 220);
      setR21State("finished");
      setR21Summary(
        `NATURAL 21 PREMIERE! Paid 2.5x (${naturalPayout} 🪙 & +${boosted} XP)!`
      );
      trackQuestEvent(["trivia_duel_3", "week_trivia_master_15"], 1);
      toast.success(`Natural 21! Won ${naturalPayout} SceneCents!`, { icon: "👑" });
    } else {
      setR21State("playing");
    }
  };

  const resolveReel21Stand = async (finalPlayerHand, stakeOverride) => {
    const stake = stakeOverride ?? r21ActiveStake;
    const pEval = computeReel21Total(finalPlayerHand);
    const dCards = [...r21DealerHand];
    while (computeReel21Total(dCards).total < 17) {
      dCards.push(drawSeededReel21Card(r21RngRef.current));
    }
    setR21DealerHand(dCards);
    setR21State("finished");

    const dEval = computeReel21Total(dCards);
    trackQuestEvent(["trivia_duel_3", "week_trivia_master_15"], 1);

    if (dEval.total > 21 || pEval.total > dEval.total) {
      const payout = stake * 2;
      const boosted = await applyRewardDelta(payout, 175);
      setR21Summary(
        `Victory! Your ${pEval.total} beat Studio Dealer's ${
          dEval.total > 21 ? `${dEval.total} (BUST)` : dEval.total
        } — Won ${payout} 🪙 & +${boosted} XP!`
      );
      toast.success(`Won ${payout} SceneCents pot!`, { icon: "🏆" });
    } else if (pEval.total === dEval.total) {
      await applyRewardDelta(stake, 50);
      setR21Summary(`Push at ${pEval.total}! Your ${stake} 🪙 stake was refunded.`);
      toast("Tie Slate! Stake refunded.", { icon: "🤝" });
    } else {
      await applyRewardDelta(0, 35);
      setR21Summary(
        `Dealer took it (${dEval.total} vs. your ${pEval.total}). +35 Consolation XP.`
      );
      toast.error(`Studio Dealer won with ${dEval.total}.`);
    }
  };

  const handleReel21Hit = async (safeCut = false) => {
    if (r21State !== "playing") return;
    if (safeCut) setR21SafeUsed(true);

    const nextCard = drawSeededReel21Card(r21RngRef.current, safeCut);
    const nextHand = [...r21PlayerHand, nextCard];
    setR21PlayerHand(nextHand);

    const { total } = computeReel21Total(nextHand);
    if (total > 21) {
      setR21State("finished");
      await applyRewardDelta(0, 30);
      setR21Summary(`Box Office Bomb! Busted at ${total} / 21.`);
      toast.error(`Busted at ${total}!`);
    } else if (nextHand.length >= 5) {
      // 5-Reel Charlie Bonus (3x stake!)
      const charliePayout = r21ActiveStake * 3;
      const boosted = await applyRewardDelta(charliePayout, 300);
      setR21State("finished");
      setR21Summary(
        `5-REEL CHARLIE BONUS (${total}/21)! Paid 3x (${charliePayout} 🪙 & +${boosted} XP)!`
      );
      toast.success(`5-Reel Charlie! Won ${charliePayout} SceneCents!`, { icon: "🔥" });
    } else if (total === 21) {
      await resolveReel21Stand(nextHand);
    }
  };

  const handleReel21Double = async () => {
    if (r21State !== "playing") return;
    if (walletCoins < r21ActiveStake) {
      toast.error(`Need ${r21ActiveStake} 🪙 to Double Down!`);
      return;
    }
    await applyRewardDelta(-r21ActiveStake, 0);
    const doubledStake = r21ActiveStake * 2;
    setR21ActiveStake(doubledStake);

    const nextCard = drawSeededReel21Card(r21RngRef.current, false);
    const nextHand = [...r21PlayerHand, nextCard];
    setR21PlayerHand(nextHand);

    const { total } = computeReel21Total(nextHand);
    if (total > 21) {
      setR21State("finished");
      setR21Summary(`Busted on Double Down at ${total} / 21.`);
      toast.error(`Double Down busted at ${total}!`);
    } else {
      await resolveReel21Stand(nextHand, doubledStake);
    }
  };

  const handleReel21Peek = async () => {
    if (r21Peeked || r21State !== "playing") return;
    if (walletCoins < 15) {
      toast.error("Need 15 SceneCents for Producer Peek!");
      return;
    }
    await applyRewardDelta(-15, 0);
    setR21Peeked(true);
    toast("Producer Peek revealed the Dealer's hidden card!", { icon: "🔍" });
  };

  const pEval = computeReel21Total(r21PlayerHand);
  const dVisibleEval =
    r21State === "playing" && !r21Peeked && r21DealerHand.length > 0
      ? computeReel21Total([r21DealerHand[0]])
      : computeReel21Total(r21DealerHand);

  const GAME_TABS = [
    {
      id: "focus",
      icon: "🎬",
      title: "Frame Focus",
      tag: "New • Visual Zoom",
    },
    {
      id: "cipher",
      icon: "🔐",
      title: "Cinema Cipher Pro",
      tag: "Combo + Lifelines",
    },
    {
      id: "clash",
      icon: "📈",
      title: "Box Office & Rating Clash",
      tag: "Risk or Bank Pot",
    },
    {
      id: "reel21",
      icon: "🃏",
      title: "Reel 21 Pro",
      tag: "Ace 1/11 + Charlie",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Game Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {GAME_TABS.map((g) => {
          const isActive = activeGame === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveGame(g.id)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                isActive
                  ? "bg-gradient-to-br from-cyan-500/20 via-[#0d162c] to-violet-500/15 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.2)]"
                  : "studio-panel hover:border-white/25"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl">{g.icon}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                    isActive
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-white/[0.06] text-slate-300 border border-white/10"
                  }`}
                >
                  {g.tag}
                </span>
              </div>
              <div className="text-sm font-bold text-white">{g.title}</div>
            </button>
          );
        })}
      </div>

      {/* Want to Challenge Another Player Callout */}
      {onSwitchToPvp && (
        <div className="px-4 py-2.5 rounded-2xl bg-violet-500/10 border border-violet-400/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-200">
            <strong className="text-violet-300">Ready for real stakes?</strong>{" "}
            Challenge any player head-to-head on identical movie seeds for a 2x SceneCents Pot.
            <span className="hidden sm:inline text-slate-400 ml-2 font-mono text-[10px]">
              ({deckSource === "tmdb_live_hybrid" ? "Live TMDB Deck Active" : "Master Cinema Deck Active"})
            </span>
          </span>
          <button
            type="button"
            onClick={onSwitchToPvp}
            className="px-3.5 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-mono text-[11px] font-bold uppercase cursor-pointer"
          >
            ⚔️ Challenge Players →
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* ACTIVE GAME 1: FRAME FOCUS                                          */}
      {/* =================================================================== */}
      {activeGame === "focus" && currentFocusRound && (
        <div className="studio-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
                🎬 Optical Frame Deconstruction
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                Identify the Film Before Pulling Full Focus
              </h3>
            </div>

            <div className="flex items-center gap-2.5 text-xs font-mono">
              <span className="px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-400/30 text-emerald-300">
                Solved: <strong>{focusSolvedCount}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-black/50 border border-amber-400/40 text-amber-300">
                🔥 Streak: <strong>{focusStreak}x</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Optical Viewport */}
            <div className="lg:col-span-7 space-y-3">
              <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-cyan-400/35 bg-slate-950 shadow-xl">
                <Image
                  src={currentFocusRound.backdrop || FALLBACK_STILL}
                  alt="Mystery Cinema Frame"
                  fill
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  style={{
                    transformOrigin: `${currentFocusRound.focalX}% ${currentFocusRound.focalY}%`,
                    transform: `scale(${focusSelected ? 1.0 : currentStageMeta.scale})`,
                    filter: `blur(${focusSelected ? 0 : currentStageMeta.blurPx}px)`,
                    transition: "transform 0.55s ease, filter 0.55s ease",
                  }}
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 border border-cyan-400/40 text-cyan-300 font-bold">
                    Stage {focusStage}/4: {currentStageMeta.label}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950/85 border border-amber-400/40 text-amber-300 font-bold">
                    Worth +{currentStageMeta.coins + Math.min(35, focusStreak * 7)} 🪙
                  </span>
                </div>
              </div>

              {/* Focus Stage Pips & Pull Focus Button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {FOCUS_STAGES.map((st) => (
                    <span
                      key={st.stage}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border ${
                        focusStage === st.stage
                          ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold"
                          : focusStage > st.stage
                            ? "bg-white/5 border-white/10 text-slate-500"
                            : "bg-black/40 border-white/10 text-slate-400"
                      }`}
                    >
                      S{st.stage}: +{st.coins}🪙
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={focusStage >= 4 || Boolean(focusSelected)}
                  onClick={() => setFocusStage((s) => Math.min(4, s + 1))}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-400/50 text-amber-200 font-mono text-xs font-bold uppercase cursor-pointer"
                >
                  {focusStage >= 4
                    ? "✓ Max Focus Reached"
                    : `🔍 Pull Focus (Reveal Clue ${focusStage + 1})`}
                </button>
              </div>
            </div>

            {/* Progressive Clues + 4 Options */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl bg-black/45 border border-white/10 space-y-2 text-xs">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Unlocked Optical Telemetry
                </div>
                <div className="text-slate-200 font-mono">
                  • Era &amp; Genre:{" "}
                  <strong className="text-cyan-300">
                    {focusStage >= 2
                      ? `${Math.floor(currentFocusRound.year / 10) * 10}s • ${currentFocusRound.genre}`
                      : "🔒 Pull Focus to Stage 2"}
                  </strong>
                </div>
                <div className="text-slate-200 font-mono">
                  • Release &amp; Score:{" "}
                  <strong className="text-amber-300">
                    {focusStage >= 3
                      ? `${currentFocusRound.year} • ★ ${currentFocusRound.rating.toFixed(1)}/10`
                      : "🔒 Pull Focus to Stage 3"}
                  </strong>
                </div>
                <div className="text-slate-300 leading-relaxed pt-1 border-t border-white/10">
                  {focusStage >= 4
                    ? currentFocusRound.clue
                    : "🔒 Full synopsis clue unlocks at Stage 4 (guess earlier for up to +45 🪙!)."}
                </div>
              </div>

              <div className="space-y-2.5">
                {currentFocusRound.options.map((opt, idx) => {
                  const letters = ["A", "B", "C", "D"];
                  const isAns = opt === currentFocusRound.answer;
                  const isPicked = focusSelected === opt;
                  let cls =
                    "bg-[#0b1120] hover:bg-cyan-500/15 border-white/15 hover:border-cyan-400 text-white";
                  if (focusSelected) {
                    if (isAns) cls = "bg-emerald-950 border-emerald-400 text-emerald-200";
                    else if (isPicked) cls = "bg-rose-950 border-rose-400 text-rose-200";
                    else cls = "bg-black/40 border-white/5 text-slate-500";
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(focusSelected)}
                      onClick={() => handleFocusGuess(opt)}
                      className={`w-full p-3.5 rounded-xl border text-left text-xs font-mono font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${cls}`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-[10px] shrink-0">
                          {letters[idx]}
                        </span>
                        <span className="truncate">{opt}</span>
                      </span>
                      {focusSelected && isAns && <span className="text-emerald-300">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ACTIVE GAME 2: CINEMA CIPHER PRO                                    */}
      {/* =================================================================== */}
      {activeGame === "cipher" && currentCipher && (
        <div className="studio-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-violet-300 font-bold">
                🔐 Timed Plot &amp; Quote Decryption
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                Cinema Cipher Pro
              </h3>
            </div>

            {/* Difficulty Multiplier Selector */}
            <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
              {CIPHER_DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setCipherDiff(d);
                    setCipherTimeLeft(d.seconds);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    cipherDiff.id === d.id
                      ? "bg-violet-500 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shot Clock Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-300 font-bold">
                🔥 Combo Streak: {cipherStreak}x{" "}
                {cipherStreak >= 3 ? "(COMBO SURGE ACTIVE!)" : ""}
              </span>
              <span
                className={`font-black ${
                  cipherClockFrozen
                    ? "text-cyan-300"
                    : cipherTimeLeft <= 4
                      ? "text-rose-400 animate-pulse"
                      : "text-slate-200"
                }`}
              >
                {cipherClockFrozen ? `❄️ FROZEN (${cipherTimeLeft}s)` : `⏱️ ${cipherTimeLeft}s`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-black/60 overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-500 ${
                  cipherTimeLeft <= 4
                    ? "bg-rose-500"
                    : "bg-gradient-to-r from-violet-500 to-cyan-400"
                }`}
                style={{
                  width: `${Math.min(100, (cipherTimeLeft / cipherDiff.seconds) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 relative h-60 rounded-2xl overflow-hidden border border-violet-400/35">
              <Image
                src={currentCipher.backdrop || FALLBACK_STILL}
                alt="Cipher Still"
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-mono">
                <span className="px-2.5 py-1 rounded bg-black/80 text-violet-200 border border-white/10">
                  {currentCipher.genre}
                </span>
                <span className="px-2.5 py-1 rounded bg-black/80 text-amber-300 border border-amber-400/30">
                  ★ {currentCipher.rating.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {/* 3 Lifelines */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={cipherEliminated.length > 0 || Boolean(cipherSelected)}
                  onClick={handleCipher5050}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 border border-cyan-400/40 text-[11px] font-mono text-cyan-200 font-semibold cursor-pointer"
                >
                  ✂️ 50/50 Splice (Free)
                </button>
                <button
                  type="button"
                  disabled={cipherClueShown || Boolean(cipherSelected)}
                  onClick={() => setCipherClueShown(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-40 border border-amber-400/40 text-[11px] font-mono text-amber-200 font-semibold cursor-pointer"
                >
                  🎬 Era &amp; Director Clue (Free)
                </button>
                <button
                  type="button"
                  disabled={cipherClockFrozen || Boolean(cipherSelected)}
                  onClick={handleFreezeClock}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 border border-sky-400/40 text-[11px] font-mono text-sky-200 font-semibold cursor-pointer"
                >
                  ❄️ Freeze +8s (15 🪙)
                </button>
              </div>

              <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-medium p-4 rounded-2xl bg-black/40 border border-white/10">
                {currentCipher.clue}
              </p>

              {cipherClueShown && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-xs font-mono text-amber-200">
                  🎬 Dossier Hint: Released in <strong>{currentCipher.year}</strong> •{" "}
                  <strong>{currentCipher.director}</strong>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentCipher.options.map((opt, i) => {
                  const letters = ["A", "B", "C", "D"];
                  const isElim = cipherEliminated.includes(opt);
                  const isAns = opt === currentCipher.answer;
                  const isPicked = cipherSelected === opt;

                  let style =
                    "bg-[#0b1120] hover:bg-violet-500/20 border-white/15 hover:border-violet-400 text-white";
                  if (isElim) {
                    style = "bg-black/30 border-white/5 text-slate-600 line-through opacity-40";
                  } else if (cipherSelected) {
                    if (isAns) style = "bg-emerald-950 border-emerald-400 text-emerald-200";
                    else if (isPicked) style = "bg-rose-950 border-rose-400 text-rose-200";
                    else style = "bg-black/40 border-white/5 text-slate-500";
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isElim || Boolean(cipherSelected)}
                      onClick={() => handleCipherChoice(opt)}
                      className={`p-3.5 rounded-xl border text-left text-xs font-mono font-bold flex items-center gap-2.5 transition-all cursor-pointer ${style}`}
                    >
                      <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-[10px] shrink-0">
                        {letters[i]}
                      </span>
                      <span className="truncate">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ACTIVE GAME 3: BOX OFFICE & RATING CLASH (RISK-OR-BANK)             */}
      {/* =================================================================== */}
      {activeGame === "clash" && activePair && (
        <div className="studio-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setClashMetric("boxoffice");
                  setClashStep(0);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer ${
                  clashMetric === "boxoffice"
                    ? "bg-amber-400 text-slate-950"
                    : "bg-white/5 text-slate-300 border border-white/10"
                }`}
              >
                💵 Box Office Gross
              </button>
              <button
                type="button"
                onClick={() => {
                  setClashMetric("rating");
                  setClashStep(0);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer ${
                  clashMetric === "rating"
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-white/5 text-slate-300 border border-white/10"
                }`}
              >
                ⭐ Audience Score
              </button>
            </div>

            {/* Risk-or-Bank Pot Controls */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                disabled={clashShieldActive}
                onClick={handleBuyClashShield}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border cursor-pointer ${
                  clashShieldActive
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                    : "bg-white/5 hover:bg-white/10 border-white/15 text-slate-200"
                }`}
              >
                {clashShieldActive ? "🛡️ Shield Armed" : "🛡️ Buy Run Shield (40 🪙)"}
              </button>

              <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-amber-400/40 text-xs font-mono">
                Unbanked Pot:{" "}
                <strong className="text-amber-300">{clashPotCoins} 🪙</strong> ({clashStreak}x)
              </div>

              <button
                type="button"
                disabled={clashPotCoins <= 0 || clashRevealed}
                onClick={handleBankClashPot}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:opacity-95 disabled:opacity-35 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer shadow"
              >
                🏦 Bank {clashPotCoins > 0 ? `+${clashPotCoins} 🪙` : "Pot"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Benchmark Film */}
            <div className="relative h-72 rounded-2xl overflow-hidden border border-cyan-400/40 p-6 flex flex-col justify-end bg-slate-950">
              <Image
                src={activePair.left.backdrop || activePair.left.poster || FALLBACK_STILL}
                alt={activePair.left.title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              <div className="relative z-10 space-y-1">
                <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 font-bold uppercase">
                  Benchmark • {activePair.left.year}
                </span>
                <h4 className="text-xl font-bold text-white">{activePair.left.title}</h4>
                <div className="text-2xl sm:text-3xl font-mono font-black text-amber-300">
                  {clashMetric === "boxoffice"
                    ? `$${activePair.left.grossMillions?.toLocaleString()}M`
                    : `★ ${activePair.left.rating.toFixed(1)} / 10`}
                </div>
              </div>
            </div>

            {/* Challenger Film */}
            <div className="relative h-72 rounded-2xl overflow-hidden border border-fuchsia-400/40 p-6 flex flex-col justify-between bg-slate-950">
              <Image
                src={activePair.right.backdrop || activePair.right.poster || FALLBACK_STILL}
                alt={activePair.right.title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-fuchsia-500/20 border border-fuchsia-400/40 text-[10px] font-mono text-fuchsia-200 font-bold uppercase">
                  Challenger • {activePair.right.year}
                </span>
                {clashLastOutcome && (
                  <span
                    className={`px-2.5 py-0.5 rounded font-mono text-xs font-black uppercase ${
                      clashLastOutcome === "win"
                        ? "bg-emerald-400 text-slate-950"
                        : clashLastOutcome === "shielded"
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-rose-500 text-white"
                    }`}
                  >
                    {clashLastOutcome === "win"
                      ? "✓ HIT!"
                      : clashLastOutcome === "shielded"
                        ? "🛡️ SHIELDED!"
                        : "✕ BUST"}
                  </span>
                )}
              </div>

              <div className="relative z-10 space-y-3">
                <div>
                  <h4 className="text-xl font-bold text-white">{activePair.right.title}</h4>
                  {clashRevealed ? (
                    <div className="text-2xl sm:text-3xl font-mono font-black text-amber-300">
                      {clashMetric === "boxoffice"
                        ? `$${activePair.right.grossMillions?.toLocaleString()}M`
                        : `★ ${activePair.right.rating.toFixed(1)} / 10`}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-slate-300 mt-0.5">
                      Did this score HIGHER or LOWER than {activePair.left.title}?
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={clashRevealed}
                    onClick={() => handleClashGuess("higher")}
                    className="py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer active:scale-95"
                  >
                    ▲ HIGHER
                  </button>
                  <button
                    type="button"
                    disabled={clashRevealed}
                    onClick={() => handleClashGuess("lower")}
                    className="py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-mono text-xs font-black uppercase cursor-pointer active:scale-95"
                  >
                    ▼ LOWER
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ACTIVE GAME 4: REEL 21 PRO                                          */}
      {/* =================================================================== */}
      {activeGame === "reel21" && (
        <div className="studio-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                🃏 Studio Table • Natural 21 Pays 2.5x • 5-Reel Charlie Pays 3x
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                Reel 21 Pro (True Oscar Ace 1/11 Math)
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[25, 50, 100, 250].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={r21State === "playing"}
                  onClick={() => setR21Stake(amt)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold cursor-pointer ${
                    r21Stake === amt
                      ? "bg-amber-400 text-slate-950"
                      : "bg-white/5 text-amber-200 border border-white/10"
                  }`}
                >
                  {amt} 🪙
                </button>
              ))}
            </div>
          </div>

          {r21State === "idle" ? (
            <div className="py-10 text-center space-y-4">
              <p className="text-sm text-slate-300 max-w-lg mx-auto">
                Build a theatrical slate closest to <strong>21</strong> without busting.{" "}
                <strong>Oscar Wildcard Aces</strong> automatically adjust between 11 and 1, and surviving 5 reels awards an instant <strong>3x Charlie Payout</strong>!
              </p>
              <button
                type="button"
                onClick={startReel21Hand}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-95 text-slate-950 font-mono text-sm font-black uppercase cursor-pointer shadow-lg"
              >
                🃏 Deal New Slate ({r21Stake} 🪙)
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Player Hand */}
                <div className="p-5 rounded-2xl bg-[#0a1326] border border-cyan-400/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-cyan-300 font-bold">
                      Your Slate ({r21PlayerHand.length}/5 Charlie Reels)
                    </span>
                    <span className="text-2xl font-mono font-black text-white">
                      {pEval.total} / 21{" "}
                      {pEval.isSoft && (
                        <span className="text-xs text-amber-300 font-normal">(Soft Ace)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r21PlayerHand.map((card, i) => (
                      <div
                        key={i}
                        className="px-3 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/50 text-xs font-mono font-bold text-white"
                      >
                        <div>{card.badge}</div>
                        <div className="text-[10px] text-cyan-200 font-normal">
                          {card.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Studio Dealer Hand */}
                <div className="p-5 rounded-2xl bg-[#180c1e] border border-rose-400/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-rose-300 font-bold">
                      Studio Dealer Slate
                    </span>
                    <span className="text-2xl font-mono font-black text-white">
                      {dVisibleEval.total}
                      {r21State === "playing" && !r21Peeked ? " + ?" : " / 21"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r21DealerHand.map((card, i) => {
                      const hidden = i === 1 && r21State === "playing" && !r21Peeked;
                      return (
                        <div
                          key={i}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-mono font-bold ${
                            hidden
                              ? "bg-black/60 border-dashed border-white/25 text-slate-400"
                              : "bg-rose-500/15 border-rose-400/50 text-white"
                          }`}
                        >
                          <div>{hidden ? "🔒 ?" : card.badge}</div>
                          <div className="text-[10px] text-rose-200 font-normal">
                            {hidden ? "Hidden Reel" : card.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {r21Summary && (
                <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-center text-sm font-mono font-bold text-amber-200">
                  {r21Summary}
                </div>
              )}

              {r21State === "playing" ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleReel21Hit(false)}
                    className="py-3 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
                  >
                    🎞️ Hit Reel
                  </button>
                  <button
                    type="button"
                    disabled={r21SafeUsed}
                    onClick={() => handleReel21Hit(true)}
                    className="py-3 px-3 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white font-mono text-xs font-black uppercase cursor-pointer"
                  >
                    🎬 Safe (+1..4)
                  </button>
                  <button
                    type="button"
                    disabled={r21Peeked}
                    onClick={handleReel21Peek}
                    className="py-3 px-3 rounded-xl bg-sky-500/25 hover:bg-sky-500/35 disabled:opacity-40 border border-sky-400/40 text-sky-200 font-mono text-xs font-bold uppercase cursor-pointer"
                  >
                    🔍 Peek (15 🪙)
                  </button>
                  <button
                    type="button"
                    onClick={handleReel21Double}
                    className="py-3 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
                  >
                    🔥 Double ({r21ActiveStake} 🪙)
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveReel21Stand(r21PlayerHand)}
                    className="col-span-2 sm:col-span-1 py-3 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
                  >
                    🛑 Stand
                  </button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={startReel21Hand}
                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-95 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer shadow-lg"
                  >
                    🔄 Deal Next Hand ({r21Stake} 🪙)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
