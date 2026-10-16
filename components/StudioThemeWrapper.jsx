// components/StudioThemeWrapper.jsx
"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function StudioThemeWrapper({ children }) {
  const [activeTheme, setActiveTheme] = useState(null);

  useEffect(() => {
    let unsubDoc = () => {};

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubDoc();
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        unsubDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            setActiveTheme(snap.data()?.equippedTheme || null);
          }
        });
      } else {
        setActiveTheme(null);
      }
    });

    return () => {
      unsubAuth();
      unsubDoc();
    };
  }, []);

  const isEmeraldMatrix = activeTheme === 'theme_matrix_emerald';

  return (
    <div className={`min-h-screen flex flex-col relative transition-colors duration-700 ${
      isEmeraldMatrix ? 'theme-matrix selection:bg-emerald-500/30' : ''
    }`}>
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden opacity-30">
        <div 
          className={`w-[1000px] h-[600px] blur-[140px] rounded-full transform -translate-y-40 transition-all duration-700 ${
            isEmeraldMatrix
              ? 'bg-gradient-to-tr from-emerald-950 via-emerald-600/20 to-teal-500/20'
              : 'bg-gradient-to-tr from-cyan-950/40 via-sky-600/20 to-indigo-500/20'
          }`}
        />
      </div>

      {children}
    </div>
  );
}