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

const Icons = {
  Landing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </svg>
  ),
  Radar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="2" r="2"/>
    </svg>
  ),
  DataLog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M14 2v6h6"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Operative: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  NeuralCore: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      <circle cx="12" cy="12" r="5"/>
    </svg>
  ),
  CommLink: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
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

  // Escape Key dismissal
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

  // Real-time Auth & Telemetry sync
  useEffect(() => {
    let unsubDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      unsubDoc();

      if (currentUser) {
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
            console.error("Operative telemetry sync failed:", error);
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
        alert("Encountered an issue contacting the Stripe gateway.");
      }
    } finally {
      setTipLoading(false);
    }
  };

  // Viewport scroll locking
  useEffect(() => {
    if (isOpen || isTipModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, isTipModalOpen]);

  const navLinks = [
    { href: "/", label: "Landing Page", subtitle: "Return to the Main Uplink", icon: Icons.Landing },
    { href: "/where-to-watch", label: "Where to Watch", subtitle: "Target Acquisition & Streaming Intel", icon: Icons.Radar },
    { href: "/reviews", label: "Global Reviews", subtitle: "Sector-Wide Operative Intel & Transmissions", icon: Icons.DataLog },
    { href: "/profile", label: "Operative Profile", subtitle: "Agent Dossier & Neural Credentials", icon: Icons.Operative },
    { href: "/armoury", label: "The Prop Department", subtitle: "Studio Commissary & Production Perks", icon: Icons.NeuralCore },
    { href: "/chat", label: "Community Chat", subtitle: "Live Tactical Operative Uplink", icon: Icons.CommLink }
  ];

  if (!user) {
    return null;
  }

  const equippedFrame = userProfile?.equippedFrame;
  const equippedTitle = userProfile?.equippedTitle;

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
      <nav className="fixed top-0 left-0 w-full h-16 z-40 bg-[#0b1120]/80 backdrop-blur-xl border-b border-cyan-500/40 flex items-center justify-between px-4 md:px-8 shadow-[0_4px_30px_rgba(0,0,0,0.5)] font-sans">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2.5 group cursor-pointer z-50 shrink-0">
          <div className="text-cyan-400 group-hover:text-emerald-400 group-hover:rotate-90 transition-all duration-700 ease-in-out drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
            {Icons.LogoAperture}
          </div>
          <span className="hidden sm:inline font-black text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-500 uppercase">
            SceneSense
          </span>
        </Link>

        {/* RIGHT CONTROLS */}
        <div className="flex items-center gap-2.5 sm:gap-4 z-50">
          
          {/* COMMUNITY TIP JAR BUTTON */}
          <button
            type="button"
            onClick={() => setIsTipModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-400/60 hover:border-amber-300 text-amber-300 hover:text-white transition-all text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer hover:scale-[1.02]"
          >
            <span className="text-xs">☕</span>
            <span>Tip Jar</span>
          </button>

          {/* WATCHLIST LINK */}
          <Link href="/watchlist" className="flex items-center gap-2 text-cyan-300 hover:text-emerald-400 transition-colors group">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 group-hover:scale-110 transition-transform">
              <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
              <polyline points="17 2 12 7 7 2"/>
            </svg>
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest bg-cyan-950/60 px-2 py-1 rounded-md border border-cyan-500/50">
              Watchlist ({(watchlist || []).length})
            </span>
          </Link>

          <div className="h-6 w-px bg-cyan-500/50 mx-0.5"></div>

          <div className="flex items-center gap-3">
            
            {/* DYNAMIC AVATAR WITH REAL-TIME EQUIPPED FRAME & GLOW */}
            <Link 
              href="/profile" 
              className="relative group cursor-pointer shrink-0" 
              title={equippedTitle ? `${user.displayName || 'Director'} [${getTitleBadge(equippedTitle)}]` : (user.displayName || "Operative Dossier")}
            >
              {/* Outer Ambient Halo matching equipped frame */}
              <div 
                className={`absolute -inset-1 rounded-full blur-[5px] transition-all duration-500 pointer-events-none ${
                  equippedFrame === 'frame_solar_gold'
                    ? 'bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 opacity-90 animate-pulse'
                    : equippedFrame === 'frame_neon_cyan'
                      ? 'bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500 opacity-95 animate-pulse'
                      : isSupporter
                        ? 'bg-amber-400/80 opacity-80 animate-pulse'
                        : 'opacity-0'
                }`}
              />

              {/* Main Avatar Border Box */}
              <div className={`relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 ${
                equippedFrame === 'frame_solar_gold'
                  ? 'border-2 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.9)] ring-1 ring-amber-400/60 bg-[#151105]'
                  : equippedFrame === 'frame_neon_cyan'
                    ? 'border-2 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.9)] ring-1 ring-cyan-400/60 bg-[#070d18]'
                    : isSupporter 
                      ? 'border-2 border-amber-400 bg-amber-950/50 shadow-[0_0_15px_rgba(251,191,36,0.8)]' 
                      : 'border-2 border-cyan-500/60 bg-[#131c31] hover:border-cyan-400'
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

                {/* Status Dot */}
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

            <button 
              type="button"
              onClick={handleSignOut}
              className="hidden sm:block px-3 py-1.5 bg-red-950/60 border border-red-500/50 text-red-300 hover:bg-red-900/80 hover:text-white rounded-lg transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-sm"
            >
              Log Out
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="h-9 px-3 sm:px-4 ml-1 rounded-lg bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 hover:bg-emerald-950/50 hover:border-emerald-500/70 hover:text-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer group shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          >
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Menu</span>
            <div className="flex flex-col gap-1 w-4 items-end">
              <span className="w-full h-[2px] bg-cyan-300 group-hover:bg-emerald-400 rounded-full"></span>
              <span className="w-2.5 h-[2px] bg-cyan-300 group-hover:bg-emerald-400 rounded-full"></span>
              <span className="w-full h-[2px] bg-cyan-300 group-hover:bg-emerald-400 rounded-full"></span>
            </div>
          </button>
        </div>
      </nav>
      <div className="h-16 w-full shrink-0"></div>

      {/* COMMUNITY TIP JAR MODAL */}
      {isTipModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-sans">
          <div className="relative w-full max-w-md bg-[#0b1120] border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.3)] text-center space-y-6 overflow-hidden">
            
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <button 
              type="button"
              onClick={() => setIsTipModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-gray-400 hover:text-white flex items-center justify-center text-sm cursor-pointer transition-colors"
            >
              ✕
            </button>

            <div className="space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/80 border border-amber-400/80 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                ☕
              </div>
              <span className="text-[10px] font-mono tracking-[0.25em] text-amber-400 font-bold uppercase block">
                COMMUNITY SUPPORT
              </span>
              <h3 className="text-2xl font-black uppercase text-white tracking-tight">
                SceneSense Tip Jar
              </h3>
              <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                SceneSense is 100% free and community-driven. If you love finding films here, tips help offset hosting bills and domain costs.
              </p>
            </div>

            {/* PRESET TIERS */}
            <div className="grid grid-cols-2 gap-2.5">
              {TIP_TIERS.map((tier) => (
                <button
                  key={tier.amount}
                  type="button"
                  onClick={() => {
                    setTipAmount(tier.amount);
                    setCustomAmount("");
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    tipAmount === tier.amount && !customAmount
                      ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-[1.02]"
                      : "bg-[#131c31]/80 border-white/10 text-gray-300 hover:border-amber-400/50 hover:text-white"
                  }`}
                >
                  <span className="font-mono font-black text-sm">{tier.label}</span>
                  <span className="text-[10px] font-mono font-medium opacity-80 mt-0.5">{tier.perk}</span>
                </button>
              ))}
            </div>

            {/* CUSTOM AMOUNT INPUT */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Or enter custom tip amount in USD"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setTipAmount(0);
                  }}
                  className="w-full bg-[#131c31]/90 border border-white/20 focus:border-amber-400 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* CHECKOUT SUBMISSION */}
            <button
              type="button"
              onClick={handleSendTip}
              disabled={tipLoading || (!customAmount && !tipAmount)}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-90 disabled:opacity-50 text-black font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer text-xs flex items-center justify-center gap-2"
            >
              {tipLoading ? (
                <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin"></span>
              ) : (
                `Send Tip via Stripe ($${customAmount || tipAmount})`
              )}
            </button>

            {/* STATUTORY TMDB & LEGAL SAFEGUARD */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-mono text-gray-400 block leading-tight">
                Tips are voluntary gifts to help cover web server hosting costs. Tips do not purchase movie data, subscriptions, or exclusive features. SceneSense uses the TMDB API but is not certified or endorsed by TMDB.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay Menu */}
      <div 
        className={`fixed inset-0 z-[100] bg-[#0b1120]/95 backdrop-blur-3xl transition-all duration-500 flex flex-col overflow-hidden ${
          isOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-4"
        }`}
      >
        <div className="absolute inset-0 pointer-events-none z-0 opacity-25">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/40 via-emerald-950/20 to-[#0b1120]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.07]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b1120] via-[#0b1120]/80 to-[#0b1120]/60"></div>
        </div>

        <div className="relative z-10 flex justify-between items-center p-6 md:px-12 border-b border-emerald-500/30 bg-[#131c31]/90 backdrop-blur-md shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] md:text-xs font-mono tracking-[0.25em] text-emerald-400 font-bold uppercase">
              SceneSense Studio Navigation
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
              Command Hub
            </h2>
          </div>
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-12 h-12 rounded-full bg-cyan-900/60 hover:bg-emerald-900/50 border border-cyan-500/50 flex items-center justify-center text-white text-lg cursor-pointer transition-colors shadow-lg"
          >
            ✕
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar py-8 px-4 sm:px-8">
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-3">
            {navLinks.map((link) => {
              const isCurrentRoute = pathname === link.href;

              return (
                <Link 
                  key={link.href} 
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`group relative flex items-center p-4 sm:p-5 rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isCurrentRoute 
                      ? "bg-gradient-to-r from-cyan-950/80 via-emerald-950/30 to-indigo-950/50 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.25)]" 
                      : "bg-[#1e293b]/70 border-cyan-500/30 hover:border-emerald-400/60 hover:bg-[#1e293b]/90 shadow-sm"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 mr-4 sm:mr-6 transition-colors ${
                    isCurrentRoute 
                      ? "bg-[#064e3b]/40 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
                      : "bg-[#0f172a]/90 border-cyan-500/40 text-cyan-300 group-hover:border-emerald-400/60 group-hover:text-emerald-300"
                  }`}>
                    {link.icon}
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-lg sm:text-xl font-black uppercase tracking-wider text-white group-hover:text-cyan-200 transition-colors">
                      {link.label}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-cyan-300 group-hover:text-emerald-300 transition-colors">
                      {link.subtitle}
                    </span>
                  </div>

                  {isCurrentRoute ? (
                    <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-400/70 px-3 py-1 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.3)] shrink-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-300">Active Sector</span>
                    </div>
                  ) : (
                    <span className="text-xl font-bold text-cyan-500 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all shrink-0">
                      →
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}