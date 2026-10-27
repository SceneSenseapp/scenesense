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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Complete User Profile Provisioning
  const provisionUserInFirestore = async (user, customAlias) => {
    if (!db) return;
    const finalAlias = customAlias?.trim() || user.displayName || user.email?.split('@')[0] || 'Operative';
    const avatarUrl = user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`;

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: finalAlias,
      photoURL: avatarUrl,
      role: 'Head of Production',
      clearance: 'Level 1 Director',
      coins: 385,
      xp: 150,
      reviewCount: 0,
      classicCount: 0,
      consensusCount: 0,
      reputationScore: 0,
      inventory: [],
      equippedFrame: null,
      equippedTitle: null,
      equippedTheme: null,
      claimedBounties: [],
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    }, { merge: true });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Encryption keys do not match. Please verify your passwords.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const cleanAlias = displayName.trim() || 'Operative';

      await updateProfile(user, { 
        displayName: cleanAlias,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`
      });

      await provisionUserInFirestore(user, cleanAlias);

      router.push('/');
    } catch (err) {
      console.warn("Sign-up exception caught:", err.code);

      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('This email is already registered. Please sign in instead.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/weak-password':
          setError('Password must contain at least 6 characters.');
          break;
        default:
          setError(err.message?.replace('Firebase: ', '') || 'Failed to initialize account credentials.');
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await provisionUserInFirestore(result.user, result.user.displayName);
      router.push('/');
    } catch (err) {
      console.warn("Google sign-up notice:", err.code);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using password authentication.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google authentication link interrupted.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] w-full text-slate-100 font-sans bg-[#050508] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden selection:bg-cyan-500/30">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-[#080d1a] border border-cyan-500/25 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-6">
        
        {/* Header HUD */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            🎬
          </div>
          <span className="inline-block px-3 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-[10px] font-mono tracking-widest text-cyan-300 font-bold uppercase">
            CLEARANCE PROVISIONING // V2.6
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white font-mono">
            Create Studio Account
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Unlock synchronized watchlist radars, published critique dispatches, and receive 385 starting Studio Credits.
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-mono text-center animate-fade-in shadow-md">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-300 font-bold mb-1.5">
              Codename / Director Alias
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Commander, CineAuteur..."
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-300 font-bold mb-1.5">
              Operative Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operative@scenesense.studio"
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">
                Encryption Key (Password)
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {showPassword ? 'Hide Key' : 'Reveal Key'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-300 font-bold mb-1.5">
              Confirm Encryption Key
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-mono font-bold uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.35)] active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Provisioning Node...</span>
              </>
            ) : (
              'Initialize Studio Clearance'
            )}
          </button>
        </form>

        {/* Google OAuth Divider */}
        <div className="relative flex items-center justify-center pt-2 font-mono">
          <div className="border-t border-cyan-500/20 w-full" />
          <span className="bg-[#080d1a] px-3 text-[10px] text-slate-500 uppercase tracking-widest absolute">
            OR REGISTER WITH
          </span>
        </div>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-[#050811] hover:bg-[#0c1424] border border-cyan-500/30 hover:border-cyan-400 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.95H1.2v3.15C3.18 21.32 7.23 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.25c-.25-.72-.38-1.49-.38-2.25s.13-1.53.38-2.25V6.6H1.2C.44 8.14 0 9.87 0 12s.44 3.86 1.2 5.4l4.08-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.23 0 3.18 2.68 1.2 6.6l4.08 3.15c.95-2.84 3.6-4.95 6.72-4.95z"
            />
          </svg>
          <span>Authenticate with Google</span>
        </button>

        <div className="pt-2 text-center text-xs font-mono text-slate-400 border-t border-cyan-500/15">
          Already have clearance?{' '}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline">
            Sign In Here
          </Link>
        </div>

      </div>
    </main>
  );
}