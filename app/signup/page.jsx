// File: app/signup/page.jsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName });
      }

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName || '',
        isVip: false,
        createdAt: serverTimestamp(),
      });

      router.push('/');
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] w-full text-white font-sans bg-black flex items-center justify-center p-6 relative overflow-hidden">
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
            Unlock custom personas, history tracking, and saved watchlists.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

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
            disabled={isLoading}
            className="w-full mt-2 py-3.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-600 hover:opacity-95 text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Initializing Node...' : 'Initialize Clearance'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          Already have clearance?{' '}
          <Link href="/login" className="text-cyan-400 hover:underline font-bold">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}