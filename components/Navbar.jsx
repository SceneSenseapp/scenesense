// File: components/Navbar.jsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { useWatchlist } from "@/hooks/useWatchlist";
import LoginButton from "@/components/LoginButton";
import { playTerminalClick, playDeploySweep } from "@/components/utils/sfx";

const Icons = {
  Landing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </svg>
  ),
  Radar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="2" r="2"/>
    </svg>
  ),
  DataLog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M14 2v6h6"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Operative: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  NeuralCore: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <circle cx="12" cy="12" r="5"/>
    </svg>
  ),
  CommLink: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  ),
  Oracle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Forums: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7l-4 4V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2z"/>
    </svg>
  ),
  Leaderboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  ),
  LogoAperture: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 transition-colors duration-500">
      <circle cx="12" cy="12" r="10"/>
      <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94"/>
    </svg>
  )
};

const TIP_TIERS = [
  { amount: 3, label: "$3", perk: "Espresso Boost ☕" },
  { amount: 5, label: "$5", perk: "Popcorn & Soda 🍿" },
  { amount: 10, label: "$10", perk: "Server Upkeep 🚀" },
  { amount: 25, label: "$25", perk: "Studio Patron 🌟" }
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [tipLoading, setTipLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isSupporter, setIsSupporter] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { watchlist } = useWatchlist();

  // Escape key listener for overlays
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsTipModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Clean Stripe return params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tip") === "success") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  // Real-time Auth & Telemetry synchronization
  useEffect(() => {
    if (!auth) return;
    let unsubDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      unsubDoc();

      if (currentUser && db) {
        const userRef = doc(db, "users", currentUser.uid);
        unsubDoc = onSnapshot(
          userRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setUserProfile(data);
              setIsSupporter(Boolean(data?.hasFuelSupporterBadge));
            } else {
              setUserProfile(null);
              setIsSupporter(false);
            }
          },
          (error) => {
            console.error("Operative telemetry sync notice:", error);
          }
        );
      } else {
        setUserProfile(null);
        setIsSupporter(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubDoc();
    };
  }, []);

  const handleSignOut = async () => {
    playTerminalClick();
    try {
      await signOut(auth);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Mainframe disconnect failed:", error);
    }
  };

  const handleSendTip = async () => {
    const finalAmount = customAmount ? parseFloat(customAmount) : tipAmount;
    if (!finalAmount || finalAmount < 1) return;

    setTipLoading(true);
    playDeploySweep();

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: finalAmount, 
          userId: user?.uid || null, 
          userEmail: user?.email || null 
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          window.location.assign(data.url);
          return;
        }
      }

      const fallbackPaymentLink = process.env.NEXT_PUBLIC_STRIPE_TIP_URL;
      if (fallbackPaymentLink) {
        const redirectUrl = user?.uid 
          ? `${fallbackPaymentLink}?client_reference_id=${encodeURIComponent(user.uid)}` 
          : fallbackPaymentLink;
        window.location.assign(redirectUrl);
        return;
      }

      alert("Unable to initiate Stripe tip checkout. Please try again shortly.");
    } catch (error) {
      console.error("Tip processing error:", error);
      const fallbackPaymentLink = process.env.NEXT_PUBLIC_STRIPE_TIP_URL;
      if (fallbackPaymentLink) {
        window.location.assign(fallbackPaymentLink);
      } else {
        alert("Encountered an issue contacting the payment gateway.");
      }
    } finally {
      setTipLoading(false);
    }
  };

  // Scroll locking for overlays
  useEffect(() => {
    if (isOpen || isTipModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, isTipModalOpen]);

  const navLinks = [
    { href: "/", label: "Landing Stage", subtitle: "Main Command Stage & Features", icon: Icons.Landing },
    { href: "/where-to-watch", label: "Where to Watch", subtitle: "Target Acquisition & Streaming Intel", icon: Icons.Radar },
    { href: "/watchlist", label: "Surveillance Radar", subtitle: "Saved Watchlist & Active Telemetry", icon: Icons.Radar },
    { href: "/reviews", label: "Global Reviews", subtitle: "Sector-Wide Operative Intel & Transmissions", icon: Icons.DataLog },
    { href: "/armoury", label: "Prop Department", subtitle: "Studio Commissary, 35mm Borders & Perks", icon: Icons.NeuralCore },
    { href: "/mood", label: "Oracle Nexus", subtitle: "Psychometric Narrative Discovery", icon: Icons.Oracle },
    { href: "/forums", label: "Cinema Forums", subtitle: "Sector Discussion & Narrative Theories", icon: Icons.Forums },
    { href: "/leaderboards", label: "Global Standings", subtitle: "Leaderboard Rankings & XP Accolades", icon: Icons.Leaderboard },
    { href: "/chat", label: "Community Chat", subtitle: "Live Tactical Communications Lounge", icon: Icons.CommLink },
    { href: "/profile", label: "Director Dossier", subtitle: "Agent Profile & Call Sheet Objectives", icon: Icons.Operative }
  ];

  const equippedFrame = userProfile?.equippedFrame;
  const equippedTitle = userProfile?.equippedTitle;
  const userCoins = userProfile?.coins ?? 0;

  const getTitleBadge = (titleId) => {
    switch (titleId) {
      case "title_shadow_operative":
        return "EXECUTIVE PRODUCER";
      case "title_archivist":
        return "CHIEF ARCHIVIST";
      default:
        return "DIRECTOR";
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-16 z-40 bg-[#050508]/90 backdrop-blur-2xl border-b border-cyan-500/25 flex items-center justify-between px-4 md:px-8 shadow-[0_4px_30px_rgba(0,0,0,0.8)] font-sans">
        
        {/* LOGO */}
        <Link 
          href="/" 
          onClick={() => playTerminalClick()}
          className="flex items-center gap-2.5 group cursor-pointer z-50 shrink-0"
        >
          <div className="text-cyan-400 group-hover:rotate-90 transition-transform duration-700 ease-out drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
            {Icons.LogoAperture}
          </div>
          <span className="font-mono font-black text-base sm:text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 uppercase">
            SceneSense
          </span>
        </Link>

        {/* RIGHT HUD CONTROLS */}
        <div className="flex items-center gap-2 sm:gap-3.5 z-50 font-mono">
          
          {/* COMMUNITY TIP JAR BUTTON */}
          <button
            type="button"
            onClick={() => {
              playTerminalClick();
              setIsTipModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#080d1a] border border-amber-400/40 hover:border-amber-300 text-amber-300 hover:text-white transition-all text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.15)] cursor-pointer active:scale-95"
            title="Support SceneSense Infrastructure"
          >
            <span>☕</span>
            <span className="hidden sm:inline">Tip Jar</span>
          </button>

          {/* AUTHENTICATED STATE CONTROLS */}
          {user ? (
            <>
              {/* COIN BALANCE HUD PILL */}
              <Link 
                href="/armoury" 
                onClick={() => playTerminalClick()}
                className="hidden md:flex items-center gap-1.5 bg-[#080d1a] border border-cyan-500/25 hover:border-cyan-400 px-3 py-1 rounded-xl text-xs font-bold text-amber-400 transition-all shadow-inner"
                title="Commissary Credits (Requisition in Armoury)"
              >
                <span>🪙</span>
                <span>{userCoins}</span>
              </Link>

              {/* WATCHLIST RADAR BADGE */}
              <Link 
                href="/watchlist" 
                onClick={() => playTerminalClick()}
                className="flex items-center gap-1.5 text-cyan-300 hover:text-white transition-colors group px-2.5 py-1 rounded-xl bg-[#080d1a] border border-cyan-500/25 hover:border-cyan-400 shadow-sm"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 group-hover:scale-105 transition-transform">
                  <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                  <polyline points="17 2 12 7 7 2"/>
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                  <span className="hidden sm:inline">Radar: </span>{(watchlist || []).length}
                </span>
              </Link>

              <div className="h-5 w-px bg-cyan-500/30 mx-0.5 hidden sm:block" />

              {/* DYNAMIC AVATAR IDENTITY BADGE */}
              <Link 
                href="/profile" 
                onClick={() => playTerminalClick()}
                className="relative group cursor-pointer shrink-0" 
                title={equippedTitle ? `${user.displayName || 'Director'} [${getTitleBadge(equippedTitle)}]` : (user.displayName || "Operative Dossier")}
              >
                <div 
                  className={`absolute -inset-1 rounded-full blur-[4px] transition-all duration-500 pointer-events-none ${
                    equippedFrame === 'frame_solar_gold'
                      ? 'bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 opacity-90 animate-pulse'
                      : equippedFrame === 'frame_neon_cyan'
                        ? 'bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500 opacity-95 animate-pulse'
                        : isSupporter
                          ? 'bg-amber-400/80 opacity-80 animate-pulse'
                          : 'opacity-0'
                  }`}
                />

                <div className={`relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${
                  equippedFrame === 'frame_solar_gold'
                    ? 'border-2 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.9)] bg-[#151105]'
                    : equippedFrame === 'frame_neon_cyan'
                      ? 'border-2 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.9)] bg-[#070d18]'
                      : isSupporter 
                        ? 'border-2 border-amber-400 bg-amber-950/50 shadow-[0_0_12px_rgba(251,191,36,0.8)]' 
                        : 'border-2 border-cyan-500/60 bg-[#080d1a] hover:border-cyan-400'
                }`}>
                  {user.photoURL && !imageError ? (
                    <Image 
                      src={user.photoURL} 
                      alt="Operative" 
                      fill 
                      unoptimized 
                      sizes="32px" 
                      className="object-cover" 
                      onError={() => setImageError(true)} 
                    />
                  ) : (
                    <span className={`text-xs font-black ${
                      equippedFrame === 'frame_solar_gold' || isSupporter 
                        ? 'text-amber-300' 
                        : 'text-cyan-300'
                    }`}>
                      {user.displayName?.charAt(0)?.toUpperCase() || 'O'}
                    </span>
                  )}

                  <span 
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                      equippedFrame === 'frame_solar_gold' || isSupporter
                        ? 'bg-amber-300 shadow-[0_0_6px_#fde047]'
                        : equippedFrame === 'frame_neon_cyan'
                          ? 'bg-cyan-300 shadow-[0_0_6px_#67e8f9]'
                          : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                    }`} 
                  />
                </div>
              </Link>
            </>
          ) : (
            /* UNAUTHENTICATED GUEST LOGIN BUTTON */
            <LoginButton variant="compact" />
          )}

          {/* TELEMETRY MENU TOGGLE */}
          <button
            type="button"
            onClick={() => {
              playTerminalClick();
              setIsOpen(true);
            }}
            className="h-8 px-3 rounded-xl bg-[#080d1a] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Open Studio Navigation Menu"
          >
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">Menu</span>
            <div className="flex flex-col gap-1 w-3.5 items-end">
              <span className="w-full h-[1.5px] bg-cyan-400 rounded-full" />
              <span className="w-2.5 h-[1.5px] bg-cyan-400 rounded-full" />
              <span className="w-full h-[1.5px] bg-cyan-400 rounded-full" />
            </div>
          </button>
        </div>
      </header>
      <div className="h-16 w-full shrink-0" />

      {/* COMMUNITY TIP JAR MODAL */}
      {isTipModalOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-fade-in font-sans"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            playTerminalClick();
            setIsTipModalOpen(false);
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#080d1a] border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_70px_rgba(245,158,11,0.25)] text-center space-y-6 overflow-hidden"
          >
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

            <button 
              type="button"
              onClick={() => {
                playTerminalClick();
                setIsTipModalOpen(false);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#050811] border border-white/20 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer transition-colors font-mono"
            >
              ✕
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-950/80 border border-amber-400/80 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                ☕
              </div>
              <span className="text-[10px] font-mono tracking-widest text-amber-400 font-bold uppercase block">
                COMMUNITY FUEL
              </span>
              <h3 className="text-2xl font-black uppercase text-white font-mono tracking-tight">
                Studio Tip Jar
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed font-light">
                SceneSense is 100% free and non-commercial[cite: 20, 25]. Voluntary tips help offset hosting bills, domain costs, and satellite discovery feeds.
              </p>
            </div>

            {/* PRESET TIERS */}
            <div className="grid grid-cols-2 gap-2.5">
              {TIP_TIERS.map((tier) => (
                <button
                  key={tier.amount}
                  type="button"
                  onClick={() => {
                    playTerminalClick();
                    setTipAmount(tier.amount);
                    setCustomAmount("");
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    tipAmount === tier.amount && !customAmount
                      ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-[1.02]"
                      : "bg-[#050811] border-cyan-500/20 text-slate-300 hover:border-amber-400/50 hover:text-white"
                  }`}
                >
                  <span className="font-mono font-bold text-sm">{tier.label}</span>
                  <span className="text-[10px] font-mono font-medium opacity-80 mt-0.5">{tier.perk}</span>
                </button>
              ))}
            </div>

            {/* CUSTOM AMOUNT INPUT */}
            <div className="space-y-1">
              <div className="relative font-mono">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Custom amount (USD)..."
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setTipAmount(0);
                  }}
                  className="w-full bg-[#050811] border border-cyan-500/25 focus:border-amber-400 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors shadow-inner"
                />
              </div>
            </div>

            {/* CHECKOUT SUBMISSION */}
            <button
              type="button"
              onClick={handleSendTip}
              disabled={tipLoading || (!customAmount && !tipAmount)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-90 disabled:opacity-40 text-black font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer text-xs flex items-center justify-center gap-2 active:scale-95"
            >
              {tipLoading ? (
                <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                `Fuel Platform via Stripe ($${customAmount || tipAmount})`
              )}
            </button>

            {/* STATUTORY TMDB & LEGAL SAFEGUARD */}
            <div className="border-t border-cyan-500/15 pt-3">
              <span className="text-[10px] font-mono text-slate-400 block leading-tight">
                Tips are voluntary gifts to assist operational server costs. Tips do not grant exclusive streaming access or purchase data[cite: 25]. Uses the TMDB API under non-commercial fair terms[cite: 20, 25].
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN COMMAND HUB OVERLAY */}
      <div 
        className={`fixed inset-0 z-[100] bg-[#050508]/95 backdrop-blur-3xl transition-all duration-500 flex flex-col overflow-hidden font-sans ${
          isOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-4"
        }`}
      >
        <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/40 via-indigo-950/20 to-[#050508]" />
          <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.08]" />
        </div>

        <div className="relative z-10 flex justify-between items-center p-6 md:px-12 border-b border-cyan-500/25 bg-[#080d1a]/90 backdrop-blur-md shrink-0">
          <div className="flex flex-col font-mono">
            <span className="text-[10px] tracking-widest text-cyan-400 font-bold uppercase">
              SCENESENSE STUDIO // NAVIGATION
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
              Command Hub
            </h2>
          </div>
          <button 
            type="button"
            onClick={() => {
              playTerminalClick();
              setIsOpen(false);
            }}
            className="w-10 h-10 rounded-full bg-[#050811] hover:bg-rose-950/80 border border-cyan-500/30 hover:border-rose-500/50 flex items-center justify-center text-slate-300 hover:text-rose-300 text-sm cursor-pointer transition-colors shadow-lg font-mono"
            title="Close Menu (Esc)"
          >
            ✕
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto py-8 px-4 sm:px-8 scrollbar-thin scrollbar-thumb-cyan-500/30">
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-3 font-mono">
            {navLinks.map((link) => {
              const isCurrentRoute = pathname === link.href;

              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => {
                    playTerminalClick();
                    setIsOpen(false);
                  }}
                  className={`group relative flex items-center p-4 sm:p-4.5 rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isCurrentRoute 
                      ? "bg-cyan-950/60 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)]" 
                      : "bg-[#080d1a] border-cyan-500/20 hover:border-cyan-400 hover:bg-[#0c1426] shadow-sm"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 mr-4 transition-colors ${
                    isCurrentRoute 
                      ? "bg-cyan-900/60 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.4)]" 
                      : "bg-[#050811] border-cyan-500/30 text-cyan-400 group-hover:border-cyan-400 group-hover:text-cyan-300"
                  }`}>
                    {link.icon}
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-base sm:text-lg font-bold uppercase tracking-wider text-white group-hover:text-cyan-300 transition-colors">
                      {link.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 group-hover:text-cyan-400/80 transition-colors">
                      {link.subtitle}
                    </span>
                  </div>

                  {isCurrentRoute ? (
                    <div className="flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-400 px-3 py-1 rounded-full shadow-sm shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-300">Active</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all shrink-0">
                      →
                    </span>
                  )}
                </Link>
              );
            })}

            {/* SESSION TERMINATION BUTTON IN MENU (IF AUTHENTICATED) */}
            {user && (
              <div className="pt-4 border-t border-cyan-500/15 flex justify-end">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-5 py-2.5 bg-[#050811] hover:bg-rose-950/70 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
                >
                  Terminate Active Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}