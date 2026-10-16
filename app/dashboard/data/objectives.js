// data/objectives.js

// 1. 50-Level Rank & EXP Calculation Curve
export function calculateRankAndSector(totalExp = 0) {
  // Exponential scaling formula
  // Level = floor(sqrt(totalExp / 100)) + 1, capped at 50
  const level = Math.min(50, Math.floor(Math.sqrt(totalExp / 60)) + 1);

  let sector = "Field Operative";
  let badgeColor = "emerald";
  
  if (level >= 41) {
    sector = "Supreme Commander";
    badgeColor = "rose";
  } else if (level >= 31) {
    sector = "Neural Tactician";
    badgeColor = "amber";
  } else if (level >= 21) {
    sector = "Intel Director";
    badgeColor = "purple";
  } else if (level >= 11) {
    sector = "Sector Recon";
    badgeColor = "cyan";
  }

  // Next level threshold calculation
  const nextLevelExp = Math.pow(level, 2) * 60;
  const currentLevelBaseExp = Math.pow(level - 1, 2) * 60;
  const progressPercent = Math.min(100, Math.round(((totalExp - currentLevelBaseExp) / (nextLevelExp - currentLevelBaseExp)) * 100));

  return {
    level,
    sector,
    badgeColor,
    currentExp: totalExp,
    nextLevelExp,
    progressPercent
  };
}

// 2. Lifetime Accolades (Long-term retention milestones)
export const LIFETIME_ACCOLADES = [
  { id: 'ACC_01', title: 'Cinephile Centurion', desc: 'Track 100 titles on your Active Radar', goal: 100, rewardCoins: 1000, exp: 5000 },
  { id: 'ACC_02', title: 'Frontline Critic', desc: 'Publish 50 verified reviews in Global Reviews', goal: 50, rewardCoins: 1500, exp: 7500 },
  { id: 'ACC_03', title: 'Oracle Whisperer', desc: 'Query the AI Oracle 100 times across all moods', goal: 100, rewardCoins: 800, exp: 4000 },
  { id: 'ACC_04', title: 'Chronos Traveler', desc: 'Log reviews for films spanning 5 separate decades', goal: 5, rewardCoins: 1200, exp: 6000 }
];