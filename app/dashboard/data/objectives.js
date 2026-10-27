// File: app/dashboard/data/objectives.js

// 1. 50-Level Rank & EXP Calculation Curve
export function calculateRankAndSector(totalExp = 0) {
  const safeExp = Math.max(0, Number(totalExp) || 0);
  
  // Exponential scaling formula: Level 1 to 50
  const rawLevel = Math.floor(Math.sqrt(safeExp / 60)) + 1;
  const level = Math.min(50, Math.max(1, rawLevel));

  let sector = "Field Operative";
  let badgeColor = "cyan";
  let tierStyle = {
    text: "text-cyan-300",
    bg: "bg-cyan-950/80",
    border: "border-cyan-500/40",
    glow: "shadow-[0_0_15px_rgba(6,182,212,0.35)]"
  };

  if (level >= 45) {
    sector = "Auteur Grandmaster";
    badgeColor = "fuchsia";
    tierStyle = {
      text: "text-fuchsia-300",
      bg: "bg-fuchsia-950/80",
      border: "border-fuchsia-500/50",
      glow: "shadow-[0_0_20px_rgba(217,70,239,0.4)]"
    };
  } else if (level >= 35) {
    sector = "Supreme Studio Director";
    badgeColor = "amber";
    tierStyle = {
      text: "text-amber-300",
      bg: "bg-amber-950/80",
      border: "border-amber-500/50",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]"
    };
  } else if (level >= 25) {
    sector = "Neural Script Architect";
    badgeColor = "indigo";
    tierStyle = {
      text: "text-indigo-300",
      bg: "bg-indigo-950/80",
      border: "border-indigo-500/40",
      glow: "shadow-[0_0_15px_rgba(99,102,241,0.35)]"
    };
  } else if (level >= 15) {
    sector = "Sector Recon Critic";
    badgeColor = "emerald";
    tierStyle = {
      text: "text-emerald-300",
      bg: "bg-emerald-950/80",
      border: "border-emerald-500/40",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.35)]"
    };
  }

  // Next level threshold calculation
  const isMaxLevel = level >= 50;
  const currentLevelBaseExp = Math.pow(level - 1, 2) * 60;
  const nextLevelExp = isMaxLevel ? Math.pow(50, 2) * 60 : Math.pow(level, 2) * 60;
  
  const span = Math.max(1, nextLevelExp - currentLevelBaseExp);
  const earnedInLevel = Math.max(0, safeExp - currentLevelBaseExp);
  const progressPercent = isMaxLevel 
    ? 100 
    : Math.min(100, Math.max(0, Math.round((earnedInLevel / span) * 100)));

  return {
    level,
    sector,
    badgeColor,
    tierStyle,
    isMaxLevel,
    currentExp: safeExp,
    currentLevelBaseExp,
    nextLevelExp,
    progressPercent,
    expToNext: isMaxLevel ? 0 : Math.max(0, nextLevelExp - safeExp)
  };
}

// 2. Lifetime Accolades (Persistent Retention Honors)
export const LIFETIME_ACCOLADES = [
  {
    id: 'ACC_01',
    title: 'Cinephile Centurion',
    desc: 'Secure 100 motion pictures or television series to your active watchlist radar.',
    goal: 100,
    statKey: 'watchlistCount',
    tier: 'Specialist',
    rewardCoins: 500,
    rewardExp: 2500,
    icon: '📋'
  },
  {
    id: 'ACC_02',
    title: 'Criterion Preserver',
    desc: 'Catalog and review at least 15 cinematic classics released prior to 1980.',
    goal: 15,
    statKey: 'classicCount',
    tier: 'Master',
    rewardCoins: 850,
    rewardExp: 4500,
    icon: '🏛️'
  },
  {
    id: 'ACC_03',
    title: 'Frontline Critic',
    desc: 'Publish 30 verified critique dispatches across the Global Archives.',
    goal: 30,
    statKey: 'reviewCount',
    tier: 'Specialist',
    rewardCoins: 750,
    rewardExp: 3500,
    icon: '✍️'
  },
  {
    id: 'ACC_04',
    title: 'Consensus Vanguard',
    desc: 'Write 5 community critiques that define official consensus thresholds.',
    goal: 5,
    statKey: 'consensusCount',
    tier: 'Auteur',
    rewardCoins: 1200,
    rewardExp: 6000,
    icon: '⚡'
  },
  {
    id: 'ACC_05',
    title: 'Backlot Requisitioner',
    desc: 'Unlock 8 distinct props, studio frames, or LUT themes from the Prop Department.',
    goal: 8,
    statKey: 'unlockedPropsCount',
    tier: 'Master',
    rewardCoins: 600,
    rewardExp: 3000,
    icon: '🎟️'
  },
  {
    id: 'ACC_06',
    title: 'Community Benefactor',
    desc: 'Award 50 Studio Credits in peer tips to fellow critics and discussion leaders.',
    goal: 50,
    statKey: 'tipsGivenCount',
    tier: 'Specialist',
    rewardCoins: 400,
    rewardExp: 2000,
    icon: '🪙'
  }
];

// 3. Evaluates accolade completion against live operative telemetry
export function evaluateAccolades(userStats = {}) {
  return LIFETIME_ACCOLADES.map((accolade) => {
    const rawVal = Number(userStats[accolade.statKey]) || 0;
    const current = Math.min(accolade.goal, rawVal);
    const completed = current >= accolade.goal;
    const progressPercent = Math.min(100, Math.round((current / accolade.goal) * 100));

    return {
      ...accolade,
      current,
      completed,
      progressPercent
    };
  });
}

// 4. Daily Studio Directives (Rotating Missions)
export const DAILY_DIRECTIVES = [
  {
    id: 'DAILY_01',
    title: 'Morning Screening Run',
    desc: 'Add 2 newly scouted titles to your watchlist radar.',
    goal: 2,
    rewardCoins: 50,
    rewardExp: 150,
    icon: '🎯'
  },
  {
    id: 'DAILY_02',
    title: 'Critique Dispatch',
    desc: 'Write and publish 1 verified film or series review in Global Archives.',
    goal: 1,
    rewardCoins: 75,
    rewardExp: 250,
    icon: '📝'
  },
  {
    id: 'DAILY_03',
    title: 'Tactical Signal Relay',
    desc: 'Transmit at least 3 discussion messages in any Community Chat channel.',
    goal: 3,
    rewardCoins: 40,
    rewardExp: 120,
    icon: '📡'
  }
];