// File: app/login/page.jsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function LoginPage() {
  const router = useRouter();
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isBetaSuccess, setIsBetaSuccess] = useState(false);

  // Complete User Profile Provisioner
  const syncUserToFirestore = async (user, customName) => {
    if (!db) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: customName || user.displayName || user.email?.split('@')[0] || 'Operative',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
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

  const handleManualAuth = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');
    setLoading(true);

    try {
      let userCredential;

      if (isRegisterMode) {
        if (!name.trim()) {
          setErrorMessage('Please enter an Operative Alias (Name).');
          setLoading(false);
          return;
        }

        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });

        await syncUserToFirestore(userCredential.user, name.trim());
        setIsBetaSuccess(true);
        setLoading(false);
        return;
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserToFirestore(userCredential.user);
        router.push('/');
      }
    } catch (error) {
      console.warn("Authentication code caught:", error.code);

      switch (error.code) {
        case 'auth/email-already-in-use':
          setErrorMessage('This email is already in use. Please sign in or use a different email.');
          break;
        case 'auth/invalid-email':
          setErrorMessage('Invalid email format provided.');
          break;
        case 'auth/weak-password':
          setErrorMessage('Password must be at least 6 characters long.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setErrorMessage('Invalid operative credentials. Please verify your email and password.');
          break;
        case 'auth/too-many-requests':
          setErrorMessage('Access temporarily blocked due to multiple attempts. Please try again shortly.');
          break;
        default:
          setErrorMessage(error.message || 'Authentication error encountered.');
          break;
      }
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setInfoMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await syncUserToFirestore(result.user);
      router.push('/');
    } catch (error) {
      console.warn("Google authentication warning:", error.code);
      if (error.code === 'auth/account-exists-with-different-credential') {
        setErrorMessage('An account already exists with this email using password login.');
      } else if (error.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(error.message || 'Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setErrorMessage('Enter your email address in the field above to receive a reset dispatch.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfoMessage(`Password reset key dispatched to ${email.trim()}. Check your inbox.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to dispatch password recovery email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-4 sm:p-8 bg-[#050508] text-slate-100 relative font-sans overflow-hidden selection:bg-cyan-500/30">
      
      {/* Background Depth Halos */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-cyan-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-[#080d1a] border border-cyan-500/25 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-6">
        
        {/* BETA SUCCESS ACKNOWLEDGMENT VIEW */}
        {isBetaSuccess ? (
          <div className="text-center space-y-5 py-4 animate-fade-in font-mono">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-cyan-400 text-3xl shadow-[0_0_30px_rgba(6,182,212,0.35)]">
              ✦
            </div>
            <div className="space-y-2">
              <span className="text-[10px] tracking-[0.25em] text-cyan-400 font-bold uppercase block">
                UPLINK SECURED // BETA OPERATIVE
              </span>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Clearance Granted
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans px-2">
                Your operative profile has been initialized with 385 Studio Credits and Level 1 clearance. Welcome to the SceneSense Studio network.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-mono font-bold uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer text-xs"
              >
                Access Mainframe →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                🎬
              </div>
              <span className="text-[10px] font-mono tracking-[0.2em] text-cyan-300 font-bold uppercase block">
                STUDIO UPLINK GATEWAY // V2.6
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white font-mono">
                {isRegisterMode ? 'REGISTER OPERATIVE' : 'OPERATIVE LOGIN'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {isRegisterMode 
                  ? 'Provision an encrypted profile to unlock watchlists, dispatches, and studio commissary rewards.' 
                  : 'Authenticate to access your synchronized surveillance radar, dossier, and rewards.'}
              </p>
            </div>

            {/* Error and Info Notices */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-xs font-mono text-rose-200 text-center animate-fade-in shadow-md">
                {errorMessage}
              </div>
            )}
            {infoMessage && (
              <div className="p-3.5 bg-cyan-950/80 border border-cyan-500/50 rounded-2xl text-xs font-mono text-cyan-200 text-center animate-fade-in shadow-md">
                {infoMessage}
              </div>
            )}

            {/* Main Auth Form */}
            <form onSubmit={handleManualAuth} className="space-y-4 text-left font-mono text-xs">
              {isRegisterMode && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">
                    Operative Codename / Alias
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Commander, Cipher..."
                    className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">
                    Encryption Key (Password)
                  </label>
                  {!isRegisterMode && (
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      Forgot Key?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#050811] border border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-4 pr-10 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition-colors shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '🔒'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-mono font-bold uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] cursor-pointer text-xs flex items-center justify-center gap-2 mt-3 active:scale-95"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : isRegisterMode ? (
                  'INITIALIZE OPERATIVE PROFILE'
                ) : (
                  'AUTHENTICATE CLEARANCE'
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="text-center pt-1 font-mono">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setErrorMessage('');
                  setInfoMessage('');
                }}
                className="text-xs text-cyan-300 hover:text-white uppercase font-bold tracking-wider cursor-pointer transition-colors"
              >
                {isRegisterMode 
                  ? 'ALREADY AN OPERATIVE? SIGN IN HERE' 
                  : 'NEED CLEARANCE? INITIALIZE REGISTRATION'}
              </button>
            </div>

            {/* Google Auth Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-cyan-500/20 w-full" />
              <span className="bg-[#080d1a] px-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest absolute">
                OR CONTINUE WITH
              </span>
            </div>

            {/* Google Auth Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
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

            {/* Back Link */}
            <div className="text-center pt-2 border-t border-cyan-500/15">
              <Link
                href="/"
                className="text-[11px] font-mono text-slate-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                ← Return to Studio Uplink
              </Link>
            </div>
          </>
        )}

      </div>
    </main>
  );
}