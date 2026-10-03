"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import LoginButton from "./LoginButton";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const navLinks = [
    { href: "/", label: "Core Scanner", subtitle: "Return to the Main Uplink" },
    { href: "/profile", label: "Command Center", subtitle: "Operative Dashboard & Transmission Logs" },
    { href: "/where", label: "Radar", subtitle: "Target Acquisition & Streaming Intel" },
    { href: "/chat", label: "Global Comms", subtitle: "Secure Terminal Lounge" },
    { href: "/mood", label: "The Oracle", subtitle: "Neural Link & Trajectory Prediction" },
    { href: "/analyze", label: "Data Logs", subtitle: "System Telemetry & Analytics" }
  ];

  return (
    <>
      {/* Sleek Cinematic Header */}
      <header className="sticky top-0 left-0 w-full z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 px-6 py-4 md:px-12 flex justify-between items-center shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        
        {/* Studio Logo Branding */}
        <Link href="/" className="flex items-center gap-3.5 group focus:outline-none">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/15 bg-black shadow-[0_0_15px_rgba(220,38,38,0.2)] group-hover:border-red-500 transition-all duration-300">
            <Image 
              src="/image_6cc2b7.jpg" 
              alt="SceneSense Logo" 
              fill 
              sizes="80px"
              quality={100}
              priority={true}
              className="object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-base tracking-[0.2em] uppercase text-white group-hover:text-red-500 transition-colors duration-300 leading-none">
              SceneSense
            </span>
            <span className="text-[9px] font-mono tracking-widest text-gray-400 mt-0.5">
              STUDIO SUITE
            </span>
          </div>
        </Link>

        {/* System Menu Trigger Button */}
        <button 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/60 rounded-xl transition-all duration-300 focus:outline-none group shadow-lg cursor-pointer"
        >
          <span className="text-[10px] text-gray-300 font-bold tracking-[0.25em] uppercase group-hover:text-white transition-colors">
            System Menu
          </span>
          <div className="flex flex-col gap-1 w-4 items-end">
            <span className="w-full h-0.5 bg-red-500 group-hover:w-3 transition-all"></span>
            <span className="w-3 h-0.5 bg-white group-hover:w-full transition-all"></span>
            <span className="w-full h-0.5 bg-red-500 group-hover:w-2 transition-all"></span>
          </div>
        </button>
      </header>

      {/* Ultra-Sleek Fullscreen Overlay Menu */}
      <div 
        className={`fixed inset-0 z-[100] bg-[#030303]/98 backdrop-blur-2xl transition-all duration-500 flex flex-col ${
          isOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-4"
        }`}
      >
        <div className="flex justify-between items-center p-6 md:px-12 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span className="font-mono text-xs tracking-widest uppercase text-gray-400">Navigation Matrix // v2.6</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-950/40 border border-white/10 hover:border-red-500 flex items-center justify-center text-white text-base hover:text-red-400 transition-all duration-300 focus:outline-none cursor-pointer shadow-lg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 md:px-16 max-w-5xl mx-auto w-full gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="group relative py-4 md:py-5 flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex flex-col">
                  <span className={`text-2xl md:text-4xl font-black uppercase tracking-tight transition-all duration-300 ${
                    isActive 
                      ? "text-red-500 translate-x-2 md:translate-x-4 drop-shadow-[0_0_20px_rgba(220,38,38,0.4)]" 
                      : "text-gray-400 group-hover:text-white group-hover:translate-x-2 md:group-hover:translate-x-4"
                  }`}>
                    {link.label}
                  </span>
                  
                  <span className="text-[10px] md:text-xs font-mono uppercase tracking-widest mt-1 text-gray-500 group-hover:text-gray-300 transition-colors md:translate-x-4">
                    {link.subtitle}
                  </span>
                </div>

                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-red-600 rounded-r shadow-[0_0_10px_rgba(220,38,38,0.8)]"></span>
                )}
                
                <span className={`hidden md:block text-2xl font-light transition-all duration-300 ${
                  isActive ? "text-red-500 translate-x-0" : "text-white/0 group-hover:text-white/40 -translate-x-2 group-hover:translate-x-0"
                }`}>
                  ↗
                </span>
              </Link>
            );
          })}
        </div>

        <div className="p-6 md:px-12 border-t border-white/10 flex justify-between items-center bg-black/60">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">
              Secure Studio Uplink Established
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    </>
  );
}