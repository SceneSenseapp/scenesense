// File: app/arcade/page.jsx
"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { doc, setDoc, increment, arrayUnion } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/firebase";
import { useStudioSession } from "@/components/StudioSessionProvider";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";
import DailySpinWheel from "@/components/arcade/DailySpinWheel";
import SoloGamesHub from "@/components/arcade/SoloGamesHub";
import SceneCentsArena from "@/components/SceneCentsArena";
import { RARITY_CONFIG, RewardPictureCard } from "@/lib/reward-visuals";
import { trackQuestEvent } from "@/lib/quest-tracker";
import {
  FALLBACK_STILL,
  getTodayUtcDateKey,
  readGuestEconomy,
  writeGuestEconomy,
  createSeededRng,
} from "@/lib/arcade-engine";

const MYSTERY_VAULTS = [
  {
    id: "crate_16mm",
    name: "16mm Indie Canister",
    subtitle: "Backlot Supply Drop",
    cost: 120,
    rarity: "RARE",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    rewardsDesc: "Win 95–240 SceneCents + 280–600 Director XP",
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
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80",
    rewardsDesc: "Win 230–600 SceneCents + 700–1,400 XP + Rare LUTs",
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
    image: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=600&q=80",
    rewardsDesc: "Win 550–1,500 SceneCents + 1,850–3,500 XP + Legendary Borders",
    possibleLoot: [
      { label: "70mm Bullion Drop (+550 🪙 & +1,850 XP)", coins: 550, xp: 1850, rarity: "EPIC", visualKey: "coins_treasury" },
      { label: "Academy Solar Gold Border (+950 🪙 & +2,600 XP)", coins: 950, xp: 2600, rarity: "LEGENDARY", visualKey: "frame_solar_gold", unlockItem: "frame_solar_gold" },
      { label: "Premiere Velvet Border (+1,500 🪙 & +3,500 XP)", coins: 1500, xp: 3500, rarity: "MYTHIC", visualKey: "frame_crimson_velvet", unlockItem: "frame_crimson_velvet" },
    ],
  },
];

const VALID_TABS = ["spin", "games", "pvp", "vaults"];

function ArcadeHubContent() {
  const searchParams = useSearchParams();
  const session = useStudioSession();
  const user = session?.user || null;
  const userProfile = session?.userProfile || null;

  const urlTab = searchParams.get("tab") || "";
  const urlCode = searchParams.get("code") || "";
  const urlGame = searchParams.get("game") || "focus";
  const urlOppUid = searchParams.get("opponentUid") || "";
  const urlOppName = searchParams.get("opponentName") || "";

  const resolvedUrlTab = useMemo(() => {
    if (urlCode || urlOppName) return "pvp";
    if (VALID_TABS.includes(urlTab)) return urlTab;
    return "spin";
  }, [urlTab, urlCode, urlOppName]);

  const [activeTab, setActiveTab] = useState(resolvedUrlTab);
  const [prevUrlKey, setPrevUrlKey] = useState(
    `${urlTab}_${urlCode}_${urlOppUid}_${urlOppName}`
  );
  const currUrlKey = `${urlTab}_${urlCode}_${urlOppUid}_${urlOppName}`;
  if (currUrlKey !== prevUrlKey) {
    setPrevUrlKey(currUrlKey);
    setActiveTab(resolvedUrlTab);
  }

  // Guest / Optimistic Economy State
  const [guestEco, setGuestEco] = useState({
    coins: 200,
    xp: 320,
    spinTickets: 1,
    lastDailySpinDate: null,
    pityCounter: 0,
  });
  const [todayKey, setTodayKey] = useState("");

  // Vault Crates State
  const [openingCrateId, setOpeningCrateId] = useState(null);
  const [unsealedLoot, setUnsealedLoot] = useState(null);
  const [peekCrateId, setPeekCrateId] = useState(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const tk = getTodayUtcDateKey(Date.now());
      setTodayKey(tk);
      const stored = readGuestEconomy();
      const legacyWheelDate = localStorage.getItem("scenesense_wheel_date");
      setGuestEco({
        ...stored,
        lastDailySpinDate: stored.lastDailySpinDate || legacyWheelDate || null,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Derive active economy from Cloud Profile (when signed in) or Guest Starter Wallet
  const walletCoins = user
    ? Number(userProfile?.coins ?? userProfile?.tokens ?? 150)
    : guestEco.coins;
  const userXp = user ? Number(userProfile?.xp ?? 320) : guestEco.xp;
  const spinTickets = user
    ? Number(userProfile?.spinTickets ?? 0)
    : guestEco.spinTickets;
  const pityCounter = user
    ? Number(userProfile?.pityCounter ?? 0)
    : guestEco.pityCounter;

  const lastDailySpinDate = user
    ? userProfile?.lastDailySpinDate || guestEco.lastDailySpinDate
    : guestEco.lastDailySpinDate;
  const freeSpinAvailable = Boolean(todayKey) && lastDailySpinDate !== todayKey;

  const xpMultiplier = useMemo(() => {
    const streak = Number(userProfile?.loginStreak || 1);
    let mult = 1.0;
    if (streak >= 30) mult = 2.25;
    else if (streak >= 14) mult = 1.85;
    else if (streak >= 7) mult = 1.5;
    else if (streak >= 3) mult = 1.25;
    else if (streak >= 2) mult = 1.1;
    if (Array.isArray(userProfile?.inventory) && userProfile.inventory.includes("xp_overclock_2x")) {
      mult += 0.25;
    }
    return Number(mult.toFixed(2));
  }, [userProfile]);

  // Unified Economy Update Handler for Guest + Optimistic Local Sync
  const handleEconomyChange = useCallback(
    ({
      deltaCoins = 0,
      deltaXp = 0,
      deltaTickets = 0,
      markDailySpinDate,
      nextPityCounter,
      unlockCosmetic,
    }) => {
      setGuestEco((prev) => {
        const updated = {
          ...prev,
          coins: Math.max(0, prev.coins + deltaCoins),
          xp: Math.max(0, prev.xp + deltaXp),
          spinTickets: Math.max(0, prev.spinTickets + deltaTickets),
          lastDailySpinDate:
            markDailySpinDate !== undefined ? markDailySpinDate : prev.lastDailySpinDate,
          pityCounter:
            typeof nextPityCounter === "number" ? nextPityCounter : prev.pityCounter,
        };
        writeGuestEconomy(updated);
        return updated;
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

  // Open Mystery Vault Canister
  const handleOpenCrate = async (crate) => {
    if (openingCrateId) return;
    if (walletCoins < crate.cost) {
      toast.error(`You need ${crate.cost} SceneCents to unseal ${crate.name}!`);
      return;
    }

    setOpeningCrateId(crate.id);
    setUnsealedLoot(null);

    setTimeout(async () => {
      const rng = createSeededRng(`vault_${crate.id}_${Date.now()}_${walletCoins}`);
      const roll = rng();
      const idx = roll > 0.8 ? 2 : roll > 0.4 ? 1 : 0;
      const loot = crate.possibleLoot[idx] || crate.possibleLoot[0];
      const netCoins = loot.coins - crate.cost;
      const boostedXp = Math.round(loot.xp * xpMultiplier);

      handleEconomyChange({
        deltaCoins: netCoins,
        deltaXp: boostedXp,
        unlockCosmetic: loot.unlockItem || null,
      });

      if (user && db) {
        try {
          const payload = {
            coins: increment(netCoins),
            xp: increment(boostedXp),
          };
          if (loot.unlockItem) payload.inventory = arrayUnion(loot.unlockItem);
          await setDoc(doc(db, "users", user.uid), payload, { merge: true });
        } catch {
          // Non-fatal
        }
      }

      setUnsealedLoot({
        crateName: crate.name,
        ...loot,
        boostedXp,
      });
      setOpeningCrateId(null);
      trackQuestEvent("week_vault_open_5", 1);
      toast.success(`Unsealed ${crate.name}: ${loot.label}!`, { icon: "📦" });
    }, 950);
  };

  const initialOpponentObj = useMemo(() => {
    if (!urlOppName) return null;
    return {
      uid: urlOppUid || `opp_${urlOppName}`,
      displayName: urlOppName,
    };
  }, [urlOppUid, urlOppName]);

  const NAV_PILLS = [
    {
      id: "spin",
      icon: "🎡",
      label: "Daily Spin & Shop",
      badge: freeSpinAvailable ? "FREE READY" : spinTickets > 0 ? `${spinTickets} 🎟️` : null,
      badgeStyle: freeSpinAvailable
        ? "bg-emerald-400 text-slate-950"
        : "bg-cyan-400 text-slate-950",
    },
    {
      id: "games",
      icon: "🎮",
      label: "Cinema Games (4)",
      badge: "Solo",
      badgeStyle: "bg-white/10 text-slate-200",
    },
    {
      id: "pvp",
      icon: "⚔️",
      label: "Challenge Players",
      badge: "PvP + Codes",
      badgeStyle: "bg-violet-400 text-slate-950",
    },
    {
      id: "vaults",
      icon: "📦",
      label: "Mystery Vaults",
      badge: null,
      badgeStyle: "",
    },
  ];

  return (
    <PageShell withGrid>
      <PageHeader
        eyebrow="Studio Arcade & PvP Wager Hub"
        title="Daily Spin, Cinema Games &"
        accent="Player Challenges"
        subtitle="Claim your free daily spin, buy discounted spin packs with SceneCents, master 4 upgraded cinema games, or challenge real players head-to-head on identical movie seeds."
        meta={
          <>
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-xs font-mono text-amber-300 font-bold">
              🪙 {walletCoins.toLocaleString()} SceneCents
            </span>
            <span className="px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-xs font-mono text-cyan-300 font-bold">
              🎟️ {spinTickets} Spin Ticket{spinTickets === 1 ? "" : "s"}
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-xs font-mono text-emerald-300 font-bold">
              ⚡ {xpMultiplier}x XP ({userXp.toLocaleString()} XP)
            </span>
            {!user && (
              <Link
                href="/login"
                className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-mono text-slate-200 transition-colors"
              >
                Guest Starter Wallet Active • Sign In to Sync ↗
              </Link>
            )}
          </>
        }
        actions={
          <>
            <Link
              href="/quests"
              className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-mono font-bold text-white transition-colors"
            >
              🎯 Quests &amp; 50-Tier Pass
            </Link>
            <Link
              href="/leaderboards"
              className="px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-xs font-mono font-bold text-cyan-200 transition-colors"
            >
              🏆 Leaderboards
            </Link>
          </>
        }
      />

      {/* CLEAN, STRAIGHTFORWARD 4-TAB PILL NAVIGATION */}
      <nav
        aria-label="Arcade Sections"
        className="studio-panel rounded-2xl p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
      >
        {NAV_PILLS.map((pill) => {
          const active = activeTab === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => setActiveTab(pill.id)}
              className={`px-4 py-3 rounded-xl font-mono text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-lg"
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 border border-white/10"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <span className="text-base">{pill.icon}</span>
                <span className="truncate">{pill.label}</span>
              </span>
              {pill.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                    active ? "bg-slate-950 text-cyan-300" : pill.badgeStyle
                  }`}
                >
                  {pill.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* SECTION 1: DAILY SPIN & SCENECENTS SPIN SHOP */}
      {activeTab === "spin" && (
        <DailySpinWheel
          user={user}
          walletCoins={walletCoins}
          xpMultiplier={xpMultiplier}
          spinTickets={spinTickets}
          freeSpinAvailable={freeSpinAvailable}
          pityCounter={pityCounter}
          onEconomyChange={handleEconomyChange}
        />
      )}

      {/* SECTION 2: 4 SOLO CINEMA GAMES */}
      {activeTab === "games" && (
        <SoloGamesHub
          user={user}
          walletCoins={walletCoins}
          xpMultiplier={xpMultiplier}
          initialGame={
            ["focus", "cipher", "clash", "reel21"].includes(urlGame) ? urlGame : "focus"
          }
          onEconomyChange={handleEconomyChange}
          onSwitchToPvp={() => setActiveTab("pvp")}
        />
      )}

      {/* SECTION 3: PLAYER-VS-PLAYER CHALLENGES & WAGER ARENA */}
      {activeTab === "pvp" && (
        <SceneCentsArena
          user={user}
          walletCoins={walletCoins}
          xpMultiplier={xpMultiplier}
          onEconomyChange={handleEconomyChange}
          initialTab={urlCode ? "inbox" : "pvp"}
          initialDuelCode={urlCode}
          initialOpponent={initialOpponentObj}
        />
      )}

      {/* SECTION 4: MYSTERY FILM VAULT CRATES */}
      {activeTab === "vaults" && (
        <section className="space-y-6">
          {unsealedLoot && (
            <div className="studio-panel rounded-2xl p-5 border-2 border-amber-400/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-20 shrink-0">
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
                  <h3 className="text-base font-bold text-white">{unsealedLoot.label}</h3>
                  <p className="text-xs font-mono text-emerald-300 mt-0.5">
                    +{unsealedLoot.coins} 🪙 &amp; +{unsealedLoot.boostedXp} XP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnsealedLoot(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono text-white cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MYSTERY_VAULTS.map((crate) => {
              const rStyle = RARITY_CONFIG[crate.rarity] || RARITY_CONFIG.RARE;
              const isOpening = openingCrateId === crate.id;
              const isPeeking = peekCrateId === crate.id;

              return (
                <div
                  key={crate.id}
                  className={`studio-panel rounded-3xl p-5 border flex flex-col justify-between space-y-4 ${rStyle.cardBorder}`}
                >
                  <div className="space-y-3">
                    <div className="relative h-44 rounded-2xl overflow-hidden border border-white/10">
                      <Image
                        src={crate.image || FALLBACK_STILL}
                        alt={crate.name}
                        fill
                        unoptimized
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                      <span
                        className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${rStyle.badgeBg}`}
                      >
                        {rStyle.label}
                      </span>
                      <div className="absolute bottom-2.5 left-3 right-3">
                        <h3 className="text-base font-bold text-white">{crate.name}</h3>
                        <p className="text-xs font-mono text-slate-300">{crate.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {crate.rewardsDesc}
                    </p>

                    <button
                      type="button"
                      onClick={() => setPeekCrateId(isPeeking ? null : crate.id)}
                      className="text-xs font-mono text-cyan-300 hover:underline cursor-pointer"
                    >
                      {isPeeking ? "▲ Hide Loot Table" : "▼ View Possible Drops"}
                    </button>

                    {isPeeking && (
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        {crate.possibleLoot.map((loot, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between text-xs font-mono"
                          >
                            <span className="text-slate-200 truncate pr-2">{loot.label}</span>
                            <span className="text-[10px] text-amber-300 shrink-0">
                              {loot.rarity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(openingCrateId)}
                    onClick={() => handleOpenCrate(crate)}
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer shadow"
                  >
                    {isOpening ? "Unsealing..." : `📦 Unseal Canister (${crate.cost} 🪙)`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </PageShell>
  );
}

export default function ArcadePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 font-mono text-cyan-300">
          <div className="w-9 h-9 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs uppercase tracking-widest">
            Loading Studio Arcade &amp; PvP Challenges...
          </span>
        </div>
      }
    >
      <ArcadeHubContent />
    </Suspense>
  );
}
