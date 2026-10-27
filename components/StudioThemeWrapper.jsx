// File: components/StudioThemeWrapper.jsx
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function StudioThemeWrapper({ children }) {
  // Initialize with fast client storage cache to prevent FOUC
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('scenesense_equipped_theme') || 'theme_default';
      } catch {
        return 'theme_default';
      }
    }
    return 'theme_default';
  });

  useEffect(() => {
    if (!auth) return;

    let unsubDoc = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubDoc();
      if (user && db) {
        const userRef = doc(db, 'users', user.uid);
        unsubDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const equipped = snap.data()?.equippedTheme || 'theme_default';
            setActiveTheme(equipped);
            try {
              localStorage.setItem('scenesense_equipped_theme', equipped);
            } catch {}
          }
        }, (err) => {
          console.warn("Theme synchronization notice:", err);
        });
      } else {
        // Fallback for guest sessions
        try {
          const cached = localStorage.getItem('scenesense_equipped_theme');
          if (cached) setActiveTheme(cached);
        } catch {}
      }
    });

    return () => {
      unsubAuth();
      unsubDoc();
    };
  }, []);

  // Sync document root attribute for CSS variable cascading
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = activeTheme;
    }
  }, [activeTheme]);

  // Resolve theme token classes & selection tints
  const getThemeConfig = (themeKey) => {
    switch (themeKey) {
      case 'theme_matrix_emerald':
        return {
          wrapperClass: 'theme-matrix selection:bg-emerald-500/30 selection:text-emerald-200',
          haloClass: 'bg-gradient-to-tr from-emerald-950/80 via-emerald-600/20 to-teal-500/20',
          accentBorder: 'border-emerald-500/30'
        };
      case 'theme_solar_gold':
        return {
          wrapperClass: 'theme-solar selection:bg-amber-400/30 selection:text-amber-200',
          haloClass: 'bg-gradient-to-tr from-amber-950/80 via-amber-600/20 to-yellow-500/20',
          accentBorder: 'border-amber-500/30'
        };
      case 'theme_monochrome_noir':
        return {
          wrapperClass: 'theme-noir grayscale-[0.35] selection:bg-white/20 selection:text-white',
          haloClass: 'bg-gradient-to-tr from-zinc-950 via-slate-700/20 to-zinc-500/10',
          accentBorder: 'border-zinc-500/30'
        };
      case 'theme_blood_cinema':
        return {
          wrapperClass: 'theme-crimson selection:bg-rose-600/30 selection:text-rose-200',
          haloClass: 'bg-gradient-to-tr from-rose-950/80 via-red-600/20 to-orange-500/15',
          accentBorder: 'border-rose-500/30'
        };
      default:
        // Default Cyan-Noir Command Aesthetic
        return {
          wrapperClass: 'theme-default selection:bg-cyan-500/30 selection:text-cyan-200',
          haloClass: 'bg-gradient-to-tr from-cyan-950/60 via-sky-600/20 to-indigo-500/20',
          accentBorder: 'border-cyan-500/25'
        };
    }
  };

  const themeConfig = getThemeConfig(activeTheme);

  return (
    <div className={`min-h-screen flex flex-col relative transition-colors duration-700 bg-[#050508] ${themeConfig.wrapperClass}`}>
      
      {/* Hardware-Accelerated Dynamic Ambient Studio Halo */}
      <div 
        aria-hidden="true" 
        className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-35 select-none"
      >
        <div 
          className={`w-[1100px] h-[650px] blur-[150px] rounded-full transform-gpu -translate-y-40 transition-all duration-1000 will-change-transform ${themeConfig.haloClass}`}
        />
        
        {/* Subtle Ambient Counter-Glow */}
        <div 
          className="absolute bottom-0 right-1/4 w-[600px] h-[400px] blur-[130px] rounded-full transform-gpu bg-cyan-950/20 pointer-events-none"
        />
      </div>

      {/* Main App Content Viewport */}
      <div className="relative z-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}