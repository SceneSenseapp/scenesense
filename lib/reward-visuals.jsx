// File: lib/reward-visuals.jsx
"use client";

import React from "react";
import Image from "next/image";

// Rarity styling definitions for visual reward cards
export const RARITY_CONFIG = {
  COMMON: {
    label: "STUDIO ISSUE",
    badgeBg: "bg-slate-800/90 text-slate-200 border-slate-500/40",
    cardBorder: "border-slate-500/30 hover:border-slate-400",
    glow: "shadow-[0_0_20px_rgba(148,163,184,0.12)]",
    accent: "from-slate-500/30 via-slate-700/10 to-transparent",
    text: "text-slate-300",
  },
  RARE: {
    label: "RARE REEL",
    badgeBg: "bg-cyan-950/90 text-cyan-300 border-cyan-400/50",
    cardBorder: "border-cyan-500/40 hover:border-cyan-300",
    glow: "shadow-[0_0_25px_rgba(6,182,212,0.22)]",
    accent: "from-cyan-500/30 via-sky-500/10 to-transparent",
    text: "text-cyan-300",
  },
  EPIC: {
    label: "EPIC ARCHIVE",
    badgeBg: "bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-400/50",
    cardBorder: "border-fuchsia-500/40 hover:border-fuchsia-300",
    glow: "shadow-[0_0_28px_rgba(217,70,239,0.25)]",
    accent: "from-fuchsia-500/35 via-violet-500/15 to-transparent",
    text: "text-fuchsia-300",
  },
  LEGENDARY: {
    label: "LEGENDARY 70MM",
    badgeBg: "bg-amber-950/90 text-amber-300 border-amber-400/60",
    cardBorder: "border-amber-500/50 hover:border-amber-300",
    glow: "shadow-[0_0_32px_rgba(251,191,36,0.3)]",
    accent: "from-amber-500/40 via-yellow-500/15 to-transparent",
    text: "text-amber-300",
  },
  MYTHIC: {
    label: "MYTHIC PALME D'OR",
    badgeBg: "bg-gradient-to-r from-rose-950 via-fuchsia-950 to-amber-950 text-amber-200 border-amber-300/70",
    cardBorder: "border-amber-300/70 hover:border-white",
    glow: "shadow-[0_0_40px_rgba(244,63,94,0.35)]",
    accent: "from-rose-500/40 via-fuchsia-500/25 to-amber-500/30",
    text: "text-amber-200",
  },
};

// High-resolution visual catalog for all Cosmetics, Frames, Titles, LUT Themes, Crates & Props
export const REWARD_VISUAL_CATALOG = {
  // --- AVATAR FRAMES ---
  frame_matrix_emerald: {
    id: "frame_matrix_emerald",
    name: "Matrix Emerald 35mm Border",
    type: "frame",
    rarity: "RARE",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    subtitle: "Phosphor Green Coding Reel",
    lore: "Cascading phosphor-emerald 35mm optical perforations that pulse around your operative portrait.",
    unlockHint: "Unlocked at Tier 3 or in the Prop Department",
  },
  frame_neon_cyan: {
    id: "frame_neon_cyan",
    name: "Cyberpunk Neon Hologram Border",
    type: "frame",
    rarity: "EPIC",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    subtitle: "Anamorphic Blue Lens Flare",
    lore: "Inspired by rain-slicked 2049 soundstages. Projects an electric cyan anamorphic halo around your avatar.",
    unlockHint: "Unlocked at Tier 8 or 150 SceneCents in Prop Dept",
  },
  frame_solar_gold: {
    id: "frame_solar_gold",
    name: "Academy Solar Gold Border",
    type: "frame",
    rarity: "LEGENDARY",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
    subtitle: "24K Festival Winner Trim",
    lore: "Hand-gilded 24-karat cinema laurels reserved for acclaimed directors and top-tier critics.",
    unlockHint: "Unlocked at Tier 15 or 500 SceneCents in Prop Dept",
  },
  frame_quantum_amethyst: {
    id: "frame_quantum_amethyst",
    name: "Quantum Amethyst Foil Border",
    type: "frame",
    rarity: "EPIC",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    subtitle: "Ultraviolet Dimensional Frame",
    lore: "Refracts deep-space ultraviolet and synthwave magenta across your dossier profile picture.",
    unlockHint: "Unlocked at Tier 21 or 450 SceneCents in Prop Dept",
  },
  frame_holographic_chrome: {
    id: "frame_holographic_chrome",
    name: "Grand Palm Luminary Chrome Border",
    type: "frame",
    rarity: "MYTHIC",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    subtitle: "Prismatic Iridescent Festival Crown",
    lore: "Liquid-mercury holographic film stock that shifts across the visible spectrum in real time.",
    unlockHint: "Unlocked at Tier 25 Milestone",
  },
  frame_crimson_velvet: {
    id: "frame_crimson_velvet",
    name: "Premiere Red Carpet Velvet Border",
    type: "frame",
    rarity: "LEGENDARY",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    subtitle: "Cannes Grand Theatre Drapery",
    lore: "Deep crimson premiere velvet accented with flashbulb sparkles and golden stanchion rope trim.",
    unlockHint: "Unlocked at Tier 32 or 650 SceneCents in Prop Dept",
  },
  frame_obsidian_70mm: {
    id: "frame_obsidian_70mm",
    name: "Obsidian IMAX 70mm Master Frame",
    type: "frame",
    rarity: "LEGENDARY",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80",
    subtitle: "15-Perf Horizontal Celluloid",
    lore: "Heavy-gauge matte carbon 70mm IMAX frame with glowing tungsten timecode markers.",
    unlockHint: "Unlocked at Tier 40 or 850 SceneCents in Prop Dept",
  },
  frame_celestial_supernova: {
    id: "frame_celestial_supernova",
    name: "Immortal Auteur Supernova Frame",
    type: "frame",
    rarity: "MYTHIC",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=600&q=80",
    subtitle: "Tier 50 Season 1 Completionist",
    lore: "The ultimate symbol of a 90-day Season 1 Master. Orbiting golden film reels and cosmic starlight.",
    unlockHint: "Exclusive Tier 50 Grand Finale Reward",
  },

  // --- SCREEN CREDIT TITLES ---
  title_lead_gaffer: {
    id: "title_lead_gaffer",
    name: "Credit: [LEAD GAFFER]",
    type: "title",
    rarity: "RARE",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80",
    subtitle: "Master of Chief Lighting",
    lore: "Displayed beside your callsign across all reviews and lounge dispatches.",
    unlockHint: "Unlocked at Tier 5",
  },
  title_auteur_director: {
    id: "title_auteur_director",
    name: "Credit: [AUTEUR DIRECTOR]",
    type: "title",
    rarity: "EPIC",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    subtitle: "Visionary Filmmaker Badge",
    lore: "Marks you as an uncompromising creative force with signature visual authority.",
    unlockHint: "Unlocked at Tier 12 or 350 SceneCents",
  },
  title_shadow_operative: {
    id: "title_shadow_operative",
    name: "Credit: [EXECUTIVE PRODUCER]",
    type: "title",
    rarity: "EPIC",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
    subtitle: "Studio Financier & Backlot Boss",
    lore: "Top-billed opening credit status across all SceneSense community transmissions.",
    unlockHint: "Unlocked at Tier 18 or 150 SceneCents",
  },
  title_archivist: {
    id: "title_archivist",
    name: "Credit: [CHIEF ARCHIVIST]",
    type: "title",
    rarity: "RARE",
    image: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=600&q=80",
    subtitle: "Keeper of the Nitrate Vaults",
    lore: "Honors cinephiles who rescue forgotten classics and curate deep watchlists.",
    unlockHint: "Unlocked at Tier 28 or 250 SceneCents",
  },
  title_festival_laureate: {
    id: "title_festival_laureate",
    name: "Credit: [GRAND JURY LAUREATE]",
    type: "title",
    rarity: "LEGENDARY",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
    subtitle: "International Critic Circle",
    lore: "Bestowed upon elite operatives who reach Act IV of the 90-Day Orbital Pass.",
    unlockHint: "Unlocked at Tier 35 or 600 SceneCents",
  },
  title_showrunner_supreme: {
    id: "title_showrunner_supreme",
    name: "Credit: [SHOWRUNNER SUPREME]",
    type: "title",
    rarity: "LEGENDARY",
    image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80",
    subtitle: "Architect of Multi-Season Epics",
    lore: "Commands respect across both Television and Feature Film sectors.",
    unlockHint: "Unlocked at Tier 45 or 800 SceneCents",
  },
  title_palme_immortal: {
    id: "title_palme_immortal",
    name: "Credit: [PALME D'OR IMMORTAL]",
    type: "title",
    rarity: "MYTHIC",
    image: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=600&q=80",
    subtitle: "Pantheon of Cinema History",
    lore: "Reserved exclusively for directors who conquer all 50 Tiers of the Season Pass.",
    unlockHint: "Unlocked at Tier 50 Grand Finale",
  },

  // --- STUDIO LUT THEMES ---
  theme_matrix_emerald: {
    id: "theme_matrix_emerald",
    name: "Color Grade: Emerald Matrix LUT",
    type: "theme",
    rarity: "RARE",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80",
    subtitle: "35mm Cyberpunk Green Tint",
    lore: "Applies a sleek emerald phosphor color grade across your dossier terminal.",
    unlockHint: "300 SceneCents in Prop Dept or Tier 10",
  },
  theme_noir_crimson: {
    id: "theme_noir_crimson",
    name: "Color Grade: Neo-Noir Crimson LUT",
    type: "theme",
    rarity: "EPIC",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    subtitle: "Sodium-Vapor & Sin City Red",
    lore: "Bathes your studio interface in moody neo-noir crimson and deep shadow contrast.",
    unlockHint: "320 SceneCents in Prop Dept or Tier 23",
  },
  theme_cyber_violet: {
    id: "theme_cyber_violet",
    name: "Color Grade: Synthwave Ultraviolet LUT",
    type: "theme",
    rarity: "EPIC",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
    subtitle: "1984 Outrun Neon Grade",
    lore: "Infuses the studio workspace with electric magenta and midnight synthwave tones.",
    unlockHint: "320 SceneCents in Prop Dept or Tier 30",
  },
  theme_imax_gold: {
    id: "theme_imax_gold",
    name: "Color Grade: 70mm IMAX Amber LUT",
    type: "theme",
    rarity: "LEGENDARY",
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80",
    subtitle: "Warm Tungsten Celluloid Glow",
    lore: "Authentic Kodak 2383 warm golden projection print grade across your profile.",
    unlockHint: "400 SceneCents in Prop Dept or Tier 38",
  },
  theme_blade_runner_teal: {
    id: "theme_blade_runner_teal",
    name: "Color Grade: Dystopian Teal & Orange LUT",
    type: "theme",
    rarity: "LEGENDARY",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    subtitle: "Deakins Anamorphic Haze",
    lore: "High-contrast atmospheric teal shadows paired with sodium-amber highlights.",
    unlockHint: "Unlocked at Tier 44 or 650 SceneCents",
  },

  // --- SPECIAL PROPS, BOOSTERS & CRATES ---
  streak_freeze_shield: {
    id: "streak_freeze_shield",
    name: "Timecode Streak Freeze Shield",
    type: "prop",
    rarity: "EPIC",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    subtitle: "Protects Your Multi-Month Streak",
    lore: "Automatically preserves your Daily Check-In Streak & XP Multiplier if you miss a day!",
    unlockHint: "220 SceneCents in Prop Dept or Tier 14",
  },
  xp_overclock_2x: {
    id: "xp_overclock_2x",
    name: "Double-Feature 2x XP Overclock",
    type: "prop",
    rarity: "LEGENDARY",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
    subtitle: "Permanent +25% Passive XP Amplifier",
    lore: "Supercharges your Director Pass progression speed across all quests and mini-games.",
    unlockHint: "550 SceneCents in Prop Dept or Tier 27",
  },
  crate_16mm: {
    id: "crate_16mm",
    name: "16mm Indie Canister",
    type: "crate",
    rarity: "RARE",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    subtitle: "Standard Backlot Supply Drop",
    lore: "Sealed 16mm celluloid canister containing indie stipends, bonus SceneCents, and director XP.",
    unlockHint: "Acquired in the Mystery Film Vaults",
  },
  crate_35mm: {
    id: "crate_35mm",
    name: "35mm Studio Vault",
    type: "crate",
    rarity: "EPIC",
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80",
    subtitle: "High-Grade Theatrical Canister",
    lore: "Premium 35mm optical canister with large SceneCents caches, rare color LUTs, and cosmetic borders.",
    unlockHint: "Acquired in the Mystery Film Vaults",
  },
  crate_70mm_mythic: {
    id: "crate_70mm_mythic",
    name: "70mm IMAX Vault Mystery Crate",
    type: "crate",
    rarity: "MYTHIC",
    image: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=600&q=80",
    subtitle: "Contains High-Tier Coins, XP & Cosmetics",
    lore: "Sealed titanium film canister containing guaranteed high-value SceneCents, XP surges, or rare props.",
    unlockHint: "Earned at Major Milestone Tiers or in the Vault",
  },
  coins_stack: {
    id: "coins_stack",
    name: "SceneCents Production Grant",
    type: "coins",
    rarity: "COMMON",
    image: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=600&q=80",
    subtitle: "Spendable in The Prop Department",
    lore: "Official SceneSense studio currency used to acquire frames, LUTs, vaults, and tools.",
    unlockHint: "Earned via Tiers, Quests & Mini-Games",
  },
  coins_treasury: {
    id: "coins_treasury",
    name: "Blockbuster Bullion Treasury",
    type: "coins",
    rarity: "RARE",
    image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=600&q=80",
    subtitle: "High-Yield Studio Reserve",
    lore: "A massive studio bullion payout for reaching mid-and-late season production milestones.",
    unlockHint: "Earned on Higher Director Pass Tiers",
  },
};

// Helper to format any title ID into its display badge string
export function formatDirectorTitle(titleId) {
  switch (titleId) {
    case "title_lead_gaffer":
      return "LEAD GAFFER";
    case "title_auteur_director":
      return "AUTEUR DIRECTOR";
    case "title_shadow_operative":
      return "EXECUTIVE PRODUCER";
    case "title_archivist":
      return "CHIEF ARCHIVIST";
    case "title_festival_laureate":
      return "GRAND JURY LAUREATE";
    case "title_showrunner_supreme":
      return "SHOWRUNNER SUPREME";
    case "title_palme_immortal":
      return "PALME D'OR IMMORTAL";
    default:
      return "DIRECTOR";
  }
}

// 50-Tier Multi-Month (90-120 Day) Orbital Director Pass Generator
// Calibrated so Tier 50 requires ~258,200 XP (~3 to 3.5 months of consistent daily/weekly play)
export const FIFTY_TIERS_DATA = Array.from({ length: 50 }, (_, i) => {
  const tierNumber = i + 1;
  // Smooth multi-month exponential curve:
  // Tier 1 = 0 XP, Tier 10 = ~15.8k XP, Tier 25 = ~76.5k XP, Tier 40 = ~169.7k XP, Tier 50 = ~258.2k XP
  const requiredXp = i === 0 ? 0 : Math.round(i * 1100 + Math.pow(i, 2.08) * 62);

  const actNumber = Math.ceil(tierNumber / 10);
  const actNames = [
    "Act I: Indie Circuit",
    "Act II: Studio Backlot",
    "Act III: Blockbuster Syndicate",
    "Act IV: Festival Luminary",
    "Act V: Immortal Auteur",
  ];
  const actName = actNames[actNumber - 1] || actNames[0];

  let rewardType = "coins";
  let rewardLabel = `+${100 + i * 30} SceneCents`;
  let rewardValue = 100 + i * 30;
  let rewardFrame = null;
  let rewardTitle = null;
  let rewardTheme = null;
  let rewardItem = null;
  let visualKey = i >= 20 ? "coins_treasury" : "coins_stack";
  let rarity = i >= 35 ? "EPIC" : i >= 15 ? "RARE" : "COMMON";

  if (tierNumber === 3) {
    rewardType = "frame";
    rewardLabel = "Matrix Emerald 35mm Border";
    rewardFrame = "frame_matrix_emerald";
    visualKey = "frame_matrix_emerald";
    rarity = "RARE";
  } else if (tierNumber === 5) {
    rewardType = "title";
    rewardLabel = "Title: [LEAD GAFFER]";
    rewardTitle = "title_lead_gaffer";
    visualKey = "title_lead_gaffer";
    rarity = "RARE";
  } else if (tierNumber === 8) {
    rewardType = "frame";
    rewardLabel = "Cyberpunk Neon Hologram Border";
    rewardFrame = "frame_neon_cyan";
    visualKey = "frame_neon_cyan";
    rarity = "EPIC";
  } else if (tierNumber === 10) {
    rewardType = "theme";
    rewardLabel = "LUT: Emerald Matrix Grade + 400 🪙";
    rewardTheme = "theme_matrix_emerald";
    rewardValue = 400;
    visualKey = "theme_matrix_emerald";
    rarity = "EPIC";
  } else if (tierNumber === 12) {
    rewardType = "title";
    rewardLabel = "Title: [AUTEUR DIRECTOR]";
    rewardTitle = "title_auteur_director";
    visualKey = "title_auteur_director";
    rarity = "EPIC";
  } else if (tierNumber === 14) {
    rewardType = "prop";
    rewardLabel = "Timecode Streak Freeze Shield + 350 🪙";
    rewardItem = "streak_freeze_shield";
    rewardValue = 350;
    visualKey = "streak_freeze_shield";
    rarity = "EPIC";
  } else if (tierNumber === 15) {
    rewardType = "frame";
    rewardLabel = "Academy Solar Gold Border";
    rewardFrame = "frame_solar_gold";
    visualKey = "frame_solar_gold";
    rarity = "LEGENDARY";
  } else if (tierNumber === 18) {
    rewardType = "title";
    rewardLabel = "Title: [EXECUTIVE PRODUCER]";
    rewardTitle = "title_shadow_operative";
    visualKey = "title_shadow_operative";
    rarity = "EPIC";
  } else if (tierNumber === 20) {
    rewardType = "crate";
    rewardLabel = "Act II Finale: 70mm Vault Crate + 1,000 🪙";
    rewardValue = 1000;
    visualKey = "crate_70mm_mythic";
    rarity = "LEGENDARY";
  } else if (tierNumber === 21) {
    rewardType = "frame";
    rewardLabel = "Quantum Amethyst Foil Border";
    rewardFrame = "frame_quantum_amethyst";
    visualKey = "frame_quantum_amethyst";
    rarity = "EPIC";
  } else if (tierNumber === 23) {
    rewardType = "theme";
    rewardLabel = "LUT: Neo-Noir Crimson Grade";
    rewardTheme = "theme_noir_crimson";
    visualKey = "theme_noir_crimson";
    rarity = "EPIC";
  } else if (tierNumber === 25) {
    rewardType = "grand";
    rewardLabel = "Grand Palm Luminary Border + 2,500 🪙";
    rewardFrame = "frame_holographic_chrome";
    rewardValue = 2500;
    visualKey = "frame_holographic_chrome";
    rarity = "MYTHIC";
  } else if (tierNumber === 27) {
    rewardType = "prop";
    rewardLabel = "Double-Feature 2x XP Overclock";
    rewardItem = "xp_overclock_2x";
    rewardValue = 500;
    visualKey = "xp_overclock_2x";
    rarity = "LEGENDARY";
  } else if (tierNumber === 28) {
    rewardType = "title";
    rewardLabel = "Title: [CHIEF ARCHIVIST]";
    rewardTitle = "title_archivist";
    visualKey = "title_archivist";
    rarity = "RARE";
  } else if (tierNumber === 30) {
    rewardType = "theme";
    rewardLabel = "LUT: Synthwave Ultraviolet + 1,200 🪙";
    rewardTheme = "theme_cyber_violet";
    rewardValue = 1200;
    visualKey = "theme_cyber_violet";
    rarity = "LEGENDARY";
  } else if (tierNumber === 32) {
    rewardType = "frame";
    rewardLabel = "Premiere Red Carpet Velvet Border";
    rewardFrame = "frame_crimson_velvet";
    visualKey = "frame_crimson_velvet";
    rarity = "LEGENDARY";
  } else if (tierNumber === 35) {
    rewardType = "title";
    rewardLabel = "Title: [GRAND JURY LAUREATE] + 1,500 🪙";
    rewardTitle = "title_festival_laureate";
    rewardValue = 1500;
    visualKey = "title_festival_laureate";
    rarity = "LEGENDARY";
  } else if (tierNumber === 38) {
    rewardType = "theme";
    rewardLabel = "LUT: 70mm IMAX Amber Grade";
    rewardTheme = "theme_imax_gold";
    visualKey = "theme_imax_gold";
    rarity = "LEGENDARY";
  } else if (tierNumber === 40) {
    rewardType = "frame";
    rewardLabel = "Obsidian IMAX 70mm Master Frame + 2,000 🪙";
    rewardFrame = "frame_obsidian_70mm";
    rewardValue = 2000;
    visualKey = "frame_obsidian_70mm";
    rarity = "LEGENDARY";
  } else if (tierNumber === 44) {
    rewardType = "theme";
    rewardLabel = "LUT: Dystopian Teal & Orange Grade";
    rewardTheme = "theme_blade_runner_teal";
    visualKey = "theme_blade_runner_teal";
    rarity = "LEGENDARY";
  } else if (tierNumber === 45) {
    rewardType = "title";
    rewardLabel = "Title: [SHOWRUNNER SUPREME] + 2,500 🪙";
    rewardTitle = "title_showrunner_supreme";
    rewardValue = 2500;
    visualKey = "title_showrunner_supreme";
    rarity = "LEGENDARY";
  } else if (tierNumber === 48) {
    rewardType = "crate";
    rewardLabel = "Mythic 70mm IMAX Vault Cache + 3,000 🪙";
    rewardValue = 3000;
    visualKey = "crate_70mm_mythic";
    rarity = "MYTHIC";
  } else if (tierNumber === 50) {
    rewardType = "grand";
    rewardLabel = "Supernova Frame + [PALME D'OR IMMORTAL] + 5,000 🪙";
    rewardFrame = "frame_celestial_supernova";
    rewardTitle = "title_palme_immortal";
    rewardValue = 5000;
    visualKey = "frame_celestial_supernova";
    rarity = "MYTHIC";
  }

  const catalogEntry = REWARD_VISUAL_CATALOG[visualKey] || REWARD_VISUAL_CATALOG.coins_stack;

  return {
    tier: tierNumber,
    actNumber,
    actName,
    requiredXp,
    rewardType,
    rewardLabel,
    rewardValue,
    rewardFrame,
    rewardTitle,
    rewardTheme,
    rewardItem,
    visualKey,
    rarity,
    image: catalogEntry.image,
    subtitle: catalogEntry.subtitle,
    lore: catalogEntry.lore,
  };
});

// Multi-Month Career Mastery Campaigns (5 Stages Each: Bronze -> Silver -> Gold -> Diamond -> Mythic)
export const CAREER_MASTERY_CAMPAIGNS = [
  {
    id: "mastery_watchlist",
    title: "Studio Acquisition Mogul",
    category: "Watchlist Curation",
    icon: "🎞️",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    description: "Build a legendary film & series library across a multi-month theatrical season.",
    stages: [
      { stage: 1, rank: "Bronze Scout", goal: 5, rewardCoins: 100, rewardXp: 300 },
      { stage: 2, rank: "Silver Curator", goal: 25, rewardCoins: 300, rewardXp: 900 },
      { stage: 3, rank: "Gold Archivist", goal: 75, rewardCoins: 750, rewardXp: 2500 },
      { stage: 4, rank: "Diamond Programmer", goal: 175, rewardCoins: 1800, rewardXp: 6500 },
      { stage: 5, rank: "Mythic Mogul", goal: 350, rewardCoins: 4000, rewardXp: 15000, bonusItem: "title_archivist" },
    ],
  },
  {
    id: "mastery_screenings",
    title: "70mm Projection Marathoner",
    category: "Completed Screenings",
    icon: "📽️",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
    description: "Watch and log completed films and series in your screening room over the season.",
    stages: [
      { stage: 1, rank: "Bronze Viewer", goal: 3, rewardCoins: 120, rewardXp: 350 },
      { stage: 2, rank: "Silver Projectionist", goal: 15, rewardCoins: 350, rewardXp: 1100 },
      { stage: 3, rank: "Gold Cinephile", goal: 45, rewardCoins: 900, rewardXp: 3000 },
      { stage: 4, rank: "Diamond Jury Member", goal: 100, rewardCoins: 2200, rewardXp: 8000 },
      { stage: 5, rank: "Mythic Luminary", goal: 220, rewardCoins: 5000, rewardXp: 18000, bonusItem: "frame_obsidian_70mm" },
    ],
  },
  {
    id: "mastery_cipher",
    title: "Enigma Reel Cryptographer",
    category: "Cinema Cipher & Box Office Duels",
    icon: "🔐",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    description: "Decrypt Cinema Ciphers and win Box Office Over/Under duels across daily sessions.",
    stages: [
      { stage: 1, rank: "Bronze Decoder", goal: 10, rewardCoins: 150, rewardXp: 400 },
      { stage: 2, rank: "Silver Analyst", goal: 40, rewardCoins: 400, rewardXp: 1200 },
      { stage: 3, rank: "Gold Cryptographer", goal: 120, rewardCoins: 1000, rewardXp: 3500 },
      { stage: 4, rank: "Diamond Oracle", goal: 300, rewardCoins: 2500, rewardXp: 9000 },
      { stage: 5, rank: "Mythic Cipher Master", goal: 600, rewardCoins: 6000, rewardXp: 22000, bonusItem: "frame_quantum_amethyst" },
    ],
  },
  {
    id: "mastery_streak",
    title: "Dedicated Showrunner Streak",
    category: "Consecutive Studio Check-Ins",
    icon: "🔥",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    description: "Maintain your daily studio check-in streak through a full 90-day production cycle.",
    stages: [
      { stage: 1, rank: "3-Day Call Sheet", goal: 3, rewardCoins: 100, rewardXp: 300 },
      { stage: 2, rank: "7-Day Weekly Wrap", goal: 7, rewardCoins: 350, rewardXp: 1000 },
      { stage: 3, rank: "21-Day Feature Shoot", goal: 21, rewardCoins: 1000, rewardXp: 3500 },
      { stage: 4, rank: "45-Day Half-Season", goal: 45, rewardCoins: 2500, rewardXp: 9500 },
      { stage: 5, rank: "90-Day Season Legend", goal: 90, rewardCoins: 7500, rewardXp: 25000, bonusItem: "frame_celestial_supernova" },
    ],
  },
];

/**
 * Rich Illustrated Picture Card for any Reward (combines photographic backdrop + custom SVG graphic overlay)
 */
export function RewardPictureCard({
  visualKey,
  rewardType = "coins",
  rarity = "COMMON",
  label,
  size = "md", // "sm" | "md" | "lg"
  isLocked = false,
  isClaimed = false,
  isEquipped = false,
}) {
  const entry = REWARD_VISUAL_CATALOG[visualKey] || REWARD_VISUAL_CATALOG.coins_stack;
  const rarityStyle = RARITY_CONFIG[rarity] || RARITY_CONFIG.COMMON;

  const heightClass =
    size === "lg" ? "h-44 sm:h-52" : size === "sm" ? "h-24" : "h-32";

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border transition-all duration-300 group select-none ${rarityStyle.cardBorder} ${rarityStyle.glow} bg-[#060812]`}
    >
      {/* Photographic Cinema Backdrop */}
      <Image
        src={entry.image}
        alt={label || entry.name}
        fill
        unoptimized
        sizes="(max-width: 768px) 50vw, 320px"
        className={`object-cover transition-transform duration-700 group-hover:scale-110 ${
          isLocked ? "opacity-45 grayscale-[35%]" : "opacity-65"
        }`}
      />

      {/* Multi-layered Gradient Vignette */}
      <div className={`absolute inset-0 bg-gradient-to-t from-[#04050a] via-[#04050a]/45 to-transparent`} />
      <div className={`absolute inset-0 bg-gradient-to-tr ${rarityStyle.accent}`} />

      {/* Top Rarity & Type Strip */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10">
        <span
          className={`px-2 py-0.5 rounded-md text-[8px] font-mono font-black uppercase tracking-wider border backdrop-blur-md ${rarityStyle.badgeBg}`}
        >
          {rarityStyle.label}
        </span>

        {isEquipped ? (
          <span className="px-2 py-0.5 rounded-md text-[8px] font-mono font-black uppercase bg-cyan-400 text-black shadow-md">
            EQUIPPED
          </span>
        ) : isClaimed ? (
          <span className="px-2 py-0.5 rounded-md text-[8px] font-mono font-black uppercase bg-emerald-500/90 text-black shadow-md">
            ✓ UNLOCKED
          </span>
        ) : isLocked ? (
          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono bg-black/75 text-slate-300 border border-white/15">
            🔒
          </span>
        ) : null}
      </div>

      {/* Center Illustrated SVG Emblem Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        {rewardType === "frame" || entry.type === "frame" ? (
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center bg-black/65 backdrop-blur-sm border-2 border-white/40 shadow-[0_0_25px_rgba(255,255,255,0.25)] group-hover:scale-110 transition-transform">
            <div
              className={`absolute -inset-1 rounded-2xl animate-pulse ${
                visualKey.includes("gold") || visualKey.includes("supernova")
                  ? "border-2 border-amber-400 shadow-[0_0_20px_#fbbf24]"
                  : visualKey.includes("emerald")
                  ? "border-2 border-emerald-400 shadow-[0_0_20px_#34d399]"
                  : visualKey.includes("amethyst")
                  ? "border-2 border-fuchsia-400 shadow-[0_0_20px_#e879f9]"
                  : visualKey.includes("crimson")
                  ? "border-2 border-rose-500 shadow-[0_0_20px_#f43f5e]"
                  : "border-2 border-cyan-400 shadow-[0_0_20px_#22d3ee]"
              }`}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-7 h-7 text-white">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        ) : rewardType === "title" || entry.type === "title" ? (
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.3)] backdrop-blur-md text-center group-hover:scale-105 transition-transform">
            <span className="text-[7px] font-mono uppercase tracking-widest text-slate-400 block">
              SCREEN CREDIT
            </span>
            <span className="text-[10px] font-mono font-black text-amber-300 tracking-wider">
              [{formatDirectorTitle(visualKey)}]
            </span>
          </div>
        ) : rewardType === "theme" || entry.type === "theme" ? (
          <div className="w-14 h-14 rounded-2xl bg-black/75 border border-white/30 backdrop-blur-md flex flex-col items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <div className="flex gap-1 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            </div>
            <span className="text-[8px] font-mono font-black text-white tracking-widest">
              35MM LUT
            </span>
          </div>
        ) : rewardType === "crate" || rewardType === "grand" || entry.type === "crate" ? (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/30 via-fuchsia-500/20 to-cyan-500/30 border-2 border-amber-300/80 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.5)] group-hover:scale-110 transition-transform">
            <span className="text-2xl drop-shadow">👑</span>
            <span className="text-[7px] font-mono font-black text-amber-200 uppercase">VAULT</span>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-2xl bg-black/70 border border-amber-400/50 backdrop-blur-md flex flex-col items-center justify-center shadow-[0_0_18px_rgba(251,191,36,0.3)] group-hover:scale-110 transition-transform">
            <span className="text-xl">🪙</span>
            <span className="text-[7px] font-mono font-black text-amber-300 uppercase">GRANT</span>
          </div>
        )}
      </div>

      {/* Bottom Caption Bar */}
      <div className="absolute bottom-2 left-2.5 right-2.5 z-10">
        <p className="text-[11px] font-bold text-white leading-tight line-clamp-1 drop-shadow">
          {label || entry.name}
        </p>
        <p className="text-[9px] font-mono text-slate-300 truncate opacity-90">
          {entry.subtitle}
        </p>
      </div>
    </div>
  );
}

/**
 * Interactive Live Avatar & Dossier Try-On Preview Component
 */
export function LiveAvatarPreview({
  avatarUrl,
  displayName = "Director Operative",
  frameId,
  titleId,
  themeId,
}) {
  const getFrameClasses = (fId) => {
    switch (fId) {
      case "frame_solar_gold":
        return "border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.85)] ring-2 ring-amber-400/70";
      case "frame_neon_cyan":
        return "border-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.85)] ring-2 ring-cyan-400/70";
      case "frame_quantum_amethyst":
        return "border-fuchsia-300 shadow-[0_0_35px_rgba(217,70,239,0.85)] ring-2 ring-fuchsia-400/70";
      case "frame_matrix_emerald":
        return "border-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.85)] ring-2 ring-emerald-400/70";
      case "frame_holographic_chrome":
        return "border-white shadow-[0_0_40px_rgba(236,72,153,0.85)] ring-2 ring-cyan-300";
      case "frame_crimson_velvet":
        return "border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.85)] ring-2 ring-amber-400/60";
      case "frame_obsidian_70mm":
        return "border-amber-500 shadow-[0_0_35px_rgba(245,158,11,0.75)] ring-2 ring-slate-300/60";
      case "frame_celestial_supernova":
        return "border-amber-200 shadow-[0_0_45px_rgba(251,191,36,0.95)] ring-4 ring-fuchsia-400/80";
      default:
        return "border-cyan-500/40 shadow-lg";
    }
  };

  const getThemeBackdrop = (tId) => {
    switch (tId) {
      case "theme_matrix_emerald":
        return "from-emerald-950/90 via-[#04120b] to-[#050811] border-emerald-500/40";
      case "theme_noir_crimson":
        return "from-rose-950/90 via-[#140409] to-[#050811] border-rose-500/40";
      case "theme_cyber_violet":
        return "from-fuchsia-950/90 via-[#12051e] to-[#050811] border-fuchsia-500/40";
      case "theme_imax_gold":
        return "from-amber-950/90 via-[#171004] to-[#050811] border-amber-500/40";
      case "theme_blade_runner_teal":
        return "from-cyan-950/90 via-[#07151c] to-amber-950/40 border-cyan-400/40";
      default:
        return "from-[#0c1326] via-[#070a14] to-[#05070e] border-cyan-500/30";
    }
  };

  return (
    <div
      className={`p-5 rounded-2xl bg-gradient-to-br ${getThemeBackdrop(
        themeId
      )} border flex items-center gap-4 relative overflow-hidden`}
    >
      <div className={`relative w-20 h-20 rounded-2xl overflow-hidden border-2 p-1 bg-black/80 shrink-0 transition-all duration-500 ${getFrameClasses(frameId)}`}>
        <div className="relative w-full h-full rounded-xl overflow-hidden">
          <Image
            src={
              avatarUrl ||
              "https://api.dicebear.com/7.x/adventurer/svg?seed=CyberAnime&backgroundColor=b6e3f4"
            }
            alt={displayName}
            fill
            unoptimized
            sizes="80px"
            className="object-cover"
          />
        </div>
      </div>

      <div className="space-y-1.5 min-w-0 z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-white truncate">{displayName}</span>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-black text-amber-300">
            [{formatDirectorTitle(titleId)}]
          </span>
        </div>
        <p className="text-[11px] font-mono text-cyan-300">
          Live Dossier Preview • {frameId ? frameId.replace("frame_", "").toUpperCase() : "STANDARD"} BORDER
        </p>
        {themeId && (
          <span className="inline-block text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-white">
            Active LUT: {themeId.replace("theme_", "").toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}
