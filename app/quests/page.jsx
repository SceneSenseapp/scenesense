// File: app/quests/page.jsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/firebase";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getLocalQuestProgress, trackQuestEvent } from "@/lib/quest-tracker";
import {
  FIFTY_TIERS_DATA,
  REWARD_VISUAL_CATALOG,
  RARITY_CONFIG,
  CAREER_MASTERY_CAMPAIGNS,
  RewardPictureCard,
  LiveAvatarPreview,
} from "@/lib/reward-visuals";
import DailySpinWheel from "@/components/arcade/DailySpinWheel";
import SoloGamesHub from "@/components/arcade/SoloGamesHub";
import SceneCentsArena from "@/components/SceneCentsArena";
import {
  getTodayUtcDateKey,
  readGuestEconomy,
  writeGuestEconomy,
} from "@/lib/arcade-engine";
import toast from "react-hot-toast";

const MODULE_DAY_SEED = Math.floor(Date.now() / 86400000);
const MODULE_WEEK_SEED = Math.floor(Date.now() / (86400000 * 7));
const MODULE_TODAY_ISO = getTodayUtcDateKey(Date.now());

// Fallback image in case of network issue
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80";

// 7-Day Consecutive Call Sheet Calendar
const STREAK_CALENDAR_DAYS = [
  {
    day: 1,
    title: "Day 1 Call Sheet",
    coins: 60,
    xp: 150,
    multiplier: "1.0x XP",
    visualKey: "coins_stack",
    rarity: "COMMON",
    badge: "+60 🪙 & +150 XP",
    desc: "Opening Call Sheet drop",
  },
  {
    day: 2,
    title: "Day 2 Rush Dailies",
    coins: 90,
    xp: 225,
    multiplier: "1.1x XP",
    visualKey: "coins_stack",
    rarity: "COMMON",
    badge: "+90 🪙 & +225 XP",
    desc: "1.1x XP Multiplier active",
  },
  {
    day: 3,
    title: "Day 3 Soundstage Sync",
    coins: 130,
    xp: 350,
    multiplier: "1.25x XP",
    visualKey: "frame_matrix_emerald",
    rarity: "RARE",
    badge: "+130 🪙 & 1.25x XP",
    desc: "Rare 35mm Frame Drop",
  },
  {
    day: 4,
    title: "Day 4 Camera Roll",
    coins: 175,
    xp: 450,
    multiplier: "1.35x XP",
    visualKey: "coins_treasury",
    rarity: "RARE",
    badge: "+175 🪙 & +450 XP",
    desc: "Bullion Treasury grant",
  },
  {
    day: 5,
    title: "Day 5 Director's Cut",
    coins: 240,
    xp: 600,
    multiplier: "1.5x XP",
    visualKey: "streak_freeze_shield",
    rarity: "EPIC",
    badge: "+240 🪙 & +600 XP",
    desc: "Epic Streak Freeze Shield",
  },
  {
    day: 6,
    title: "Day 6 Festival Screening",
    coins: 320,
    xp: 800,
    multiplier: "1.75x XP",
    visualKey: "coins_treasury",
    rarity: "EPIC",
    badge: "+320 🪙 & +800 XP",
    desc: "1.75x Global Multiplier",
  },
  {
    day: 7,
    title: "Day 7 70mm Vault Drop",
    coins: 500,
    xp: 1250,
    multiplier: "2.0x XP",
    visualKey: "crate_70mm_mythic",
    rarity: "MYTHIC",
    badge: "Vault Crate + 500 🪙",
    desc: "Mythic 70mm IMAX Canister",
  },
];

// Mystery Film Vault Crates with Visuals & Detailed Loot Tables
const VAULT_CRATES = [
  {
    id: "crate_16mm",
    name: "16mm Indie Canister",
    subtitle: "Standard Backlot Supply Drop",
    cost: 120,
    rarity: "RARE",
    visualKey: "crate_16mm",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    rewardsDesc: "Win 80–250 SceneCents + 250–600 Director XP",
    possibleLoot: [
      { label: "Indie Stipend (+95 🪙 & +280 XP)", coins: 95, xp: 280, rarity: "COMMON", visualKey: "coins_stack" },
      { label: "Festival Grant (+160 🪙 & +420 XP)", coins: 160, xp: 420, rarity: "RARE", visualKey: "coins_treasury" },
      { label: "Matrix Emerald Border (+240 🪙 & +600 XP)", coins: 240, xp: 600, rarity: "RARE", visualKey: "frame_matrix_emerald", unlockItem: "frame_matrix_emerald" },
    ],
  },
  {
    id: "crate_35mm",
    name: "35mm Studio Vault",
    subtitle: "High-Grade Theatrical Canister",
    cost: 280,
    rarity: "EPIC",
    visualKey: "crate_35mm",
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80",
    rewardsDesc: "Win 200–600 SceneCents + 650–1,400 XP + Rare Cosmetics",
    possibleLoot: [
      { label: "35mm Box Office Cut (+230 🪙 & +700 XP)", coins: 230, xp: 700, rarity: "RARE", visualKey: "coins_treasury" },
      { label: "Neo-Noir Crimson LUT (+420 🪙 & +1,050 XP)", coins: 420, xp: 1050, rarity: "EPIC", visualKey: "theme_noir_crimson", unlockItem: "theme_noir_crimson" },
      { label: "Cyberpunk Neon Border (+600 🪙 & +1,400 XP)", coins: 600, xp: 1400, rarity: "EPIC", visualKey: "frame_neon_cyan", unlockItem: "frame_neon_cyan" },
    ],
  },
  {
    id: "crate_70mm",
    name: "70mm IMAX Mythic Crate",
    subtitle: "Titanium Palme d'Or Archive",
    cost: 600,
    rarity: "MYTHIC",
    visualKey: "crate_70mm_mythic",
    image: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=600&q=80",
    rewardsDesc: "Win 500–1,500 SceneCents + 1,800–3,500 XP + Legendary Borders",
    possibleLoot: [
      { label: "70mm Bullion Drop (+550 🪙 & +1,850 XP)", coins: 550, xp: 1850, rarity: "EPIC", visualKey: "coins_treasury" },
      { label: "Academy Solar Gold Border (+950 🪙 & +2,600 XP)", coins: 950, xp: 2600, rarity: "LEGENDARY", visualKey: "frame_solar_gold", unlockItem: "frame_solar_gold" },
      { label: "Premiere Velvet Border (+1,500 🪙 & +3,500 XP)", coins: 1500, xp: 3500, rarity: "MYTHIC", visualKey: "frame_crimson_velvet", unlockItem: "frame_crimson_velvet" },
    ],
  },
];

// Daily Quests Pool with Visual Rewards & Categories
const DAILY_QUESTS_POOL = [
  {
    id: "daily_login",
    title: "Studio Check-In",
    category: "Check-In",
    description: "Log in and synchronize your director credentials today.",
    goal: 1,
    rewardCents: 60,
    rewardXp: 150,
    icon: "📡",
    visualKey: "coins_stack",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "curate_10",
    title: "Watchlist Curator",
    category: "Watchlist",
    description: "Maintain or save at least 10 titles in your active Watchlist.",
    goal: 10,
    rewardCents: 110,
    rewardXp: 300,
    icon: "📋",
    visualKey: "coins_treasury",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "trivia_duel_3",
    title: "Cinema Trivia Duelist",
    category: "Mini-Games",
    description: "Complete 3 Cinema Cipher decryptions or Box Office Duels.",
    goal: 3,
    rewardCents: 95,
    rewardXp: 350,
    icon: "⚔️",
    visualKey: "coins_stack",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "file_review_2",
    title: "Film Critic Dispatch",
    category: "Reviews",
    description: "Post 2 verified critiques in the Community Reviews sector.",
    goal: 2,
    rewardCents: 160,
    rewardXp: 450,
    icon: "✍️",
    visualKey: "coins_treasury",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "where_to_watch_5",
    title: "Streaming Scanner",
    category: "Discovery",
    description: "Inspect where to watch across 5 titles in Where To Watch.",
    goal: 5,
    rewardCents: 85,
    rewardXp: 250,
    icon: "🎟️",
    visualKey: "coins_stack",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "oracle_consult_3",
    title: "CineMind AI Scout",
    category: "AI Discovery",
    description: "Run 3 AI movie prompts or mood recommendations.",
    goal: 3,
    rewardCents: 100,
    rewardXp: 300,
    icon: "🧠",
    visualKey: "coins_stack",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "daily_wheel_spin",
    title: "Lucky 35mm Spin",
    category: "Arcade",
    description: "Spin the 35mm Studio Prize Wheel in the Arcade.",
    goal: 1,
    rewardCents: 75,
    rewardXp: 200,
    icon: "🎡",
    visualKey: "coins_stack",
    image: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "inspect_rewards_3",
    title: "Vault Showcase Inspector",
    category: "Exploration",
    description: "Inspect 3 rewards or Try-On Frames in the Season Pass.",
    goal: 3,
    rewardCents: 70,
    rewardXp: 200,
    icon: "🔍",
    visualKey: "coins_stack",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80",
  },
];

// Weekly Challenges with Visual Picture Previews
const WEEKLY_CHALLENGES_POOL = [
  {
    id: "week_watchlist_35",
    title: "Archival Hoard",
    category: "Watchlist",
    description: "Accumulate 35 total movies or series in your active Watchlist.",
    goal: 35,
    rewardCents: 550,
    rewardXp: 1800,
    icon: "🗄️",
    visualKey: "coins_treasury",
    rarity: "EPIC",
    rewardName: "550 SceneCents Treasury Drop",
  },
  {
    id: "week_trivia_master_15",
    title: "Arcade Grandmaster",
    category: "Mini-Games",
    description: "Complete 15 Cinema Cipher or Box Office Duel rounds across the studio.",
    goal: 15,
    rewardCents: 850,
    rewardXp: 2800,
    icon: "🏆",
    visualKey: "frame_quantum_amethyst",
    rarity: "LEGENDARY",
    rewardName: "Quantum Amethyst Foil Border + 850 🪙",
  },
  {
    id: "week_screen_12",
    title: "Projection Marathon",
    category: "Screenings",
    description: "Watch and mark 12 completed titles from your screening room.",
    goal: 12,
    rewardCents: 700,
    rewardXp: 2300,
    icon: "🎞️",
    visualKey: "crate_70mm_mythic",
    rarity: "LEGENDARY",
    rewardName: "70mm Mythic Vault Canister + 700 🪙",
  },
];

export default function QuestsAndRewardsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { watchlist } = useWatchlist();

  // Primary Page Tab: 'quests' | 'pass' | 'arcade' | 'mastery' | 'all'
  const [activeMainTab, setActiveMainTab] = useState("quests");
  const [showGuideBanner, setShowGuideBanner] = useState(true);

  const [profileData, setProfileData] = useState({
    walletCoins: 200,
    userXp: 320,
    spinTickets: 1,
    lastDailySpinDate: null,
    pityCounter: 0,
    claimedTiers: [],
    claimedQuests: [],
    claimedMastery: [],
    equippedFrame: null,
    equippedTitle: null,
    equippedTheme: null,
    inventory: [],
    questProgress: {},
    loginStreak: 1,
    lastCheckInDate: null,
  });

  const [localProgress, setLocalProgress] = useState({ daily_login: 1 });
  const [claimingTier, setClaimingTier] = useState(null);
  const [claimingQuest, setClaimingQuest] = useState(null);

  // Filters for 50-Tier Pass
  const [selectedActFilter, setSelectedActFilter] = useState("all"); // 'all' | 1 | 2 | 3 | 4 | 5 | 'ready'
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all"); // 'all' | 'frame' | 'title' | 'theme' | 'crate' | 'coins'

  // Interactive Reward Showcase / Inspector Modal State
  const [inspectedReward, setInspectedReward] = useState(null);

  // Interactive Studio Arcade Active Tab: 'wheel' | 'games' | 'arena' | 'vaults'
  const [arcadeTab, setArcadeTab] = useState("wheel");

  // Mystery Film Vault Crate State
  const [openingCrateId, setOpeningCrateId] = useState(null);
  const [unsealedLoot, setUnsealedLoot] = useState(null);
  const [peekCrateId, setPeekCrateId] = useState(null);

  // Daily Quest Reroll Offset
  const [rerollOffset, setRerollOffset] = useState(0);
  const [rerollUsedToday, setRerollUsedToday] = useState(false);

  // Sync local quest progress & daily state
  useEffect(() => {
    const syncLocal = () => {
      const state = getLocalQuestProgress();
      setLocalProgress(state.counts || { daily_login: 1 });
      const todayStr = getTodayUtcDateKey(Date.now());
      if (typeof window !== "undefined") {
        setRerollUsedToday(localStorage.getItem("scenesense_reroll_date") === todayStr);
      }
    };
    const raf = requestAnimationFrame(syncLocal);
    window.addEventListener("scenesense:quest-progress", syncLocal);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scenesense:quest-progress", syncLocal);
    };
  }, []);

  // Authenticate and synchronize Firestore progression (with Guest Starter Wallet fallback)
  useEffect(() => {
    const hydrateGuest = () => {
      const guest = readGuestEconomy();
      const legacyWheel =
        typeof window !== "undefined"
          ? localStorage.getItem("scenesense_wheel_date")
          : null;
      setProfileData((prev) => ({
        ...prev,
        walletCoins: guest.coins,
        userXp: guest.xp,
        spinTickets: guest.spinTickets,
        lastDailySpinDate: guest.lastDailySpinDate || legacyWheel || null,
        pityCounter: guest.pityCounter,
      }));
      setLoading(false);
    };

    if (!auth) {
      const raf = requestAnimationFrame(hydrateGuest);
      return () => cancelAnimationFrame(raf);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfileData({
              walletCoins: data.coins ?? data.tokens ?? 150,
              userXp: data.xp ?? 320,
              spinTickets: typeof data.spinTickets === "number" ? data.spinTickets : 0,
              lastDailySpinDate: data.lastDailySpinDate || null,
              pityCounter: typeof data.pityCounter === "number" ? data.pityCounter : 0,
              claimedTiers: Array.isArray(data.claimedTiers) ? data.claimedTiers : [],
              claimedQuests: Array.isArray(data.claimedQuests) ? data.claimedQuests : [],
              claimedMastery: Array.isArray(data.claimedMastery) ? data.claimedMastery : [],
              equippedFrame: data.equippedFrame || null,
              equippedTitle: data.equippedTitle || null,
              equippedTheme: data.equippedTheme || null,
              inventory: Array.isArray(data.inventory) ? data.inventory : [],
              questProgress: data.questProgress || {},
              loginStreak: typeof data.loginStreak === "number" ? data.loginStreak : 1,
              lastCheckInDate: data.lastCheckInDate || null,
            });
          }
        } catch (err) {
          console.warn("Dossier progression fetch notice:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        hydrateGuest();
      }
    });
    return () => unsubscribe();
  }, []);

  const todayIso = MODULE_TODAY_ISO;
  const isCheckedInToday = profileData.lastCheckInDate === todayIso;

  // Active XP Multiplier from Streak + Overclock Prop
  const xpMultiplier = useMemo(() => {
    const streak = profileData.loginStreak || 1;
    let mult = 1.0;
    if (streak >= 30) mult = 2.25;
    else if (streak >= 14) mult = 1.85;
    else if (streak >= 7) mult = 1.5;
    else if (streak >= 3) mult = 1.25;
    else if (streak >= 2) mult = 1.1;

    if (profileData.inventory.includes("xp_overclock_2x")) {
      mult += 0.25;
    }
    return Number(mult.toFixed(2));
  }, [profileData.loginStreak, profileData.inventory]);

  // Daily Quests Selection with Reroll Support
  const activeDailyQuests = useMemo(() => {
    const daySeed = MODULE_DAY_SEED + rerollOffset * 7;
    return [...DAILY_QUESTS_POOL]
      .sort((a, b) => ((a.id.length * daySeed) % 19) - ((b.id.length * daySeed) % 19))
      .slice(0, 4);
  }, [rerollOffset]);

  const activeWeeklyChallenges = useMemo(() => {
    return WEEKLY_CHALLENGES_POOL.map((q, idx) => ({
      ...q,
      baseId: q.id,
      instanceId: `${q.id}_w${MODULE_WEEK_SEED}_${idx}`,
    }));
  }, []);

  const getQuestCurrentCount = useCallback(
    (questId, goal) => {
      if (questId === "daily_login") return 1;
      const fromLocal = localProgress[questId] || 0;
      const fromCloud = profileData.questProgress?.[questId] || 0;
      let base = Math.max(fromLocal, fromCloud);

      if (questId === "curate_10" || questId.startsWith("week_watchlist_35")) {
        base = Math.max(base, (watchlist || []).length);
      }
      if (questId.startsWith("week_screen_12")) {
        const watchedCount = (watchlist || []).filter((item) => item.watched).length;
        base = Math.max(base, watchedCount);
      }
      return Math.min(goal, base);
    },
    [localProgress, profileData.questProgress, watchlist]
  );

  // Compute Current Tier (1 to 50) + Prestige Encore Levels
  const currentTierIndex = useMemo(() => {
    let tier = 1;
    for (let i = 0; i < FIFTY_TIERS_DATA.length; i++) {
      if (profileData.userXp >= FIFTY_TIERS_DATA[i].requiredXp) {
        tier = FIFTY_TIERS_DATA[i].tier;
      } else {
        break;
      }
    }
    return tier;
  }, [profileData.userXp]);

  const maxPassXp = FIFTY_TIERS_DATA[FIFTY_TIERS_DATA.length - 1].requiredXp;
  const prestigeRank =
    profileData.userXp > maxPassXp
      ? Math.floor((profileData.userXp - maxPassXp) / 7500) + 1
      : 0;

  const currentTierObj = FIFTY_TIERS_DATA[currentTierIndex - 1] || FIFTY_TIERS_DATA[0];
  const nextTierObj = FIFTY_TIERS_DATA[currentTierIndex] || FIFTY_TIERS_DATA[FIFTY_TIERS_DATA.length - 1];
  const xpInTier = Math.max(0, profileData.userXp - currentTierObj.requiredXp);
  const xpNeeded = Math.max(1, nextTierObj.requiredXp - currentTierObj.requiredXp);
  const tierProgressPct =
    currentTierIndex === 50 ? 100 : Math.min(100, Math.round((xpInTier / xpNeeded) * 100));
  const globalProgressPct = Math.min(100, Math.round((profileData.userXp / maxPassXp) * 100));

  // Unclaimed Ready Tiers Count
  const readyToClaimTiers = useMemo(() => {
    return FIFTY_TIERS_DATA.filter(
      (t) => profileData.userXp >= t.requiredXp && !profileData.claimedTiers.includes(t.tier)
    );
  }, [profileData.userXp, profileData.claimedTiers]);

  // Unclaimed Ready Quests Count
  const readyToClaimQuests = useMemo(() => {
    let count = 0;
    activeDailyQuests.forEach((q) => {
      const isClaimed = profileData.claimedQuests.includes(q.id);
      const isReady = getQuestCurrentCount(q.id, q.goal) >= q.goal;
      if (isReady && !isClaimed) count++;
    });
    activeWeeklyChallenges.forEach((w) => {
      const isClaimed = profileData.claimedQuests.includes(w.instanceId);
      const isReady = getQuestCurrentCount(w.baseId, w.goal) >= w.goal;
      if (isReady && !isClaimed) count++;
    });
    return count;
  }, [activeDailyQuests, activeWeeklyChallenges, profileData.claimedQuests, getQuestCurrentCount]);

  // Total Unclaimed Count
  const totalUnclaimedCount = readyToClaimTiers.length + readyToClaimQuests;

  // Filtered Tiers for the 50-Tier Gallery
  const displayedTiers = useMemo(() => {
    let result = FIFTY_TIERS_DATA;
    if (selectedActFilter === "ready") {
      result = readyToClaimTiers.length > 0 ? readyToClaimTiers : FIFTY_TIERS_DATA.slice(0, 10);
    } else if (typeof selectedActFilter === "number") {
      result = result.filter((t) => t.actNumber === selectedActFilter);
    }

    if (selectedTypeFilter !== "all") {
      result = result.filter((t) => {
        if (selectedTypeFilter === "coins") return t.rewardType === "coins";
        if (selectedTypeFilter === "frame") return Boolean(t.rewardFrame);
        if (selectedTypeFilter === "title") return Boolean(t.rewardTitle);
        if (selectedTypeFilter === "theme") return Boolean(t.rewardTheme);
        if (selectedTypeFilter === "crate") return t.rewardType === "crate" || t.rewardType === "grand" || Boolean(t.rewardItem);
        return true;
      });
    }

    return result;
  }, [selectedActFilter, selectedTypeFilter, readyToClaimTiers]);

  const freeSpinAvailable = profileData.lastDailySpinDate !== MODULE_TODAY_ISO;

  // Unified Economy Sync for DailySpinWheel, SoloGamesHub & SceneCentsArena
  const handleArcadeEconomyChange = useCallback(
    ({
      deltaCoins = 0,
      deltaXp = 0,
      deltaTickets = 0,
      markDailySpinDate,
      nextPityCounter,
      unlockCosmetic,
    }) => {
      setProfileData((prev) => {
        const nextCoins = Math.max(0, prev.walletCoins + deltaCoins);
        const nextXp = Math.max(0, prev.userXp + deltaXp);
        const nextTickets = Math.max(0, prev.spinTickets + deltaTickets);
        const nextSpinDate =
          markDailySpinDate !== undefined ? markDailySpinDate : prev.lastDailySpinDate;
        const resolvedPity =
          typeof nextPityCounter === "number" ? nextPityCounter : prev.pityCounter;
        const nextInventory =
          unlockCosmetic && !prev.inventory.includes(unlockCosmetic)
            ? [...prev.inventory, unlockCosmetic]
            : prev.inventory;

        if (!user) {
          writeGuestEconomy({
            coins: nextCoins,
            xp: nextXp,
            spinTickets: nextTickets,
            lastDailySpinDate: nextSpinDate,
            pityCounter: resolvedPity,
          });
        }

        return {
          ...prev,
          walletCoins: nextCoins,
          userXp: nextXp,
          spinTickets: nextTickets,
          lastDailySpinDate: nextSpinDate,
          pityCounter: resolvedPity,
          inventory: nextInventory,
        };
      });

      if (user && db && unlockCosmetic) {
        setDoc(
          doc(db, "users", user.uid),
          { inventory: arrayUnion(unlockCosmetic) },
          { merge: true }
        ).catch(() => {});
      }
    },
    [user]
  );

  // Handle Daily Streak Check-In
  const handleDailyStreakCheckIn = async () => {
    if (isCheckedInToday) return;

    const yesterday = getTodayUtcDateKey(Date.now() - 86400000);
    const hasFreezeShield = profileData.inventory.includes("streak_freeze_shield");
    let nextStreak = 1;

    if (profileData.lastCheckInDate === yesterday) {
      nextStreak = (profileData.loginStreak || 1) + 1;
    } else if (profileData.lastCheckInDate && hasFreezeShield) {
      nextStreak = (profileData.loginStreak || 1) + 1;
      toast("Timecode Streak Freeze Shield protected your streak!", { icon: "🛡️" });
    } else {
      nextStreak = (profileData.loginStreak || 0) + 1;
    }

    const cycleDay = ((nextStreak - 1) % 7) + 1;
    const dayReward = STREAK_CALENDAR_DAYS[cycleDay - 1] || STREAK_CALENDAR_DAYS[0];
    const boostedXp = Math.round(dayReward.xp * xpMultiplier);

    setProfileData((prev) => {
      const nextCoins = prev.walletCoins + dayReward.coins;
      const nextXp = prev.userXp + boostedXp;
      if (!user) {
        writeGuestEconomy({
          coins: nextCoins,
          xp: nextXp,
          spinTickets: prev.spinTickets,
          lastDailySpinDate: prev.lastDailySpinDate,
          pityCounter: prev.pityCounter,
        });
      }
      return {
        ...prev,
        walletCoins: nextCoins,
        userXp: nextXp,
        loginStreak: nextStreak,
        lastCheckInDate: todayIso,
      };
    });

    toast.success(
      `Day ${nextStreak} Streak! +${dayReward.coins} SceneCents & +${boostedXp} XP (${xpMultiplier}x multiplier)!`,
      { icon: "🔥" }
    );

    if (user && db) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          coins: increment(dayReward.coins),
          xp: increment(boostedXp),
          loginStreak: nextStreak,
          lastCheckInDate: todayIso,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Streak sync notice:", err);
      }
    }
  };

  // Claim Single Tier Reward
  const handleClaimTier = async (tierObj) => {
    if (
      profileData.claimedTiers.includes(tierObj.tier) ||
      profileData.userXp < tierObj.requiredXp ||
      claimingTier
    )
      return;
    setClaimingTier(tierObj.tier);

    try {
      const addedCoins = tierObj.rewardValue || 0;
      const updatedClaimedTiers = [...profileData.claimedTiers, tierObj.tier];
      const updatedInventory = [...profileData.inventory];

      [tierObj.rewardFrame, tierObj.rewardTitle, tierObj.rewardTheme, tierObj.rewardItem]
        .filter(Boolean)
        .forEach((itemKey) => {
          if (!updatedInventory.includes(itemKey)) {
            updatedInventory.push(itemKey);
          }
        });

      setProfileData((prev) => {
        const nextCoins = prev.walletCoins + addedCoins;
        if (!user) {
          writeGuestEconomy({
            coins: nextCoins,
            xp: prev.userXp,
            spinTickets: prev.spinTickets,
            lastDailySpinDate: prev.lastDailySpinDate,
            pityCounter: prev.pityCounter,
          });
        }
        return {
          ...prev,
          walletCoins: nextCoins,
          claimedTiers: updatedClaimedTiers,
          inventory: updatedInventory,
        };
      });

      if (user && db) {
        const userRef = doc(db, "users", user.uid);
        const updatePayload = {
          claimedTiers: updatedClaimedTiers,
          inventory: updatedInventory,
          updatedAt: serverTimestamp(),
        };
        if (addedCoins > 0) updatePayload.coins = increment(addedCoins);
        await updateDoc(userRef, updatePayload);
      }
      toast.success(`Unlocked Tier ${tierObj.tier}: ${tierObj.rewardLabel}!`, { icon: "🎬" });
    } catch (err) {
      console.error("Failed to claim tier reward:", err);
    } finally {
      setClaimingTier(null);
    }
  };

  // Claim All Ready Tiers at Once
  const handleClaimAllReadyTiers = async () => {
    if (readyToClaimTiers.length === 0 || claimingTier) return;
    setClaimingTier("all");

    try {
      let totalCoins = 0;
      const updatedClaimedTiers = [...profileData.claimedTiers];
      const updatedInventory = [...profileData.inventory];

      readyToClaimTiers.forEach((t) => {
        if (!updatedClaimedTiers.includes(t.tier)) {
          updatedClaimedTiers.push(t.tier);
          totalCoins += t.rewardValue || 0;
          [t.rewardFrame, t.rewardTitle, t.rewardTheme, t.rewardItem]
            .filter(Boolean)
            .forEach((k) => {
              if (!updatedInventory.includes(k)) updatedInventory.push(k);
            });
        }
      });

      setProfileData((prev) => {
        const nextCoins = prev.walletCoins + totalCoins;
        if (!user) {
          writeGuestEconomy({
            coins: nextCoins,
            xp: prev.userXp,
            spinTickets: prev.spinTickets,
            lastDailySpinDate: prev.lastDailySpinDate,
            pityCounter: prev.pityCounter,
          });
        }
        return {
          ...prev,
          walletCoins: nextCoins,
          claimedTiers: updatedClaimedTiers,
          inventory: updatedInventory,
        };
      });

      if (user && db) {
        const userRef = doc(db, "users", user.uid);
        const payload = {
          claimedTiers: updatedClaimedTiers,
          inventory: updatedInventory,
          updatedAt: serverTimestamp(),
        };
        if (totalCoins > 0) payload.coins = increment(totalCoins);
        await updateDoc(userRef, payload);
      }

      toast.success(
        `Claimed ${readyToClaimTiers.length} Tiers! +${totalCoins.toLocaleString()} SceneCents unlocked!`,
        { icon: "👑" }
      );
    } catch (err) {
      console.error("Batch tier claim error:", err);
    } finally {
      setClaimingTier(null);
    }
  };

  // Claim Daily/Weekly Quest
  const handleClaimQuest = async (quest) => {
    if (profileData.claimedQuests.includes(quest.id) || claimingQuest) return;
    setClaimingQuest(quest.id);

    try {
      const boostedXp = Math.round(quest.rewardXp * xpMultiplier);
      const updatedClaimedQuests = [...profileData.claimedQuests, quest.id];

      setProfileData((prev) => {
        const nextCoins = prev.walletCoins + quest.rewardCents;
        const nextXp = prev.userXp + boostedXp;
        if (!user) {
          writeGuestEconomy({
            coins: nextCoins,
            xp: nextXp,
            spinTickets: prev.spinTickets,
            lastDailySpinDate: prev.lastDailySpinDate,
            pityCounter: prev.pityCounter,
          });
        }
        return {
          ...prev,
          walletCoins: nextCoins,
          userXp: nextXp,
          claimedQuests: updatedClaimedQuests,
        };
      });

      if (user && db) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          coins: increment(quest.rewardCents),
          xp: increment(boostedXp),
          claimedQuests: updatedClaimedQuests,
        });
      }
      toast.success(
        `Reward Claimed: +${quest.rewardCents} SceneCents & +${boostedXp} XP (${xpMultiplier}x multiplier)!`,
        { icon: "🎁" }
      );
    } catch (err) {
      console.error("Failed to claim quest:", err);
    } finally {
      setClaimingQuest(null);
    }
  };

  // Instant Equipment of Unlocked Cosmetics
  const handleEquipCosmetic = async (itemKey) => {
    if (!itemKey) return;
    const isFrame = itemKey.startsWith("frame_");
    const isTitle = itemKey.startsWith("title_");
    const isTheme = itemKey.startsWith("theme_");
    const field = isFrame ? "equippedFrame" : isTitle ? "equippedTitle" : isTheme ? "equippedTheme" : null;
    if (!field) return;

    const isEquipped = profileData[field] === itemKey;
    const nextVal = isEquipped ? null : itemKey;

    setProfileData((prev) => ({ ...prev, [field]: nextVal }));
    toast.success(nextVal ? `Equipped to your Profile Dossier!` : `Unequipped cosmetic.`);
    if (user && db) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { [field]: nextVal });
      } catch {}
    }
  };

  // Inspect a Reward & Track Inspection Quest
  const handleInspectReward = (rewardObj) => {
    setInspectedReward(rewardObj);
    trackQuestEvent("inspect_rewards_3", 1);
  };

  // Open Mystery Film Vault Crate
  const handleOpenVaultCrate = async (crate) => {
    if (openingCrateId) return;
    if (profileData.walletCoins < crate.cost) {
      toast.error(`Need ${crate.cost} SceneCents to unseal ${crate.name}!`);
      return;
    }

    setOpeningCrateId(crate.id);
    setUnsealedLoot(null);

    setTimeout(async () => {
      const roll = Math.random();
      const lootIndex = roll > 0.8 ? 2 : roll > 0.4 ? 1 : 0;
      const rolledLoot = crate.possibleLoot[lootIndex] || crate.possibleLoot[0];
      const netCoins = rolledLoot.coins - crate.cost;
      const boostedXp = Math.round(rolledLoot.xp * xpMultiplier);

      const updatedInventory = [...profileData.inventory];
      if (rolledLoot.unlockItem && !updatedInventory.includes(rolledLoot.unlockItem)) {
        updatedInventory.push(rolledLoot.unlockItem);
      }

      setProfileData((prev) => {
        const nextCoins = Math.max(0, prev.walletCoins + netCoins);
        const nextXp = prev.userXp + boostedXp;
        if (!user) {
          writeGuestEconomy({
            coins: nextCoins,
            xp: nextXp,
            spinTickets: prev.spinTickets,
            lastDailySpinDate: prev.lastDailySpinDate,
            pityCounter: prev.pityCounter,
          });
        }
        return {
          ...prev,
          walletCoins: nextCoins,
          userXp: nextXp,
          inventory: updatedInventory,
        };
      });

      setUnsealedLoot({
        crateName: crate.name,
        ...rolledLoot,
        boostedXp,
      });
      setOpeningCrateId(null);
      trackQuestEvent("week_vault_open_5", 1);

      toast.success(`Vault Unsealed: ${rolledLoot.label}!`, { icon: "📦" });

      if (user && db) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            coins: increment(netCoins),
            xp: increment(boostedXp),
            inventory: updatedInventory,
          });
        } catch {}
      }
    }, 1200);
  };

  // Claim Career Mastery Stage Reward
  const handleClaimMasteryStage = async (campaign, stageObj) => {
    const claimKey = `${campaign.id}_s${stageObj.stage}`;
    if (profileData.claimedMastery.includes(claimKey)) return;

    const boostedXp = Math.round(stageObj.rewardXp * xpMultiplier);
    const updatedMastery = [...profileData.claimedMastery, claimKey];
    const updatedInventory = [...profileData.inventory];

    if (stageObj.bonusItem && !updatedInventory.includes(stageObj.bonusItem)) {
      updatedInventory.push(stageObj.bonusItem);
    }

    setProfileData((prev) => {
      const nextCoins = prev.walletCoins + stageObj.rewardCoins;
      const nextXp = prev.userXp + boostedXp;
      if (!user) {
        writeGuestEconomy({
          coins: nextCoins,
          xp: nextXp,
          spinTickets: prev.spinTickets,
          lastDailySpinDate: prev.lastDailySpinDate,
          pityCounter: prev.pityCounter,
        });
      }
      return {
        ...prev,
        walletCoins: nextCoins,
        userXp: nextXp,
        claimedMastery: updatedMastery,
        inventory: updatedInventory,
      };
    });

    toast.success(
      `Mastery Unlocked: ${campaign.title} (${stageObj.rank})! +${stageObj.rewardCoins} 🪙 & +${boostedXp} XP!`,
      { icon: "🏆" }
    );

    if (user && db) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          coins: increment(stageObj.rewardCoins),
          xp: increment(boostedXp),
          claimedMastery: updatedMastery,
          inventory: updatedInventory,
        });
      } catch {}
    }
  };

  // Get Current Value for Career Mastery Campaigns
  const getMasteryCurrentValue = (campaignId) => {
    switch (campaignId) {
      case "mastery_watchlist":
        return (watchlist || []).length;
      case "mastery_screenings":
        return (watchlist || []).filter((i) => i.watched).length;
      case "mastery_cipher":
        return Math.max(
          localProgress.week_trivia_master_15 || 0,
          profileData.questProgress?.week_trivia_master_15 || 0
        );
      case "mastery_streak":
        return profileData.loginStreak || 1;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3 font-mono bg-[#050508] text-white">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-cyan-400 uppercase tracking-widest">
          Loading Quests, Rewards &amp; 50-Tier Season Pass...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans p-4 sm:p-8 max-w-7xl mx-auto space-y-8 selection:bg-cyan-500/30 relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* HEADER & PROFILE OVERVIEW */}
      <section className="bg-gradient-to-r from-[#070914] via-[#090d1f] to-[#0d0718] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.12)] relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs font-mono font-black uppercase tracking-widest text-amber-400">
              Season 1: 90-Day Director Pass • 50 Tiers &amp; Rewards
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono text-cyan-300 font-bold">
              {currentTierObj.actName}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white">
            Rewards, Quests &amp; Arcade
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Level up by watching movies, curating your watchlist, testing your film knowledge in mini-games, and checking in daily. Unlock rare avatar frames, screen titles, color LUTs, and mystery canisters.
          </p>
        </div>

        {/* STATS DECK */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full xl:w-auto shrink-0">
          <div className="p-4 bg-[#090b16] border border-amber-500/40 rounded-2xl text-center min-w-[125px] shadow-inner">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">SceneCents</span>
            <span className="text-xl font-black font-mono text-amber-400 flex items-center justify-center gap-1 mt-0.5">
              {profileData.walletCoins.toLocaleString()} 🪙
            </span>
            <Link
              href="/armoury"
              className="text-[9px] font-mono text-amber-300/80 hover:text-amber-200 underline mt-1 block"
            >
              Shop Prop Dept ↗
            </Link>
          </div>

          <div className="p-4 bg-[#090b16] border border-cyan-500/40 rounded-2xl text-center min-w-[125px] shadow-inner">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Pass Tier</span>
            <span className="text-xl font-black font-mono text-cyan-300 block mt-0.5">
              Tier {currentTierIndex} / 50
            </span>
            <span className="text-[9px] font-mono text-slate-400 block mt-1">
              {tierProgressPct}% to Tier {nextTierObj.tier}
            </span>
          </div>

          <div className="p-4 bg-[#090b16] border border-rose-500/40 rounded-2xl text-center min-w-[125px] shadow-inner">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Daily Streak</span>
            <span className="text-xl font-black font-mono text-rose-400 block mt-0.5">
              🔥 {profileData.loginStreak || 1} Days
            </span>
            <span className="text-[9px] font-mono text-slate-400 block mt-1">
              {isCheckedInToday ? "✓ Checked in" : "Pending check-in"}
            </span>
          </div>

          <div className="p-4 bg-[#090b16] border border-emerald-500/40 rounded-2xl text-center min-w-[125px] shadow-inner">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">XP Multiplier</span>
            <span className="text-xl font-black font-mono text-emerald-400 block mt-0.5">
              ⚡ {xpMultiplier}x
            </span>
            <span className="text-[9px] font-mono text-slate-400 block mt-1">
              Boosts all rewards
            </span>
          </div>
        </div>
      </section>

      {/* QUICK START / HOW IT WORKS GUIDE (DISMISSIBLE) */}
      {showGuideBanner && (
        <section className="bg-gradient-to-r from-cyan-950/40 via-[#0a1024] to-violet-950/40 border border-cyan-500/30 rounded-2xl p-5 relative z-10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-black uppercase text-cyan-300 flex items-center gap-2">
              <span>📖</span> How Rewards &amp; Season Progression Work
            </span>
            <button
              type="button"
              onClick={() => setShowGuideBanner(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
            >
              ✕ Hide Guide
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5 font-mono">
                <span>🔥</span> 1. Check in Daily
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Build your daily streak to scale your global XP Multiplier up to <strong>2.25x</strong> and unlock the Day 7 Mythic Canister!
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5 font-mono">
                <span>🎯</span> 2. Complete Quests &amp; Games
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Quests complete automatically as you browse movies, add to watchlist, spin the 35mm lucky reel, or solve cinema ciphers.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-fuchsia-400 font-bold text-xs flex items-center gap-1.5 font-mono">
                <span>👑</span> 3. Level Up 50 Season Tiers
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                Earn Season XP to climb all 50 tiers. Click any reward card to inspect it and preview it live on your avatar portrait.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* FLOATING READY TO CLAIM BANNER */}
      {totalUnclaimedCount > 0 && (
        <section className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-black p-4 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.5)] flex flex-col sm:flex-row items-center justify-between gap-4 z-20 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">
                You have {totalUnclaimedCount} Reward{totalUnclaimedCount > 1 ? "s" : ""} Ready to Claim!
              </h3>
              <p className="text-xs font-semibold opacity-90">
                {readyToClaimTiers.length > 0 && `${readyToClaimTiers.length} Season Pass Tier(s) `}
                {readyToClaimQuests > 0 && `${readyToClaimQuests} Quest Bounty(ies) `}
                waiting in your locker.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {readyToClaimTiers.length > 0 && (
              <button
                type="button"
                onClick={handleClaimAllReadyTiers}
                disabled={Boolean(claimingTier)}
                className="px-4 py-2 rounded-xl bg-black text-white hover:bg-slate-900 font-mono text-xs font-black uppercase transition-all cursor-pointer shadow-md active:scale-95"
              >
                Claim All {readyToClaimTiers.length} Tiers
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveMainTab(readyToClaimTiers.length > 0 ? "pass" : "quests")}
              className="px-4 py-2 rounded-xl bg-white/25 hover:bg-white/40 text-black font-mono text-xs font-black uppercase transition-all cursor-pointer"
            >
              View Rewards →
            </button>
          </div>
        </section>
      )}

      {/* PRIMARY NAVIGATION PILL TABS */}
      <nav
        aria-label="Quests and Rewards Sections"
        className="bg-[#080b16] border border-white/10 rounded-2xl p-2 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 z-10 shadow-lg"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 flex-1">
          {[
            {
              id: "quests",
              icon: "🎯",
              label: "Daily Quests & Streak",
              badge: readyToClaimQuests > 0 ? `${readyToClaimQuests} Ready` : null,
            },
            {
              id: "pass",
              icon: "🎞️",
              label: "50-Tier Season Pass",
              badge: readyToClaimTiers.length > 0 ? `${readyToClaimTiers.length} Ready` : null,
            },
            {
              id: "arcade",
              icon: "🎡",
              label: "Daily Spin & Arcade",
              badge: freeSpinAvailable
                ? "FREE SPIN"
                : profileData.spinTickets > 0
                ? `${profileData.spinTickets} 🎟️`
                : null,
            },
            {
              id: "mastery",
              icon: "🏅",
              label: "Career Mastery",
              badge: null,
            },
            {
              id: "all",
              icon: "🌐",
              label: "All Sections",
              badge: null,
            },
          ].map((tab) => {
            const active = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMainTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-md"
                    : "bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/10"
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span>{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                </span>
                {tab.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                      active
                        ? "bg-slate-950 text-cyan-300"
                        : "bg-amber-400 text-slate-950"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          {!user && (
            <Link
              href="/login"
              className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-[11px] font-mono text-slate-200 transition-colors"
            >
              Guest Starter Mode • Sign In ↗
            </Link>
          )}
          <Link
            href="/arcade"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-mono text-xs font-black uppercase tracking-wide transition-all shadow-md whitespace-nowrap"
          >
            ⚔️ Full Arcade &amp; PvP Hub ↗
          </Link>
        </div>
      </nav>

      {/* ======================================================== */}
      {/* SECTION 1: 7-DAY STREAK CALENDAR & DAILY/WEEKLY QUESTS */}
      {/* ======================================================== */}
      {(activeMainTab === "quests" || activeMainTab === "all") && (
        <div className="space-y-8 animate-fadeIn">
          {/* 7-DAY CALL SHEET CHECK-IN CALENDAR */}
          <section className="bg-gradient-to-br from-[#090d1b] via-[#07070d] to-[#12091c] border border-amber-500/35 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/50 text-[10px] font-mono font-black uppercase text-rose-300">
                    🔥 Daily Retention Loop
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Active Multiplier: {xpMultiplier}x XP on all activities
                  </span>
                  {profileData.inventory.includes("streak_freeze_shield") && (
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono text-cyan-300">
                      🛡️ Streak Shield Active
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wide text-white mt-1.5">
                  7-Day Consecutive Call Sheet Calendar
                </h2>
                <p className="text-xs text-slate-300">
                  Log in every day to ramp up your reward drops and unlock the <strong>Day 7 70mm Mythic Vault Canister</strong>.
                </p>
              </div>

              <button
                type="button"
                disabled={isCheckedInToday}
                onClick={handleDailyStreakCheckIn}
                className={`px-6 py-3 rounded-2xl font-mono text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                  isCheckedInToday
                    ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 cursor-default"
                    : "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95 animate-pulse"
                }`}
              >
                {isCheckedInToday
                  ? `✓ Checked In Today (Day ${profileData.loginStreak})`
                  : `🔥 Claim Day ${(profileData.loginStreak || 0) + 1} Check-In Drop`}
              </button>
            </div>

            {/* 7-Day Visual Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {STREAK_CALENDAR_DAYS.map((d) => {
                const currentCycleDay = ((profileData.loginStreak - 1) % 7) + 1;
                const isPastOrToday = d.day <= currentCycleDay;
                const isTodayTarget = d.day === currentCycleDay;

                return (
                  <div
                    key={d.day}
                    onClick={() =>
                      handleInspectReward({
                        name: d.title,
                        visualKey: d.visualKey,
                        rarity: d.rarity,
                        rewardType: d.day === 7 ? "crate" : "coins",
                        lore: `Consecutive check-in reward for Day ${d.day}. Awards ${d.badge} and scales your global XP multiplier to ${d.multiplier}.`,
                      })
                    }
                    className={`p-3 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer ${
                      isTodayTarget
                        ? "bg-[#13192e] border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                        : isPastOrToday
                        ? "bg-[#091410]/70 border-emerald-500/40"
                        : "bg-[#080b14] border-white/10 hover:border-cyan-400/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-black uppercase text-white">
                        Day {d.day}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">
                        {d.multiplier}
                      </span>
                    </div>

                    <RewardPictureCard
                      visualKey={d.visualKey}
                      rarity={d.rarity}
                      rewardType={d.day === 7 ? "crate" : "coins"}
                      label={d.badge}
                      size="sm"
                      isClaimed={isPastOrToday && isCheckedInToday}
                    />

                    <div className="mt-2 text-center">
                      <span className="text-[10px] font-mono font-bold text-amber-300 block truncate">
                        {d.badge}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 block truncate">
                        {d.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ROTATING DAILY QUESTS & WEEKLY MILESTONES */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
            {/* DAILY QUESTS */}
            <div className="bg-[#07070d] border border-cyan-500/25 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-2">
                    <span>⚡</span> Rotating Daily Quests
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Quests complete automatically as you browse movies, save to watchlist, or write reviews.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={rerollUsedToday}
                  onClick={() => {
                    setRerollOffset((r) => r + 1);
                    setRerollUsedToday(true);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("scenesense_reroll_date", todayIso);
                    }
                    toast.success("Daily Quests Rerolled!", { icon: "🎲" });
                  }}
                  className="text-xs font-mono text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-3 py-1.5 rounded-xl disabled:opacity-40 cursor-pointer"
                >
                  {rerollUsedToday ? "✓ Rerolled Today" : "🎲 Reroll Quests (1 Free)"}
                </button>
              </div>

              <div className="space-y-3">
                {activeDailyQuests.map((quest) => {
                  const isClaimed = profileData.claimedQuests.includes(quest.id);
                  const currentCount = getQuestCurrentCount(quest.id, quest.goal);
                  const pct = Math.min(100, Math.round((currentCount / quest.goal) * 100));
                  const isReady = currentCount >= quest.goal;

                  return (
                    <div
                      key={quest.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                        isClaimed
                          ? "bg-[#091410]/50 border-emerald-500/30 opacity-75"
                          : "bg-[#080d1a] border-cyan-500/20 hover:border-cyan-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-cyan-400/30 shrink-0">
                            <Image
                              src={quest.image || FALLBACK_IMAGE}
                              alt={quest.title}
                              fill
                              unoptimized
                              sizes="56px"
                              className="object-cover"
                            />
                            <span className="absolute bottom-1 right-1 text-sm bg-black/60 rounded px-1">
                              {quest.icon}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-white">{quest.title}</h4>
                              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[9px] font-mono border border-cyan-500/30">
                                {quest.category}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-snug mt-0.5">
                              {quest.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-mono text-amber-400 font-bold">
                                +{quest.rewardCents} 🪙
                              </span>
                              <span className="text-[11px] font-mono text-cyan-400">
                                +{Math.round(quest.rewardXp * xpMultiplier)} XP ({xpMultiplier}x)
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isClaimed || !isReady || claimingQuest === quest.id}
                          onClick={() => handleClaimQuest(quest)}
                          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                            isClaimed
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                              : isReady
                              ? "bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 text-white shadow-md active:scale-95 cursor-pointer font-black animate-pulse"
                              : "bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed"
                          }`}
                        >
                          {isClaimed
                            ? "✓ Claimed"
                            : isReady
                            ? "🎁 Claim Bounty"
                            : `${currentCount}/${quest.goal}`}
                        </button>
                      </div>

                      {/* Live Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Progress</span>
                          <span className="text-cyan-300 font-bold">
                            {isClaimed ? quest.goal : currentCount} / {quest.goal} ({isClaimed ? 100 : pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                            style={{ width: `${isClaimed ? 100 : pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WEEKLY CHALLENGES */}
            <div className="bg-[#07070d] border border-amber-500/25 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                    <span>🏆</span> Weekly Studio Milestones
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    High-yield weekly milestones • Click the reward picture to inspect up close
                  </p>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  High Yield
                </span>
              </div>

              <div className="space-y-3">
                {activeWeeklyChallenges.map((challenge) => {
                  const isClaimed = profileData.claimedQuests.includes(challenge.instanceId);
                  const currentCount = getQuestCurrentCount(challenge.baseId, challenge.goal);
                  const pct = Math.min(100, Math.round((currentCount / challenge.goal) * 100));
                  const isReady = currentCount >= challenge.goal;

                  return (
                    <div
                      key={challenge.instanceId}
                      className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                        isClaimed
                          ? "bg-[#091410]/50 border-emerald-500/30 opacity-75"
                          : "bg-[#080d1a] border-amber-500/20 hover:border-amber-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className="w-20 shrink-0 cursor-pointer"
                            onClick={() =>
                              handleInspectReward({
                                name: challenge.rewardName || challenge.title,
                                visualKey: challenge.visualKey,
                                rarity: challenge.rarity,
                                rewardType: "crate",
                                lore: challenge.description,
                              })
                            }
                            title="Click to inspect reward"
                          >
                            <RewardPictureCard
                              visualKey={challenge.visualKey}
                              rarity={challenge.rarity}
                              size="sm"
                              label={`+${challenge.rewardCents} 🪙`}
                              isClaimed={isClaimed}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-white">{challenge.title}</h4>
                              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[9px] font-mono border border-amber-500/30">
                                {challenge.category}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-snug mt-0.5">
                              {challenge.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-mono text-amber-400 font-bold">
                                +{challenge.rewardCents} 🪙
                              </span>
                              <span className="text-[11px] font-mono text-cyan-400">
                                +{Math.round(challenge.rewardXp * xpMultiplier)} XP
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isClaimed || !isReady || claimingQuest === challenge.instanceId}
                          onClick={() =>
                            handleClaimQuest({
                              id: challenge.instanceId,
                              rewardCents: challenge.rewardCents,
                              rewardXp: challenge.rewardXp,
                            })
                          }
                          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all ${
                            isClaimed
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                              : isReady
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black shadow-md active:scale-95 cursor-pointer font-black animate-pulse"
                              : "bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed"
                          }`}
                        >
                          {isClaimed
                            ? "✓ Claimed"
                            : isReady
                            ? "🎁 Claim Bounty"
                            : `${currentCount}/${challenge.goal}`}
                        </button>
                      </div>

                      {/* Live Weekly Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Milestone Progress</span>
                          <span className="text-amber-300 font-bold">
                            {isClaimed ? challenge.goal : currentCount} / {challenge.goal} ({isClaimed ? 100 : pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-500"
                            style={{ width: `${isClaimed ? 100 : pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: 50-TIER ORBITAL DIRECTOR PASS (90-DAY JOURNEY) */}
      {/* ======================================================== */}
      {(activeMainTab === "pass" || activeMainTab === "all") && (
        <section className="bg-[#07070d] border border-cyan-500/25 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative z-10 animate-fadeIn">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎞️</span>
                <h2 className="text-lg sm:text-2xl font-black uppercase text-white tracking-wide">
                  50-Tier Season Pass (90-Day Progression)
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Click any reward picture to inspect it up close, read its lore, or preview how frames and titles look on your avatar portrait.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {readyToClaimTiers.length > 0 && (
                <button
                  type="button"
                  onClick={handleClaimAllReadyTiers}
                  disabled={Boolean(claimingTier)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-black font-mono text-xs font-black uppercase shadow-[0_0_20px_rgba(251,191,36,0.4)] cursor-pointer active:scale-95"
                >
                  🎁 Claim All {readyToClaimTiers.length} Ready Tiers
                </button>
              )}

              <div className="text-right">
                <span className="text-xs font-mono text-cyan-300 font-bold block">
                  {profileData.userXp.toLocaleString()} / {maxPassXp.toLocaleString()} Season XP
                  {prestigeRank > 0 && ` • Prestige Lv.${prestigeRank}`}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Next Tier ({nextTierObj.tier}): {nextTierObj.requiredXp.toLocaleString()} XP ({tierProgressPct}%)
                </span>
              </div>
            </div>
          </div>

          {/* Global Season Progress Bar */}
          <div className="space-y-1.5">
            <div className="h-4 w-full bg-[#0a0a14] border border-cyan-500/30 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-400 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(6,182,212,0.6)]"
                style={{ width: `${globalProgressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 flex-wrap gap-2">
              <span>Act I: Indie (0 XP)</span>
              <span>Act II: Backlot (15.8k XP)</span>
              <span>Act III: Syndicate (54.4k XP)</span>
              <span>Act IV: Festival (114.6k XP)</span>
              <span>Tier 50: Palme d&apos;Or Immortal ({maxPassXp.toLocaleString()} XP)</span>
            </div>
          </div>

          {/* Act Filter & Reward Type Dropdown Selectors */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <label htmlFor="pass-act-select" className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <span>🎞️</span> Act Filter:
              </label>
              <select
                id="pass-act-select"
                value={String(selectedActFilter)}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedActFilter(val === "all" || val === "ready" ? val : Number(val));
                }}
                className="bg-[#0c1020] border border-cyan-500/30 text-xs font-mono font-bold text-white rounded-xl px-3.5 py-2 outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
              >
                <option value="all" className="bg-[#0c1020] text-white">All 50 Tiers</option>
                <option value="1" className="bg-[#0c1020] text-white">Act I (Tiers 1–10)</option>
                <option value="2" className="bg-[#0c1020] text-white">Act II (Tiers 11–20)</option>
                <option value="3" className="bg-[#0c1020] text-white">Act III (Tiers 21–30)</option>
                <option value="4" className="bg-[#0c1020] text-white">Act IV (Tiers 31–40)</option>
                <option value="5" className="bg-[#0c1020] text-white">Act V (Tiers 41–50)</option>
                <option value="ready" className="bg-[#0c1020] text-amber-300">🎁 Ready to Claim ({readyToClaimTiers.length})</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="pass-type-select" className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <span>🎁</span> Reward Type:
              </label>
              <select
                id="pass-type-select"
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="bg-[#0c1020] border border-amber-500/30 text-xs font-mono font-bold text-white rounded-xl px-3.5 py-2 outline-none focus:border-amber-400 cursor-pointer shadow-inner"
              >
                <option value="all" className="bg-[#0c1020] text-white">All Rewards</option>
                <option value="frame" className="bg-[#0c1020] text-white">🖼️ Avatar Frames</option>
                <option value="title" className="bg-[#0c1020] text-white">🏷️ Screen Titles</option>
                <option value="theme" className="bg-[#0c1020] text-white">🎨 35mm LUT Grades</option>
                <option value="crate" className="bg-[#0c1020] text-white">📦 Mystery Vaults & Props</option>
                <option value="coins" className="bg-[#0c1020] text-white">🪙 SceneCents Grants</option>
              </select>
            </div>
          </div>

          {/* Horizontal Tier Reel with High-Res Reward Pictures */}
          <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-cyan-500/30">
            {displayedTiers.map((t) => {
              const isUnlocked = profileData.userXp >= t.requiredXp;
              const isClaimed = profileData.claimedTiers.includes(t.tier);
              const isCurrent = currentTierIndex === t.tier;
              const equipKey = t.rewardFrame || t.rewardTitle || t.rewardTheme;
              const isEquipped =
                Boolean(equipKey) &&
                (profileData.equippedFrame === equipKey ||
                  profileData.equippedTitle === equipKey ||
                  profileData.equippedTheme === equipKey);

              return (
                <div
                  key={t.tier}
                  className={`snap-start shrink-0 w-64 p-4 rounded-2xl border flex flex-col justify-between transition-all relative ${
                    isCurrent
                      ? "bg-gradient-to-b from-[#11192e] to-[#080d1a] border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)] ring-1 ring-cyan-300/40"
                      : isUnlocked
                      ? "bg-[#080d1a] border-amber-500/40"
                      : "bg-[#05060d] border-white/10 opacity-85"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-mono font-black px-2 py-0.5 rounded ${
                          isCurrent
                            ? "bg-cyan-400 text-black"
                            : isUnlocked
                            ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                            : "bg-white/10 text-slate-300"
                        }`}
                      >
                        TIER {t.tier}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {t.requiredXp.toLocaleString()} XP
                      </span>
                    </div>

                    {/* Clickable Reward Picture Card */}
                    <div
                      onClick={() =>
                        handleInspectReward({
                          ...t,
                          name: t.rewardLabel,
                        })
                      }
                      className="cursor-pointer"
                      title="Click to inspect & preview reward"
                    >
                      <RewardPictureCard
                        visualKey={t.visualKey}
                        rewardType={t.rewardType}
                        rarity={t.rarity}
                        label={t.rewardLabel}
                        size="md"
                        isLocked={!isUnlocked}
                        isClaimed={isClaimed}
                        isEquipped={isEquipped}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 mt-3 space-y-1.5">
                    {isClaimed ? (
                      <>
                        <span className="w-full py-1.5 bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold uppercase rounded-lg text-center block">
                          ✓ Unlocked in Kit
                        </span>
                        {equipKey && (
                          <button
                            type="button"
                            onClick={() => handleEquipCosmetic(equipKey)}
                            className="w-full py-1.5 bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold uppercase rounded-lg border border-cyan-500/30 cursor-pointer"
                          >
                            {isEquipped ? "✓ Equipped (Unequip)" : "Equip to Dossier"}
                          </button>
                        )}
                      </>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        disabled={claimingTier === t.tier}
                        onClick={() => handleClaimTier(t)}
                        className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black text-[10px] font-mono font-black uppercase rounded-lg transition-all shadow-md active:scale-95 cursor-pointer animate-pulse"
                      >
                        {claimingTier === t.tier ? "Unlocking..." : "🎁 Claim Reward"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleInspectReward({ ...t, name: t.rewardLabel })}
                        className="w-full py-1.5 bg-[#0e1222] hover:bg-[#161d35] text-cyan-300 border border-cyan-500/20 text-[10px] font-mono uppercase rounded-lg text-center block cursor-pointer"
                      >
                        🔍 Inspect &amp; Preview
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: INTERACTIVE STUDIO ARCADE & MINI-GAMES       */}
      {/* ======================================================== */}
      {(activeMainTab === "arcade" || activeMainTab === "all") && (
        <section className="bg-gradient-to-r from-[#090d1d] via-[#110c24] to-[#08121c] border border-violet-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(139,92,246,0.15)] relative z-10 space-y-6 animate-fadeIn">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/50 text-[10px] font-mono font-black uppercase text-violet-300">
                  ⚡ Studio Arcade &amp; PvP Challenges
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-300">
                  🎟️ {profileData.spinTickets} Spin Ticket{profileData.spinTickets === 1 ? "" : "s"}
                </span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black uppercase tracking-wide text-white mt-1">
                Daily Spin, 4 Cinema Games &amp; Player Challenges
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Claim your free daily spin, buy discounted spin bundles with SceneCents, master 4 upgraded cinema games, or challenge players head-to-head.
              </p>
            </div>

            {/* Arcade Mode Selector Pill Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                {
                  id: "wheel",
                  label: "🎡 Daily Spin & Shop",
                  badge: freeSpinAvailable ? "FREE" : null,
                },
                { id: "games", label: "🎮 Cinema Games (4)", badge: null },
                { id: "arena", label: "⚔️ Challenge Players", badge: "PvP" },
                { id: "vaults", label: "📦 Mystery Canisters", badge: null },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setArcadeTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    arcadeTab === tab.id
                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg"
                      : "bg-black/50 text-slate-300 border border-white/10 hover:border-violet-400"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: DAILY SPIN WHEEL + SCENECENTS SPIN SHOP */}
          {arcadeTab === "wheel" && (
            <DailySpinWheel
              user={user}
              walletCoins={profileData.walletCoins}
              xpMultiplier={xpMultiplier}
              spinTickets={profileData.spinTickets}
              freeSpinAvailable={freeSpinAvailable}
              pityCounter={profileData.pityCounter}
              onEconomyChange={handleArcadeEconomyChange}
            />
          )}

          {/* TAB 2: 4 UPGRADED SOLO CINEMA GAMES */}
          {arcadeTab === "games" && (
            <SoloGamesHub
              user={user}
              walletCoins={profileData.walletCoins}
              xpMultiplier={xpMultiplier}
              initialGame="focus"
              onEconomyChange={handleArcadeEconomyChange}
              onSwitchToPvp={() => setArcadeTab("arena")}
            />
          )}

          {/* TAB 3: PLAYER-VS-PLAYER CHALLENGES & SCENECENTS ARENA */}
          {arcadeTab === "arena" && (
            <SceneCentsArena
              user={user}
              walletCoins={profileData.walletCoins}
              xpMultiplier={xpMultiplier}
              onEconomyChange={handleArcadeEconomyChange}
              initialTab="pvp"
            />
          )}

          {/* TAB 4: MYSTERY FILM VAULT CRATES WITH IMAGES & LOOT TABLES */}
          {arcadeTab === "vaults" && (
            <div className="space-y-6">
              {unsealedLoot && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-fuchsia-950/70 to-cyan-950/80 border-2 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.35)] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 shrink-0">
                      <RewardPictureCard
                        visualKey={unsealedLoot.visualKey}
                        rarity={unsealedLoot.rarity}
                        size="sm"
                        label={unsealedLoot.label}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                        🎉 {unsealedLoot.crateName} Unsealed!
                      </span>
                      <h4 className="text-base font-black text-white">{unsealedLoot.label}</h4>
                      <p className="text-xs font-mono text-emerald-300 mt-0.5">
                        Payout: +{unsealedLoot.coins} 🪙 &amp; +{unsealedLoot.boostedXp} Director XP
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUnsealedLoot(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {VAULT_CRATES.map((crate) => {
                  const rarityStyle = RARITY_CONFIG[crate.rarity] || RARITY_CONFIG.RARE;
                  const isOpening = openingCrateId === crate.id;
                  const isPeeking = peekCrateId === crate.id;

                  return (
                    <div
                      key={crate.id}
                      className={`rounded-2xl border p-5 bg-[#090c18] flex flex-col justify-between space-y-4 ${rarityStyle.cardBorder} ${rarityStyle.glow}`}
                    >
                      <div className="space-y-3">
                        <div className="relative h-44 rounded-xl overflow-hidden border border-white/10 group">
                          <Image
                            src={crate.image || FALLBACK_IMAGE}
                            alt={crate.name}
                            fill
                            unoptimized
                            sizes="(max-width: 1024px) 50vw, 33vw"
                            className={`object-cover transition-transform duration-500 ${
                              isOpening ? "scale-125 animate-pulse" : "group-hover:scale-105"
                            }`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                          <span
                            className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase border ${rarityStyle.badgeBg}`}
                          >
                            {rarityStyle.label}
                          </span>
                          <div className="absolute bottom-2 left-2.5 right-2.5">
                            <h3 className="text-base font-black text-white">{crate.name}</h3>
                            <p className="text-xs font-mono text-slate-300">{crate.subtitle}</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{crate.rewardsDesc}</p>

                        {/* Peek Inside Loot Table Toggle */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setPeekCrateId(isPeeking ? null : crate.id)}
                            className="text-[11px] font-mono text-cyan-300 hover:text-cyan-200 underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{isPeeking ? "▲ Hide Possible Drops" : "▼ Peek Inside Loot Table"}</span>
                          </button>

                          {isPeeking && (
                            <div className="mt-3 space-y-2 pt-2 border-t border-white/10">
                              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                                Guaranteed 1 of 3 possible drops:
                              </span>
                              {crate.possibleLoot.map((loot, lIdx) => (
                                <div
                                  key={lIdx}
                                  className="p-2 rounded-lg bg-black/60 border border-white/10 flex items-center gap-2.5 text-xs font-mono"
                                >
                                  <div className="w-10 h-10 shrink-0">
                                    <RewardPictureCard
                                      visualKey={loot.visualKey}
                                      rarity={loot.rarity}
                                      size="sm"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[11px] font-bold text-white block truncate">
                                      {loot.label}
                                    </span>
                                    <span className="text-[9px] text-amber-300 font-bold block">
                                      {loot.rarity} DROP
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={Boolean(openingCrateId)}
                        onClick={() => handleOpenVaultCrate(crate)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-black font-mono text-xs font-black uppercase transition-all shadow-md cursor-pointer active:scale-95"
                      >
                        {isOpening ? "Unsealing Canister..." : `📦 Unseal Vault (${crate.cost} 🪙)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ======================================================== */}
      {/* SECTION 4: CAREER MASTERY CAMPAIGNS (90-DAY TROPHIES)   */}
      {/* ======================================================== */}
      {(activeMainTab === "mastery" || activeMainTab === "all") && (
        <section className="bg-[#07070d] border border-fuchsia-500/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative z-10 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-400 font-bold block">
                🏅 90-Day Career Mastery Trophies (Bronze → Mythic)
              </span>
              <h2 className="text-lg sm:text-2xl font-black uppercase text-white mt-0.5">
                Long-Term Studio Mastery Campaigns
              </h2>
              <p className="text-xs text-slate-300">
                Multi-month progressive milestones with 5 stages each (Bronze, Silver, Gold, Diamond, Mythic). Complete them over weeks and months of active cinema engagement!
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CAREER_MASTERY_CAMPAIGNS.map((camp) => {
              const currentVal = getMasteryCurrentValue(camp.id);
              // Find active uncompleted or unclaimed stage
              let activeStageObj = camp.stages[camp.stages.length - 1];
              for (const st of camp.stages) {
                const claimKey = `${camp.id}_s${st.stage}`;
                if (!profileData.claimedMastery.includes(claimKey)) {
                  activeStageObj = st;
                  break;
                }
              }
              const activeClaimKey = `${camp.id}_s${activeStageObj.stage}`;
              const isStageClaimed = profileData.claimedMastery.includes(activeClaimKey);
              const isStageReady = currentVal >= activeStageObj.goal && !isStageClaimed;
              const pct = Math.min(100, Math.round((currentVal / activeStageObj.goal) * 100));

              return (
                <div
                  key={camp.id}
                  className="bg-[#090d1a] border border-white/10 hover:border-fuchsia-400/50 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-fuchsia-400/40 shrink-0">
                      <Image
                        src={camp.image || FALLBACK_IMAGE}
                        alt={camp.title}
                        fill
                        unoptimized
                        sizes="96px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute bottom-1.5 left-2 text-xl">{camp.icon}</span>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase text-fuchsia-300 font-bold">
                          Stage {activeStageObj.stage} / 5 • {activeStageObj.rank}
                        </span>
                        <span className="text-[10px] font-mono text-amber-300 font-bold">
                          +{activeStageObj.rewardCoins} 🪙 &amp; +{activeStageObj.rewardXp} XP
                        </span>
                      </div>
                      <h3 className="text-base font-black text-white">{camp.title}</h3>
                      <p className="text-xs text-slate-400 leading-snug">{camp.description}</p>

                      {/* 5 Stage Pips */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {camp.stages.map((st) => {
                          const claimed = profileData.claimedMastery.includes(`${camp.id}_s${st.stage}`);
                          return (
                            <span
                              key={st.stage}
                              className={`h-2 flex-1 rounded-full ${
                                claimed
                                  ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                                  : st.stage === activeStageObj.stage
                                  ? "bg-fuchsia-400 animate-pulse"
                                  : "bg-white/10"
                              }`}
                              title={`${st.rank}: Goal ${st.goal}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">
                        Progress: <strong className="text-white">{currentVal}</strong> / {activeStageObj.goal} ({pct}%)
                      </span>
                      <button
                        type="button"
                        disabled={!isStageReady}
                        onClick={() => handleClaimMasteryStage(camp, activeStageObj)}
                        className={`px-4 py-1.5 rounded-xl text-[10px] font-mono font-black uppercase transition-all ${
                          isStageClaimed
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                            : isStageReady
                            ? "bg-gradient-to-r from-fuchsia-500 to-amber-500 text-black shadow-md cursor-pointer active:scale-95 animate-pulse"
                            : "bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed"
                        }`}
                      >
                        {isStageClaimed
                          ? "✓ All Stages Complete"
                          : isStageReady
                          ? `Claim ${activeStageObj.rank}`
                          : "In Progress"}
                      </button>
                    </div>
                    <div className="h-2 w-full bg-black/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-amber-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* INTERACTIVE REWARD SHOWCASE & LIVE AVATAR TRY-ON MODAL   */}
      {/* ======================================================== */}
      {inspectedReward && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
          onClick={() => setInspectedReward(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#070913] border border-cyan-400/50 rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-5 shadow-[0_0_60px_rgba(6,182,212,0.3)] relative max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  🔍 Reward Showcase &amp; Live Try-On
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {inspectedReward.name || inspectedReward.rewardLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedReward(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Large High-Resolution Reward Picture */}
            <RewardPictureCard
              visualKey={inspectedReward.visualKey || "coins_stack"}
              rewardType={inspectedReward.rewardType || "coins"}
              rarity={inspectedReward.rarity || "RARE"}
              label={inspectedReward.name || inspectedReward.rewardLabel}
              size="lg"
            />

            <p className="text-xs text-slate-300 leading-relaxed">
              {inspectedReward.lore ||
                REWARD_VISUAL_CATALOG[inspectedReward.visualKey]?.lore ||
                "Prestigious Season 1 Director Pass reward."}
            </p>

            {/* Live Avatar Try-On Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 block">
                Live Avatar Dossier Preview:
              </span>
              <LiveAvatarPreview
                avatarUrl={user?.photoURL}
                displayName={user?.displayName || "Director Operative"}
                frameId={inspectedReward.rewardFrame || profileData.equippedFrame}
                titleId={inspectedReward.rewardTitle || profileData.equippedTitle}
                themeId={inspectedReward.rewardTheme || profileData.equippedTheme}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/armoury"
                className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold hover:bg-amber-500/30"
              >
                Visit Prop Dept ↗
              </Link>
              <button
                type="button"
                onClick={() => setInspectedReward(null)}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-black uppercase cursor-pointer"
              >
                Close Showcase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER NAVIGATION */}
      <footer className="pt-6 border-t border-white/10 flex items-center justify-between flex-wrap gap-4 text-xs font-mono text-slate-400">
        <Link href="/" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
          <span>←</span> Back to Cinema Home
        </Link>
        <Link href="/armoury" className="hover:text-amber-300 transition-colors flex items-center gap-1.5">
          <span>🎟️</span> Visit The Prop Department
        </Link>
        <Link href="/profile" className="hover:text-cyan-300 transition-colors flex items-center gap-1.5">
          View Director Profile Dossier <span>→</span>
        </Link>
      </footer>
    </div>
  );
}
