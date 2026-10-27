// File: components/LoginButton.jsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { playTerminalClick } from '@/components/utils/sfx';

export default function LoginButton({ 
  variant = 'compact', // 'compact' | 'full' | 'nav'
  redirectTo = '/dashboard',
  className = ''
}) {
  const [user, setUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Ensure first-time Google sign-ins receive baseline schema
  const provisionUserRecord = async (firebaseUser) => {
    if (!db || !firebaseUser) return;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Operative',
          photoURL: firebaseUser.photoURL || null,
          coins: 385, // Starting requisition balance
          xp: 150,    // Level 1 starter experience
          level: 1,
          rank: 'Operative',
          inventory: ['frame_neon_cyan'],
          equippedFrame: 'frame_neon_cyan',
          equippedTitle: 'title_director',
          equippedTheme: 'theme_default',
          bioTagline: 'SceneSense Field Operative',
          accentColor: 'cyan',
          compactMode: false,
          hoverGlow: true,
          ambientBackdrop: true,
          defaultReviewPublic: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      }
    } catch (err) {
      console.warn("User provisioning notice:", err);
    }
  };

  const handleGoogleLogin = async () => {
    playTerminalClick();
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await provisionUserRecord(result.user);
        if (redirectTo) {
          router.push(redirectTo);
        }
      }
    } catch (error) {
      console.error("Authentication rejected:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    playTerminalClick();
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Authenticated State: Active Operative Identity Pill
  if (user) {
    const displayName = user.displayName || user.email?.split('@')[0] || 'Operative';

    return (
      <div className={`flex items-center gap-2.5 font-mono text-xs ${className}`}>
        {/* Direct Link to Profile Dossier */}
        <button
          type="button"
          onClick={() => {
            playTerminalClick();
            router.push('/profile');
          }}
          className="flex items-center gap-2 bg-[#080d1a] border border-cyan-500/25 hover:border-cyan-400 p-1.5 pr-3 rounded-2xl transition-all cursor-pointer shadow-sm group"
          title="Open Operative Profile"
        >
          {user.photoURL ? (
            <div className="relative w-6 h-6 rounded-xl overflow-hidden border border-cyan-500/40 shrink-0">
              <Image 
                src={user.photoURL} 
                alt={displayName} 
                fill 
                unoptimized 
                sizes="24px" 
                className="object-cover" 
              />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-[10px] text-cyan-300 font-bold uppercase shrink-0">
              {displayName.charAt(0)}
            </div>
          )}

          <div className="text-left">
            <span className="text-[11px] font-bold text-white group-hover:text-cyan-300 transition-colors block truncate max-w-[120px]">
              {displayName}
            </span>
          </div>
        </button>

        {/* Terminate Session Button */}
        <button 
          type="button"
          onClick={handleLogout} 
          className="px-3 py-1.5 bg-[#050811] hover:bg-rose-950/60 border border-white/10 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-[10px]"
          title="Terminate Active Session"
        >
          Log Out
        </button>
      </div>
    );
  }

  // Unauthenticated State
  return (
    <div className={`flex items-center gap-2 font-mono text-xs ${className}`}>
      {/* Primary 1-Click Google Sign In */}
      <button 
        type="button"
        disabled={isAuthenticating}
        onClick={handleGoogleLogin} 
        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer flex items-center gap-2 active:scale-95 text-[11px]"
      >
        {isAuthenticating ? (
          <>
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span>⚡</span>
            <span>Director Login</span>
          </>
        )}
      </button>

      {/* Auxiliary Route Link to Credentials Form */}
      {variant === 'full' && (
        <button
          type="button"
          onClick={() => {
            playTerminalClick();
            router.push('/login');
          }}
          className="px-3.5 py-2 bg-[#080d1a] hover:bg-white/5 border border-cyan-500/25 hover:border-cyan-400 text-slate-300 hover:text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-[10px]"
        >
          Key Login
        </button>
      )}
    </div>
  );
}