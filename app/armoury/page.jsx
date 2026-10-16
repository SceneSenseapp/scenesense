// app/armoury/page.jsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function PropDepartmentPage() {
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [unlockedItems, setUnlockedItems] = useState([]);
  const [equippedFrame, setEquippedFrame] = useState(null);
  const [equippedTitle, setEquippedTitle] = useState(null);
  const [activeTab, setActiveTab] = useState('cosmetics'); // 'cosmetics' | 'intel' | 'production' | 'broadcast'
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseStatus, setPurchaseStatus] = useState(null);

  const router = useRouter();

  // Dynamic Visual Preview Component replacing static emojis
  const renderItemPreview = (itemId) => {
    switch (itemId) {
      // 1. Neon Cyan Frame Preview
      case 'frame_neon_cyan':
        return (
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#070d18] border-2 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)] overflow-hidden">
            <div className="absolute inset-0 bg-cyan-400/10 animate-pulse pointer-events-none" />
            <div className="w-6 h-6 rounded-lg bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-[10px] text-cyan-300 font-mono">
              35mm
            </div>
            <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          </div>
        );

      // 2. Academy Gold Director Frame Preview
      case 'frame_solar_gold':
        return (
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#151105] border-2 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.8)] ring-1 ring-amber-400/40 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/20 via-yellow-400/20 to-transparent animate-pulse pointer-events-none" />
            <div className="w-6 h-6 rounded-lg bg-amber-950/80 border border-amber-300/60 flex items-center justify-center text-[10px] text-amber-200 font-mono">
              GOLD
            </div>
            <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047]" />
          </div>
        );

      // 3. Screen Credit: Executive Producer
      case 'title_shadow_operative':
        return (
          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-[#0d0d16] border border-cyan-500/30 shadow-inner px-1 text-center">
            <span className="text-[7px] font-mono tracking-tighter text-cyan-400 font-black uppercase leading-tight">
              PRODUCER
            </span>
            <div className="w-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent my-0.5" />
            <span className="text-[6px] font-mono text-gray-400">CREDIT</span>
          </div>
        );

      // 4. Screen Credit: Chief Archivist
      case 'title_archivist':
        return (
          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-[#141008] border border-amber-500/40 shadow-inner px-1 text-center">
            <span className="text-[7px] font-mono tracking-tighter text-amber-300 font-black uppercase leading-tight">
              ARCHIVIST
            </span>
            <div className="w-6 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent my-0.5" />
            <span className="text-[6px] font-mono text-gray-400">CREDIT</span>
          </div>
        );

      // 5. Emerald Matrix LUT Theme Preview
      case 'theme_matrix_emerald':
        return (
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#021008] border-2 border-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.6)] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:4px_4px] opacity-40" />
            <span className="text-[9px] font-mono font-black text-emerald-300 tracking-widest z-10">
              LUT
            </span>
          </div>
        );

      // 6. Marquee Neon Glow
      case 'chat_gold_glow':
        return (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#110e1a] border border-fuchsia-500/40 shadow-[0_0_15px_rgba(217,70,239,0.5)]">
            <span className="text-[10px] font-mono font-black text-fuchsia-300 tracking-wider animate-pulse">
              NEON
            </span>
          </div>
        );

      // 7. Script Tokens & AI Fuel
      case 'oracle_boost_5':
        return (
          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-cyan-950/40 border border-cyan-400/40 shadow-inner">
            <div className="w-5 h-5 rounded-full border border-cyan-400 flex items-center justify-center text-[9px] font-mono text-cyan-300 font-bold">
              5x
            </div>
            <span className="text-[6px] font-mono text-cyan-400/80 mt-0.5">TOKENS</span>
          </div>
        );

      // 8. Cult Cinema Lens
      case 'hidden_gem_scanner':
        return (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#0f0c1a] border border-indigo-400/40 shadow-[0_0_10px_rgba(129,140,248,0.3)]">
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-indigo-400 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            </div>
          </div>
        );

      // 9. Auteur Filmography Reel
      case 'director_retrospective':
        return (
          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-[#141420] border border-amber-500/30">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-3 bg-amber-400/80 rounded-sm" />
              <div className="w-1.5 h-5 bg-amber-300 rounded-sm" />
              <div className="w-1.5 h-4 bg-amber-500/80 rounded-sm" />
            </div>
            <span className="text-[6px] font-mono text-amber-300 mt-0.5">REEL</span>
          </div>
        );

      // 10. Streaming Alert
      case 'stream_radar_ping':
        return (
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-[#0b101d] border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.4)]">
            <div className="w-3 h-3 rounded-full bg-sky-400 animate-ping absolute" />
            <div className="w-2.5 h-2.5 rounded-full bg-sky-300 relative z-10" />
          </div>
        );

      // 11. Screening Watchlist Deck Expansions (+25 / +50)
      case 'radar_expander_25':
      case 'radar_expander_50':
        return (
          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-cyan-950/30 border border-cyan-400/40">
            <span className="text-[10px] font-mono font-black text-cyan-300">
              {itemId === 'radar_expander_25' ? '+25' : '+50'}
            </span>
            <span className="text-[6px] font-mono text-gray-400 uppercase">SLOTS</span>
          </div>
        );

      // 12. Studio Filter Module
      case 'studio_filter_module':
        return (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#14121d] border border-pink-400/40 text-[9px] font-mono font-black text-pink-300">
            A24/CR
          </div>
        );

      // 13. Watchlist Data Export
      case 'watchlist_data_export':
        return (
          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-[#0b1514] border border-teal-400/40 text-[8px] font-mono font-bold text-teal-300">
            <span>.CSV</span>
            <span className="text-[6px] text-teal-400/60">EXPORT</span>
          </div>
        );

      // 14. Holographic Review Foil
      case 'custom_dispatch_foil':
        return (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-tr from-cyan-500/30 via-fuchsia-500/30 to-amber-500/30 border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            <span className="text-[8px] font-mono font-black text-white tracking-widest">
              FOIL
            </span>
          </div>
        );

      // Fallback
      default:
        return (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 text-xs font-mono text-gray-400">
            PROP
          </div>
        );
    }
  };

  const PROP_ITEMS = [
    // 1. COSMETICS & CREDITS
    {
      id: 'frame_neon_cyan',
      name: 'Cyberpunk Neon Director Frame',
      category: 'cosmetics',
      price: 150,
      tag: 'Avatar Reel',
      desc: 'Equips a glowing anamorphic 35mm film border around your director avatar.'
    },
    {
      id: 'title_shadow_operative',
      name: 'Screen Credit: [EXECUTIVE PRODUCER]',
      category: 'cosmetics',
      price: 150,
      tag: 'Opening Credit',
      desc: 'Display an executive producer credit title beside your handle across all reviews.'
    },
    {
      id: 'theme_matrix_emerald',
      name: 'Color Grade: Emerald Matrix',
      category: 'cosmetics',
      price: 300,
      tag: 'Studio LUT Theme',
      desc: 'Applies an emerald green cinematic color grade LUT across your SceneSense workspace.'
    },
    {
      id: 'frame_solar_gold',
      name: 'Academy Gold Director Frame',
      category: 'cosmetics',
      price: 500,
      tag: 'Avatar Reel',
      desc: 'Prestigious gold leaf film reel border for celebrated community contributors.'
    },
    {
      id: 'title_archivist',
      name: 'Screen Credit: [CHIEF ARCHIVIST]',
      category: 'cosmetics',
      price: 250,
      tag: 'Opening Credit',
      desc: 'Exclusive credit for cinephiles preserving and cataloging classic releases.'
    },
    {
      id: 'chat_gold_glow',
      name: 'Marquee Neon Glow',
      category: 'cosmetics',
      price: 400,
      tag: 'Credit Styling',
      desc: 'Highlights your username with a theater marquee glow in community discussions.'
    },

    // 2. INTEL & SCREENPLAY OVERCLOCKS
    {
      id: 'oracle_boost_5',
      name: '5x CineMind Script Canisters',
      category: 'intel',
      price: 75,
      tag: 'Screenplay AI Fuel',
      desc: 'Unlocks in-depth thematic motif breakdowns, script subtext, and director commentary.'
    },
    {
      id: 'hidden_gem_scanner',
      name: 'Midnight Cult Cinema Lens',
      category: 'intel',
      price: 200,
      tag: 'CineMind Filter',
      desc: 'Reveals highly rated hidden gems and obscure festival titles with under 5,000 ratings.'
    },
    {
      id: 'director_retrospective',
      name: 'Auteur Filmography Reel',
      category: 'intel',
      price: 350,
      tag: 'Studio Archives',
      desc: 'Generates instant chronological box-office, budget, and thematic retrospectives for any director.'
    },
    {
      id: 'stream_radar_ping',
      name: 'Digital Distribution Ping',
      category: 'intel',
      price: 150,
      tag: 'Streaming Alert',
      desc: 'Get notified immediately when a theater-exclusive film hits SVOD streaming services.'
    },

    // 3. PRODUCTION & GEAR
    {
      id: 'radar_expander_25',
      name: 'Screening Deck Expansion (+25)',
      category: 'production',
      price: 200,
      tag: 'Studio Capacity',
      desc: 'Expands your screening watchlist to monitor an additional 25 upcoming releases.'
    },
    {
      id: 'radar_expander_50',
      name: 'Soundstage Watchlist Expansion (+50)',
      category: 'production',
      price: 350,
      tag: 'Studio Capacity',
      desc: 'Maximum screening capacity, adding 50 extra slots to your active film radar.'
    },
    {
      id: 'studio_filter_module',
      name: 'Boutique Studio Lens',
      category: 'production',
      price: 250,
      tag: 'Catalog Tool',
      desc: 'Filter directly by beloved boutique distributors: A24, Neon, Criterion, and Toho.'
    },
    {
      id: 'watchlist_data_export',
      name: 'Production Log Export',
      category: 'production',
      price: 100,
      tag: 'Data Archive',
      desc: 'Export your complete watchlist, reviews, and watch dates into clean CSV or JSON format.'
    },
    {
      id: 'custom_dispatch_foil',
      name: 'Holographic Festival Laurel Foil',
      category: 'production',
      price: 450,
      tag: 'Review Card Skin',
      desc: 'Adds shimmering holographic foil laurels to all your published community reviews.'
    },

    // 4. BROADCAST & PREMIERES
    {
      id: 'comms_broadcast_beacon',
      name: 'Director Spotlight Megaphone',
      category: 'broadcast',
      price: 300,
      tag: 'Lobby Marquee',
      desc: 'Pin a chosen film recommendation to the header of Community Chat for 2 hours.'
    },
    {
      id: 'tactical_emoji_pack',
      name: 'Cinema Popcorn & Film Reel Emojis',
      category: 'broadcast',
      price: 120,
      tag: 'Community Emotes',
      desc: 'Unlocks 12 retro cinema reaction stickers in live lobby discussions.'
    },
    {
      id: 'pinned_dispatch_token',
      name: 'Opening Night Critic Pin',
      category: 'broadcast',
      price: 400,
      tag: 'Featured Review',
      desc: 'Pin your personal review to the top of any movie detail page for 7 full days.'
    }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const rawCoins = data.coins ?? 385;
            const validCoins = Math.max(0, rawCoins);
            setCoins(validCoins);
            setUnlockedItems(data.inventory || []);
            setEquippedFrame(data.equippedFrame || null);
            setEquippedTitle(data.equippedTitle || null);

            if (rawCoins < 0) {
              await updateDoc(doc(db, 'users', currentUser.uid), { coins: validCoins });
            }
          }
        } catch (err) {
          console.error("Failed to load prop department data:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleResetTestBalance = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { coins: 550 }, { merge: true });
      setCoins(550);
      setPurchaseStatus({ type: 'success', msg: 'Studio grant funded: 550 Coins deposited.' });
      setTimeout(() => setPurchaseStatus(null), 3000);
    } catch (err) {
      console.error("Failed to reset coins:", err);
    }
  };

  const handlePurchase = async (item) => {
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

      setCoins(prev => Math.max(0, prev - item.price));
      setUnlockedItems(updatedInventory);
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
    const field = isFrame ? 'equippedFrame' : isTitle ? 'equippedTitle' : null;
    if (!field) return;

    const currentVal = isFrame ? equippedFrame : equippedTitle;
    const nextVal = currentVal === item.id ? null : item.id;

    try {
      await updateDoc(doc(db, 'users', user.uid), { [field]: nextVal });
      if (isFrame) setEquippedFrame(nextVal);
      if (isTitle) setEquippedTitle(nextVal);

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
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-amber-400 uppercase tracking-widest">Opening The Prop Department...</span>
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
              Studio Commissary • Exchange Studio Coins for custom film credits, review foils, and screening tools
            </p>
          </div>
        </div>

        {/* Live Coin Wallet Display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-[#0e0e18] border border-amber-500/30 px-5 py-2.5 rounded-2xl shadow-lg">
            <span className="text-xl">🪙</span>
            <div>
              <span className="text-[10px] font-mono uppercase text-gray-400 block leading-none">Studio Balance</span>
              <span className="text-xl font-black text-amber-400 leading-tight">{coins} Coins</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetTestBalance}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold rounded-xl transition-all cursor-pointer"
            title="Recharge test coins"
          >
            + Grant 550
          </button>
        </div>
      </div>

      {/* STATUS BANNER */}
      {purchaseStatus && (
        <div className={`p-4 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between transition-all ${
          purchaseStatus.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
            : 'bg-red-950/80 border-red-500/50 text-red-300'
        }`}>
          <span>{purchaseStatus.msg}</span>
          <button onClick={() => setPurchaseStatus(null)} className="text-sm opacity-60 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* CATEGORY TABS */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-4 overflow-x-auto scrollbar-none">
        {[
          { id: 'cosmetics', label: '🎬 Screen Credits & Frames' },
          { id: 'intel', label: '🧠 Screenplay AI & Lenses' },
          { id: 'production', label: '📽️ Production Tools' },
          { id: 'broadcast', label: '📢 Premieres & Marquee' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black border border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-[#0e0e16] text-gray-400 hover:text-white border border-amber-500/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ITEMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {filteredItems.map((item) => {
          const isOwned = unlockedItems.includes(item.id);
          const canAfford = coins >= item.price;
          const isFrame = item.id.startsWith('frame_');
          const isTitle = item.id.startsWith('title_');
          const isEquippable = isFrame || isTitle;
          const isEquipped = isFrame ? equippedFrame === item.id : isTitle ? equippedTitle === item.id : false;

          return (
            <div
              key={item.id}
              className={`bg-[#0b0b14] border rounded-3xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-lg relative ${
                isEquipped
                  ? 'border-cyan-400/80 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : isOwned
                    ? 'border-emerald-500/40 bg-[#06100c]/50'
                    : 'border-amber-500/20 hover:border-amber-400/60 hover:-translate-y-1'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  {/* Dynamic Visual Box instead of emoji */}
                  {renderItemPreview(item.id)}

                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                    {item.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{item.name}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-light mt-1">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-base font-black text-amber-400">{item.price}</span>
                  <span className="text-xs text-gray-400">Coins</span>
                </div>

                {isOwned ? (
                  isEquippable ? (
                    <button
                      type="button"
                      onClick={() => handleToggleEquipFromShop(item)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                        isEquipped
                          ? 'bg-cyan-500 text-black shadow-md hover:bg-cyan-400'
                          : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:border-cyan-400'
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
                    disabled={!canAfford}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-md shadow-amber-500/20 cursor-pointer'
                        : 'bg-[#141420] border border-white/10 text-gray-500 cursor-not-allowed opacity-60'
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