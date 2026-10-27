// app/armoury/page.jsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function PropDepartmentPage() {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [unlockedItems, setUnlockedItems] = useState([]);
  const [equippedFrame, setEquippedFrame] = useState(null);
  const [equippedTitle, setEquippedTitle] = useState(null);
  const [equippedTheme, setEquippedTheme] = useState(null);
  const [activeTab, setActiveTab] = useState('cosmetics');
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseStatus, setPurchaseStatus] = useState(null);

  const [userStats, setUserStats] = useState({
    reviewCount: 0,
    classicCount: 0,
    consensusCount: 0,
    reputationScore: 0
  });

  const router = useRouter();

  const PROP_ITEMS = useMemo(() => [
    // 1. COSMETICS, FRAMES & TITLES
    {
      id: 'frame_neon_cyan',
      name: 'Cyberpunk Neon Director Frame',
      category: 'cosmetics',
      price: 250,
      tier: 'Standard',
      tag: 'Avatar Reel',
      desc: 'Equips a glowing anamorphic 35mm cyan film border around your director avatar.',
      requirement: { type: 'reviews', threshold: 5, label: 'Publish 5 Verified Reviews' }
    },
    {
      id: 'title_shadow_operative',
      name: 'Screen Credit: [EXECUTIVE PRODUCER]',
      category: 'cosmetics',
      price: 450,
      tier: 'Specialist',
      tag: 'Opening Credit',
      desc: 'Permanent executive producer title card rendered alongside your handle across reviews.',
      requirement: { type: 'reviews', threshold: 15, label: 'Publish 15 Verified Reviews' }
    },
    {
      id: 'theme_matrix_emerald',
      name: 'Color Grade: Emerald Matrix LUT',
      category: 'cosmetics',
      price: 600,
      tier: 'Specialist',
      tag: 'Studio LUT Theme',
      desc: 'Applies an authentic high-contrast phosphor emerald LUT across the entire terminal.',
      requirement: { type: 'reviews', threshold: 10, label: 'Publish 10 Verified Reviews' }
    },
    {
      id: 'title_archivist',
      name: 'Screen Credit: [CRITERION ARCHIVIST]',
      category: 'cosmetics',
      price: 850,
      tier: 'Master',
      tag: 'Prestige Title',
      desc: 'Distinguished archival rank for scholars actively preserving classic historical cinema.',
      requirement: { type: 'classic', threshold: 10, label: 'Review 10 Films Released Before 1980' }
    },
    {
      id: 'frame_solar_gold',
      name: 'Academy Gold Director Laurel',
      category: 'cosmetics',
      price: 1200,
      tier: 'Master',
      tag: 'Prestige Frame',
      desc: 'Hand-burnished 24k gold leaf film reel border for celebrated contributors.',
      requirement: { type: 'reviews', threshold: 30, label: 'Publish 30 Verified Reviews' }
    },
    {
      id: 'chat_gold_glow',
      name: 'Marquee Neon Glow',
      category: 'cosmetics',
      price: 750,
      tier: 'Specialist',
      tag: 'Credit Styling',
      desc: 'Illuminates your username with a theater marquee glow across all community channels.',
      requirement: { type: 'reputation', threshold: 50, label: 'Earn 50 Community Upvotes' }
    },

    // 2. INTEL, SCREENPLAY AI & SCRIPT LENSES
    {
      id: 'oracle_boost_5',
      name: '5x CineMind Script Canisters',
      category: 'intel',
      price: 150,
      tier: 'Standard',
      tag: 'AI Screenplay Tokens',
      desc: 'Deep-dive script motif breakdowns, thematic subtext, and screenplay structure audits.',
      requirement: { type: 'none', threshold: 0, label: 'Open Access' }
    },
    {
      id: 'hidden_gem_scanner',
      name: 'Midnight Cult Cinema Lens',
      category: 'intel',
      price: 500,
      tier: 'Specialist',
      tag: 'Discovery Filter',
      desc: 'Surfaces festival selections, low-budget masterpieces, and films with under 5,000 ratings.',
      requirement: { type: 'reviews', threshold: 8, label: 'Publish 8 Verified Reviews' }
    },
    {
      id: 'director_retrospective',
      name: 'Auteur Filmography Radar',
      category: 'intel',
      price: 800,
      tier: 'Master',
      tag: 'Studio Retrospective',
      desc: 'Generates full box-office, cinematography roster, and directorial continuity roadmaps.',
      requirement: { type: 'reviews', threshold: 20, label: 'Publish 20 Verified Reviews' }
    },
    {
      id: 'consensus_vote_amplifier',
      name: 'Consensus Engine Weighted Vote',
      category: 'intel',
      price: 1500,
      tier: 'Auteur',
      tag: 'Platform Power',
      desc: 'Increases the algorithmic weighting of your critique score by 1.5x in global consensus calculations.',
      requirement: { type: 'consensus', threshold: 5, label: 'Author 5 Consensus-Defining Reviews' }
    },

    // 3. PRODUCTION TOOLS & DATA GEAR
    {
      id: 'radar_expander_25',
      name: 'Screening Deck Expansion (+25)',
      category: 'production',
      price: 300,
      tier: 'Standard',
      tag: 'Studio Capacity',
      desc: 'Expands your screening watchlist buffer to track 25 additional upcoming releases.',
      requirement: { type: 'none', threshold: 0, label: 'Open Access' }
    },
    {
      id: 'studio_filter_module',
      name: 'Boutique Studio Lens',
      category: 'production',
      price: 450,
      tier: 'Specialist',
      tag: 'Catalog Tool',
      desc: 'Direct catalog filters for A24, NEON, Criterion, StudioCanal, and Janus Films.',
      requirement: { type: 'reviews', threshold: 5, label: 'Publish 5 Verified Reviews' }
    },
    {
      id: 'watchlist_data_export',
      name: 'Full Studio Production Export',
      category: 'production',
      price: 200,
      tier: 'Standard',
      tag: 'Data Pipeline',
      desc: 'Export your complete watchlist, rating history, and timestamped reviews into CSV/JSON.',
      requirement: { type: 'none', threshold: 0, label: 'Open Access' }
    },
    {
      id: 'custom_dispatch_foil',
      name: 'Holographic Festival Foil Card',
      category: 'production',
      price: 1100,
      tier: 'Master',
      tag: 'Review Skin',
      desc: 'Encases your published critiques in a rare iridescent Cannes/Venice festival foil wrapper.',
      requirement: { type: 'reviews', threshold: 25, label: 'Publish 25 Verified Reviews' }
    },

    // 4. BROADCAST, PREMIERES & SPOTLIGHTS
    {
      id: 'tactical_emoji_pack',
      name: '35mm Celluloid & Clapper Emotes',
      category: 'broadcast',
      price: 180,
      tier: 'Standard',
      tag: 'Chat Emotes',
      desc: 'Unlocks 12 retro cinema and clapperboard stickers in live community feeds.',
      requirement: { type: 'none', threshold: 0, label: 'Open Access' }
    },
    {
      id: 'pinned_dispatch_token',
      name: 'Opening Night Critic Pin',
      category: 'broadcast',
      price: 900,
      tier: 'Master',
      tag: 'Priority Placement',
      desc: 'Pins your personal critique to the top of any movie detail page for 7 full days.',
      requirement: { type: 'reviews', threshold: 15, label: 'Publish 15 Verified Reviews' }
    },
    {
      id: 'curator_spotlight_beacon',
      name: 'Frontpage Double-Feature Curator',
      category: 'broadcast',
      price: 2000,
      tier: 'Auteur',
      tag: 'Editorial Control',
      desc: 'Curate a featured Double Feature bill placed directly on the SceneSense main stage for 48 hours.',
      requirement: { type: 'reviews', threshold: 40, label: 'Publish 40 Verified Reviews' }
    }
  ], []);

  const renderItemPreview = (itemId) => {
    switch (itemId) {
      case 'frame_neon_cyan':
        return (
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-[#050b14] border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.45)] overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:6px_6px] opacity-30" />
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-400/60 flex items-center justify-center text-[10px] text-cyan-300 font-mono font-black z-10">
              35mm
            </div>
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          </div>
        );

      case 'frame_solar_gold':
        return (
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-[#140e04] border-2 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.5)] overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/30 via-yellow-400/20 to-transparent animate-pulse pointer-events-none" />
            <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-300/80 flex items-center justify-center text-[10px] text-amber-200 font-mono font-black z-10">
              24K
            </div>
            <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_10px_#fde047]" />
          </div>
        );

      case 'title_shadow_operative':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#070b14] border border-cyan-500/40 shadow-inner px-1 text-center shrink-0 group-hover:border-cyan-400 transition-colors">
            <span className="text-[7px] font-mono tracking-widest text-cyan-400 font-black uppercase">
              EXECUTIVE
            </span>
            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent my-1" />
            <span className="text-[7px] font-mono tracking-wider text-slate-300 font-bold">
              PRODUCER
            </span>
          </div>
        );

      case 'title_archivist':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#120d04] border border-amber-500/50 shadow-inner px-1 text-center shrink-0 group-hover:border-amber-400 transition-colors">
            <span className="text-[7px] font-mono tracking-widest text-amber-300 font-black uppercase">
              CRITERION
            </span>
            <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent my-1" />
            <span className="text-[7px] font-mono tracking-wider text-amber-200/80 font-bold">
              ARCHIVIST
            </span>
          </div>
        );

      case 'theme_matrix_emerald':
        return (
          <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-[#021008] border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.4)] overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:5px_5px] opacity-50" />
            <span className="text-[10px] font-mono font-black text-emerald-300 tracking-widest z-10">
              LUT 01
            </span>
          </div>
        );

      case 'chat_gold_glow':
        return (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#120716] border border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.35)] shrink-0 group-hover:border-fuchsia-400 transition-colors">
            <span className="text-[10px] font-mono font-black text-fuchsia-300 tracking-widest animate-pulse">
              MARQUEE
            </span>
          </div>
        );

      case 'oracle_boost_5':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-cyan-950/40 border border-cyan-400/50 shadow-inner shrink-0 group-hover:border-cyan-300 transition-colors">
            <div className="w-6 h-6 rounded-full border border-cyan-400 flex items-center justify-center text-[10px] font-mono text-cyan-300 font-bold">
              5x
            </div>
            <span className="text-[7px] font-mono text-cyan-400/90 mt-1 uppercase tracking-wider font-semibold">CineMind</span>
          </div>
        );

      case 'hidden_gem_scanner':
        return (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[#0a0718] border border-indigo-400/50 shadow-[0_0_15px_rgba(129,140,248,0.3)] shrink-0 group-hover:border-indigo-400 transition-colors">
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-indigo-400 flex items-center justify-center relative">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping absolute" />
              <div className="w-2 h-2 rounded-full bg-indigo-300 relative z-10" />
            </div>
          </div>
        );

      case 'director_retrospective':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#12121e] border border-amber-500/40 shrink-0 group-hover:border-amber-400 transition-colors">
            <div className="flex gap-1 items-end h-5">
              <div className="w-1.5 h-3 bg-amber-400/80 rounded-xs" />
              <div className="w-1.5 h-5 bg-amber-300 rounded-xs" />
              <div className="w-1.5 h-4 bg-amber-500/80 rounded-xs" />
            </div>
            <span className="text-[7px] font-mono text-amber-300 mt-1 uppercase tracking-wider font-semibold">Auteur</span>
          </div>
        );

      case 'consensus_vote_amplifier':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#1c0818] border-2 border-fuchsia-400/70 shadow-[0_0_20px_rgba(232,121,249,0.35)] shrink-0 group-hover:scale-105 transition-transform duration-300">
            <span className="text-xs font-mono font-black text-fuchsia-300 leading-tight">1.5x</span>
            <span className="text-[7px] font-mono text-fuchsia-400 uppercase tracking-widest font-bold">VOTE</span>
          </div>
        );

      case 'radar_expander_25':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-cyan-950/30 border border-cyan-400/50 shrink-0 group-hover:border-cyan-300 transition-colors">
            <span className="text-xs font-mono font-black text-cyan-300 leading-tight">+25</span>
            <span className="text-[7px] font-mono text-slate-400 uppercase tracking-widest">SLOTS</span>
          </div>
        );

      case 'studio_filter_module':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#150a18] border border-pink-400/50 shrink-0 group-hover:border-pink-300 transition-colors">
            <span className="text-[9px] font-mono font-black text-pink-300 leading-tight">A24</span>
            <span className="text-[7px] font-mono text-pink-400/80 uppercase tracking-widest">NEON</span>
          </div>
        );

      case 'watchlist_data_export':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#061413] border border-teal-400/50 shrink-0 group-hover:border-teal-300 transition-colors">
            <span className="text-[10px] font-mono font-black text-teal-300 leading-tight">.CSV</span>
            <span className="text-[7px] font-mono text-teal-400/70 uppercase tracking-widest">EXPORT</span>
          </div>
        );

      case 'custom_dispatch_foil':
        return (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-cyan-500/30 via-fuchsia-500/30 to-amber-500/30 border-2 border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.25)] shrink-0 group-hover:scale-105 transition-transform duration-300">
            <span className="text-[9px] font-mono font-black text-white tracking-widest">
              FOIL
            </span>
          </div>
        );

      case 'tactical_emoji_pack':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#070b14] border border-cyan-500/40 shadow-inner shrink-0 group-hover:border-cyan-400 transition-colors">
            <div className="flex gap-1 text-xs">
              <span>🎬</span>
              <span>🎞️</span>
            </div>
            <span className="text-[7px] font-mono text-cyan-400 uppercase tracking-wider font-bold mt-1">EMOTES</span>
          </div>
        );

      case 'pinned_dispatch_token':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#150d03] border border-amber-500/50 shadow-inner px-1 shrink-0 group-hover:border-amber-400 transition-colors">
            <span className="text-base leading-none">📌</span>
            <span className="text-[7px] font-mono text-amber-300 uppercase tracking-wider font-bold mt-1">PINNED</span>
          </div>
        );

      case 'curator_spotlight_beacon':
        return (
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center bg-[#1c0e04] border-2 border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.45)] shrink-0 group-hover:scale-105 transition-transform duration-300">
            <span className="text-base leading-none">📽️</span>
            <span className="text-[7px] font-mono text-amber-300 uppercase font-black tracking-widest mt-0.5">CURATOR</span>
          </div>
        );

      default:
        return (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400 shrink-0">
            PROP
          </div>
        );
    }
  };

  // Real-time Firestore sync listener
  useEffect(() => {
    let unsubUserDoc = () => {};

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubUserDoc();
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, 'users', currentUser.uid);

        unsubUserDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const rawCoins = data.coins ?? 385;
            const validCoins = Math.max(0, rawCoins);

            setCoins(validCoins);
            setUnlockedItems(Array.isArray(data.inventory) ? data.inventory : []);
            setEquippedFrame(data.equippedFrame || null);
            setEquippedTitle(data.equippedTitle || null);
            setEquippedTheme(data.equippedTheme || null);

            setUserStats({
              reviewCount: Number(data.reviewCount) || 0,
              classicCount: Number(data.classicCount) || 0,
              consensusCount: Number(data.consensusCount) || 0,
              reputationScore: Number(data.reputationScore) || 0
            });
          }
          setIsLoading(false);
        }, (err) => {
          console.error("Armoury telemetry listener error:", err);
          setIsLoading(false);
        });
      } else {
        router.push('/login');
      }
    });

    return () => {
      unsubAuth();
      unsubUserDoc();
    };
  }, [router]);

  const checkRequirementMet = (req) => {
    if (!req || req.type === 'none') return { met: true, progress: 1, current: 0, target: 0 };
    let current = 0;
    if (req.type === 'reviews') current = userStats.reviewCount;
    if (req.type === 'classic') current = userStats.classicCount;
    if (req.type === 'consensus') current = userStats.consensusCount;
    if (req.type === 'reputation') current = userStats.reputationScore;

    const target = req.threshold || 1;
    const progress = Math.min(1, Math.max(0, current / target));
    return {
      met: current >= target,
      progress,
      current,
      target
    };
  };

  const handlePurchase = async (item) => {
    if (!user) return;
    const reqStatus = checkRequirementMet(item.requirement);

    if (!reqStatus.met) {
      setPurchaseStatus({
        type: 'error',
        msg: `Milestone Locked: You must "${item.requirement.label}" first (${reqStatus.current}/${reqStatus.target}).`
      });
      setTimeout(() => setPurchaseStatus(null), 4000);
      return;
    }

    if (coins < item.price) {
      setPurchaseStatus({ 
        type: 'error', 
        msg: `Insufficient Studio Coins. You need ${item.price - coins} more coins.` 
      });
      setTimeout(() => setPurchaseStatus(null), 4000);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedInventory = [...unlockedItems, item.id];

      await updateDoc(userRef, {
        coins: increment(-item.price),
        inventory: updatedInventory
      });

      setPurchaseStatus({ 
        type: 'success', 
        msg: `Prop acquired: ${item.name} is now stored in your Studio Kit.` 
      });
      setTimeout(() => setPurchaseStatus(null), 4000);
    } catch (err) {
      console.error("Purchase error:", err);
      setPurchaseStatus({ type: 'error', msg: 'Prop checkout error. Please retry.' });
      setTimeout(() => setPurchaseStatus(null), 4000);
    }
  };

  const handleToggleEquipFromShop = async (item) => {
    if (!user) return;
    const isFrame = item.id.startsWith('frame_');
    const isTitle = item.id.startsWith('title_');
    const isTheme = item.id.startsWith('theme_');
    
    let field = null;
    let currentVal = null;

    if (isFrame) {
      field = 'equippedFrame';
      currentVal = equippedFrame;
    } else if (isTitle) {
      field = 'equippedTitle';
      currentVal = equippedTitle;
    } else if (isTheme) {
      field = 'equippedTheme';
      currentVal = equippedTheme;
    }

    if (!field) return;

    const nextVal = currentVal === item.id ? null : item.id;

    try {
      await updateDoc(doc(db, 'users', user.uid), { [field]: nextVal });

      setPurchaseStatus({
        type: 'success',
        msg: nextVal ? `Equipped ${item.name} to your dossier.` : `Unequipped ${item.name}.`
      });
      setTimeout(() => setPurchaseStatus(null), 3000);
    } catch (err) {
      console.error("Failed to toggle equip state:", err);
    }
  };

  const filteredItems = PROP_ITEMS.filter(i => i.category === activeTab);

  if (isLoading) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
          Accessing Studio Commissary Vault...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans text-slate-100 relative min-h-[85vh]">
      
      {/* Background Depth Effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-[450px] h-[450px] bg-amber-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* TOP COMMAND HUD RAIL */}
      <header className="relative z-10 bg-[#080d1a]/80 backdrop-blur-xl border border-cyan-500/25 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="w-11 h-11 rounded-2xl bg-[#050811] border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 flex items-center justify-center transition-all duration-200 shadow-md cursor-pointer group"
              title="Return to Profile Dossier"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            </Link>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
                  STUDIO NODE // COMMISSARY
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-mono mt-1">
                The Prop Department &amp; Backlot
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Acquire visual prestige honors through critique telemetry • Exchange studio coins for archival tools
              </p>
            </div>
          </div>

          {/* Telemetry Modules & Wallet Strip */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            
            <div className="flex items-center gap-4 bg-[#050811] border border-cyan-500/20 px-4 py-2.5 rounded-2xl font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">CRITIQUES LOGGED</span>
                <span className="font-bold text-cyan-300 text-sm">{userStats.reviewCount}</span>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div>
                <span className="text-slate-500 block text-[9px] uppercase tracking-wider">CLASSICS (&lt;1980)</span>
                <span className="font-bold text-amber-300 text-sm">{userStats.classicCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#050811] border border-amber-500/30 px-5 py-2.5 rounded-2xl shadow-inner">
              <span className="text-2xl">🪙</span>
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block leading-tight">STUDIO BALANCE</span>
                <span className="text-base font-black text-amber-400 font-mono leading-tight">{coins} COINS</span>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* STATUS BANNER */}
      {purchaseStatus && (
        <div className={`p-4 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between transition-all ${
          purchaseStatus.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
            : 'bg-rose-950/80 border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
        }`}>
          <span>{purchaseStatus.msg}</span>
          <button onClick={() => setPurchaseStatus(null)} className="text-sm opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* ILLUMINATED SOUNDSTAGE TABS */}
      <div className="relative z-10 flex items-center gap-2 border-b border-cyan-500/20 pb-4 overflow-x-auto scrollbar-none">
        {[
          { id: 'cosmetics', label: 'Screen Credits & Frames', icon: '🎬', count: 6 },
          { id: 'intel', label: 'Screenplay AI & Lenses', icon: '🧠', count: 4 },
          { id: 'production', label: 'Production Tools', icon: '📽️', count: 4 },
          { id: 'broadcast', label: 'Premieres & Marquee', icon: '📢', count: 3 }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-3 rounded-2xl text-xs font-mono font-bold transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-2.5 ${
                isActive
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                  : 'bg-[#080d1a] text-slate-400 hover:text-white border border-cyan-500/15 hover:border-cyan-500/40 hover:bg-[#0c1426]'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
              )}
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                isActive ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'bg-black/40 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* PROP ITEMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filteredItems.map((item) => {
          const isOwned = unlockedItems.includes(item.id);
          const reqStatus = checkRequirementMet(item.requirement);
          const canAfford = coins >= item.price;
          const isFrame = item.id.startsWith('frame_');
          const isTitle = item.id.startsWith('title_');
          const isTheme = item.id.startsWith('theme_');
          const isEquippable = isFrame || isTitle || isTheme;
          
          const isEquipped = isFrame 
            ? equippedFrame === item.id 
            : isTitle 
              ? equippedTitle === item.id 
              : isTheme 
                ? equippedTheme === item.id 
                : false;

          const tierBadgeStyle = 
            item.tier === 'Auteur' ? 'text-fuchsia-300 border-fuchsia-500/50 bg-fuchsia-950/60 shadow-[0_0_12px_rgba(232,121,249,0.3)]' :
            item.tier === 'Master' ? 'text-amber-300 border-amber-500/50 bg-amber-950/60 shadow-[0_0_12px_rgba(251,191,36,0.3)]' :
            item.tier === 'Specialist' ? 'text-emerald-300 border-emerald-500/50 bg-emerald-950/60 shadow-[0_0_12px_rgba(52,211,153,0.3)]' :
            'text-cyan-300 border-cyan-500/40 bg-cyan-950/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]';

          const cardSurface = isEquipped
            ? 'border-cyan-400 bg-cyan-950/25 shadow-[0_0_35px_rgba(6,182,212,0.25)]'
            : isOwned
              ? 'border-emerald-500/40 bg-[#06100c]/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
              : !reqStatus.met
                ? 'border-white/10 bg-[#080d1a]/60 opacity-80'
                : 'border-cyan-500/20 bg-[#080d1a] hover:border-cyan-400/60 hover:-translate-y-1 shadow-lg';

          return (
            <div
              key={item.id}
              className={`rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all duration-300 relative border group ${cardSurface}`}
            >
              <div className="space-y-4">
                
                {/* Header preview row */}
                <div className="flex items-start justify-between gap-3">
                  {renderItemPreview(item.id)}

                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] font-mono uppercase tracking-widest font-black px-2.5 py-0.5 rounded-full border ${tierBadgeStyle}`}>
                      {item.tier}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      {item.tag}
                    </span>
                  </div>
                </div>

                {/* Typography info */}
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight flex items-center gap-2 group-hover:text-cyan-300 transition-colors">
                    {!reqStatus.met && !isOwned && <span className="text-sm">🔒</span>}
                    <span>{item.name}</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-light mt-1.5">
                    {item.desc}
                  </p>
                </div>

                {/* Requirement Progress Tracker */}
                {item.requirement && item.requirement.type !== 'none' && !isOwned && (
                  <div className="p-3 bg-[#050811] border border-cyan-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 uppercase tracking-widest">CRITERIA AUDIT:</span>
                      <span className={reqStatus.met ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                        {reqStatus.met ? "✓ READY TO ACQUIRE" : `${reqStatus.current} / ${reqStatus.target} LOGGED`}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-300">
                      {item.requirement.label}
                    </div>
                    <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-500 ${reqStatus.met ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#fde047]'}`}
                        style={{ width: `${Math.round(reqStatus.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Card Footer action bar */}
              <div className="pt-4 border-t border-cyan-500/15 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-base font-black text-amber-400">{item.price}</span>
                  <span className="text-xs text-slate-400">COINS</span>
                </div>

                {isOwned ? (
                  isEquippable ? (
                    <button
                      type="button"
                      onClick={() => handleToggleEquipFromShop(item)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:bg-cyan-300'
                          : 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 hover:border-cyan-400'
                      }`}
                    >
                      {isEquipped ? '✓ Equipped' : 'Equip to Dossier'}
                    </button>
                  ) : (
                    <span className="px-4 py-2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold rounded-xl flex items-center gap-1">
                      ✓ In Studio Kit
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePurchase(item)}
                    disabled={!reqStatus.met || !canAfford}
                    className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      !reqStatus.met
                        ? 'bg-[#101422] border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
                        : canAfford
                          ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95'
                          : 'bg-[#101422] border border-amber-500/20 text-amber-500/60 cursor-not-allowed'
                    }`}
                  >
                    <span>{!reqStatus.met ? 'Locked' : 'Acquire Prop'}</span>
                    <span>→</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}