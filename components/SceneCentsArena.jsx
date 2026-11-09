// File: components/SceneCentsArena.jsx
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/firebase";
import { trackQuestEvent } from "@/lib/quest-tracker";
import {
  MASTER_CINEMA_CATALOG,
  FALLBACK_STILL,
  createSeededRng,
  generateDuelCode,
  buildSeededCinemaRounds,
  buildSeededClashPairs,
  computeReel21Total,
  drawSeededReel21Card,
} from "@/lib/arcade-engine";

const SESSION_BOOT_MS = Date.now();

// 5 Arena Duel Modes (all deterministic & seed-synchronized for PvP!)
const ARENA_GAME_MODES = [
  {
    id: "focus",
    icon: "🎬",
    shortTitle: "Frame Focus Duel",
    label: "🎬 Frame Focus Duel",
    roundsDesc: "5 Seeded Optical Frames",
    desc: "Both players inspect the exact same 5 cropped cinema stills. Identify early before pulling focus for maximum points.",
  },
  {
    id: "blitz",
    icon: "⚡",
    shortTitle: "Speed-Frame Blitz",
    label: "⚡ Speed-Frame Cinema Blitz",
    roundsDesc: "5 Timed Rounds (12s Clock)",
    desc: "Race a 12-second shot clock across 5 identical movie clues & stills. Faster answers bank bigger speed bonuses.",
  },
  {
    id: "clash",
    icon: "📈",
    shortTitle: "Box Office Clash",
    label: "📈 Box Office Clash Duel",
    roundsDesc: "5 Higher/Lower Matchups",
    desc: "Predict whether 5 challenger films grossed Higher or Lower worldwide than the benchmark blockbuster.",
  },
  {
    id: "showdown",
    icon: "🃏",
    shortTitle: "Director's Cut Cards",
    label: "🃏 Director's Cut Showdown",
    roundsDesc: "3-Round Tactical Hand",
    desc: "Deploy Blockbuster, Plot Twist, Method Drama, Criterion Ensemble & A24 Wildcards with 1x 70mm Overdrive.",
  },
  {
    id: "blackjack",
    icon: "🎲",
    shortTitle: "Reel 21 Duel",
    label: "🎲 Reel 21 Blackjack Duel",
    roundsDesc: "Seeded Shoe • Ace 1/11",
    desc: "Build a theatrical slate closest to 21 without busting. Features Oscar Aces (1/11), Safe Cut & Double Down.",
  },
];

const WAGER_PRESETS = [25, 50, 100, 250, 500];

const FOCUS_DUEL_STAGES = [
  { stage: 1, label: "Tight Crop", basePts: 320, scale: 2.5, blurPx: 10 },
  { stage: 2, label: "Medium Pull", basePts: 240, scale: 1.75, blurPx: 4 },
  { stage: 3, label: "Wide 35mm", basePts: 170, scale: 1.08, blurPx: 0 },
  { stage: 4, label: "Full Dossier", basePts: 110, scale: 1.0, blurPx: 0 },
];

const SHOWDOWN_DECK = [
  {
    id: "blockbuster",
    name: "Blockbuster IMAX",
    icon: "💥",
    power: 185,
    beats: ["method", "ensemble"],
    desc: "Counters Method & Ensemble (+45)",
  },
  {
    id: "twist",
    name: "Final-Act Twist",
    icon: "🌀",
    power: 185,
    beats: ["blockbuster", "ensemble"],
    desc: "Counters Blockbuster & Ensemble (+45)",
  },
  {
    id: "method",
    name: "Method Masterclass",
    icon: "🎭",
    power: 185,
    beats: ["twist", "indie"],
    desc: "Counters Plot Twist & Wildcard (+45)",
  },
  {
    id: "ensemble",
    name: "Criterion Ensemble",
    icon: "🎞️",
    power: 195,
    beats: ["method", "indie"],
    desc: "High base prestige; counters Method (+45)",
  },
  {
    id: "indie",
    name: "A24 Cult Wildcard",
    icon: "🃏",
    power: 175,
    beats: ["blockbuster", "twist"],
    desc: "55% Critic Surge (+65) + counters IMAX/Twist",
  },
];

// 4 Calibrated AI Studio Rivals
const STUDIO_BOTS = [
  {
    id: "bot_grip",
    name: "Grip-Bot v1.4",
    title: "BACKLOT ROOKIE",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=GripBot&backgroundColor=06b6d4",
    difficulty: "Rookie",
    xpBonus: 130,
    accuracy: 0.56,
    bio: "Steady backlot runner. Ideal for testing new game modes and building SceneCents.",
    accent: "border-cyan-500/40 from-cyan-950/30",
  },
  {
    id: "bot_critic",
    name: "Critic-Core 3000",
    title: "SYNDICATED REVIEWER",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=CriticCore&backgroundColor=8b5cf6",
    difficulty: "Veteran",
    xpBonus: 260,
    accuracy: 0.7,
    bio: "Sharp analytical sub-routines. Fast on Speed-Frame Blitz and Box Office Clash.",
    accent: "border-violet-500/40 from-violet-950/30",
  },
  {
    id: "bot_auteur",
    name: "Auteur-9000",
    title: "FESTIVAL GRANDMASTER",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Auteur9000&backgroundColor=f59e0b",
    difficulty: "Elite",
    xpBonus: 520,
    accuracy: 0.82,
    bio: "Trained on 10,000 Criterion spine numbers. High-accuracy visual frame recognition.",
    accent: "border-amber-500/50 from-amber-950/30",
  },
  {
    id: "bot_kubrick",
    name: "Kubrick-Omega",
    title: "MYTHIC HIGH-ROLLER",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=KubrickOmega&backgroundColor=f43f5e",
    difficulty: "Mythic",
    xpBonus: 1100,
    accuracy: 0.9,
    bio: "Demands 127 takes. Huge XP bonus for operatives sharp enough to outscore it.",
    accent: "border-rose-500/60 from-rose-950/30",
  },
];

// Benchmark Players Directory (merged with live Firestore `users` for Direct Challenges)
const BENCHMARK_PLAYERS = [
  {
    uid: "seed_1",
    displayName: "Maya Sterling",
    title: "AUTEUR DIRECTOR",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSterling&backgroundColor=b6e3f4",
  },
  {
    uid: "seed_2",
    displayName: "Lucas Vance",
    title: "EXECUTIVE PRODUCER",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=LucasVance&backgroundColor=c0aede",
  },
  {
    uid: "seed_3",
    displayName: "Elena Torres",
    title: "CHIEF ARCHIVIST",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=ElenaTorres&backgroundColor=ffdfbf",
  },
  {
    uid: "seed_4",
    displayName: "Julian Hayes",
    title: "LEAD GAFFER",
    avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=JulianHayes&backgroundColor=d1d4f9",
  },
];

// Seeded Open Challenges so the Global Lobby & Code Lookup always have playable seeded duels
const SEEDED_OPEN_CHALLENGES = [
  {
    id: "seed_chall_focus_1",
    duelCode: "DUEL-70MM",
    seed: "seed_70mm_focus_v2",
    hostUid: "seed_1",
    hostName: "Maya Sterling",
    hostTitle: "AUTEUR DIRECTOR",
    hostAvatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=MayaSterling&backgroundColor=b6e3f4",
    targetUid: null,
    targetName: null,
    gameMode: "focus",
    gameLabel: "🎬 Frame Focus Duel",
    wager: 50,
    hostScore: 1180,
    hostRoundScores: [280, 220, 240, 190, 250],
    note: "Can you spot all 5 films before Stage 3?",
    status: "open",
    isSeeded: true,
  },
  {
    id: "seed_chall_blitz_2",
    duelCode: "DUEL-2049",
    seed: "seed_2049_blitz_v2",
    hostUid: "seed_2",
    hostName: "Lucas Vance",
    hostTitle: "EXECUTIVE PRODUCER",
    hostAvatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=LucasVance&backgroundColor=c0aede",
    targetUid: null,
    targetName: null,
    gameMode: "blitz",
    gameLabel: "⚡ Speed-Frame Cinema Blitz",
    wager: 100,
    hostScore: 1620,
    hostRoundScores: [425, 375, 0, 450, 370],
    note: "Missed Round 3 — beat 1,620 pts to take my 200 🪙 pot!",
    status: "open",
    isSeeded: true,
  },
  {
    id: "seed_chall_clash_3",
    duelCode: "DUEL-IMAX",
    seed: "seed_imax_clash_v2",
    hostUid: "seed_3",
    hostName: "Elena Torres",
    hostTitle: "CHIEF ARCHIVIST",
    hostAvatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=ElenaTorres&backgroundColor=ffdfbf",
    targetUid: null,
    targetName: null,
    gameMode: "clash",
    gameLabel: "📈 Box Office Clash Duel",
    wager: 100,
    hostScore: 1290,
    hostRoundScores: [340, 320, 0, 310, 320],
    note: "4/5 correct on Global Box Office Clash.",
    status: "open",
    isSeeded: true,
  },
  {
    id: "seed_chall_r21_4",
    duelCode: "DUEL-ACE1",
    seed: "seed_ace1_r21_v2",
    hostUid: "seed_4",
    hostName: "Julian Hayes",
    hostTitle: "LEAD GAFFER",
    hostAvatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=JulianHayes&backgroundColor=d1d4f9",
    targetUid: null,
    targetName: null,
    gameMode: "blackjack",
    gameLabel: "🎲 Reel 21 Blackjack Duel",
    wager: 250,
    hostScore: 19,
    hostRoundScores: [19],
    note: "Stood on 19 Reel Points. Hit 20 or 21 to claim 500 🪙!",
    status: "open",
    isSeeded: true,
  },
];

function buildSimulatedRoundScores(seedStr, gameMode, accuracy = 0.68) {
  const rng = createSeededRng(`opp_${seedStr}_${gameMode}`);
  if (gameMode === "blackjack") {
    let cards = [drawSeededReel21Card(rng), drawSeededReel21Card(rng)];
    while (computeReel21Total(cards).total < 17) {
      cards.push(drawSeededReel21Card(rng));
    }
    const total = computeReel21Total(cards).total;
    const score = total > 21 ? 0 : total;
    return { totalScore: score, roundScores: [score], cards };
  }
  if (gameMode === "showdown") {
    const scores = [0, 1, 2].map(() => 175 + Math.floor(rng() * 55 * accuracy));
    return {
      totalScore: scores.reduce((a, b) => a + b, 0),
      roundScores: scores,
    };
  }
  const rounds = [0, 1, 2, 3, 4].map(() => {
    const hit = rng() < accuracy;
    if (!hit) return 0;
    const base = gameMode === "focus" ? 210 : 250;
    const speed = Math.floor(rng() * 170);
    return base + speed;
  });
  return {
    totalScore: rounds.reduce((a, b) => a + b, 0),
    roundScores: rounds,
  };
}

export default function SceneCentsArena({
  user,
  walletCoins = 150,
  xpMultiplier = 1.0,
  onEconomyChange,
  onBalanceUpdate,
  initialTab = "pvp",
  initialDuelCode = "",
  initialOpponent = null,
}) {
  const [arenaTab, setArenaTab] = useState(initialTab); // 'pvp' | 'inbox' | 'bots'
  const [selectedGame, setSelectedGame] = useState("focus");
  const [wagerAmount, setWagerAmount] = useState(50);
  const [challengeNote, setChallengeNote] = useState("");

  // Player directory & Direct Challenge Target
  const [directoryPlayers, setDirectoryPlayers] = useState(BENCHMARK_PLAYERS);
  const [playerSearch, setPlayerSearch] = useState("");
  const [targetOpponent, setTargetOpponent] = useState(initialOpponent);

  // Sync deep-linked opponent or duel code if URL query params change
  const [prevInitCode, setPrevInitCode] = useState(initialDuelCode);
  const [duelCodeInput, setDuelCodeInput] = useState(initialDuelCode || "");
  if (initialDuelCode !== prevInitCode) {
    setPrevInitCode(initialDuelCode);
    if (initialDuelCode) {
      setDuelCodeInput(initialDuelCode.toUpperCase());
      setArenaTab("inbox");
    }
  }

  const [prevInitOppKey, setPrevInitOppKey] = useState(
    initialOpponent
      ? `${initialOpponent.uid}_${initialOpponent.displayName || initialOpponent.name}`
      : ""
  );
  const currInitOppKey = initialOpponent
    ? `${initialOpponent.uid}_${initialOpponent.displayName || initialOpponent.name}`
    : "";
  if (currInitOppKey !== prevInitOppKey) {
    setPrevInitOppKey(currInitOppKey);
    if (initialOpponent) {
      setTargetOpponent({
        uid: initialOpponent.uid,
        displayName: initialOpponent.displayName || initialOpponent.name,
        avatar: initialOpponent.avatar,
      });
      setArenaTab("pvp");
    }
  }

  // Cinema Deck Pool (Live TMDB + Master Catalog)
  const [cinemaPool, setCinemaPool] = useState(MASTER_CINEMA_CATALOG);

  // Cloud + Local Challenges State
  const [cloudChallenges, setCloudChallenges] = useState([]);
  const [localChallenges, setLocalChallenges] = useState([]);
  const [dismissedSeedIds, setDismissedSeedIds] = useState([]);
  const [justCreatedChallenge, setJustCreatedChallenge] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);

  // Active Match Engine State
  const [activeMatch, setActiveMatch] = useState(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [playerRoundScores, setPlayerRoundScores] = useState([]);
  const [oppDisplayScore, setOppDisplayScore] = useState(0);

  // Mode-Specific Interactive States
  const [focusStage, setFocusStage] = useState(1);
  const [selectedOption, setSelectedOption] = useState(null);
  const [shotClock, setShotClock] = useState(12);
  const shotClockRef = useRef(null);

  // Showdown 5-card tactical hand
  const [sdAvailableIds, setSdAvailableIds] = useState(SHOWDOWN_DECK.map((c) => c.id));
  const [sdOverdriveArmed, setSdOverdriveArmed] = useState(false);
  const [sdOverdriveUsed, setSdOverdriveUsed] = useState(false);
  const [sdLastClash, setSdLastClash] = useState(null);
  const [sdBusy, setSdBusy] = useState(false);

  // Reel 21 Duel State & Monotonic Sequence Counter
  const [r21Hand, setR21Hand] = useState([]);
  const [r21SafeUsed, setR21SafeUsed] = useState(false);
  const [r21Done, setR21Done] = useState(false);
  const [duelSeq, setDuelSeq] = useState(1);

  // Unified economy mutator (supports both onEconomyChange & legacy onBalanceUpdate)
  const updateEconomy = useCallback(
    async (deltaCoins, rawXp = 0) => {
      const boostedXp = rawXp > 0 ? Math.round(rawXp * xpMultiplier) : 0;
      if (onEconomyChange) {
        onEconomyChange({ deltaCoins, deltaXp: boostedXp });
      } else if (onBalanceUpdate) {
        onBalanceUpdate(deltaCoins, boostedXp);
      }

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
    [user, xpMultiplier, onEconomyChange, onBalanceUpdate]
  );

  // Hydrate Live TMDB + Master Cinema Deck
  useEffect(() => {
    let cancelled = false;
    const raf = requestAnimationFrame(async () => {
      try {
        const res = await fetch("/api/arcade/deck");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.items) && data.items.length >= 12) {
          setCinemaPool(data.items);
        }
      } catch {
        // Offline catalog active
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  // Load Firestore Player Directory for Direct Player Search
  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    const raf = requestAnimationFrame(async () => {
      try {
        const snap = await getDocs(query(collection(db, "users"), limit(30)));
        if (cancelled) return;
        const liveUsers = [];
        snap.forEach((d) => {
          const data = d.data();
          const name =
            data.displayName ||
            data.username ||
            (data.email ? data.email.split("@")[0] : null);
          if (!name) return;
          liveUsers.push({
            uid: d.id,
            displayName: name,
            title: "STUDIO OPERATIVE",
            avatar:
              data.avatarUrl ||
              data.photoURL ||
              `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4`,
          });
        });
        const seen = new Set(liveUsers.map((u) => u.displayName.toLowerCase()));
        const merged = [
          ...liveUsers,
          ...BENCHMARK_PLAYERS.filter((b) => !seen.has(b.displayName.toLowerCase())),
        ];
        setDirectoryPlayers(merged);
      } catch {
        // Keep benchmark directory
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  // Subscribe to Live Firestore `arena_challenges`
  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, "arena_challenges"), limit(40));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const items = [];
          snap.forEach((docSnap) => {
            items.push({
              id: docSnap.id,
              ...docSnap.data(),
              isCloud: true,
            });
          });
          items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
          setCloudChallenges(items);
        },
        () => {
          // Graceful local fallback
        }
      );
      return () => unsub();
    } catch {
      // Ignore subscription error
    }
  }, []);

  // Combined Challenges Lists
  const allChallenges = useMemo(() => {
    const cloudIds = new Set(cloudChallenges.map((c) => c.duelCode));
    const filteredLocal = localChallenges.filter((l) => !cloudIds.has(l.duelCode));
    const activeSeeds = SEEDED_OPEN_CHALLENGES.filter(
      (s) => !dismissedSeedIds.includes(s.id) && !cloudIds.has(s.duelCode)
    );
    return [...cloudChallenges, ...filteredLocal, ...activeSeeds];
  }, [cloudChallenges, localChallenges, dismissedSeedIds]);

  const openLobbyChallenges = useMemo(
    () =>
      allChallenges.filter(
        (c) =>
          c.status === "open" &&
          (!c.targetUid || (user && c.targetUid === user.uid) || c.hostUid === user?.uid)
      ),
    [allChallenges, user]
  );

  const incomingForUser = useMemo(
    () =>
      allChallenges.filter(
        (c) =>
          c.status === "open" &&
          user &&
          (c.targetUid === user.uid ||
            (c.targetName &&
              user.displayName &&
              c.targetName.toLowerCase() === user.displayName.toLowerCase()))
      ),
    [allChallenges, user]
  );

  const mySentChallenges = useMemo(
    () =>
      allChallenges.filter(
        (c) =>
          (user && c.hostUid === user.uid) ||
          (!user && c.hostUid === "guest_local")
      ),
    [allChallenges, user]
  );

  const filteredDirectory = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    return directoryPlayers
      .filter((p) => !user || p.uid !== user.uid)
      .filter((p) => !q || p.displayName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [directoryPlayers, playerSearch, user]);

  // Shot Clock for Focus, Blitz & Clash Active Rounds
  useEffect(() => {
    if (
      !activeMatch ||
      activeMatch.finished ||
      selectedOption !== null ||
      !["focus", "blitz", "clash"].includes(activeMatch.gameMode)
    ) {
      return;
    }

    shotClockRef.current = setInterval(() => {
      setShotClock((prev) => {
        if (prev <= 1) {
          clearInterval(shotClockRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(shotClockRef.current);
  }, [activeMatch, roundIdx, selectedOption]);

  // Copy helper for Duel Code / Link
  const copyToClipboard = async (text, label = "Duel Link") => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`, { icon: "🔗" });
    } catch {
      toast(`${label}: ${text}`, { icon: "📋" });
    }
  };

  // Initialize & Launch Any Seeded Match
  const launchSeededMatch = ({
    role, // 'host_creating' | 'challenger_accepting' | 'vs_bot'
    gameMode,
    seed,
    duelCode,
    wager,
    opponentName,
    opponentTitle,
    opponentAvatar,
    opponentUid = null,
    targetOpponentObj = null,
    hostScore = null,
    hostRoundScores = [],
    challengeDoc = null,
    xpBonus = 260,
    accuracy = 0.7,
    note = "",
  }) => {
    const modeMeta =
      ARENA_GAME_MODES.find((m) => m.id === gameMode) || ARENA_GAME_MODES[0];

    const cinemaRounds = buildSeededCinemaRounds(cinemaPool, seed, 5);
    const clashPairs = buildSeededClashPairs(cinemaPool, seed, "boxoffice", 5);
    const simOpp =
      role === "challenger_accepting" && typeof hostScore === "number"
        ? { totalScore: hostScore, roundScores: hostRoundScores || [] }
        : buildSimulatedRoundScores(seed, gameMode, accuracy);

    // Prepare Reel 21 seeded opening deal if mode === 'blackjack'
    const p1 = drawSeededReel21Card(createSeededRng(`r21_shoe_${seed}_0`));
    const p2 = drawSeededReel21Card(createSeededRng(`r21_shoe_${seed}_1`));

    setActiveMatch({
      role,
      gameMode,
      gameLabel: modeMeta.label,
      seed,
      duelCode,
      wager,
      pot: wager * 2,
      opponentName,
      opponentTitle,
      opponentAvatar,
      opponentUid,
      targetOpponentObj,
      hostScore: simOpp.totalScore,
      hostRoundScores: simOpp.roundScores,
      challengeDoc,
      xpBonus,
      note,
      cinemaRounds,
      clashPairs,
      finished: false,
      outcome: null,
      finalSummary: "",
    });

    setRoundIdx(0);
    setPlayerScore(0);
    setPlayerRoundScores([]);
    setOppDisplayScore(0);
    setFocusStage(1);
    setSelectedOption(null);
    setShotClock(12);
    setSdAvailableIds(SHOWDOWN_DECK.map((c) => c.id));
    setSdOverdriveArmed(false);
    setSdOverdriveUsed(false);
    setSdLastClash(null);
    setSdBusy(false);
    setR21Hand([p1, p2]);
    setR21SafeUsed(false);
    setR21Done(false);
  };

  // Start Creating a Real PvP Challenge (Host Plays Seed First & Escrows Wager)
  const handleStartHostChallenge = async () => {
    if (walletCoins < wagerAmount) {
      toast.error(
        `Insufficient SceneCents! You need ${wagerAmount} 🪙 to escrow this challenge.`
      );
      return;
    }

    setJustCreatedChallenge(null);
    await updateEconomy(-wagerAmount, 0);

    const nextSeq = duelSeq + 1;
    setDuelSeq(nextSeq);
    const ticketStamp = SESSION_BOOT_MS + nextSeq * 97 + walletCoins * 13;
    const duelCode = generateDuelCode(ticketStamp);
    const seed = `pvp_${duelCode}_${ticketStamp}`;

    launchSeededMatch({
      role: "host_creating",
      gameMode: selectedGame,
      seed,
      duelCode,
      wager: wagerAmount,
      opponentName: targetOpponent ? targetOpponent.displayName : "Open Challenger",
      opponentTitle: targetOpponent ? "DIRECT CHALLENGE TARGET" : "GLOBAL WAGER LOBBY",
      opponentAvatar:
        targetOpponent?.avatar ||
        "https://api.dicebear.com/7.x/adventurer/svg?seed=OpenArena&backgroundColor=c0aede",
      opponentUid: targetOpponent?.uid || null,
      targetOpponentObj: targetOpponent || null,
      xpBonus: 280,
      note: challengeNote.trim(),
    });
  };

  // Accept an Existing Open or Direct Challenge
  const handleAcceptChallenge = async (chall) => {
    if (!chall) return;
    if (user && chall.hostUid === user.uid) {
      toast.error("That is your own open challenge! Share its Duel Code with a friend.");
      return;
    }
    if (walletCoins < chall.wager) {
      toast.error(
        `You need ${chall.wager} SceneCents to accept ${chall.hostName}'s challenge!`
      );
      return;
    }

    await updateEconomy(-chall.wager, 0);

    launchSeededMatch({
      role: "challenger_accepting",
      gameMode: chall.gameMode || "focus",
      seed: chall.seed || `fallback_${chall.id}`,
      duelCode: chall.duelCode || "DUEL-LIVE",
      wager: chall.wager,
      opponentName: chall.hostName || "Studio Director",
      opponentTitle: chall.hostTitle || "CHALLENGE HOST",
      opponentAvatar:
        chall.hostAvatar ||
        "https://api.dicebear.com/7.x/adventurer/svg?seed=HostDirector&backgroundColor=b6e3f4",
      opponentUid: chall.hostUid || null,
      hostScore: typeof chall.hostScore === "number" ? chall.hostScore : 980,
      hostRoundScores: Array.isArray(chall.hostRoundScores) ? chall.hostRoundScores : [],
      challengeDoc: chall,
      xpBonus: 340,
    });
  };

  // Lookup & Accept by 6-Character Duel Code
  const handleJoinByDuelCode = async (e) => {
    e?.preventDefault?.();
    const raw = duelCodeInput.trim().toUpperCase();
    if (!raw) {
      toast.error("Enter a Duel Code (for example DUEL-70MM)!");
      return;
    }
    const normalized = raw.startsWith("DUEL-") ? raw : `DUEL-${raw}`;

    let found = allChallenges.find(
      (c) => c.duelCode?.toUpperCase() === normalized && c.status === "open"
    );

    if (!found && db) {
      try {
        const snap = await getDocs(
          query(
            collection(db, "arena_challenges"),
            where("duelCode", "==", normalized),
            limit(3)
          )
        );
        snap.forEach((d) => {
          const data = d.data();
          if (data.status === "open" && !found) {
            found = { id: d.id, ...data, isCloud: true };
          }
        });
      } catch {
        // Fallback to local lookup
      }
    }

    if (!found) {
      toast.error(`No open challenge found with code "${normalized}".`);
      return;
    }

    handleAcceptChallenge(found);
  };

  // Host Cancels Their Unaccepted Open Challenge -> Full Escrow Refund
  const handleCancelChallenge = async (chall) => {
    if (!chall || chall.status !== "open") return;
    await updateEconomy(chall.wager, 0);

    if (chall.isCloud && db) {
      try {
        await updateDoc(doc(db, "arena_challenges", chall.id), {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
        });
      } catch {
        // Ignore
      }
    } else {
      setLocalChallenges((prev) => prev.filter((c) => c.id !== chall.id));
    }

    toast.success(`Challenge ${chall.duelCode} cancelled — ${chall.wager} 🪙 refunded!`, {
      icon: "↩️",
    });
  };

  // Finalize Any Match (Host Posting Score, Challenger Settling Pot, or Bot Duel)
  const finalizeMatch = async (finalPlayerScore, finalRoundScores, matchOverride) => {
    const m = matchOverride || activeMatch;
    if (!m) return;

    trackQuestEvent(["trivia_duel_3", "week_trivia_master_15"], 1);

    // CASE 1: Host just finished setting the benchmark score for a new PvP Challenge!
    if (m.role === "host_creating") {
      const challengePayload = {
        duelCode: m.duelCode,
        seed: m.seed,
        hostUid: user?.uid || "guest_local",
        hostName: user?.displayName || "Director Operative",
        hostTitle: "CHALLENGE HOST",
        hostAvatar:
          user?.photoURL ||
          "https://api.dicebear.com/7.x/adventurer/svg?seed=CyberDirector&backgroundColor=b6e3f4",
        targetUid: m.targetOpponentObj?.uid || null,
        targetName: m.targetOpponentObj?.displayName || null,
        gameMode: m.gameMode,
        gameLabel: m.gameLabel,
        wager: m.wager,
        hostScore: finalPlayerScore,
        hostRoundScores: finalRoundScores,
        note: m.note || "",
        status: "open",
        createdAtMs: SESSION_BOOT_MS + duelSeq * 1000 + finalPlayerScore,
      };

      let savedId = `local_${m.duelCode}_${duelSeq}`;
      if (db && user) {
        try {
          const ref = await addDoc(collection(db, "arena_challenges"), {
            ...challengePayload,
            createdAt: serverTimestamp(),
          });
          savedId = ref.id;
        } catch {
          // Keep in localChallenges if offline
        }
      }

      const createdRecord = { id: savedId, ...challengePayload };
      setLocalChallenges((prev) => [createdRecord, ...prev]);
      setJustCreatedChallenge(createdRecord);

      const hostXp = await updateEconomy(0, 140);
      setActiveMatch((prev) =>
        prev
          ? {
              ...prev,
              finished: true,
              outcome: "hosted",
              finalPlayerScore,
              earnedXp: hostXp,
              finalSummary: `Benchmark locked at ${finalPlayerScore.toLocaleString()} pts! Share code ${m.duelCode} — winner takes ${m.pot} 🪙.`,
            }
          : null
      );

      toast.success(
        `Challenge ${m.duelCode} Live! Score locked: ${finalPlayerScore} pts (+${hostXp} XP).`,
        { icon: "📡" }
      );
      return;
    }

    // CASE 2: Challenger Accepting a Real PvP Challenge OR Playing vs AI Rival
    const oppTarget = m.hostScore ?? 0;
    const outcome =
      finalPlayerScore > oppTarget
        ? "win"
        : finalPlayerScore < oppTarget
          ? "loss"
          : "push";

    let deltaCoins = 0;
    let rawXp = 45;

    if (outcome === "win") {
      deltaCoins = m.wager * 2;
      rawXp = m.xpBonus || 280;
    } else if (outcome === "push") {
      deltaCoins = m.wager;
      rawXp = 90;
    }

    const boostedXp = await updateEconomy(deltaCoins, rawXp);

    // Settle Cloud / Seeded PvP Challenge Document & Credit Host if Host Defended!
    if (m.role === "challenger_accepting" && m.challengeDoc) {
      const cDoc = m.challengeDoc;
      if (cDoc.isSeeded) {
        setDismissedSeedIds((prev) => [...prev, cDoc.id]);
      } else {
        setLocalChallenges((prev) =>
          prev.map((item) =>
            item.id === cDoc.id
              ? {
                  ...item,
                  status: "completed",
                  challengerScore: finalPlayerScore,
                  challengerName: user?.displayName || "Challenger",
                  winnerUid:
                    outcome === "win"
                      ? user?.uid || "challenger"
                      : outcome === "loss"
                        ? cDoc.hostUid
                        : "tie",
                }
              : item
          )
        );
      }

      if (cDoc.isCloud && db) {
        try {
          await updateDoc(doc(db, "arena_challenges", cDoc.id), {
            status: "completed",
            challengerUid: user?.uid || "guest",
            challengerName: user?.displayName || "Challenger Operative",
            challengerScore: finalPlayerScore,
            winnerUid:
              outcome === "win"
                ? user?.uid || "challenger"
                : outcome === "loss"
                  ? cDoc.hostUid
                  : "tie",
            completedAt: serverTimestamp(),
          });

          // Credit real Firestore Host if Host won or tied!
          if (
            cDoc.hostUid &&
            !String(cDoc.hostUid).startsWith("seed_") &&
            cDoc.hostUid !== "guest_local"
          ) {
            if (outcome === "loss") {
              await setDoc(
                doc(db, "users", cDoc.hostUid),
                { coins: increment(m.wager * 2), xp: increment(220) },
                { merge: true }
              );
            } else if (outcome === "push") {
              await setDoc(
                doc(db, "users", cDoc.hostUid),
                { coins: increment(m.wager), xp: increment(75) },
                { merge: true }
              );
            }
          }
        } catch {
          // Non-fatal
        }
      }
    }

    if (outcome === "win") {
      toast.success(
        `VICTORY vs. ${m.opponentName}! Won ${m.wager * 2} 🪙 Pot & +${boostedXp} XP!`,
        { icon: "🏆" }
      );
    } else if (outcome === "push") {
      toast(`Exact Tie (${finalPlayerScore} pts)! Your ${m.wager} 🪙 wager was refunded.`, {
        icon: "🤝",
      });
    } else {
      toast.error(
        `${m.opponentName} won (${oppTarget} vs. ${finalPlayerScore}). +${boostedXp} XP.`
      );
    }

    const summaryText = `Final Score: You ${finalPlayerScore.toLocaleString()} — ${oppTarget.toLocaleString()} ${m.opponentName}`;

    setActiveMatch((prev) =>
      prev
        ? {
            ...prev,
            finished: true,
            outcome,
            finalPlayerScore,
            earnedXp: boostedXp,
            finalSummary: summaryText,
          }
        : null
    );

    setMatchHistory((prev) => [
      {
        id: `mh_${m.duelCode}_${duelSeq}_${prev.length}`,
        opponent: m.opponentName,
        mode: m.gameLabel,
        outcome,
        netCoins:
          outcome === "win" ? `+${m.wager}` : outcome === "push" ? "0" : `-${m.wager}`,
      },
      ...prev.slice(0, 5),
    ]);
  };

  // =========================================================================
  // INTERACTIVE ROUND HANDLERS FOR ALL 5 ARENA DUEL MODES
  // =========================================================================
  const advanceFiveRoundGame = (earnedPts) => {
    const nextTotal = playerScore + earnedPts;
    const nextRounds = [...playerRoundScores, earnedPts];
    const oppRoundPts = activeMatch?.hostRoundScores?.[roundIdx] ?? 0;
    const nextOppTotal = oppDisplayScore + oppRoundPts;

    setPlayerScore(nextTotal);
    setPlayerRoundScores(nextRounds);
    if (activeMatch?.role !== "host_creating") {
      setOppDisplayScore(nextOppTotal);
    }

    setTimeout(() => {
      if (roundIdx + 1 >= 5) {
        finalizeMatch(nextTotal, nextRounds);
      } else {
        setRoundIdx((r) => r + 1);
        setFocusStage(1);
        setSelectedOption(null);
        setShotClock(12);
      }
    }, 1250);
  };

  const handleFocusOrBlitzPick = (option) => {
    if (!activeMatch || activeMatch.finished || selectedOption !== null) return;
    clearInterval(shotClockRef.current);
    setSelectedOption(option);

    const roundObj = activeMatch.cinemaRounds[roundIdx];
    const isCorrect = option === roundObj.answer;

    let pts = 0;
    if (isCorrect) {
      if (activeMatch.gameMode === "focus") {
        const stMeta = FOCUS_DUEL_STAGES[focusStage - 1] || FOCUS_DUEL_STAGES[0];
        pts = stMeta.basePts + shotClock * 10;
      } else {
        pts = 260 + shotClock * 22;
      }
    } else {
      setFocusStage(4);
    }

    advanceFiveRoundGame(pts);
  };

  const handleClashDuelPick = (dir) => {
    if (!activeMatch || activeMatch.finished || selectedOption !== null) return;
    clearInterval(shotClockRef.current);
    setSelectedOption(dir);

    const pair = activeMatch.clashPairs[roundIdx];
    const isWin =
      dir === "higher"
        ? pair.right.grossMillions >= pair.left.grossMillions
        : pair.right.grossMillions <= pair.left.grossMillions;

    const pts = isWin ? 280 + shotClock * 18 : 0;
    advanceFiveRoundGame(pts);
  };

  const handlePlayShowdownCard = (card) => {
    if (!activeMatch || activeMatch.finished || sdBusy) return;
    setSdBusy(true);

    const rng = createSeededRng(`${activeMatch.seed}_sd_${roundIdx}`);
    const oppCard = SHOWDOWN_DECK[Math.floor(rng() * SHOWDOWN_DECK.length)];

    let myPts = card.power + Math.floor(rng() * 25);
    if (sdOverdriveArmed) {
      myPts += 40;
      setSdOverdriveArmed(false);
      setSdOverdriveUsed(true);
    }

    let note = "Neutral Frame Clash";
    if (card.id === "indie" && rng() < 0.55) {
      myPts += 65;
      note = "A24 Cult Critic Surge (+65)!";
    } else if (card.beats.includes(oppCard.id)) {
      myPts += 45;
      note = `${card.name} countered ${oppCard.name} (+45)!`;
    } else if (oppCard.beats.includes(card.id)) {
      myPts = Math.max(90, myPts - 25);
      note = `${oppCard.name} countered your ${card.name}!`;
    }

    const oppRoundPts =
      activeMatch.role === "host_creating"
        ? oppCard.power + Math.floor(rng() * 25)
        : activeMatch.hostRoundScores?.[roundIdx] ?? 195;

    setSdAvailableIds((prev) => prev.filter((id) => id !== card.id));
    setSdLastClash({ card, oppCard, myPts, oppRoundPts, note });

    const nextTotal = playerScore + myPts;
    const nextRounds = [...playerRoundScores, myPts];
    const nextOppTotal = oppDisplayScore + oppRoundPts;

    setPlayerScore(nextTotal);
    setPlayerRoundScores(nextRounds);
    if (activeMatch.role !== "host_creating") {
      setOppDisplayScore(nextOppTotal);
    }

    setTimeout(() => {
      setSdBusy(false);
      if (roundIdx + 1 >= 3) {
        finalizeMatch(nextTotal, nextRounds);
      } else {
        setRoundIdx((r) => r + 1);
      }
    }, 1150);
  };

  const handleR21Hit = (safe = false) => {
    if (!activeMatch || r21Done) return;
    if (safe) setR21SafeUsed(true);
    const stepRng = createSeededRng(
      `r21_shoe_${activeMatch.seed}_${r21Hand.length}_${safe ? "s" : "n"}`
    );
    const nextCard = drawSeededReel21Card(stepRng, safe);
    const nextHand = [...r21Hand, nextCard];
    setR21Hand(nextHand);

    const { total } = computeReel21Total(nextHand);
    if (total > 21) {
      setR21Done(true);
      finalizeMatch(0, [0]);
    } else if (nextHand.length >= 5) {
      // 5-Reel Charlie scores 22 (beats regular 21!)
      setR21Done(true);
      finalizeMatch(22, [22]);
    } else if (total === 21) {
      setR21Done(true);
      finalizeMatch(21, [21]);
    }
  };

  const handleR21Stand = (handOverride, matchOverride) => {
    const h = handOverride || r21Hand;
    const { total } = computeReel21Total(h);
    setR21Done(true);
    finalizeMatch(total > 21 ? 0 : total, [total > 21 ? 0 : total], matchOverride);
  };

  const handleR21Double = async () => {
    if (!activeMatch || r21Done || activeMatch.role === "challenger_accepting") return;
    if (walletCoins < activeMatch.wager) {
      toast.error(`Need ${activeMatch.wager} 🪙 to Double Down!`);
      return;
    }
    await updateEconomy(-activeMatch.wager, 0);
    const doubled = {
      ...activeMatch,
      wager: activeMatch.wager * 2,
      pot: activeMatch.pot * 2,
    };
    setActiveMatch(doubled);
    const dblRng = createSeededRng(`r21_shoe_${activeMatch.seed}_${r21Hand.length}_dbl`);
    const card = drawSeededReel21Card(dblRng, false);
    const nextHand = [...r21Hand, card];
    setR21Hand(nextHand);
    handleR21Stand(nextHand, doubled);
  };

  const r21Eval = computeReel21Total(r21Hand);

  return (
    <section className="studio-panel rounded-3xl p-5 sm:p-8 border border-violet-400/30 space-y-6 relative overflow-hidden">
      {/* Top Arena Navigation Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/50 text-[10px] font-mono font-bold uppercase text-violet-200">
              ⚔️ Seeded Head-to-Head Arena
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] font-mono text-amber-300 font-bold">
              2x SceneCents Winner-Takes-All Pot
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Challenge Players, Share Duel Codes, or Battle Studio AI
          </h2>
          <p className="text-xs text-slate-400">
            Both players get the exact same movie frames and cards from a shared deterministic seed. Highest score wins the pot.
          </p>
        </div>

        {/* Clean 3-Pill Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/50 p-1.5 rounded-2xl border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => {
              setArenaTab("pvp");
              setActiveMatch(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              arenaTab === "pvp"
                ? "bg-violet-500 text-white shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            ⚔️ Challenge Players ({openLobbyChallenges.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setArenaTab("inbox");
              setActiveMatch(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              arenaTab === "inbox"
                ? "bg-cyan-400 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <span>📥 Duel Code / Inbox</span>
            {incomingForUser.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                {incomingForUser.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setArenaTab("bots");
              setActiveMatch(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              arenaTab === "bots"
                ? "bg-amber-400 text-slate-950 shadow"
                : "text-slate-300 hover:text-white"
            }`}
          >
            🤖 AI Studio Rivals
          </button>
        </div>
      </div>

      {/* NEWLY CREATED CHALLENGE SHARE BANNER */}
      {justCreatedChallenge && !activeMatch && (
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase font-black text-emerald-300">
                ✓ Challenge Live &amp; Escrowed!
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-950 border border-emerald-400/50 font-mono text-xs font-black text-amber-300">
                {justCreatedChallenge.duelCode}
              </span>
            </div>
            <p className="text-xs text-slate-200">
              Your benchmark score of{" "}
              <strong>{justCreatedChallenge.hostScore} pts</strong> in{" "}
              <strong>{justCreatedChallenge.gameLabel}</strong> is live
              {justCreatedChallenge.targetName
                ? ` for ${justCreatedChallenge.targetName}`
                : " in the Open Lobby"}
              . Send the code or link below!
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => copyToClipboard(justCreatedChallenge.duelCode, "Duel Code")}
              className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-white/20 text-xs font-mono font-bold text-white cursor-pointer"
            >
              📋 Copy {justCreatedChallenge.duelCode}
            </button>
            <button
              type="button"
              onClick={() => {
                const origin =
                  typeof window !== "undefined" ? window.location.origin : "";
                copyToClipboard(
                  `${origin}/arcade?tab=pvp&code=${justCreatedChallenge.duelCode}`,
                  "Challenge Link"
                );
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-mono font-black uppercase cursor-pointer"
            >
              🔗 Copy Challenge Link
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LIVE INTERACTIVE SEEDED MATCH VIEWPORT                              */}
      {/* =================================================================== */}
      {activeMatch ? (
        <div className="rounded-3xl bg-[#060914] border-2 border-cyan-400/45 p-5 sm:p-7 space-y-6 shadow-[0_0_45px_rgba(34,211,238,0.16)]">
          {/* Top Head-to-Head Scoreboard */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-mono font-black text-cyan-200">
                {(user?.displayName || "YOU").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase text-cyan-300">
                  {activeMatch.role === "host_creating" ? "YOU (SETTING BENCHMARK)" : "YOU"}
                </div>
                <div className="text-sm font-bold text-white">
                  {user?.displayName || "Director Operative"}
                </div>
                <div className="text-xs font-mono text-emerald-300 font-bold">
                  Score: {activeMatch.gameMode === "blackjack" ? r21Eval.total : playerScore} pts
                </div>
              </div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/50 text-center">
              <div className="text-[10px] font-mono uppercase text-amber-200">
                {activeMatch.gameLabel} • {activeMatch.duelCode}
              </div>
              <div className="text-base sm:text-lg font-mono font-black text-amber-300">
                🏆 POT: {activeMatch.pot} 🪙
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-rose-300">
                  {activeMatch.opponentTitle}
                </div>
                <div className="text-sm font-bold text-white">
                  {activeMatch.opponentName}
                </div>
                <div className="text-xs font-mono text-rose-300 font-bold">
                  {activeMatch.role === "host_creating"
                    ? "Plays Your Seed Next"
                    : activeMatch.gameMode === "blackjack"
                      ? activeMatch.finished
                        ? `Target: ${activeMatch.hostScore} pts`
                        : "Target: Locked Slate"
                      : `Pace: ${oppDisplayScore} pts`}
                </div>
              </div>
              <Image
                src={activeMatch.opponentAvatar}
                alt={activeMatch.opponentName}
                width={44}
                height={44}
                unoptimized
                className="w-11 h-11 rounded-xl border border-rose-400/60 bg-slate-950 object-cover"
              />
            </div>
          </div>

          {/* MATCH FINISHED SCREEN */}
          {activeMatch.finished ? (
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/15 text-center space-y-4">
              <div className="text-4xl">
                {activeMatch.outcome === "hosted"
                  ? "📡"
                  : activeMatch.outcome === "win"
                    ? "👑"
                    : activeMatch.outcome === "push"
                      ? "🤝"
                      : "🎞️"}
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                {activeMatch.outcome === "hosted"
                  ? `Challenge ${activeMatch.duelCode} Ready for Challenger!`
                  : activeMatch.outcome === "win"
                    ? `Victory! You Claimed ${activeMatch.pot} SceneCents!`
                    : activeMatch.outcome === "push"
                      ? `Deadlock Draw! ${activeMatch.wager} 🪙 Refunded`
                      : `${activeMatch.opponentName} Won the Duel`}
              </h3>
              <p className="text-xs sm:text-sm font-mono text-cyan-300">
                {activeMatch.finalSummary}
              </p>

              {activeMatch.outcome === "hosted" && (
                <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeMatch.duelCode, "Duel Code")}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/20 text-xs font-mono font-bold text-white cursor-pointer"
                  >
                    📋 Copy Code ({activeMatch.duelCode})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const origin =
                        typeof window !== "undefined" ? window.location.origin : "";
                      copyToClipboard(
                        `${origin}/arcade?tab=pvp&code=${activeMatch.duelCode}`,
                        "Challenge Link"
                      );
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-mono font-black uppercase cursor-pointer"
                  >
                    🔗 Copy Shareable Challenge Link
                  </button>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMatch(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold uppercase cursor-pointer"
                >
                  ← Back to Challenge Lobby
                </button>
              </div>
            </div>
          ) : activeMatch.gameMode === "focus" || activeMatch.gameMode === "blitz" ? (
            /* LIVE SEEDED FRAME FOCUS OR SPEED-FRAME BLITZ */
            (() => {
              const round = activeMatch.cinemaRounds[roundIdx];
              const isFocus = activeMatch.gameMode === "focus";
              const stMeta = FOCUS_DUEL_STAGES[focusStage - 1] || FOCUS_DUEL_STAGES[0];
              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-black/50 px-4 py-2.5 rounded-xl border border-white/10">
                    <span className="text-cyan-300 font-bold">
                      Seeded Round {roundIdx + 1} / 5
                    </span>
                    {shotClock === 0 && !selectedOption ? (
                      <button
                        type="button"
                        onClick={() => handleFocusOrBlitzPick("__TIMEOUT__")}
                        className="px-3 py-1 rounded bg-rose-500 text-white font-bold cursor-pointer"
                      >
                        Time Up — Next Frame →
                      </button>
                    ) : (
                      <span
                        className={`font-black ${
                          shotClock <= 4 ? "text-rose-400 animate-pulse" : "text-amber-300"
                        }`}
                      >
                        ⏱️ {shotClock}s Speed Bonus
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                    <div className="lg:col-span-6 space-y-2.5">
                      <div className="relative h-56 sm:h-68 rounded-2xl overflow-hidden border border-white/15 bg-slate-950">
                        <Image
                          src={round.backdrop || FALLBACK_STILL}
                          alt="Seeded Duel Frame"
                          fill
                          unoptimized
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          style={
                            isFocus
                              ? {
                                  transformOrigin: `${round.focalX}% ${round.focalY}%`,
                                  transform: `scale(${selectedOption ? 1.0 : stMeta.scale})`,
                                  filter: `blur(${selectedOption ? 0 : stMeta.blurPx}px)`,
                                  transition: "transform 0.45s ease, filter 0.45s ease",
                                }
                              : undefined
                          }
                          className="object-cover"
                        />
                        {isFocus && (
                          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/85 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 font-bold">
                            Stage {focusStage}/4: {stMeta.label} (+{stMeta.basePts} pts)
                          </div>
                        )}
                      </div>

                      {isFocus && (
                        <button
                          type="button"
                          disabled={focusStage >= 4 || Boolean(selectedOption)}
                          onClick={() => setFocusStage((s) => Math.min(4, s + 1))}
                          className="w-full py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-400/40 text-amber-200 font-mono text-xs font-bold uppercase cursor-pointer"
                        >
                          {focusStage >= 4
                            ? "Full Frame Visible"
                            : `🔍 Pull Focus to Stage ${focusStage + 1}`}
                        </button>
                      )}
                    </div>

                    <div className="lg:col-span-6 space-y-3">
                      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-slate-200 leading-relaxed">
                        {isFocus && focusStage < 3 ? (
                          <span className="font-mono text-slate-400">
                            Era Hint: {Math.floor(round.year / 10) * 10}s • {round.genre} (Pull Focus to Stage 3 for plot clue, or answer now for +{stMeta.basePts} base pts!)
                          </span>
                        ) : (
                          round.clue
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {round.options.map((opt) => {
                          const isAns = opt === round.answer;
                          const isPicked = selectedOption === opt;
                          let cls =
                            "bg-[#0d1428] hover:bg-cyan-500/15 border-white/15 hover:border-cyan-400 text-white";
                          if (selectedOption) {
                            if (isAns)
                              cls = "bg-emerald-950 border-emerald-400 text-emerald-200";
                            else if (isPicked)
                              cls = "bg-rose-950 border-rose-400 text-rose-200";
                            else cls = "bg-black/40 border-white/5 text-slate-500";
                          }
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={Boolean(selectedOption)}
                              onClick={() => handleFocusOrBlitzPick(opt)}
                              className={`p-3.5 rounded-xl border text-left text-xs font-mono font-bold transition-all cursor-pointer ${cls}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : activeMatch.gameMode === "clash" ? (
            /* LIVE SEEDED BOX OFFICE CLASH DUEL */
            (() => {
              const pair = activeMatch.clashPairs[roundIdx];
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono bg-black/50 px-4 py-2.5 rounded-xl border border-white/10">
                    <span className="text-cyan-300 font-bold">
                      Box Office Clash {roundIdx + 1} / 5
                    </span>
                    <span className="text-amber-300 font-bold">⏱️ {shotClock}s Bonus</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative h-56 rounded-2xl overflow-hidden border border-cyan-400/40 p-5 flex flex-col justify-end bg-slate-950">
                      <Image
                        src={pair.left.backdrop || pair.left.poster || FALLBACK_STILL}
                        alt={pair.left.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover opacity-50"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                      <div className="relative z-10">
                        <span className="text-[10px] font-mono uppercase text-cyan-300">
                          Benchmark ({pair.left.year})
                        </span>
                        <h4 className="text-lg font-bold text-white">{pair.left.title}</h4>
                        <p className="text-2xl font-mono font-black text-amber-300">
                          ${pair.left.grossMillions.toLocaleString()}M
                        </p>
                      </div>
                    </div>

                    <div className="relative h-56 rounded-2xl overflow-hidden border border-violet-400/40 p-5 flex flex-col justify-between bg-slate-950">
                      <Image
                        src={pair.right.backdrop || pair.right.poster || FALLBACK_STILL}
                        alt={pair.right.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover opacity-50"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
                      <span className="relative z-10 text-[10px] font-mono uppercase text-violet-300">
                        Challenger ({pair.right.year})
                      </span>
                      <div className="relative z-10 space-y-2.5">
                        <h4 className="text-lg font-bold text-white">{pair.right.title}</h4>
                        {selectedOption ? (
                          <p className="text-2xl font-mono font-black text-emerald-300">
                            ${pair.right.grossMillions.toLocaleString()}M
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleClashDuelPick("higher")}
                              className="py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
                            >
                              ▲ Higher
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClashDuelPick("lower")}
                              className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-mono text-xs font-black uppercase cursor-pointer"
                            >
                              ▼ Lower
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : activeMatch.gameMode === "showdown" ? (
            /* LIVE 5-CARD DIRECTOR'S CUT SHOWDOWN */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-black/50 px-4 py-2.5 rounded-xl border border-white/10 text-xs font-mono">
                <span className="text-cyan-300 font-bold">
                  Tactical Exchange {roundIdx + 1} / 3
                </span>
                <button
                  type="button"
                  disabled={sdOverdriveUsed || sdOverdriveArmed}
                  onClick={() => setSdOverdriveArmed(true)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${
                    sdOverdriveArmed
                      ? "bg-amber-400 text-slate-950 animate-pulse"
                      : sdOverdriveUsed
                        ? "bg-white/5 text-slate-500"
                        : "bg-amber-500/20 border border-amber-400/40 text-amber-300"
                  }`}
                >
                  {sdOverdriveArmed
                    ? "⚡ +40 Overdrive ARMED"
                    : sdOverdriveUsed
                      ? "✓ Overdrive Spent"
                      : "⚡ Arm 70mm Overdrive (+40, 1x)"}
                </button>
              </div>

              {sdLastClash && (
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-cyan-300">
                    You: {sdLastClash.card.icon} {sdLastClash.card.name} ({sdLastClash.myPts} pts)
                  </span>
                  <span className="text-amber-300 font-bold">{sdLastClash.note}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {SHOWDOWN_DECK.map((card) => {
                  const available = sdAvailableIds.includes(card.id);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      disabled={!available || sdBusy}
                      onClick={() => handlePlayShowdownCard(card)}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all ${
                        available
                          ? "bg-[#0c1326] hover:bg-[#131e3a] border-cyan-400/35 hover:border-amber-400 cursor-pointer"
                          : "bg-black/30 border-white/5 opacity-35 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{card.icon}</span>
                        <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono text-amber-300">
                          {card.power} PWR
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{card.name}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{card.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* LIVE REEL 21 BLACKJACK DUEL */
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-[#0b1326] border border-cyan-400/35 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-cyan-300 font-bold">
                    Your Seeded Reel 21 Hand {r21Eval.isSoft ? "(Soft Ace Active)" : ""}
                  </span>
                  <span className="text-2xl font-mono font-black text-white">
                    {r21Eval.total} / 21
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {r21Hand.map((card, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/50 text-xs font-mono text-white"
                    >
                      <div className="font-black text-amber-300">{card.badge}</div>
                      <div className="text-[10px] text-slate-300">{card.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  disabled={r21Done}
                  onClick={() => handleR21Hit(false)}
                  className="py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
                >
                  🎞️ Hit Reel
                </button>
                <button
                  type="button"
                  disabled={r21Done || r21SafeUsed}
                  onClick={() => handleR21Hit(true)}
                  className="py-3 px-4 rounded-xl bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white font-mono text-xs font-black uppercase cursor-pointer"
                >
                  🎬 Safe Cut (+1..4)
                </button>
                <button
                  type="button"
                  disabled={r21Done || activeMatch.role === "challenger_accepting"}
                  onClick={handleR21Double}
                  className="py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
                >
                  🔥 Double Stake
                </button>
                <button
                  type="button"
                  disabled={r21Done}
                  onClick={() => handleR21Stand()}
                  className="py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
                >
                  🛑 Lock Slate (Stand)
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================================================================= */
        /* LOBBY VIEWS: GAME & WAGER CONFIGURATOR + PVP / INBOX / AI BOTS     */
        /* ================================================================= */
        <div className="space-y-6">
          {/* Game Mode & Wager Configurator (Used for Hosting PvP & AI Duels) */}
          {arenaTab !== "inbox" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {ARENA_GAME_MODES.map((gm) => {
                  const active = selectedGame === gm.id;
                  return (
                    <button
                      key={gm.id}
                      type="button"
                      onClick={() => setSelectedGame(gm.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        active
                          ? "bg-violet-500/20 border-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                          : "bg-white/[0.02] border-white/10 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{gm.icon}</span>
                        <span className="text-[9px] font-mono text-cyan-300">
                          {gm.roundsDesc}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">{gm.shortTitle}</div>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{gm.desc}</p>
                    </button>
                  );
                })}
              </div>

              {/* Wager Stake Selector */}
              <div className="p-3.5 rounded-2xl bg-black/45 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono uppercase text-slate-300 font-semibold">
                    🪙 Wager Stake:
                  </span>
                  {WAGER_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWagerAmount(amt)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black transition-all cursor-pointer ${
                        wagerAmount === amt
                          ? "bg-amber-400 text-slate-950 shadow"
                          : "bg-white/[0.04] text-amber-300 border border-amber-400/25 hover:border-amber-400"
                      }`}
                    >
                      {amt} 🪙
                    </button>
                  ))}
                </div>
                <span className="text-xs font-mono text-emerald-300 font-bold">
                  Winner Pot: <strong className="text-amber-300">{wagerAmount * 2} 🪙</strong>
                </span>
              </div>
            </div>
          )}

          {/* TAB 1: CHALLENGE PLAYERS (DIRECT PLAYER PICKER + GLOBAL LOBBY) */}
          {arenaTab === "pvp" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 5 Cols: Create Direct or Open Challenge */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-white/[0.03] border border-violet-400/35 space-y-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-violet-300 font-bold">
                    Step 1 • Pick Target Player or Open Table
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Send a Seeded Player Challenge
                  </h3>
                </div>

                {/* Selected Target Pill */}
                <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-xs">
                  {targetOpponent ? (
                    <>
                      <span className="text-cyan-300 font-mono truncate">
                        🎯 Challenging: <strong className="text-white">{targetOpponent.displayName}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setTargetOpponent(null)}
                        className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer"
                      >
                        Switch to Open
                      </button>
                    </>
                  ) : (
                    <span className="text-slate-300 font-mono">
                      🌐 Mode: <strong className="text-emerald-300">Open Lobby + Duel Code</strong> (anyone can accept)
                    </span>
                  )}
                </div>

                {/* Search & Pick Specific Player */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    placeholder="Search player name to challenge directly..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-cyan-400 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {filteredDirectory.map((pl) => {
                      const isPicked = targetOpponent?.uid === pl.uid;
                      return (
                        <button
                          key={pl.uid}
                          type="button"
                          onClick={() =>
                            setTargetOpponent(
                              isPicked
                                ? null
                                : { uid: pl.uid, displayName: pl.displayName, avatar: pl.avatar }
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                            isPicked
                              ? "bg-cyan-400 text-slate-950 border-cyan-300 font-bold"
                              : "bg-white/[0.04] border-white/10 text-slate-300 hover:border-cyan-400/50"
                          }`}
                        >
                          ⚔️ {pl.displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <input
                  type="text"
                  maxLength={70}
                  value={challengeNote}
                  onChange={(e) => setChallengeNote(e.target.value)}
                  placeholder="Optional challenge note (e.g., Beat my Frame Focus score!)"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-violet-400 text-xs text-white placeholder-slate-500 outline-none"
                />

                <button
                  type="button"
                  onClick={handleStartHostChallenge}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 hover:opacity-95 text-slate-950 font-mono text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg"
                >
                  ⚔️ Play Seed &amp; Post {wagerAmount} 🪙 Challenge
                </button>
              </div>

              {/* Right 7 Cols: Open Player Challenges Feed */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase font-mono">
                    🌐 Active Player Challenges ({openLobbyChallenges.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setArenaTab("inbox")}
                    className="text-xs font-mono text-cyan-300 hover:underline cursor-pointer"
                  >
                    Have a Duel Code? Enter Code →
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
                  {openLobbyChallenges.map((chall) => {
                    const isMine =
                      (user && chall.hostUid === user.uid) ||
                      (!user && chall.hostUid === "guest_local");
                    return (
                      <div
                        key={chall.id}
                        className="p-4 rounded-2xl bg-black/45 border border-white/10 hover:border-cyan-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Image
                            src={
                              chall.hostAvatar ||
                              "https://api.dicebear.com/7.x/adventurer/svg?seed=Director&backgroundColor=b6e3f4"
                            }
                            alt={chall.hostName}
                            width={44}
                            height={44}
                            unoptimized
                            className="w-11 h-11 rounded-xl border border-white/15 bg-slate-950 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white truncate">
                                {chall.hostName}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] font-mono text-amber-300">
                                {chall.duelCode}
                              </span>
                              {chall.targetName && (
                                <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-[10px] font-mono text-cyan-300">
                                  → vs. {chall.targetName}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-cyan-300 mt-0.5">
                              {chall.gameLabel} • Target to Beat:{" "}
                              <strong className="text-white">{chall.hostScore} pts</strong>
                            </div>
                            {chall.note && (
                              <p className="text-[11px] text-slate-400 italic truncate mt-0.5">
                                &ldquo;{chall.note}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isMine ? (
                            <>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(chall.duelCode, "Duel Code")}
                                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-[11px] font-bold cursor-pointer"
                              >
                                📋 {chall.duelCode}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelChallenge(chall)}
                                className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 font-mono text-[11px] font-bold cursor-pointer"
                              >
                                Refund {chall.wager}🪙
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAcceptChallenge(chall)}
                              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer shadow"
                            >
                              ⚔️ Accept ({chall.wager} 🪙)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: JOIN BY DUEL CODE & INCOMING / SENT CHALLENGES INBOX */}
          {arenaTab === "inbox" && (
            <div className="space-y-6">
              {/* Join by 6-Character Duel Code */}
              <form
                onSubmit={handleJoinByDuelCode}
                className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-400/35 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <div className="flex-1">
                  <label
                    htmlFor="duel-code-input"
                    className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold block mb-1"
                  >
                    🔑 Enter Friend&apos;s Duel Code (Try DUEL-70MM or DUEL-2049)
                  </label>
                  <input
                    id="duel-code-input"
                    type="text"
                    value={duelCodeInput}
                    onChange={(e) => setDuelCodeInput(e.target.value.toUpperCase())}
                    placeholder="DUEL-XXXX"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/20 focus:border-cyan-400 font-mono text-sm font-bold text-white uppercase outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer shrink-0 sm:self-end"
                >
                  ⚔️ Load &amp; Play Seed
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Incoming Direct Challenges */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-bold">
                    📥 Direct Challenges Sent to You ({incomingForUser.length})
                  </h4>
                  {incomingForUser.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No pending direct challenges right now. Share your username or accept any open duel from the lobby!
                    </p>
                  ) : (
                    incomingForUser.map((chall) => (
                      <div
                        key={chall.id}
                        className="p-3.5 rounded-xl bg-black/50 border border-cyan-400/40 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">
                            {chall.hostName} challenged you!
                          </div>
                          <div className="text-[11px] font-mono text-slate-300">
                            {chall.gameLabel} • Beat {chall.hostScore} pts • {chall.wager} 🪙
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptChallenge(chall)}
                          className="px-3.5 py-2 rounded-xl bg-cyan-400 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
                        >
                          Accept
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* My Sent Challenges Status */}
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                    📡 Your Sent Challenges ({mySentChallenges.length})
                  </h4>
                  {mySentChallenges.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      You haven&apos;t posted a seeded challenge yet. Pick a game in &ldquo;Challenge Players&rdquo; to set a score!
                    </p>
                  ) : (
                    mySentChallenges.slice(0, 6).map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-white truncate">
                            {c.duelCode} • {c.gameLabel}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Your Score: {c.hostScore} pts • Pot: {c.wager * 2} 🪙 •{" "}
                            <strong className="text-cyan-300 uppercase">{c.status}</strong>
                          </div>
                        </div>
                        {c.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleCancelChallenge(c)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 font-mono text-[10px] font-bold cursor-pointer shrink-0"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INSTANT DUELS VS AI STUDIO RIVALS */}
          {arenaTab === "bots" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STUDIO_BOTS.map((bot) => (
                <div
                  key={bot.id}
                  className={`p-5 rounded-2xl bg-gradient-to-b ${bot.accent} to-[#070a14] border flex flex-col justify-between gap-4`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Image
                        src={bot.avatar}
                        alt={bot.name}
                        width={52}
                        height={52}
                        unoptimized
                        className="w-13 h-13 rounded-2xl border border-white/20 bg-slate-950 p-1"
                      />
                      <div>
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-amber-300 font-bold">
                          {bot.difficulty} AI
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">{bot.name}</h4>
                        <span className="text-[10px] font-mono text-cyan-300 block">
                          +{bot.xpBonus} Win XP
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{bot.bio}</p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (walletCoins < wagerAmount) {
                        toast.error(`Need ${wagerAmount} SceneCents to duel ${bot.name}!`);
                        return;
                      }
                      await updateEconomy(-wagerAmount, 0);
                      const nextSeq = duelSeq + 1;
                      setDuelSeq(nextSeq);
                      launchSeededMatch({
                        role: "vs_bot",
                        gameMode: selectedGame,
                        seed: `bot_${bot.id}_${SESSION_BOOT_MS + nextSeq}`,
                        duelCode: "AI-DUEL",
                        wager: wagerAmount,
                        opponentName: bot.name,
                        opponentTitle: `${bot.difficulty.toUpperCase()} AI RIVAL`,
                        opponentAvatar: bot.avatar,
                        accuracy: bot.accuracy,
                        xpBonus: bot.xpBonus,
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer shadow"
                  >
                    ⚔️ Duel {bot.name} ({wagerAmount} 🪙)
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Session Match Ledger */}
          {matchHistory.length > 0 && (
            <div className="pt-3 border-t border-white/10 flex items-center gap-2.5 overflow-x-auto text-xs font-mono">
              <span className="text-slate-400 uppercase shrink-0">Session Duels:</span>
              {matchHistory.map((h) => (
                <span
                  key={h.id}
                  className={`px-2.5 py-1 rounded-lg border shrink-0 ${
                    h.outcome === "win"
                      ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-300"
                      : h.outcome === "push"
                        ? "bg-white/5 border-white/15 text-slate-300"
                        : "bg-rose-500/15 border-rose-400/40 text-rose-300"
                  }`}
                >
                  vs. {h.opponent}: <strong>{h.netCoins} 🪙</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
