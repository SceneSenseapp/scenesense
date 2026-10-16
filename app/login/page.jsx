// File: app/login/page.jsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function LoginPage() {
  const router = useRouter();
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBetaSuccess, setIsBetaSuccess] = useState(false); // NEW: Beta acknowledgment state

  const syncUserToFirestore = async (user, customName) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: customName || user.displayName || 'Operative',
          photoURL: user.photoURL || null,
          isVip: false,
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
        
        // Trigger the professional beta appreciation notice on new registration
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
          setErrorMessage('This email is already in use. Please try a different email address.');
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

  return (
    <main className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-6 bg-black text-white relative selection:bg-emerald-500/40 font-sans">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md bg-[#0b1120] border-2 border-white/10 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl space-y-6">
        
        {/* BETA SUCCESS ACKNOWLEDGMENT VIEW */}
        {isBetaSuccess ? (
          <div className="text-center space-y-5 py-4 animate-fadeIn">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-950/80 border border-emerald-400/60 flex items-center justify-center text-emerald-400 text-2xl shadow-[0_0_25px_rgba(52,211,153,0.4)]">
              ✦
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-[0.25em] text-emerald-400 font-bold uppercase block">
                UPLINK SECURED // BETA ACCESS
              </span>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Thank You for Your Interest
              </h2>
              <p className="text-xs text-gray-300 leading-relaxed font-sans px-2">
                Thank you for having an interest in SceneSense and using our Beta version. The official launch is on its way.
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-emerald-500 to-indigo-600 hover:opacity-90 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer text-xs"
              >
                Return to Main Uplink
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/80 border border-emerald-400/50 flex items-center justify-center text-emerald-400 text-xl shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                🎬
              </div>
              <span className="text-[10px] font-mono tracking-[0.2em] text-emerald-300 font-bold uppercase block">
                SECURE STUDIO UPLINK ACTIVE // V2.6
              </span>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                {isRegisterMode ? 'REGISTER OPERATIVE' : 'OPERATIVE LOGIN'}
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                {isRegisterMode 
                  ? 'Create a new encrypted profile to join the SceneSense Beta program.' 
                  : 'Authenticate to access personalized neural curations and saved files.'}
              </p>
            </div>

            {/* Error Alert Box */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-950/50 border border-rose-500/60 rounded-xl text-xs text-rose-200 font-medium text-center animate-fadeIn">
                <p>{errorMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleManualAuth} className="space-y-4 text-left">
              {isRegisterMode && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-gray-300 font-bold block">
                    Operative Alias (Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Commander, Cipher..."
                    className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition-all"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-300 font-bold block">
                  Operative Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operative@scenesense.ai"
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-300 font-bold block">
                  Encryption Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-emerald-500 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer text-xs flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                ) : isRegisterMode ? (
                  'JOIN BETA PROGRAM'
                ) : (
                  'AUTHENTICATE ACCESS'
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setErrorMessage('');
                }}
                className="text-xs font-mono text-cyan-300 hover:text-white uppercase font-bold tracking-wider cursor-pointer transition-colors"
              >
                {isRegisterMode 
                  ? 'ALREADY AN OPERATIVE? LOGIN HERE.' 
                  : 'NEED CLEARANCE? JOIN THE BETA.'}
              </button>
            </div>

            {/* Google Auth Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-white/10 w-full"></div>
              <span className="bg-[#0b1120] px-3 text-[10px] font-mono text-gray-500 uppercase tracking-widest absolute">
                OR CONTINUE WITH
              </span>
            </div>

            {/* Google Auth Button with Official Logo */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3 px-4 bg-black/80 hover:bg-black border border-white/20 hover:border-white/40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-md"
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
              <span>Sign in with Google</span>
            </button>

            {/* Back Link */}
            <div className="text-center pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-[11px] font-mono text-gray-400 hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
              >
                ← Return to Mainframe
              </button>
            </div>
          </>
        )}

      </div>
    </main>
  );
}