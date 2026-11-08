// File: app/armoury/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "@/firebase";
import {
  RARITY_CONFIG,
  LiveAvatarPreview,
  formatDirectorTitle,
} from "@/lib/reward-visuals";
import { trackQuestEvent } from "@/lib/quest-tracker";

const PROP_ITEMS = [
  // 1. COSMETICS, CREDITS & STUDIO LUT THEMES
  {
    id: "frame_neon_cyan",
    name: "Cyberpunk Neon Director Frame",
    category: "cosmetics",
    price: 150,
    rarity: "EPIC",
    tag: "Avatar Reel",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    desc: "Equips a glowing anamorphic 35mm cyan film border around your director avatar.",
  },
  {
    id: "frame_matrix_emerald",
    name: "Matrix Emerald 35mm Border",
    category: "cosmetics",
    price: 220,
    rarity: "RARE",
    tag: "Avatar Reel",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    desc: "Cascading phosphor-emerald 35mm optical perforations that pulse around your portrait.",
  },
  {
    id: "frame_quantum_amethyst",
    name: "Quantum Amethyst Foil Border",
    category: "cosmetics",
    price: 450,
    rarity: "EPIC",
    tag: "Avatar Reel",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    desc: "Iridescent ultraviolet & magenta holographic border around your operative avatar.",
  },
  {
    id: "frame_solar_gold",
    name: "Academy Solar Gold Director Frame",
    category: "cosmetics",
    price: 500,
    rarity: "LEGENDARY",
    tag: "Avatar Reel",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
    desc: "Prestigious 24K gold leaf film reel border for celebrated community contributors.",
  },
  {
    id: "frame_crimson_velvet",
    name: "Premiere Red Carpet Velvet Border",
    category: "cosmetics",
    price: 650,
    rarity: "LEGENDARY",
    tag: "Avatar Reel",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    desc: "Cannes Grand Theatre crimson velvet trim accented with golden flashbulb sparkles.",
  },
  {
    id: "frame_obsidian_70mm",
    name: "Obsidian IMAX 70mm Master Frame",
    category: "cosmetics",
    price: 850,
    rarity: "MYTHIC",
    tag: "Avatar Reel",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80",
    desc: "Heavy-gauge matte carbon 15-perf 70mm IMAX frame with glowing tungsten timecodes.",
  },
  {
    id: "title_shadow_operative",
    name: "Screen Credit: [EXECUTIVE PRODUCER]",
    category: "cosmetics",
    price: 150,
    rarity: "RARE",
    tag: "Opening Credit",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
    desc: "Display an executive producer credit title beside your handle across all reviews.",
  },
  {
    id: "title_archivist",
    name: "Screen Credit: [CHIEF ARCHIVIST]",
    category: "cosmetics",
    price: 250,
    rarity: "RARE",
    tag: "Opening Credit",
    image: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=600&q=80",
    desc: "Exclusive credit for cinephiles preserving and cataloging classic releases.",
  },
  {
    id: "title_auteur_director",
    name: "Screen Credit: [AUTEUR DIRECTOR]",
    category: "cosmetics",
    price: 350,
    rarity: "EPIC",
    tag: "Opening Credit",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    desc: "Prestigious Palme d'Or inspired credit badge displayed in navigation and reviews.",
  },
  {
    id: "title_festival_laureate",
    name: "Screen Credit: [GRAND JURY LAUREATE]",
    category: "cosmetics",
    price: 600,
    rarity: "LEGENDARY",
    tag: "Opening Credit",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
    desc: "International Festival Jury badge for elite critics and multi-month veterans.",
  },
  {
    id: "title_showrunner_supreme",
    name: "Screen Credit: [SHOWRUNNER SUPREME]",
    category: "cosmetics",
    price: 800,
    rarity: "MYTHIC",
    tag: "Opening Credit",
    image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80",
    desc: "Supreme studio authority badge across both Feature Film and Series sectors.",
  },
  {
    id: "theme_matrix_emerald",
    name: "Color Grade: Emerald Matrix",
    category: "cosmetics",
    price: 300,
    rarity: "RARE",
    tag: "Studio LUT Theme",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80",
    desc: "Applies an emerald green cinematic color grade LUT across your SceneSense workspace.",
  },
  {
    id: "theme_noir_crimson",
    name: "Color Grade: Neo-Noir Crimson",
    category: "cosmetics",
    price: 320,
    rarity: "EPIC",
    tag: "Studio LUT Theme",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    desc: "Applies a moody crimson & sodium-vapor neo-noir ambient lighting grade across the app.",
  },
  {
    id: "theme_cyber_violet",
    name: "Color Grade: Synthwave Ultraviolet",
    category: "cosmetics",
    price: 320,
    rarity: "EPIC",
    tag: "Studio LUT Theme",
    image: "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=600&q=80",
    desc: "Infuses the workspace with 1980s outrun magenta and deep ultraviolet studio ambience.",
  },
  {
    id: "theme_imax_gold",
    name: "Color Grade: 70mm IMAX Amber",
    category: "cosmetics",
    price: 400,
    rarity: "LEGENDARY",
    tag: "Studio LUT Theme",
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80",
    desc: "Warm tungsten 70mm celluloid projection glow across your entire SceneSense terminal.",
  },
  {
    id: "theme_blade_runner_teal",
    name: "Color Grade: Dystopian Teal & Orange",
    category: "cosmetics",
    price: 650,
    rarity: "LEGENDARY",
    tag: "Studio LUT Theme",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    desc: "High-contrast Deakins-inspired anamorphic teal shadows with sodium-amber highlights.",
  },
  {
    id: "chat_gold_glow",
    name: "Marquee Neon Glow",
    category: "cosmetics",
    price: 400,
    rarity: "EPIC",
    tag: "Credit Styling",
    image: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=600&q=80",
    desc: "Highlights your username with a theater marquee glow in community discussions.",
  },

  // 2. INTEL, XP BOOSTERS & STREAK SHIELDS
  {
    id: "streak_freeze_shield",
    name: "Timecode Streak Freeze Shield",
    category: "intel",
    price: 220,
    rarity: "EPIC",
    tag: "Streak Protection",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    desc: "Automatically protects your multi-week Daily Check-In Streak & XP Multiplier if you miss a day.",
  },
  {
    id: "xp_overclock_2x",
    name: "Double-Feature XP Overclock (+0.25x)",
    category: "intel",
    price: 550,
    rarity: "LEGENDARY",
    tag: "Permanent XP Boost",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80",
    desc: "Permanently adds +0.25x to your global Director XP multiplier across all quests and mini-games.",
  },
  {
    id: "oracle_boost_5",
    name: "5x CineMind Script Canisters",
    category: "intel",
    price: 75,
    rarity: "COMMON",
    tag: "Screenplay AI Fuel",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80",
    desc: "Unlocks in-depth thematic motif breakdowns, script subtext, and director commentary.",
  },
  {
    id: "hidden_gem_scanner",
    name: "Midnight Cult Cinema Lens",
    category: "intel",
    price: 200,
    rarity: "RARE",
    tag: "CineMind Filter",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    desc: "Reveals highly rated hidden gems and obscure festival titles with under 5,000 ratings.",
  },
  {
    id: "director_retrospective",
    name: "Auteur Filmography Reel",
    category: "intel",
    price: 350,
    rarity: "EPIC",
    tag: "Studio Archives",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    desc: "Generates instant chronological box-office, budget, and thematic retrospectives for any director.",
  },
  {
    id: "stream_radar_ping",
    name: "Digital Distribution Ping",
    category: "intel",
    price: 150,
    rarity: "RARE",
    tag: "Streaming Alert",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    desc: "Get notified immediately when a theater-exclusive film hits SVOD streaming services.",
  },

  // 3. PRODUCTION & GEAR
  {
    id: "radar_expander_25",
    name: "Screening Deck Expansion (+25)",
    category: "production",
    price: 200,
    rarity: "RARE",
    tag: "Studio Capacity",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80",
    desc: "Expands your screening watchlist to monitor an additional 25 upcoming releases.",
  },
  {
    id: "radar_expander_50",
    name: "Soundstage Watchlist Expansion (+50)",
    category: "production",
    price: 350,
    rarity: "EPIC",
    tag: "Studio Capacity",
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&q=80",
    desc: "Maximum screening capacity, adding 50 extra slots to your active film radar.",
  },
  {
    id: "studio_filter_module",
    name: "Boutique Studio Lens (A24 / Criterion)",
    category: "production",
    price: 250,
    rarity: "RARE",
    tag: "Catalog Tool",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
    desc: "Filter directly by beloved boutique distributors: A24, Neon, Criterion, and Toho.",
  },
  {
    id: "watchlist_data_export",
    name: "Production Log Export (.CSV / .JSON)",
    category: "production",
    price: 100,
    rarity: "COMMON",
    tag: "Data Archive",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    desc: "Export your complete watchlist, reviews, and watch dates into clean CSV or JSON format.",
  },
  {
    id: "custom_dispatch_foil",
    name: "Holographic Festival Laurel Foil",
    category: "production",
    price: 450,
    rarity: "LEGENDARY",
    tag: "Review Card Skin",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
    desc: "Adds shimmering holographic foil laurels to all your published community reviews.",
  },

  // 4. BROADCAST & PREMIERES
  {
    id: "comms_broadcast_beacon",
    name: "Director Spotlight Megaphone",
    category: "broadcast",
    price: 300,
    rarity: "EPIC",
    tag: "Lobby Marquee",
    image: "https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=600&q=80",
    desc: "Pin a chosen film recommendation to the header of Community Chat for 2 hours.",
  },
  {
    id: "tactical_emoji_pack",
    name: "Cinema Popcorn & Film Reel Emojis",
    category: "broadcast",
    price: 120,
    rarity: "RARE",
    tag: "Community Emotes",
    image: "https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=600&q=80",
    desc: "Unlocks 12 retro cinema reaction stickers in live lobby discussions.",
  },
  {
    id: "pinned_dispatch_token",
    name: "Opening Night Critic Pin",
    category: "broadcast",
    price: 400,
    rarity: "LEGENDARY",
    tag: "Featured Review",
    image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=600&q=80",
    desc: "Pin your personal review to the top of any movie detail page for 7 full days.",
  },
];

const MODULE_DAY_SEED = Math.floor(Date.now() / 86400000);
const FLASH_SALE_ITEM_IDS = [
  PROP_ITEMS[MODULE_DAY_SEED % PROP_ITEMS.length].id,
  PROP_ITEMS[(MODULE_DAY_SEED * 5 + 3) % PROP_ITEMS.length].id,
];

export default function PropDepartmentPage() {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [unlockedItems, setUnlockedItems] = useState([]);
  const [equippedFrame, setEquippedFrame] = useState(null);
  const [equippedTitle, setEquippedTitle] = useState(null);
  const [equippedTheme, setEquippedTheme] = useState(null);
  const [activeTab, setActiveTab] = useState("cosmetics"); // 'cosmetics' | 'intel' | 'production' | 'broadcast'
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseStatus, setPurchaseStatus] = useState(null);

  // Interactive Live Try-On Sandbox State
  const [previewFrame, setPreviewFrame] = useState(null);
  const [previewTitle, setPreviewTitle] = useState(null);
  const [previewTheme, setPreviewTheme] = useState(null);
  const [showDressingRoom, setShowDressingRoom] = useState(true);

  const router = useRouter();

  // Daily Flash Sale Item IDs (rotates every 24h, 35% off)
  const flashSaleIds = FLASH_SALE_ITEM_IDS;

  const getEffectivePrice = (item) => {
    if (flashSaleIds.includes(item.id)) {
      return Math.round(item.price * 0.65);
    }
    return item.price;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const rawCoins = data.coins ?? 385;
            const validCoins = Math.max(0, rawCoins);
            setCoins(validCoins);
            setUnlockedItems(data.inventory || []);
            setEquippedFrame(data.equippedFrame || null);
            setEquippedTitle(data.equippedTitle || null);
            setEquippedTheme(data.equippedTheme || null);
            setPreviewFrame(data.equippedFrame || "frame_solar_gold");
            setPreviewTitle(data.equippedTitle || "title_auteur_director");
            setPreviewTheme(data.equippedTheme || null);

            if (rawCoins < 0) {
              await updateDoc(doc(db, "users", currentUser.uid), { coins: validCoins });
            }
          }
        } catch (err) {
          console.error("Failed to load prop department data:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handlePurchase = async (item) => {
    const finalPrice = getEffectivePrice(item);
    if (coins < finalPrice) {
      setPurchaseStatus({
        type: "error",
        msg: `Insufficient Studio Coins. You need ${finalPrice - coins} more coins.`,
      });
      setTimeout(() => setPurchaseStatus(null), 4000);
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const updatedInventory = [...unlockedItems, item.id];

      await updateDoc(userRef, {
        coins: increment(-finalPrice),
        inventory: updatedInventory,
        xp: increment(50),
      });

      setCoins((prev) => Math.max(0, prev - finalPrice));
      setUnlockedItems(updatedInventory);
      setPurchaseStatus({
        type: "success",
        msg: `Prop acquired: ${item.name} (+50 Bonus Director XP) is now stored in your Studio Kit!`,
      });
      setTimeout(() => setPurchaseStatus(null), 4000);
    } catch (err) {
      console.error("Purchase error:", err);
      setPurchaseStatus({ type: "error", msg: "Prop checkout error. Please retry." });
      setTimeout(() => setPurchaseStatus(null), 4000);
    }
  };

  const handleToggleEquipFromShop = async (item) => {
    if (!user) return;
    const isFrame = item.id.startsWith("frame_");
    const isTitle = item.id.startsWith("title_");
    const isTheme = item.id.startsWith("theme_");
    const field = isFrame
      ? "equippedFrame"
      : isTitle
      ? "equippedTitle"
      : isTheme
      ? "equippedTheme"
      : null;
    if (!field) return;

    const currentVal = isFrame ? equippedFrame : isTitle ? equippedTitle : equippedTheme;
    const nextVal = currentVal === item.id ? null : item.id;

    try {
      await updateDoc(doc(db, "users", user.uid), { [field]: nextVal });
      if (isFrame) {
        setEquippedFrame(nextVal);
        setPreviewFrame(nextVal);
      }
      if (isTitle) {
        setEquippedTitle(nextVal);
        setPreviewTitle(nextVal);
      }
      if (isTheme) {
        setEquippedTheme(nextVal);
        setPreviewTheme(nextVal);
      }

      setPurchaseStatus({
        type: "success",
        msg: nextVal ? `Equipped ${item.name} to your dossier.` : `Unequipped ${item.name}.`,
      });
      setTimeout(() => setPurchaseStatus(null), 3000);
    } catch (err) {
      console.error("Failed to toggle equip state:", err);
    }
  };

  // Interactive Try-On Handler
  const handleTryOnItem = (item) => {
    setShowDressingRoom(true);
    if (user?.uid) {
      trackQuestEvent(user.uid, "inspect_rewards_3", 1);
    }
    if (item.id.startsWith("frame_")) setPreviewFrame(item.id);
    else if (item.id.startsWith("title_")) setPreviewTitle(item.id);
    else if (item.id.startsWith("theme_")) setPreviewTheme(item.id);

    setPurchaseStatus({
      type: "success",
      msg: `Live Try-On Active: Previewing "${item.name}" in the Director Dressing Room above!`,
    });
    setTimeout(() => setPurchaseStatus(null), 3000);
  };

  const filteredItems = PROP_ITEMS.filter((i) => i.category === activeTab);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">
          Opening The Prop Department &amp; Live Try-On Studio...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans text-white relative min-h-[85vh]">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-amber-500/20 pb-6 gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="w-9 h-9 rounded-xl bg-[#0e0e16] border border-amber-500/30 hover:border-amber-400 text-amber-300 flex items-center justify-center transition-all shadow-md cursor-pointer"
            title="Return to Profile"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎟️</span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                The Prop Department &amp; Backlot
              </h1>
            </div>
            <p className="text-[11px] font-mono text-gray-400 mt-1">
              Studio Commissary • Preview reward pictures, try on borders &amp; LUTs live, and exchange SceneCents
            </p>
          </div>
        </div>

        {/* Live Coin Wallet Display */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/quests"
            className="px-3.5 py-2.5 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold rounded-xl transition-all"
          >
            ⚡ 50-Tier Pass &amp; Arcade
          </Link>

          <div className="flex items-center gap-3 bg-[#0e0e18] border border-amber-500/30 px-5 py-2.5 rounded-2xl shadow-lg">
            <span className="text-xl">🪙</span>
            <div>
              <span className="text-[10px] font-mono uppercase text-gray-400 block leading-none">
                Studio Balance
              </span>
              <span className="text-xl font-black text-amber-400 leading-tight">
                {coins.toLocaleString()} Coins
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE LIVE AVATAR DRESSING ROOM / TRY-ON STUDIO */}
      <div className="bg-[#080b16] border border-cyan-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              🪞 Interactive Director Dressing Room &amp; Live Try-On
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white">
              Click &quot;👁️ Try On&quot; on any Frame, Credit Title, or Studio LUT below to preview it live on your Dossier
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPreviewFrame(equippedFrame);
                setPreviewTitle(equippedTitle);
                setPreviewTheme(equippedTheme);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 cursor-pointer"
            >
              Reset to Equipped
            </button>
            <button
              type="button"
              onClick={() => setShowDressingRoom((s) => !s)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-mono text-cyan-300 cursor-pointer"
            >
              {showDressingRoom ? "Hide Preview" : "Show Preview"}
            </button>
          </div>
        </div>

        {showDressingRoom && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            <div className="lg:col-span-2">
              <LiveAvatarPreview
                avatarUrl={user?.photoURL}
                displayName={user?.displayName || "Director Operative"}
                frameId={previewFrame}
                titleId={previewTitle}
                themeId={previewTheme}
              />
            </div>
            <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/30 space-y-2">
              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                🔥 24h Backlot Flash Deals (35% Off Today)
              </span>
              {PROP_ITEMS.filter((it) => flashSaleIds.includes(it.id)).map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between text-xs font-mono bg-amber-500/10 border border-amber-400/30 px-3 py-2 rounded-xl"
                >
                  <span className="text-white truncate pr-2">{deal.name}</span>
                  <span className="text-amber-300 font-black shrink-0">
                    <s className="text-slate-500 mr-1">{deal.price}</s>
                    {getEffectivePrice(deal)} 🪙
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* STATUS BANNER */}
      {purchaseStatus && (
        <div
          className={`p-4 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between transition-all ${
            purchaseStatus.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
              : "bg-red-950/80 border-red-500/50 text-red-300"
          }`}
        >
          <span>{purchaseStatus.msg}</span>
          <button
            onClick={() => setPurchaseStatus(null)}
            className="text-sm opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* CATEGORY SELECTOR */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <label htmlFor="armoury-dept-select" className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <span>🏬</span> Department:
        </label>
        <select
          id="armoury-dept-select"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="bg-[#0e0e16] border border-amber-500/30 text-xs font-mono font-bold text-white rounded-xl px-4 py-2.5 outline-none focus:border-amber-400 cursor-pointer shadow-inner transition-all"
        >
          <option value="cosmetics" className="bg-[#0e0e16] text-white">🎬 Screen Credits, Frames & 35mm LUTs</option>
          <option value="intel" className="bg-[#0e0e16] text-white">🛡️ Streak Shields, XP Boosts & AI Lenses</option>
          <option value="production" className="bg-[#0e0e16] text-white">📽️ Production & Watchlist Tools</option>
          <option value="broadcast" className="bg-[#0e0e16] text-white">📢 Marquee Broadcasts & Premieres</option>
        </select>
      </div>

      {/* ITEMS GRID WITH HIGH-RESOLUTION REWARD PICTURES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filteredItems.map((item) => {
          const isOwned = unlockedItems.includes(item.id);
          const finalPrice = getEffectivePrice(item);
          const isFlashDeal = flashSaleIds.includes(item.id);
          const canAfford = coins >= finalPrice;
          const isFrame = item.id.startsWith("frame_");
          const isTitle = item.id.startsWith("title_");
          const isTheme = item.id.startsWith("theme_");
          const isEquippable = isFrame || isTitle || isTheme;
          const isEquipped = isFrame
            ? equippedFrame === item.id
            : isTitle
            ? equippedTitle === item.id
            : isTheme
            ? equippedTheme === item.id
            : false;

          const rarityStyle = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.COMMON;

          return (
            <div
              key={item.id}
              className={`bg-[#0b0b14] border rounded-3xl overflow-hidden flex flex-col justify-between transition-all shadow-lg relative group ${
                isEquipped
                  ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_25px_rgba(6,182,212,0.25)]"
                  : isOwned
                  ? "border-emerald-500/40 bg-[#06100c]/50"
                  : `${rarityStyle.cardBorder} hover:-translate-y-1`
              }`}
            >
              {/* High-Resolution Picture Header */}
              <div>
                <div className="relative h-44 w-full overflow-hidden bg-black">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b14] via-[#0b0b14]/35 to-transparent" />

                  {/* Rarity & Tag Pills */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[9px] font-mono font-black uppercase border backdrop-blur-md ${rarityStyle.badgeBg}`}
                    >
                      {rarityStyle.label}
                    </span>

                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-black/80 border border-amber-500/40 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                      {item.tag}
                    </span>
                  </div>

                  {isFlashDeal && !isOwned && (
                    <span className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-black uppercase shadow-lg">
                      🔥 35% FLASH DEAL
                    </span>
                  )}

                  {isEquippable && (
                    <button
                      type="button"
                      onClick={() => handleTryOnItem(item)}
                      className="absolute bottom-3 right-3 px-3 py-1 rounded-lg bg-black/80 hover:bg-cyan-500 hover:text-black text-cyan-300 border border-cyan-400/50 text-[10px] font-mono font-bold uppercase transition-all cursor-pointer backdrop-blur-md"
                    >
                      👁️ Try On Live
                    </button>
                  )}

                  {/* Center Visual Overlay Badge for Titles */}
                  {isTitle && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="px-3 py-1 rounded-xl bg-black/80 border border-amber-400/60 text-xs font-mono font-black text-amber-300 shadow-lg">
                        [{formatDirectorTitle(item.id)}]
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-6 pb-3 space-y-2">
                  <h3 className="text-base font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono">
                  {isFlashDeal && !isOwned && (
                    <s className="text-xs text-slate-500">{item.price}</s>
                  )}
                  <span className="text-base font-black text-amber-400">{finalPrice}</span>
                  <span className="text-xs text-gray-400">Coins</span>
                </div>

                {isOwned ? (
                  isEquippable ? (
                    <button
                      type="button"
                      onClick={() => handleToggleEquipFromShop(item)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        isEquipped
                          ? "bg-cyan-500 text-black shadow-md hover:bg-cyan-400"
                          : "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:border-cyan-400"
                      }`}
                    >
                      {isEquipped ? "✓ Equipped" : "Equip to Dossier"}
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
                    disabled={!canAfford}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                      canAfford
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-md shadow-amber-500/20 cursor-pointer"
                        : "bg-[#141420] border border-white/10 text-gray-500 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <span>Acquire Prop</span>
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
