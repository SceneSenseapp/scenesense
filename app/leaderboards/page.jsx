// File: app/leaderboards/page.jsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, limit, doc, setDoc, increment } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "@/firebase";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/layout/PageHeader";

const STUDIO_FACTIONS = [
  {
    id: "The Auteur Guild",
    icon: "🎬",
    tagline: "70mm celluloid purists, Criterion collectors & festival laureates.",
    barColor: "from-amber-500 to-yellow-300",
    baseScore: 48200,
  },
  {
    id: "Sci-Fi Masterminds",
    icon: "🛸",
    tagline: "Cyberpunk architects, temporal paradox theorists & cosmic voyagers.",
    barColor: "from-cyan-500 to-sky-300",
    baseScore: 51900,
  },
  {
    id: "Horror Archivists",
    icon: "🩸",
    tagline: "Masters of slow-burn psychological dread, folk horror & midnight tension.",
    barColor: "from-rose-600 to-orange-400",
    baseScore: 44600,
  },
  {
    id: "Midnight Cine-Maniacs",
    icon: "🍿",
    tagline: "Underground cult cinema hunters, grindhouse devotees & genre mashup rebels.",
    barColor: "from-violet-500 to-fuchsia-400",
    baseScore: 46100,
  },
];

const SEEDED_DIRECTORS = [
  { id: "seed_1", displayName: "Maya Sterling", handle: "@maya_sterling", xp: 48200, coins: 2450, reviewsCount: 38, faction: "Sci-Fi Masterminds", equippedTitle: "title_auteur_director", equippedFrame: "frame_solar_gold" },
  { id: "seed_2", displayName: "Lucas Vance", handle: "@lucas.vance", xp: 42900, coins: 1980, reviewsCount: 31, faction: "The Auteur Guild", equippedTitle: "title_shadow_operative", equippedFrame: "frame_neon_cyan" },
  { id: "seed_3", displayName: "Elena Torres", handle: "@elena.torres", xp: 39150, coins: 1740, reviewsCount: 29, faction: "Horror Archivists", equippedTitle: "title_archivist", equippedFrame: "frame_quantum_amethyst" },
  { id: "seed_4", displayName: "Julian Hayes", handle: "@julian_hayes", xp: 31400, coins: 1520, reviewsCount: 24, faction: "Midnight Cine-Maniacs", equippedTitle: "title_lead_gaffer", equippedFrame: "frame_neon_cyan" },
  { id: "seed_5", displayName: "Chloe Rivera", handle: "@chloe.rivera", xp: 27800, coins: 1290, reviewsCount: 21, faction: "Sci-Fi Masterminds", equippedTitle: "title_shadow_operative", equippedFrame: null },
  { id: "seed_6", displayName: "Liam Chen", handle: "@liam_chen", xp: 24100, coins: 1100, reviewsCount: 19, faction: "The Auteur Guild", equippedTitle: "title_archivist", equippedFrame: "frame_solar_gold" },
  { id: "seed_7", displayName: "Zoe Morales", handle: "@zoe_m", xp: 19600, coins: 940, reviewsCount: 15, faction: "Horror Archivists", equippedTitle: null, equippedFrame: null },
  { id: "seed_8", displayName: "Marcus Reynolds", handle: "@m_reynolds", xp: 16200, coins: 810, reviewsCount: 12, faction: "Midnight Cine-Maniacs", equippedTitle: null, equippedFrame: null },
];

const getTitleLabel = (titleId) => {
  switch (titleId) {
    case "title_auteur_director":
      return "AUTEUR DIRECTOR";
    case "title_shadow_operative":
      return "EXECUTIVE PRODUCER";
    case "title_archivist":
      return "CHIEF ARCHIVIST";
    case "title_lead_gaffer":
      return "LEAD GAFFER";
    default:
      return "STUDIO DIRECTOR";
  }
};

const computeTier = (xp = 0) => {
  let tier = 1;
  for (let i = 0; i < 50; i++) {
    const req = i === 0 ? 0 : i * 1200 + Math.pow(i, 2) * 45;
    if (xp >= req) tier = i + 1;
  }
  return tier;
};

const BOARD_TABS = [
  { id: "xp", icon: "🎖️", label: "Director XP" },
  { id: "coins", icon: "🪙", label: "SceneCents" },
  { id: "critics", icon: "✍️", label: "Top Critics" },
  { id: "factions", icon: "⚔️", label: "Studio Factions" },
];

export default function LeaderboardPage() {
  const [user, setUser] = useState(null);
  const [operatives, setOperatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("xp");
  const [userFaction, setUserFaction] = useState("Sci-Fi Masterminds");
  const [pledging, setPledging] = useState(false);

  const fetchLeaderboardData = useCallback(async (currentUser) => {
    setIsLoading(true);
    try {
      if (!db) throw new Error("Offline benchmark");
      const q = query(collection(db, "users"), limit(40));
      const querySnapshot = await getDocs(q);
      const fetched = [];

      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const name =
          d.displayName ||
          d.username ||
          (d.email ? d.email.split("@")[0] : `Director_${docSnap.id.slice(-4)}`);
        if (currentUser && docSnap.id === currentUser.uid && d.faction) {
          setUserFaction(d.faction);
        }
        fetched.push({
          id: docSnap.id,
          displayName: name,
          handle: `@${name.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`,
          xp: Number(d.xp ?? 450),
          coins: Number(d.coins ?? d.tokens ?? 180),
          reviewsCount: Number(
            d.reviewsCount ??
              (Array.isArray(d.claimedQuests) ? d.claimedQuests.length * 2 + 3 : 4)
          ),
          faction: d.faction || "Sci-Fi Masterminds",
          equippedTitle: d.equippedTitle || null,
          equippedFrame: d.equippedFrame || null,
        });
      });

      const existingNames = new Set(fetched.map((f) => f.displayName.toLowerCase()));
      const merged = [
        ...fetched,
        ...SEEDED_DIRECTORS.filter((s) => !existingNames.has(s.displayName.toLowerCase())),
      ];
      setOperatives(merged);
    } catch {
      setOperatives(SEEDED_DIRECTORS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      const raf = requestAnimationFrame(() => {
        fetchLeaderboardData(null);
      });
      return () => cancelAnimationFrame(raf);
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      fetchLeaderboardData(currentUser);
    });
    return () => unsubscribe();
  }, [fetchLeaderboardData]);

  const sortedOperatives = useMemo(() => {
    const copy = [...operatives];
    if (activeTab === "coins") {
      return copy.sort((a, b) => b.coins - a.coins);
    }
    if (activeTab === "critics") {
      return copy.sort((a, b) => b.reviewsCount - a.reviewsCount);
    }
    return copy.sort((a, b) => b.xp - a.xp);
  }, [operatives, activeTab]);

  const factionStandings = useMemo(() => {
    return STUDIO_FACTIONS.map((fac) => {
      const members = operatives.filter((op) => op.faction === fac.id);
      const memberXp = members.reduce((sum, op) => sum + (op.xp || 0), 0);
      return {
        ...fac,
        totalXp: fac.baseScore + memberXp,
        memberCount: members.length + 14,
      };
    }).sort((a, b) => b.totalXp - a.totalXp);
  }, [operatives]);

  const handlePledgeFaction = async (factionId) => {
    setUserFaction(factionId);
    setOperatives((prev) =>
      prev.map((op) =>
        user && op.id === user.uid ? { ...op, faction: factionId, xp: op.xp + 50 } : op
      )
    );

    if (!user || !db) {
      toast.success(`Allegiance pledged to ${factionId}!`);
      return;
    }

    setPledging(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { faction: factionId, xp: increment(50) },
        { merge: true }
      );
      toast.success(`Joined ${factionId}! +50 Director XP awarded.`, { icon: "⚔️" });
    } catch {
      toast.error("Could not sync faction pledge.");
    } finally {
      setPledging(false);
    }
  };

  const topThree = sortedOperatives.slice(0, 3);

  return (
    <PageShell withGrid maxWidth="max-w-6xl">
      <PageHeader
        eyebrow="Global Studio Rankings"
        title="Director Leaderboards &"
        accent="Player Challenges"
        subtitle="Compare Season 1 Director XP, SceneCents treasuries, verified reviews, and studio factions — or challenge any ranked player directly to a seeded SceneCents duel."
        actions={
          <>
            <Link
              href="/arcade?tab=pvp"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 hover:opacity-95 text-slate-950 text-xs font-mono font-black uppercase tracking-wider shadow"
            >
              ⚔️ Open PvP Arena
            </Link>
            <Link
              href="/quests"
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-mono font-black uppercase tracking-wider shadow"
            >
              🎯 Daily Quests
            </Link>
          </>
        }
      />

      {/* CLEAN 4-PILL BOARD SELECTOR */}
      <nav
        aria-label="Leaderboard Categories"
        className="studio-panel rounded-2xl p-2 grid grid-cols-2 sm:grid-cols-4 gap-2"
      >
        {BOARD_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow"
                  : "bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 border border-white/10"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-11 h-11 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-300">
            Synchronizing Global Studio Standings...
          </span>
        </div>
      ) : activeTab === "factions" ? (
        /* STUDIO FACTION WAR TAB */
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {factionStandings.map((fac, idx) => {
            const isJoined = userFaction === fac.id;
            const maxFactionXp = factionStandings[0]?.totalXp || 1;
            const barPct = Math.min(100, Math.round((fac.totalXp / maxFactionXp) * 100));

            return (
              <div
                key={fac.id}
                className={`studio-panel p-6 rounded-3xl border transition-all flex flex-col justify-between gap-5 ${
                  isJoined
                    ? "border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.18)]"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase text-slate-400">
                      Standing #{idx + 1} • {fac.memberCount} Directors
                    </span>
                    {isJoined && (
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                        ✓ Your Faction
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{fac.icon}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">{fac.id}</h3>
                      <p className="text-xs text-slate-400">{fac.tagline}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Combined Faction Resonance</span>
                      <span className="text-white font-bold">
                        {fac.totalXp.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${fac.barColor}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isJoined || pledging}
                  onClick={() => handlePledgeFaction(fac.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                    isJoined
                      ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default"
                      : "bg-white/10 hover:bg-cyan-400 hover:text-slate-950 text-white border border-white/15"
                  }`}
                >
                  {isJoined ? "✓ Allegiance Active" : "Pledge Allegiance (+50 XP)"}
                </button>
              </div>
            );
          })}
        </section>
      ) : (
        /* INDIVIDUAL LEADERBOARD & PODIUM */
        <div className="space-y-6">
          {/* TOP 3 PODIUM */}
          {topThree.length >= 3 && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {topThree.map((op, idx) => {
                const tier = computeTier(op.xp);
                const isCurrentUser = user && op.id === user.uid;
                const medals = [
                  "🥇 #1 GRAND LUMINARY",
                  "🥈 #2 STUDIO VANGUARD",
                  "🥉 #3 LEAD AUTEUR",
                ];
                const borderColors = [
                  "border-amber-400/75 bg-gradient-to-b from-amber-950/25 to-[#080b16]",
                  "border-cyan-400/55 bg-gradient-to-b from-cyan-950/20 to-[#080b16]",
                  "border-violet-400/55 bg-gradient-to-b from-violet-950/20 to-[#080b16]",
                ];

                return (
                  <div
                    key={op.id}
                    className={`p-6 rounded-3xl border ${borderColors[idx]} flex flex-col justify-between gap-4`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-300">
                        {medals[idx]}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-cyan-300">
                        Tier {tier}
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full bg-[#0f172a] border-2 border-amber-300 flex items-center justify-center font-black text-base text-amber-300 shrink-0">
                        {op.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-white truncate">
                          {op.displayName}
                        </h3>
                        <span className="text-[10px] font-mono uppercase text-cyan-400 block">
                          [{getTitleLabel(op.equippedTitle)}]
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="font-black text-amber-300">
                        {activeTab === "coins"
                          ? `${op.coins.toLocaleString()} 🪙`
                          : activeTab === "critics"
                            ? `${op.reviewsCount} Critiques`
                            : `${op.xp.toLocaleString()} XP`}
                      </span>
                      {!isCurrentUser && (
                        <Link
                          href={`/arcade?tab=pvp&opponentUid=${encodeURIComponent(
                            op.id
                          )}&opponentName=${encodeURIComponent(op.displayName)}`}
                          className="px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500 border border-violet-400/40 text-violet-200 hover:text-white text-[10px] font-bold uppercase transition-colors"
                        >
                          ⚔️ Challenge
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* FULL STANDINGS TABLE */}
          <section className="studio-panel border border-white/10 rounded-3xl overflow-hidden shadow-xl">
            <div className="grid grid-cols-12 gap-2 px-5 py-3.5 bg-black/50 border-b border-white/10 text-[10px] font-mono uppercase tracking-widest text-slate-400">
              <span className="col-span-2 sm:col-span-1">Rank</span>
              <span className="col-span-6 sm:col-span-5">Director &amp; Credit</span>
              <span className="hidden md:block md:col-span-3">Studio Faction</span>
              <span className="col-span-4 sm:col-span-6 md:col-span-3 text-right">
                {activeTab === "coins"
                  ? "SceneCents & Duel"
                  : activeTab === "critics"
                    ? "Dispatches & Duel"
                    : "Director XP & Duel"}
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {sortedOperatives.map((op, idx) => {
                const isCurrentUser = user && op.id === user.uid;
                const tier = computeTier(op.xp);

                return (
                  <div
                    key={op.id}
                    className={`grid grid-cols-12 gap-2 items-center px-5 py-4 transition-colors ${
                      isCurrentUser
                        ? "bg-cyan-950/35 border-l-4 border-l-cyan-400"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="col-span-2 sm:col-span-1 font-mono font-black text-sm text-cyan-400">
                      #{idx + 1}
                    </div>

                    <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#11192e] border border-cyan-500/40 flex items-center justify-center text-xs font-black text-cyan-300 shrink-0">
                        {op.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-white truncate">
                            {op.displayName}
                          </p>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 text-[9px] font-mono font-black uppercase">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          Tier {tier} • [{getTitleLabel(op.equippedTitle)}]
                        </p>
                      </div>
                    </div>

                    <div className="hidden md:block md:col-span-3">
                      <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                        {op.faction}
                      </span>
                    </div>

                    <div className="col-span-4 sm:col-span-6 md:col-span-3 flex items-center justify-end gap-2.5 font-mono">
                      <span className="text-xs sm:text-sm font-black text-amber-400">
                        {activeTab === "coins"
                          ? `${op.coins.toLocaleString()} 🪙`
                          : activeTab === "critics"
                            ? `${op.reviewsCount} Reviews`
                            : `${op.xp.toLocaleString()} XP`}
                      </span>
                      {!isCurrentUser && (
                        <Link
                          href={`/arcade?tab=pvp&opponentUid=${encodeURIComponent(
                            op.id
                          )}&opponentName=${encodeURIComponent(op.displayName)}`}
                          className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500 border border-violet-400/35 text-violet-200 hover:text-white text-[10px] font-bold uppercase transition-colors shrink-0"
                          title={`Challenge ${op.displayName} to a SceneCents Duel`}
                        >
                          ⚔️ Duel
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}
