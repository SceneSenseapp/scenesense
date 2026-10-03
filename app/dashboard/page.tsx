"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/firebase';

interface Movie {
  id: string;
  movieId?: string | number;
  title: string;
  poster_path?: string;
  overview?: string;
  savedAt?: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Secure the route: Boot unauthenticated users back to the scanner
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/');
      } else {
        setUser(currentUser);
        fetchWatchlist(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Pull the saved targets from Firestore
  const fetchWatchlist = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'users', uid, 'watchlist'),
        orderBy('savedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Movie));
      setWatchlist(movies);
    } catch (error) {
      console.error("Failed to decrypt database:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (!user) return null; // Prevent UI flash before redirect

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans p-8 relative overflow-hidden">
      {/* Cinematic CSS Backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] z-0 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black to-black z-0 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Navigation */}
        <div className="flex justify-between items-center border-b border-red-900/50 pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Operative Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">System Active: {user.email}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-red-600/50 text-red-400 hover:bg-red-900/30 text-sm font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(220,38,38,0.2)] cursor-pointer"
            >
              Back to Scanner
            </button>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-950/50 hover:bg-red-900 border border-red-900/50 text-red-400 text-sm rounded-lg transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Watchlist Grid */}
        <h2 className="text-xl font-bold mb-6 text-red-500">Secured Targets (Watchlist)</h2>
        
        {isLoading ? (
          <div className="text-red-500 animate-pulse font-mono text-sm">Decrypting database payload...</div>
        ) : watchlist.length === 0 ? (
          <div className="p-8 border border-white/10 rounded-xl bg-[#0a0a0a] text-center">
            <p className="text-gray-400">No targets secured yet. Return to the scanner to initiate a search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {watchlist.map((movie) => (
              <div key={movie.id} className="bg-[#141414] rounded-lg overflow-hidden border border-white/10 hover:border-red-500 transition-all duration-300 group shadow-lg">
                {movie.poster_path ? (
                  <img 
                    src={movie.poster_path} 
                    alt={movie.title} 
                    className="w-full h-72 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-72 bg-[#1a1a1a] flex items-center justify-center text-gray-600">
                    No Image Found
                  </div>
                )}
                <div className="p-4 border-t border-white/5">
                  <h3 className="font-bold text-sm truncate text-gray-200 group-hover:text-white transition-colors">{movie.title}</h3>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}