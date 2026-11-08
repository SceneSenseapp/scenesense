// File: components/Navbar.jsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  useStudioSession,
  STUDIO_LUTS,
  STREAMING_REGIONS,
} from "@/components/StudioSessionProvider";
import { openCineMind } from "@/components/CineMindModal";
import { formatDirectorTitle } from "@/lib/reward-visuals";

const TIP_TIERS = [
  { amount: 3, label: "$3", perk: "Espresso Boost" },
  { amount: 5, label: "$5", perk: "Screening Snacks" },
  { amount: 10, label: "$10", perk: "Server Relay" },
  { amount: 25, label: "$25", perk: "Studio Patron" },
];

const PRIMARY_NAV = [
  { href: "/", label: "Discover" },
  { href: "/where-to-watch", label: "Radar" },
  { href: "/analyze", label: "Scene AI" },
  { href: "/arcade", label: "Arcade" },
  { href: "/chat", label: "Watch Party" },
  { href: "/reviews", label: "Reviews" },
];

const STUDIO_SUITE_LINKS = [
  {
    href: "/arcade",
    label: "Daily Spin & PvP Arcade",
    desc: "Daily wheel, spin shop, 4 cinema games & player challenges",
  },
  {
    href: "/quests",
    label: "Quests & 50-Tier Pass",
    desc: "Daily bounties, streaks & season progression",
  },
  {
    href: "/leaderboards",
    label: "Critic Leaderboards",
    desc: "Global rankings, 1-click player challenges & factions",
  },
  {
    href: "/watchlist?swipeSession=PARTY",
    label: "Movie Night Matcher",
    desc: "Real-time collaborative swipe matching",
  },
  {
    href: "/forums",
    label: "Cinema Forums",
    desc: "Deep-dive threads & film theory",
  },
  {
    href: "/armoury",
    label: "The Armoury Shop",
    desc: "Frames, titles & Studio LUT grades",
  },
  {
    href: "/dashboard",
    label: "System & API Telemetry",
    desc: "Live integration health & vault metrics",
  },
];

function getFrameGlowClass(equippedFrame, isSupporter) {
  switch (equippedFrame) {
    case "frame_solar_gold":
    case "frame_oscar_laurel":
      return "bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 opacity-90";
    case "frame_neon_cyan":
    case "frame_hologram_prism":
      return "bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500 opacity-90";
    case "frame_quantum_amethyst":
      return "bg-gradient-to-tr from-violet-500 via-fuchsia-400 to-pink-500 opacity-90";
    case "frame_matrix_emerald":
      return "bg-gradient-to-tr from-emerald-500 via-green-300 to-teal-500 opacity-90";
    case "frame_crimson_director":
      return "bg-gradient-to-tr from-rose-500 via-red-400 to-orange-500 opacity-90";
    default:
      return isSupporter ? "bg-amber-400/75 opacity-80" : "opacity-0";
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const session = useStudioSession();

  const user = session?.user || null;
  const userProfile = session?.userProfile || null;
  const isSupporter = Boolean(session?.isSupporter);
  const userCoins = session?.coins ?? 100;
  const watchlist = session?.watchlistApi?.watchlist || [];
  const region = session?.region || "US";
  const setRegion = session?.setRegion;
  const activeLut = session?.activeLut || "default";
  const setStudioLut = session?.setStudioLut;
  const openCommandPalette = () => session?.setIsCommandPaletteOpen?.(true);

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSuiteOpen, setIsSuiteOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [tipLoading, setTipLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsSuiteOpen(false);
    setIsProfileOpen(false);
    setIsMobileOpen(false);
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
        setIsTipModalOpen(false);
        setIsSuiteOpen(false);
        setIsProfileOpen(false);
      }
    };
    const handleClickOutside = (e) => {
      if (!e.target.closest?.("[data-dropdown-container]")) {
        setIsSuiteOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isMobileOpen || isTipModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen, isTipModalOpen]);

  const handleSignOut = async () => {
    try {
      await session?.signOutUser?.();
      setIsProfileOpen(false);
      setIsMobileOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Fixed: Posts one-time tips directly to /api/stripe/tip (works for guests & authenticated operatives)
  const handleSendTip = async () => {
    const finalAmount = customAmount ? parseFloat(customAmount) : tipAmount;
    if (!finalAmount || finalAmount < 1) return;

    setTipLoading(true);
    try {
      const res = await fetch("/api/stripe/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          userId: user?.uid || null,
          userEmail: user?.email || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
        window.location.assign(data.url);
        return;
      }

      const fallbackPaymentLink = process.env.NEXT_PUBLIC_STRIPE_TIP_URL;
      if (fallbackPaymentLink) {
        const redirectUrl = user?.uid
          ? `${fallbackPaymentLink}?client_reference_id=${encodeURIComponent(user.uid)}`
          : fallbackPaymentLink;
        window.location.assign(redirectUrl);
        return;
      }

      toast.error(data?.error || "Unable to initiate Stripe tip checkout.");
    } catch {
      const fallbackPaymentLink = process.env.NEXT_PUBLIC_STRIPE_TIP_URL;
      if (fallbackPaymentLink) {
        window.location.assign(fallbackPaymentLink);
      } else {
        toast.error("Unable to reach the Stripe payment gateway.");
      }
    } finally {
      setTipLoading(false);
    }
  };

  const equippedFrame = userProfile?.equippedFrame;
  const equippedTitle = userProfile?.equippedTitle;
  const avatarSrc = userProfile?.avatarUrl || user?.photoURL || null;

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-16 z-40 bg-[#050812]/85 backdrop-blur-2xl border-b border-white/10 flex items-center justify-between px-4 lg:px-8 font-sans">
        {/* LEFT: Brand + Primary Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="text-cyan-400 group-hover:text-emerald-300 group-hover:rotate-90 transition-all duration-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-6 h-6"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-wider text-white uppercase">
              SceneSense
            </span>
          </Link>

          {/* Clean Primary Nav Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            {PRIMARY_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-white/[0.09] text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Studio Suite Dropdown */}
            <div className="relative" data-dropdown-container>
              <button
                type="button"
                onClick={() => {
                  setIsSuiteOpen((p) => !p);
                  setIsProfileOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSuiteOpen
                    ? "bg-white/[0.09] text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <span>Studio</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-3.5 h-3.5 transition-transform ${
                    isSuiteOpen ? "rotate-180" : ""
                  }`}
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isSuiteOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-[#090e1c]/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-2 z-50 space-y-0.5 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400 border-b border-white/10 mb-1">
                    Studio Modules
                  </div>
                  {STUDIO_SUITE_LINKS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSuiteOpen(false)}
                      className="block px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="text-xs font-semibold text-white">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Quick Search (Cmd+K), Region, CineMind, Auth/Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Cmd+K Omnibar Trigger */}
          <button
            type="button"
            onClick={openCommandPalette}
            className="flex items-center gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200 transition-all text-xs cursor-pointer"
            title="Search films, cast & tools (Ctrl+K / Cmd+K)"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-3.5 h-3.5 text-cyan-400 shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <span className="hidden md:inline text-xs text-slate-400">
              Search...
            </span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] font-mono text-slate-300">
              ⌘K
            </kbd>
          </button>

          {/* Global Region Selector (Desktop) */}
          <select
            value={region}
            onChange={(e) => setRegion?.(e.target.value)}
            aria-label="Streaming Region"
            title="Active Streaming Region"
            className="hidden xl:block bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] font-mono font-semibold text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {STREAMING_REGIONS.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#090e1c] text-white">
                {r.id}
              </option>
            ))}
          </select>

          {/* CineMind AI Button */}
          <button
            type="button"
            onClick={() => openCineMind(null)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 hover:from-violet-500/30 hover:to-cyan-500/30 border border-violet-400/35 hover:border-cyan-300/60 text-slate-100 transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            title="Open CineMind AI Assistant"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">CineMind</span>
            <span className="sm:hidden font-mono text-[11px]">AI</span>
          </button>

          {user ? (
            <div className="relative" data-dropdown-container>
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen((p) => !p);
                  setIsSuiteOpen(false);
                }}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 transition-all cursor-pointer"
              >
                <div className="relative shrink-0">
                  <div
                    className={`absolute -inset-0.5 rounded-full blur-[3px] pointer-events-none ${getFrameGlowClass(
                      equippedFrame,
                      isSupporter
                    )}`}
                  />
                  <div className="relative w-7 h-7 rounded-full overflow-hidden flex items-center justify-center border border-white/20 bg-slate-900">
                    {avatarSrc && !imageError && !avatarSrc.startsWith("data:") ? (
                      <Image
                        src={avatarSrc}
                        alt=""
                        fill
                        unoptimized
                        sizes="28px"
                        className="object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : avatarSrc && avatarSrc.startsWith("data:") ? (
                      <Image
                        src={avatarSrc}
                        alt=""
                        width={28}
                        height={28}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-cyan-300">
                        {user.displayName?.charAt(0)?.toUpperCase() || "D"}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-amber-300 hidden sm:inline">
                  {Number(userCoins).toLocaleString()}
                </span>
              </button>

              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-2 w-68 rounded-2xl bg-[#090e1c]/95 backdrop-blur-2xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.85)] p-2 z-50 space-y-1 animate-fadeIn">
                  <div className="px-3 py-2.5 border-b border-white/10">
                    <div className="text-xs font-semibold text-white truncate">
                      {userProfile?.displayName || user.displayName || "Studio Director"}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-300 mt-0.5">
                      {formatDirectorTitle(equippedTitle)} •{" "}
                      {Number(userCoins).toLocaleString()} credits
                    </div>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] text-slate-200 text-xs transition-colors"
                  >
                    <span>Profile &amp; Studio Identity</span>
                  </Link>

                  <Link
                    href="/watchlist"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] text-slate-200 text-xs transition-colors"
                  >
                    <span>My Watchlist Vault</span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                      {watchlist.length}
                    </span>
                  </Link>

                  <Link
                    href="/dashboard"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] text-slate-200 text-xs transition-colors"
                  >
                    <span>Telemetry &amp; Integrations</span>
                  </Link>

                  <Link
                    href="/arcade"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] text-amber-200 text-xs transition-colors"
                  >
                    <span>Daily Spin &amp; PvP Arcade</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                      PLAY
                    </span>
                  </Link>

                  <Link
                    href="/armoury"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.06] text-slate-200 text-xs transition-colors"
                  >
                    <span>The Armoury Shop</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsTipModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-500/10 text-amber-200 text-xs transition-colors cursor-pointer"
                  >
                    Support Studio (Tip Jar)
                  </button>

                  {/* Quick Color Grade LUT Selector */}
                  <div className="px-3 py-2 border-t border-white/10">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      Studio Color LUT
                    </div>
                    <div className="flex items-center gap-2">
                      {STUDIO_LUTS.map((lut) => (
                        <button
                          key={lut.id}
                          type="button"
                          onClick={() => setStudioLut?.(lut.id)}
                          title={lut.label}
                          className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                            activeLut === lut.id
                              ? "ring-2 ring-white scale-110"
                              : "opacity-65 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: lut.swatch }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/15 text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTipModalOpen(true)}
                className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Tip Jar
              </button>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 text-xs font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:opacity-95 text-slate-950 text-xs font-semibold transition-opacity"
              >
                Join Free
              </Link>
            </div>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open Studio Navigation"
            className="lg:hidden h-9 w-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-slate-200 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>
      <div className="h-16 w-full shrink-0" />

      {/* COMMUNITY TIP JAR MODAL (Wired to /api/stripe/tip) */}
      {isTipModalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn font-sans"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsTipModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md studio-panel-accent rounded-3xl p-6 sm:p-8 text-center space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsTipModalOpen(false)}
              aria-label="Close Tip Jar Modal"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-mono tracking-widest text-amber-300 font-semibold uppercase">
                Community Support
              </span>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                SceneSense Tip Jar
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tips help fund server hosting and AI model inference. Signed-in supporters also unlock the Patron Gold frame and bonus studio credits.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {TIP_TIERS.map((tier) => (
                <button
                  key={tier.amount}
                  type="button"
                  onClick={() => {
                    setTipAmount(tier.amount);
                    setCustomAmount("");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    tipAmount === tier.amount && !customAmount
                      ? "bg-amber-400 text-slate-950 border-amber-300 font-semibold"
                      : "bg-white/[0.04] border-white/10 text-slate-300 hover:border-amber-400/40"
                  }`}
                >
                  <div className="font-mono font-bold text-sm">{tier.label}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">{tier.perk}</div>
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
                $
              </span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Custom amount (USD)"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setTipAmount(0);
                }}
                className="w-full bg-white/[0.04] border border-white/15 focus:border-amber-400 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleSendTip}
              disabled={tipLoading || (!customAmount && !tipAmount)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:opacity-95 disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider rounded-xl transition-opacity cursor-pointer text-xs flex items-center justify-center gap-2"
            >
              {tipLoading ? (
                <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                `Continue with Stripe ($${customAmount || tipAmount})`
              )}
            </button>

            <p className="text-[10px] text-slate-500 leading-relaxed">
              Voluntary support contribution processed securely via Stripe. SceneSense uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
          </div>
        </div>
      )}

      {/* RESPONSIVE MOBILE DRAWER */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[140] bg-[#04060d]/95 backdrop-blur-2xl flex flex-col animate-fadeIn lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
            <span className="font-bold text-sm uppercase tracking-wider text-white">
              SceneSense Navigation
            </span>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close Menu"
              className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Region + LUT Controls */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">Region:</span>
                <select
                  value={region}
                  onChange={(e) => setRegion?.(e.target.value)}
                  className="bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-xs font-mono text-white"
                >
                  {STREAMING_REGIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.id} — {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                {STUDIO_LUTS.map((lut) => (
                  <button
                    key={lut.id}
                    type="button"
                    onClick={() => setStudioLut?.(lut.id)}
                    className={`w-4 h-4 rounded-full ${
                      activeLut === lut.id ? "ring-2 ring-white" : "opacity-65"
                    }`}
                    style={{ backgroundColor: lut.swatch }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                Core Destinations
              </div>
              {[...PRIMARY_NAV, ...STUDIO_SUITE_LINKS].map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`block px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-200 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div>{link.label}</div>
                    {link.desc && (
                      <div className="text-[11px] text-slate-400 font-normal">
                        {link.desc}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsMobileOpen(false);
                  setIsTipModalOpen(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-semibold cursor-pointer"
              >
                Support Tip Jar
              </button>
              {!user && (
                <Link
                  href="/signup"
                  onClick={() => setIsMobileOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 text-xs font-bold text-center"
                >
                  Create Free Account
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
