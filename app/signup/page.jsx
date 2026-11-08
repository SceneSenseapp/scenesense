// File: app/signup/page.jsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const syncUserToFirestore = async (user, customName) => {
    try {
      if (!db) return;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: customName || user.displayName || user.email?.split('@')[0] || 'Operative',
          photoURL: user.photoURL || null,
          isVip: false,
          coins: 150,
          tokens: 150,
          walletBalance: 150,
          xp: 320,
          level: 1,
          faction: 'Sci-Fi Masterminds',
          equippedTitle: 'Novice Cinephile',
          equippedTheme: 'theme_default',
          equippedFrame: 'frame_none',
          inventory: [],
          watchlist: [],
          claimedBounties: [],
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      }
    } catch (err) {
      console.error("Failed to sync profile to database:", err);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('Please provide a Codename / Alias.');
      return;
    }
    if (password.length < 6) {
      setError('Security Clearance Protocol requires a password of at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName: displayName.trim() });
      }

      await syncUserToFirestore(user, displayName.trim());
      router.push('/');
    } catch (err) {
      console.error("Sign-up exception:", err);
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This transmission address is already registered. Please sign in instead.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/weak-password':
          setError('Password must contain at least 6 characters.');
          break;
        default:
          setError(err.message.replace('Firebase: ', ''));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setIsGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      await syncUserToFirestore(result.user);
      router.push('/');
    } catch (err) {
      console.warn("Google authentication notice:", err.code);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google biometric authentication failed. Please retry or utilize email credentials.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full text-white font-sans bg-black flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15)_0,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-black/90 border border-cyan-500/40 rounded-3xl p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)]">
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-[10px] font-mono tracking-widest text-cyan-300 font-bold uppercase mb-3">
            Neural Access Key
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">
            Create Studio Account
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Unlock custom personas, history tracking, screening party chat, and 150 starter credits.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Google One-Click Biometric Access */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isGoogleLoading || isLoading}
          className="w-full mb-5 py-3 px-4 rounded-xl bg-[#0e111a] hover:bg-[#141824] border border-cyan-500/30 hover:border-cyan-400 text-xs font-mono font-bold tracking-wider uppercase text-cyan-200 hover:text-white flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>Initialize with Google</span>
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] font-mono uppercase text-gray-500 font-bold">Or Email Transmission</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 mb-1.5">
              Codename / Username
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Commander"
              className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="commander@scenesense.studio"
              className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-black/80 border border-white/20 focus:border-cyan-400 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 hover:opacity-95 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50 disabled:cursor-not-allowed font-mono"
          >
            {isLoading ? 'Initializing Node...' : 'Initialize Clearance (+150 Credits)'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Already have clearance?{' '}
          <Link href="/login" className="text-cyan-400 hover:underline font-bold font-mono">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
